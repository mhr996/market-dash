'use client';
import React, { useState, useRef, useEffect, use } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconX from '@/components/icon/icon-x';
import { getTranslation } from '@/i18n';

interface Option {
    id: number;
    name: string;
    logo_url?: string;
}

interface MultiSelectProps {
    options: Option[];
    selectedValues: number[];
    onChange: (values: number[]) => void;
    placeholder: string;
    className?: string;
    isRtl?: boolean;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ options, selectedValues, onChange, placeholder, className = '', isRtl = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { t } = getTranslation();

    const filteredOptions = options.filter((option) => option.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const selectedOptions = options.filter((option) => selectedValues.includes(option.id));

    const toggleOption = (optionId: number) => {
        if (selectedValues.includes(optionId)) {
            onChange(selectedValues.filter((id) => id !== optionId));
        } else {
            onChange([...selectedValues, optionId]);
        }
    };

    const removeOption = (optionId: number) => {
        onChange(selectedValues.filter((id) => id !== optionId));
    };

    const clearAll = () => {
        onChange([]);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Selected Items Display */}
            <div className={`form-input min-h-[42px] cursor-pointer ${isOpen ? 'ring-2 ring-primary' : ''}`} onClick={() => setIsOpen(!isOpen)}>
                <div className="flex flex-wrap items-center gap-1">
                    {selectedOptions.length > 0 ? (
                        selectedOptions.map((option) => (
                            <span
                                key={option.id}
                                className={`inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs text-primary dark:bg-primary/20 ${isRtl ? 'flex-row-reverse' : ''}`}
                            >
                                {option.logo_url && <img src={option.logo_url} alt={option.name} className="h-4 w-4 rounded-full object-cover" />}
                                <span className="max-w-[100px] truncate">{option.name}</span>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeOption(option.id);
                                    }}
                                    className="text-primary/70 hover:text-primary"
                                >
                                    <IconX className="h-3 w-3" />
                                </button>
                            </span>
                        ))
                    ) : (
                        <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
                    )}
                </div>
                <div className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'left-3' : 'right-3'}`}>
                    <IconCaretDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full z-50 mt-1 w-full rounded-md border border-white-light bg-white shadow-lg dark:border-white-dark dark:bg-black">
                    {/* Search */}
                    <div className="p-2">
                        <input type="text" className="form-input" placeholder={t('search')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()} />
                    </div>

                    {/* Clear All Button */}
                    {selectedValues.length > 0 && (
                        <div className="border-b border-white-light px-2 pb-2 dark:border-white-dark">
                            <button type="button" onClick={clearAll} className="text-xs text-danger hover:underline">
                                Clear All
                            </button>
                        </div>
                    )}

                    {/* Options */}
                    <div className="max-h-48 overflow-y-auto">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.id}
                                    className={`flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                                        selectedValues.includes(option.id) ? 'bg-primary/10 text-primary' : ''
                                    } ${isRtl ? 'flex-row-reverse' : ''}`}
                                    onClick={() => toggleOption(option.id)}
                                >
                                    <input type="checkbox" checked={selectedValues.includes(option.id)} onChange={() => {}} className="rounded border-gray-300" />
                                    {option.logo_url && <img src={option.logo_url} alt={option.name} className="h-6 w-6 rounded-full object-cover" />}
                                    <span className="truncate">{option.name}</span>
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-center text-gray-500 dark:text-gray-400">No options found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSelect;
