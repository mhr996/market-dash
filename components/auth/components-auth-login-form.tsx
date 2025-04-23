'use client';
import IconLockDots from '@/components/icon/icon-lock-dots';
import IconMail from '@/components/icon/icon-mail';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { signIn } from '@/lib/auth';
import Link from 'next/link';

interface FormErrors {
    email?: string;
    password?: string;
    general?: string;
}

const ComponentsAuthLoginForm = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validateForm = () => {
        const newErrors: FormErrors = {};

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            newErrors.email = 'Email is required';
        } else if (!emailRegex.test(email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        // Password validation
        if (!password) {
            newErrors.password = 'Password is required';
        }

        return newErrors;
    };

    const submitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setIsSubmitting(false);
            return;
        }

        try {
            const { error } = await signIn(email, password);
            if (error) {
                setErrors({ general: 'Invalid email or password' });
            } else {
                router.push('/');
            }
        } catch (error) {
            setErrors({ general: 'An unexpected error occurred. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form className="space-y-5 dark:text-white" onSubmit={submitForm}>
            {errors.general && <div className="text-red-500 bg-red-100 p-3 rounded-md mb-4">{errors.general}</div>}
            <div>
                <label htmlFor="Email">Email</label>
                <div className="relative text-white-dark">
                    <input
                        id="Email"
                        type="email"
                        placeholder="Enter Email"
                        className={`form-input ps-10 placeholder:text-white-dark ${errors.email ? 'border-red-500' : ''}`}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconMail fill={true} />
                    </span>
                </div>
                {errors.email && <span className="text-red-500 text-sm mt-1">{errors.email}</span>}
            </div>
            <div>
                <label htmlFor="Password">Password</label>
                <div className="relative text-white-dark">
                    <input
                        id="Password"
                        type="password"
                        placeholder="Enter Password"
                        className={`form-input ps-10 placeholder:text-white-dark ${errors.password ? 'border-red-500' : ''}`}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconLockDots fill={true} />
                    </span>
                </div>
                {errors.password && <span className="text-red-500 text-sm mt-1">{errors.password}</span>}
            </div>
            <div className="flex justify-between">
                <label className="flex cursor-pointer items-center">
                    <input type="checkbox" className="form-checkbox bg-white dark:bg-black" />
                    <span className="text-white-dark">Remember me</span>
                </label>
                <Link href="/reset-password" className="text-primary hover:underline">
                    Forgot Password?
                </Link>
            </div>
            <button type="submit" className="btn btn-gradient !mt-6 w-full border-0 uppercase shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]" disabled={isSubmitting}>
                {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>
        </form>
    );
};

export default ComponentsAuthLoginForm;
