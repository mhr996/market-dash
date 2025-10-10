'use client';
import React from 'react';
import { getTranslation } from '@/i18n';

const Homepage = () => {
    const { t } = getTranslation();

    return (
        <div className="container mx-auto p-6 w-full max-w-none">
            {/* Breadcrumb Navigation */}
            <ul className="flex space-x-2 rtl:space-x-reverse mb-4">
                <li>
                    <span className="text-primary">Homepage</span>
                </li>
            </ul>

            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Homepage</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your platform's homepage settings</p>
            </div>

            {/* Main Content */}
            <div className="panel mb-5 w-full max-w-none">
                <div className="mb-5">
                    <h5 className="text-lg font-semibold dark:text-white-light">Homepage Configuration</h5>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Configure your platform's homepage content and layout</p>
                </div>

                <div className="text-center py-12">
                    <div className="text-gray-400 mb-6">
                        <svg className="h-20 w-20 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1}
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                            />
                        </svg>
                    </div>
                    <h6 className="text-xl font-semibold text-gray-500 dark:text-gray-400 mb-2">Homepage Management</h6>
                    <p className="text-gray-400 dark:text-gray-500 max-w-md mx-auto">
                        Homepage configuration tools will be available here. You'll be able to customize your platform's main page content, layout, and features.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Homepage;
