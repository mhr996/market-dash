'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import IconArrowBackward from '@/components/icon/icon-arrow-backward';
import IconArrowForward from '@/components/icon/icon-arrow-forward';

interface FilterItem {
    id: number;
    name: string;
    image_url?: string | null;
}

interface HorizontalFilterProps {
    items: FilterItem[];
    selectedItems: number[];
    onSelectionChange: (selectedIds: number[]) => void;
    placeholder?: string;
    className?: string;
    showImages?: boolean;
}

const HorizontalFilter: React.FC<HorizontalFilterProps> = ({ items, selectedItems, onSelectionChange, placeholder = 'Select items', className = '', showImages = false }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScrollButtons = useCallback(() => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
        }
    }, []);

    useEffect(() => {
        checkScrollButtons();
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', checkScrollButtons);
            return () => container.removeEventListener('scroll', checkScrollButtons);
        }
    }, [items]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 200;
            const currentScroll = scrollContainerRef.current.scrollLeft;
            const newScroll = direction === 'left' ? currentScroll - scrollAmount : currentScroll + scrollAmount;

            scrollContainerRef.current.scrollTo({
                left: newScroll,
                behavior: 'smooth',
            });
        }
    };

    const toggleItem = (itemId: number) => {
        const newSelection = selectedItems.includes(itemId) ? selectedItems.filter((id) => id !== itemId) : [...selectedItems, itemId];
        onSelectionChange(newSelection);
    };

    const clearAll = () => {
        onSelectionChange([]);
    };

    return (
        <div className={`relative ${className}`}>
            {/* Clear All Button */}
            {selectedItems.length > 0 && (
                <div className="mb-3 flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{selectedItems.length} selected</span>
                    <button onClick={clearAll} className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors font-medium">
                        Clear All
                    </button>
                </div>
            )}

            {/* Filter Container */}
            <div className="relative bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                {/* Scroll Buttons - Desktop Only */}
                <div className="hidden lg:flex absolute left-2 top-1/2 transform -translate-y-1/2 z-10">
                    <button
                        onClick={() => scroll('left')}
                        disabled={!canScrollLeft}
                        className={`p-1.5 rounded-full bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600 transition-all duration-200 ${
                            canScrollLeft ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 hover:shadow-md' : 'text-gray-300 dark:text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        <IconArrowBackward className="h-3.5 w-3.5" />
                    </button>
                </div>

                <div className="hidden lg:flex absolute right-2 top-1/2 transform -translate-y-1/2 z-10">
                    <button
                        onClick={() => scroll('right')}
                        disabled={!canScrollRight}
                        className={`p-1.5 rounded-full bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600 transition-all duration-200 ${
                            canScrollRight ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 hover:shadow-md' : 'text-gray-300 dark:text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        <IconArrowForward className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* Scrollable Items Container */}
                <div ref={scrollContainerRef} className="flex gap-2 overflow-x-auto scrollbar-hide lg:px-8" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {items.length === 0 ? (
                        <div className="flex items-center justify-center w-full py-6 text-gray-500 dark:text-gray-400">
                            <span className="text-sm">{placeholder}</span>
                        </div>
                    ) : (
                        items.map((item) => {
                            const isSelected = selectedItems.includes(item.id);
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => toggleItem(item.id)}
                                    className={`flex-shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all duration-200 min-w-fit ${
                                        isSelected
                                            ? 'bg-primary text-white border-primary shadow-sm'
                                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10'
                                    }`}
                                >
                                    {showImages && item.image_url && <img src={item.image_url} alt={item.name} className="w-4 h-4 rounded-full object-cover flex-shrink-0" />}
                                    <span className="text-sm font-medium whitespace-nowrap">{item.name}</span>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Mobile Scroll Indicators */}
                <div className="lg:hidden flex justify-center mt-3">
                    <div className="flex space-x-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full transition-colors ${canScrollLeft ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                        <div className={`w-1.5 h-1.5 rounded-full transition-colors ${canScrollRight ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HorizontalFilter;
