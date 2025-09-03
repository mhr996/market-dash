'use client';
import React, { useState, useRef, useEffect } from 'react';
import IconSettings from '@/components/icon/icon-settings';
import IconX from '@/components/icon/icon-x';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconSearch from '@/components/icon/icon-search';
import { getTranslation } from '@/i18n';

interface FilterOption {
    id: number;
    name: string;
    logo_url?: string;
}

interface FilterState {
    shops: number[];
    users: number[];
    timeRange: string;
}

interface StatisticsFilterProps {
    shops: FilterOption[];
    users: FilterOption[];
    onFilterChange: (filters: FilterState) => void;
    currentFilters: FilterState;
    isLoading?: boolean;
}

const StatisticsFilter: React.FC<StatisticsFilterProps> = ({ shops, users, onFilterChange, currentFilters, isLoading = false }) => {
    const { t } = getTranslation();
    const [isOpen, setIsOpen] = useState(false);
    // Pending filters that haven't been applied yet
    const [pendingFilters, setPendingFilters] = useState<FilterState>(currentFilters);

    const [searchTerms, setSearchTerms] = useState({
        shops: '',
        users: '',
    });

    const dropdownRef = useRef<HTMLDivElement>(null);

    // Update pending filters when current filters change (e.g., from outside or initial load)
    useEffect(() => {
        setPendingFilters(currentFilters);
    }, [currentFilters]);

    // Filter options based on search terms
    const filteredShops = shops.filter((shop) => shop.name.toLowerCase().includes(searchTerms.shops.toLowerCase()));
    const filteredUsers = users.filter((user) => user.name.toLowerCase().includes(searchTerms.users.toLowerCase()));

    // Get selected items for current applied filters (for display)
    const selectedShops = shops.filter((shop) => currentFilters.shops.includes(shop.id));
    const selectedUsers = users.filter((user) => currentFilters.users.includes(user.id));

    // Time range options
    const timeRangeOptions = [
        { value: 'all', label: t('all_time') },
        { value: 'today', label: t('today') },
        { value: 'week', label: t('this_week') },
        { value: 'month', label: t('this_month') },
        { value: 'quarter', label: t('this_quarter') },
        { value: 'year', label: t('this_year') },
    ];

    // Update pending filters (doesn't trigger data refresh)
    const updatePendingFilters = (newFilters: Partial<FilterState>) => {
        setPendingFilters((prev) => ({ ...prev, ...newFilters }));
    };

    // Toggle shop selection in pending filters
    const toggleShop = (shopId: number) => {
        const newShops = pendingFilters.shops.includes(shopId) ? pendingFilters.shops.filter((id: number) => id !== shopId) : [...pendingFilters.shops, shopId];
        updatePendingFilters({ shops: newShops });
    };

    // Toggle user selection in pending filters
    const toggleUser = (userId: number) => {
        const newUsers = pendingFilters.users.includes(userId) ? pendingFilters.users.filter((id: number) => id !== userId) : [...pendingFilters.users, userId];
        updatePendingFilters({ users: newUsers });
    };

    // Remove specific shop from applied filters
    const removeShop = (shopId: number) => {
        const newFilters = {
            ...currentFilters,
            shops: currentFilters.shops.filter((id: number) => id !== shopId),
        };
        onFilterChange(newFilters);
    };

    // Remove specific user from applied filters
    const removeUser = (userId: number) => {
        const newFilters = {
            ...currentFilters,
            users: currentFilters.users.filter((id: number) => id !== userId),
        };
        onFilterChange(newFilters);
    };

    // Apply pending filters
    const applyFilters = () => {
        onFilterChange(pendingFilters);
        setIsOpen(false);
    };

    // Clear all filters (both pending and applied)
    const clearAllFilters = () => {
        const clearedFilters = {
            shops: [],
            users: [],
            timeRange: 'all',
        };
        setPendingFilters(clearedFilters);
        onFilterChange(clearedFilters);
    };

    // Reset pending filters to current applied filters
    const resetPendingFilters = () => {
        setPendingFilters(currentFilters);
    };

    // Check if any filters are active
    const hasActiveFilters = currentFilters.shops.length > 0 || currentFilters.users.length > 0 || currentFilters.timeRange !== 'all';

    // Check if there are pending changes
    const hasPendingChanges = JSON.stringify(pendingFilters) !== JSON.stringify(currentFilters);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                if (hasPendingChanges) {
                    // Reset pending filters when clicking outside with unsaved changes
                    resetPendingFilters();
                }
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, hasPendingChanges, currentFilters]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                if (hasPendingChanges) {
                    resetPendingFilters();
                }
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, hasPendingChanges, currentFilters]);

    const getActiveFilterCount = () => {
        return currentFilters.shops.length + currentFilters.users.length + (currentFilters.timeRange !== 'all' ? 1 : 0);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Filter Button */}
            <div className="flex items-center gap-3 mb-4">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`btn bg-indigo-500 text-white flex items-center gap-2 transition-all duration-200 ${
                        hasActiveFilters ? 'btn-primary shadow-lg' : 'btn-outline-primary hover:btn-primary'
                    } ${isOpen ? 'ring-2 ring-primary/30' : ''}`}
                    disabled={isLoading}
                >
                    <IconSettings className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                    {t('filter_statistics')}
                    {hasActiveFilters && <span className="bg-white text-primary rounded-full px-2 py-1 text-xs font-bold ml-1 animate-pulse">{getActiveFilterCount()}</span>}
                    <IconCaretDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Clear All Button */}
                {hasActiveFilters && (
                    <button type="button" onClick={clearAllFilters} className="btn btn-outline-danger flex items-center gap-2 hover:scale-105 transition-transform duration-200">
                        <IconX className="w-4 h-4" />
                        {t('clear_all')}
                    </button>
                )}
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
                <div className="mb-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                            <IconSettings className="w-4 h-4" />
                            {t('active_filters')}:
                        </span>

                        {/* Selected Shops */}
                        {selectedShops.map((shop) => (
                            <span
                                key={`shop-${shop.id}`}
                                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs text-primary dark:bg-primary/20 border border-primary/20 hover:bg-primary/20 transition-colors duration-200"
                            >
                                {shop.logo_url && <img src={shop.logo_url} alt={shop.name} className="h-4 w-4 rounded-full object-cover" />}
                                <span className="max-w-[100px] truncate font-medium">{shop.name}</span>
                                <button
                                    type="button"
                                    onClick={() => removeShop(shop.id)}
                                    className="text-primary/70 hover:text-primary hover:bg-primary/20 rounded-full p-0.5 transition-all duration-200"
                                >
                                    <IconX className="h-3 w-3" />
                                </button>
                            </span>
                        ))}

                        {/* Selected Users */}
                        {selectedUsers.map((user) => (
                            <span
                                key={`user-${user.id}`}
                                className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1.5 text-xs text-success dark:bg-success/20 border border-success/20 hover:bg-success/20 transition-colors duration-200"
                            >
                                {user.logo_url && <img src={user.logo_url} alt={user.name} className="h-4 w-4 rounded-full object-cover" />}
                                <span className="max-w-[100px] truncate font-medium">{user.name}</span>
                                <button
                                    type="button"
                                    onClick={() => removeUser(user.id)}
                                    className="text-success/70 hover:text-success hover:bg-success/20 rounded-full p-0.5 transition-all duration-200"
                                >
                                    <IconX className="h-3 w-3" />
                                </button>
                            </span>
                        ))}

                        {/* Time Range */}
                        {currentFilters.timeRange !== 'all' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-3 py-1.5 text-xs text-info dark:bg-info/20 border border-info/20 hover:bg-info/20 transition-colors duration-200">
                                {timeRangeOptions.find((opt) => opt.value === currentFilters.timeRange)?.label}
                                <button
                                    type="button"
                                    onClick={() => onFilterChange({ ...currentFilters, timeRange: 'all' })}
                                    className="text-info/70 hover:text-info hover:bg-info/20 rounded-full p-0.5 transition-all duration-200"
                                >
                                    <IconX className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Filter Dropdown */}
            <div
                className={`absolute top-full left-0 rtl:left-auto rtl:right-0 z-50 mt-1 w-full max-w-4xl min-w-[700px] transition-all duration-300 ease-out transform ${
                    isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'
                }`}
            >
                <div className="rounded-lg border border-white-light bg-white shadow-2xl dark:border-white-dark dark:bg-black backdrop-blur-sm">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <IconSettings className="w-5 h-5 text-primary" />
                            {t('filter_statistics')}
                        </h3>
                        {hasPendingChanges && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-medium">{t('unsaved_changes') || 'Unsaved changes'}</span>}
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left Column */}
                            <div className="space-y-6">
                                {/* Shop Filter */}
                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('filter_by_shops')}</label>
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                className="form-input pl-10 pr-4 py-2 w-full transition-all duration-200 focus:ring-2 focus:ring-primary/30"
                                                placeholder={t('search_shops')}
                                                value={searchTerms.shops}
                                                onChange={(e) => setSearchTerms((prev) => ({ ...prev, shops: e.target.value }))}
                                            />
                                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        </div>
                                        <div className="max-h-56 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900">
                                            {filteredShops.length > 0 ? (
                                                filteredShops.map((shop) => (
                                                    <label
                                                        key={shop.id}
                                                        className="flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-gray-800 cursor-pointer transition-colors duration-200 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={pendingFilters.shops.includes(shop.id)}
                                                            onChange={() => toggleShop(shop.id)}
                                                            className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4"
                                                        />
                                                        {shop.logo_url && (
                                                            <img src={shop.logo_url} alt={shop.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-600" />
                                                        )}
                                                        <span className="text-sm font-medium">{shop.name}</span>
                                                    </label>
                                                ))
                                            ) : (
                                                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                                                    <IconSearch className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                    {t('no_shops_found')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Time Range Filter */}
                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('time_range')}</label>
                                    <select
                                        className="form-select w-full transition-all duration-200 focus:ring-2 focus:ring-primary/30"
                                        value={pendingFilters.timeRange}
                                        onChange={(e) => updatePendingFilters({ timeRange: e.target.value })}
                                    >
                                        {timeRangeOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-6">
                                {/* User Filter */}
                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('filter_by_users')}</label>
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                className="form-input pl-10 pr-4 py-2 w-full transition-all duration-200 focus:ring-2 focus:ring-primary/30"
                                                placeholder={t('search_users')}
                                                value={searchTerms.users}
                                                onChange={(e) => setSearchTerms((prev) => ({ ...prev, users: e.target.value }))}
                                            />
                                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        </div>
                                        <div className="max-h-56 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900">
                                            {filteredUsers.length > 0 ? (
                                                filteredUsers.map((user) => (
                                                    <label
                                                        key={user.id}
                                                        className="flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-gray-800 cursor-pointer transition-colors duration-200 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={pendingFilters.users.includes(user.id)}
                                                            onChange={() => toggleUser(user.id)}
                                                            className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4"
                                                        />
                                                        {user.logo_url && (
                                                            <img src={user.logo_url} alt={user.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-600" />
                                                        )}
                                                        <span className="text-sm font-medium">{user.name}</span>
                                                    </label>
                                                ))
                                            ) : (
                                                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                                                    <IconSearch className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                    {t('no_users_found')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filter Actions */}
                        <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200 dark:border-gray-600">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setPendingFilters({
                                            shops: [],
                                            users: [],
                                            timeRange: 'all',
                                        })
                                    }
                                    className="btn btn-outline-secondary hover:scale-105 transition-transform duration-200"
                                >
                                    <IconX className="w-4 h-4 mx-2" />
                                    {t('reset_filters') || 'Reset'}
                                </button>
                                {hasPendingChanges && (
                                    <button type="button" onClick={resetPendingFilters} className="btn btn-outline-warning hover:scale-105 transition-transform duration-200">
                                        {t('cancel_changes') || 'Cancel Changes'}
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <button type="button" onClick={() => setIsOpen(false)} className="btn btn-outline-secondary hover:scale-105 transition-transform duration-200">
                                    {t('close') || 'Close'}
                                </button>
                                <button
                                    type="button"
                                    onClick={applyFilters}
                                    disabled={!hasPendingChanges || isLoading}
                                    className={`btn btn-primary flex items-center gap-2 hover:scale-105 transition-all duration-200 ${
                                        !hasPendingChanges ? 'opacity-50 cursor-not-allowed' : 'shadow-lg hover:shadow-xl'
                                    }`}
                                >
                                    {isLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <IconSettings className="w-4 h-4" />}
                                    {t('apply_filters')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatisticsFilter;
