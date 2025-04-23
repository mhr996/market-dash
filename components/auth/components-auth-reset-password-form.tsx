'use client';
import IconMail from '@/components/icon/icon-mail';
import { useState } from 'react';
import { resetPassword } from '@/lib/auth';

const ComponentsAuthResetPasswordForm = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            setError('Please enter your email');
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            const result = await resetPassword(email);

            if (result.error) {
                setError(result.error);
            } else {
                setMessage('Password reset link has been sent to your email');
                setEmail('');
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again later.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
                <label htmlFor="Email" className="dark:text-white">
                    Email
                </label>
                <div className="relative text-white-dark">
                    <input
                        id="Email"
                        type="email"
                        placeholder="Enter Email"
                        className="form-input ps-10 placeholder:text-white-dark"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconMail fill={true} />
                    </span>
                </div>
            </div>

            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}

            {message && <div className="text-green-500 text-sm mt-2">{message}</div>}

            <button type="submit" className="btn btn-gradient !mt-6 w-full border-0 uppercase shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]" disabled={loading}>
                {loading ? 'SENDING...' : 'RECOVER'}
            </button>
        </form>
    );
};

export default ComponentsAuthResetPasswordForm;
