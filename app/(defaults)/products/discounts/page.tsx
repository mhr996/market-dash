'use client';
import React from 'react';
import { getTranslation } from '@/i18n';

const DiscountsPage = () => {
    const { t } = getTranslation();

    return (
        <div className="panel border-white-light px-0 dark:border-[#1b2e4b] w-full max-w-none">
            <div className="invoice-table">
                <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                    <div className="flex items-center gap-2">
                        <h5 className="text-lg font-semibold dark:text-white">Discounts</h5>
                    </div>
                </div>

                <div className="relative">
                    <div className="p-6">
                        <div className="text-center py-20">
                            <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Discounts Management</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">This page will be used to manage product discounts and promotions.</p>
                            <div className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg">Coming Soon</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DiscountsPage;
