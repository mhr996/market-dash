'use client';
import React from 'react';

interface DateRangeInputsProps {
    fromDate: string;
    toDate: string;
    onFromDateChange: (date: string) => void;
    onToDateChange: (date: string) => void;
    className?: string;
}

const DateRangeInputs: React.FC<DateRangeInputsProps> = ({ fromDate, toDate, onFromDateChange, onToDateChange, className = '' }) => {
    return (
        <div className={`space-y-3 ${className}`}>
            <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">From Date</label>
                <input type="date" value={fromDate} onChange={(e) => onFromDateChange(e.target.value)} className="form-input w-full" />
            </div>
            <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">To Date</label>
                <input type="date" value={toDate} onChange={(e) => onToDateChange(e.target.value)} className="form-input w-full" />
            </div>
        </div>
    );
};

export default DateRangeInputs;
