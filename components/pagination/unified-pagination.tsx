'use client';
import React from 'react';

interface UnifiedPaginationProps {
    page: number;
    pageSize: number;
    totalRecords: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    pageSizes: number[];
}

const UnifiedPagination: React.FC<UnifiedPaginationProps> = ({ page, pageSize, totalRecords, onPageChange, onPageSizeChange, pageSizes }) => {
    const startRecord = (page - 1) * pageSize + 1;
    const endRecord = Math.min(page * pageSize, totalRecords);
    const totalPages = Math.ceil(totalRecords / pageSize);

    return (
        <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {startRecord} to {endRecord} of {totalRecords} entries
            </div>
            <div className="flex items-center space-x-2">
                <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))} className="form-select text-sm">
                    {pageSizes.map((size) => (
                        <option key={size} value={size}>
                            {size} per page
                        </option>
                    ))}
                </select>
                <div className="flex space-x-1">
                    <button
                        onClick={() => onPageChange(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700"
                    >
                        Previous
                    </button>
                    <span className="px-3 py-1 text-sm">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                        disabled={page * pageSize >= totalRecords}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UnifiedPagination;
