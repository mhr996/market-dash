import supabase from './supabase';

export const signUp = async (email, password, name) => {
    const { user, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { display_name: name },
        },
    });

    if (error) {
        console.error('Error signing up:', error.message);
        return { error: error.message };
    }

    return { user };
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
