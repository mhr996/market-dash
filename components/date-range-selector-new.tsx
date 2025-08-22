'use client';
import React, { useState, useRef, useEffect } from 'react';
import { DateRangePicker } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import IconCalendar from '@/components/icon/icon-calendar';
import IconCaretDown from '@/components/icon/icon-caret-down';

interface DateRangeSelectorProps {
    value: Date[];
    onChange: (dates: Date[]) => void;
    placeholder?: string;
    className?: string;
    isRtl?: boolean;
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({ value, onChange, placeholder = 'Select date range', className = '', isRtl = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selection, setSelection] = useState({
        startDate: value[0] || new Date(),
        endDate: value[1] || new Date(),
        key: 'selection',
    });
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Update selection when value prop changes
    useEffect(() => {
        setSelection({
            startDate: value[0] || new Date(),
            endDate: value[1] || new Date(),
            key: 'selection',
        });
    }, [value]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (ranges: any) => {
        const range = ranges.selection;
        setSelection(range);
        onChange([range.startDate, range.endDate]);
    };

    const formatDateRange = () => {
        if (!value[0] || !value[1]) return placeholder;
        const start = value[0].toLocaleDateString();
        const end = value[1].toLocaleDateString();
        return `${start} - ${end}`;
    };

    const quickRanges = [
        {
            label: 'Today',
            range: () => {
                const today = new Date();
                return [today, today];
            },
        },
        {
            label: 'Yesterday',
            range: () => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                return [yesterday, yesterday];
            },
        },
        {
            label: 'Last 7 days',
            range: () => {
                const today = new Date();
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return [weekAgo, today];
            },
        },
        {
            label: 'Last 30 days',
            range: () => {
                const today = new Date();
                const monthAgo = new Date();
                monthAgo.setDate(monthAgo.getDate() - 30);
                return [monthAgo, today];
            },
        },
        {
            label: 'This month',
            range: () => {
                const today = new Date();
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                return [monthStart, today];
            },
        },
    ];

    const handleQuickRange = (rangeFn: () => Date[]) => {
        const [start, end] = rangeFn();
        setSelection({
            startDate: start,
            endDate: end,
            key: 'selection',
        });
        onChange([start, end]);
        setIsOpen(false);
    };

    return (
        <>
            <style jsx global>{`
                .date-range-picker-container {
                    font-family: inherit;
                }

                .date-range-picker-container .rdrCalendarWrapper {
                    background: transparent;
                    color: inherit;
                }

                .date-range-picker-container .rdrMonth {
                    background: transparent;
                }

                .date-range-picker-container .rdrWeekDays {
                    background: transparent;
                }

                .date-range-picker-container .rdrDay {
                    background: transparent;
                }

                .date-range-picker-container .rdrDayToday .rdrDayNumber:after {
                    background: #4361ee;
                }

                .date-range-picker-container .rdrDayInRange {
                    background: #4361ee20 !important;
                    color: inherit;
                }

                .date-range-picker-container .rdrStartEdge,
                .date-range-picker-container .rdrEndEdge {
                    background: #4361ee !important;
                    color: white !important;
                }

                .date-range-picker-container .rdrInRange {
                    background: #4361ee20 !important;
                    color: inherit;
                }

                .date-range-picker-container .rdrDayNumber {
                    color: inherit;
                }

                .date-range-picker-container .rdrMonthAndYearWrapper {
                    background: transparent;
                    color: inherit;
                }

                .date-range-picker-container .rdrMonthAndYearPickers select {
                    background: transparent;
                    color: inherit;
                    border: 1px solid #e0e6ed;
                }

                .dark .date-range-picker-container .rdrMonthAndYearPickers select {
                    border-color: #1b2e4b;
                    background: #0e1726;
                }

                .date-range-picker-container .rdrWeekDay {
                    color: inherit;
                }

                .date-range-picker-container .rdrNextPrevButton {
                    background: transparent;
                    border: 1px solid #e0e6ed;
                }

                .dark .date-range-picker-container .rdrNextPrevButton {
                    border-color: #1b2e4b;
                }

                .date-range-picker-container .rdrPprevButton i,
                .date-range-picker-container .rdrNextButton i {
                    border-color: inherit;
                }
            `}</style>

            <div className={`relative ${className}`} ref={dropdownRef}>
                {/* Display Input */}
                <div className={`form-input flex cursor-pointer items-center justify-between ${isOpen ? 'ring-2 ring-primary' : ''}`} onClick={() => setIsOpen(!isOpen)}>
                    <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <IconCalendar className="h-4 w-4 text-gray-400" />
                        <span className={`${!value[0] || !value[1] ? 'text-gray-500 dark:text-gray-400' : 'text-black dark:text-white'}`}>{formatDateRange()}</span>
                    </div>
                    <IconCaretDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>

                {/* Dropdown */}
                {isOpen && (
                    <div className={`absolute top-full z-50 mt-2 rounded-lg border border-white-light bg-white shadow-lg dark:border-white-dark dark:bg-black ${isRtl ? 'right-0' : 'left-0'}`}>
                        {/* Quick Ranges */}
                        <div className="border-b border-gray-200 p-3 dark:border-gray-700">
                            <div className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">Quick Ranges:</div>
                            <div className="grid grid-cols-2 gap-2">
                                {quickRanges.map((range, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        className="rounded px-3 py-1 text-xs text-gray-600 hover:bg-primary/10 hover:text-primary dark:text-gray-300"
                                        onClick={() => handleQuickRange(range.range)}
                                    >
                                        {range.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date Range Picker */}
                        <div className="date-range-picker-container">
                            <DateRangePicker
                                ranges={[selection]}
                                onChange={handleSelect}
                                moveRangeOnFirstSelection={false}
                                months={2}
                                direction="horizontal"
                                preventSnapRefocus={true}
                                calendarFocus="backwards"
                            />
                        </div>

                        {/* Apply Button */}
                        <div className="border-t border-gray-200 p-3 dark:border-gray-700">
                            <button type="button" className="btn btn-primary w-full" onClick={() => setIsOpen(false)}>
                                Apply
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default DateRangeSelector;
