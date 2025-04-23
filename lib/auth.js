import supabase from './supabase';

export const signUp = async (email, password, name) => {
    // Step 1: Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { display_name: name },
        },
    });

    if (authError) {
        console.error('Error signing up:', authError.message);
        return { error: authError.message };
    }

    // Step 2: Create a profile entry for the new user
    if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
            id: authData.user.id,
            full_name: name,
            email: email,
            updated_at: new Date().toISOString(),
        });

        if (profileError) {
            console.error('Error creating profile:', profileError.message);
            // We don't return error here since the user is already created
            // and the profile creation can be retried later
        }
    }

    return { user: authData.user };
};

export const signIn = async (email, password) => {
    const { user, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error('Error signing in:', error.message);
        return { error: error.message };
    }

    return { user };
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error signing out:', error.message);
        return { error: error.message };
    }
    return { success: true };
};

export const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
        console.error('Error resetting password:', error.message);
        return { error: error.message };
    }
    return { success: true };
};

export const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({
        password: newPassword,
    });
    if (error) {
        console.error('Error updating password:', error.message);
        return { error: error.message };
    }
    return { success: true };
};

export const getCurrentUser = async () => {
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();
    if (error) {
        console.error('Error getting user:', error.message);
        return { error: error.message };
    }
    return { user };
};
