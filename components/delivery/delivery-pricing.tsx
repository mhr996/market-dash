import React, { useState } from 'react';
import IconPlus from '@/components/icon/icon-plus';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import { getTranslation } from '@/i18n';

interface DeliveryMethod {
    id?: number;
    label: string;
    delivery_time: string;
    price: number;
    is_active: boolean;
    location_prices?: DeliveryLocationPrice[];
}

interface DeliveryLocationPrice {
    id?: number;
    location_name: string;
    price_addition: number;
    is_active: boolean;
}

interface DeliveryPricingProps {
    methods: DeliveryMethod[];
    onChange: (methods: DeliveryMethod[]) => void;
    disabled?: boolean;
}

const DeliveryPricing: React.FC<DeliveryPricingProps> = ({ methods, onChange, disabled = false }) => {
    const { t } = getTranslation();

    const addMethod = () => {
        const newMethods = [
            ...methods,
            {
                label: '',
                delivery_time: '',
                price: 0,
                is_active: true,
                location_prices: [],
            },
        ];
        onChange(newMethods);
    };

    const removeMethod = (index: number) => {
        const newMethods = methods.filter((_, i) => i !== index);
        onChange(newMethods);
    };

    const updateMethod = (index: number, field: keyof DeliveryMethod, value: any) => {
        const newMethods = methods.map((method, i) => (i === index ? { ...method, [field]: value } : method));
        onChange(newMethods);
    };

    const addLocationPrice = (methodIndex: number) => {
        const newMethods = methods.map((method, i) =>
            i === methodIndex
                ? {
                      ...method,
                      location_prices: [
                          ...(method.location_prices || []),
                          {
                              location_name: '',
                              price_addition: 0,
                              is_active: true,
                          },
                      ],
                  }
                : method,
        );
        onChange(newMethods);
    };

    const removeLocationPrice = (methodIndex: number, locationIndex: number) => {
        const newMethods = methods.map((method, i) =>
            i === methodIndex
                ? {
                      ...method,
                      location_prices: method.location_prices?.filter((_, j) => j !== locationIndex) || [],
                  }
                : method,
        );
        onChange(newMethods);
    };

    const updateLocationPrice = (methodIndex: number, locationIndex: number, field: keyof DeliveryLocationPrice, value: any) => {
        const newMethods = methods.map((method, i) =>
            i === methodIndex
                ? {
                      ...method,
                      location_prices: method.location_prices?.map((loc, j) => (j === locationIndex ? { ...loc, [field]: value } : loc)) || [],
                  }
                : method,
        );
        onChange(newMethods);
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Delivery Methods & Pricing</h3>
                <button type="button" onClick={addMethod} disabled={disabled} className="btn btn-primary btn-sm gap-2">
                    <IconPlus className="w-4 h-4" />
                    Add Method
                </button>
            </div>

            {methods.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="mb-4">
                        <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <p className="text-sm">No delivery methods added</p>
                    <p className="text-xs mt-1">Click "Add Method" to start</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {methods.map((method, methodIndex) => (
                        <div key={methodIndex} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300">Method #{methodIndex + 1}</h4>
                                <button type="button" onClick={() => removeMethod(methodIndex)} disabled={disabled} className="btn btn-outline-danger p-2" title="Remove Method">
                                    <IconTrashLines className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Method Details */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1">Method Label</label>
                                    <input
                                        type="text"
                                        className="form-input text-sm"
                                        placeholder="e.g., Fast, Express, Standard"
                                        value={method.label}
                                        onChange={(e) => updateMethod(methodIndex, 'label', e.target.value)}
                                        disabled={disabled}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Delivery Time</label>
                                    <input
                                        type="text"
                                        className="form-input text-sm"
                                        placeholder="e.g., Same Day, 2-3 Days"
                                        value={method.delivery_time}
                                        onChange={(e) => updateMethod(methodIndex, 'delivery_time', e.target.value)}
                                        disabled={disabled}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Base Price ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="form-input text-sm"
                                        placeholder="0.00"
                                        value={method.price}
                                        onChange={(e) => updateMethod(methodIndex, 'price', parseFloat(e.target.value) || 0)}
                                        disabled={disabled}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox"
                                            checked={method.is_active}
                                            onChange={(e) => updateMethod(methodIndex, 'is_active', e.target.checked)}
                                            disabled={disabled}
                                        />
                                        <span className="ml-2 text-sm">Active</span>
                                    </label>
                                </div>
                            </div>

                            {/* Location-based Pricing */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Location-based Pricing</h5>
                                    <button type="button" onClick={() => addLocationPrice(methodIndex)} disabled={disabled} className="btn btn-primary btn-sm gap-1">
                                        <IconPlus className="w-3 h-3" />
                                        Add Location
                                    </button>
                                </div>

                                {method.location_prices && method.location_prices.length > 0 ? (
                                    <div className="space-y-2">
                                        {method.location_prices.map((location, locationIndex) => (
                                            <div key={locationIndex} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-white dark:bg-gray-900 rounded border">
                                                <div>
                                                    <label className="block text-xs font-medium mb-1">Location Name</label>
                                                    <input
                                                        type="text"
                                                        className="form-input text-sm"
                                                        placeholder="e.g., Downtown, Suburbs"
                                                        value={location.location_name}
                                                        onChange={(e) => updateLocationPrice(methodIndex, locationIndex, 'location_name', e.target.value)}
                                                        disabled={disabled}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium mb-1">Price Addition ($)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="form-input text-sm"
                                                        placeholder="0.00"
                                                        value={location.price_addition}
                                                        onChange={(e) => updateLocationPrice(methodIndex, locationIndex, 'price_addition', parseFloat(e.target.value) || 0)}
                                                        disabled={disabled}
                                                    />
                                                </div>
                                                <div className="flex items-end">
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            className="form-checkbox"
                                                            checked={location.is_active}
                                                            onChange={(e) => updateLocationPrice(methodIndex, locationIndex, 'is_active', e.target.checked)}
                                                            disabled={disabled}
                                                        />
                                                        <span className="ml-2 text-sm">Active</span>
                                                    </label>
                                                </div>
                                                <div className="flex items-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeLocationPrice(methodIndex, locationIndex)}
                                                        disabled={disabled}
                                                        className="btn btn-outline-danger btn-sm p-2"
                                                        title="Remove Location"
                                                    >
                                                        <IconTrashLines className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">No location-specific pricing added</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {methods.length > 0 && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    <p>
                        💡 <strong>Tip:</strong> Base price applies to all locations. Location prices add extra cost for specific areas.
                    </p>
                </div>
            )}
        </div>
    );
};

export default DeliveryPricing;
