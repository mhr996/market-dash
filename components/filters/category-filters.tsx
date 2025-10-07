'use client';
import React, { useState, useEffect, useCallback } from 'react';
import HorizontalFilter from './horizontal-filter';

interface Category {
    id: number;
    title: string;
    desc: string;
    image_url?: string | null;
}

interface SubCategory {
    id: number;
    title: string;
    desc: string;
    category_id: number;
}

interface CategoryFiltersProps {
    categories: Category[];
    subcategories: SubCategory[];
    selectedCategories: number[];
    selectedSubcategories: number[];
    onCategoriesChange: (categoryIds: number[]) => void;
    onSubcategoriesChange: (subcategoryIds: number[]) => void;
    className?: string;
}

const CategoryFilters: React.FC<CategoryFiltersProps> = ({ categories, subcategories, selectedCategories, selectedSubcategories, onCategoriesChange, onSubcategoriesChange, className = '' }) => {
    const [filteredSubcategories, setFilteredSubcategories] = useState<SubCategory[]>([]);

    // Filter subcategories based on selected categories
    useEffect(() => {
        if (selectedCategories.length === 0) {
            // If no categories selected, show all subcategories
            setFilteredSubcategories(subcategories);
        } else {
            // Show only subcategories that belong to selected categories
            const filtered = subcategories.filter((sub) => selectedCategories.includes(sub.category_id));
            setFilteredSubcategories(filtered);
        }
    }, [selectedCategories, subcategories]);

    const handleCategoryChange = (categoryIds: number[]) => {
        onCategoriesChange(categoryIds);

        // Clear subcategories when categories change
        if (categoryIds.length === 0) {
            onSubcategoriesChange([]);
        } else {
            // Remove subcategories that don't belong to selected categories
            const validSubcategories = selectedSubcategories.filter((subId) => {
                const sub = subcategories.find((s) => s.id === subId);
                return sub && categoryIds.includes(sub.category_id);
            });
            if (validSubcategories.length !== selectedSubcategories.length) {
                onSubcategoriesChange(validSubcategories);
            }
        }
    };

    const handleSubcategoryChange = (subcategoryIds: number[]) => {
        onSubcategoriesChange(subcategoryIds);
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Categories Filter */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Categories</label>
                <HorizontalFilter
                    items={categories.map((cat) => ({
                        id: cat.id,
                        name: cat.title,
                        image_url: cat.image_url || undefined,
                    }))}
                    selectedItems={selectedCategories}
                    onSelectionChange={handleCategoryChange}
                    placeholder="No categories available"
                    showImages={true}
                />
            </div>

            {/* Subcategories Filter */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filter by Subcategories
                    {selectedCategories.length > 0 && <span className="text-xs text-gray-500 ml-2">(showing subcategories for selected categories)</span>}
                </label>
                <HorizontalFilter
                    items={filteredSubcategories.map((sub) => ({
                        id: sub.id,
                        name: sub.title,
                    }))}
                    selectedItems={selectedSubcategories}
                    onSelectionChange={handleSubcategoryChange}
                    placeholder={selectedCategories.length === 0 ? 'Select categories first' : 'No subcategories available'}
                    showImages={false}
                />
            </div>
        </div>
    );
};

export default CategoryFilters;
