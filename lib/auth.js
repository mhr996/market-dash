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
