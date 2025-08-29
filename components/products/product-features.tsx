import React, { useState } from 'react';
import IconPlus from '@/components/icon/icon-plus';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import { getTranslation } from '@/i18n';

interface Feature {
    label: string;
    value: string;
}

interface ProductFeaturesProps {
    features: Feature[];
    onChange: (features: Feature[]) => void;
    disabled?: boolean;
}

const ProductFeatures: React.FC<ProductFeaturesProps> = ({ features, onChange, disabled = false }) => {
    const { t } = getTranslation();

    const addFeature = () => {
        const newFeatures = [...features, { label: '', value: '' }];
        onChange(newFeatures);
    };

    const removeFeature = (index: number) => {
        const newFeatures = features.filter((_, i) => i !== index);
        onChange(newFeatures);
    };

    const updateFeature = (index: number, field: 'label' | 'value', value: string) => {
        const newFeatures = features.map((feature, i) => (i === index ? { ...feature, [field]: value } : feature));
        onChange(newFeatures);
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t('product_features')}</h3>
                <button type="button" onClick={addFeature} disabled={disabled} className="btn btn-primary btn-sm gap-2">
                    <IconPlus className="w-4 h-4" />
                    {t('add_feature')}
                </button>
            </div>

            {features.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="mb-4">
                        <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                    </div>
                    <p className="text-sm">{t('no_features_added')}</p>
                    <p className="text-xs mt-1">{t('click_add_feature_to_start')}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {features.map((feature, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                            <div>
                                <label htmlFor={`feature-label-${index}`} className="block text-sm font-medium mb-2">
                                    {t('feature_label')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id={`feature-label-${index}`}
                                    type="text"
                                    className="form-input"
                                    placeholder={t('feature_label_placeholder')}
                                    value={feature.label}
                                    onChange={(e) => updateFeature(index, 'label', e.target.value)}
                                    disabled={disabled}
                                />
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label htmlFor={`feature-value-${index}`} className="block text-sm font-medium mb-2">
                                        {t('feature_value')} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id={`feature-value-${index}`}
                                        type="text"
                                        className="form-input"
                                        placeholder={t('feature_value_placeholder')}
                                        value={feature.value}
                                        onChange={(e) => updateFeature(index, 'value', e.target.value)}
                                        disabled={disabled}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button type="button" onClick={() => removeFeature(index)} disabled={disabled} className="btn btn-outline-danger p-2" title={t('remove_feature')}>
                                        <IconTrashLines className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {features.length > 0 && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    <p>{t('features_help_text')}</p>
                </div>
            )}
        </div>
    );
};

export default ProductFeatures;
