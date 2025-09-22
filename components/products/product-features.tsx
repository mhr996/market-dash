import React, { useState } from 'react';
import IconPlus from '@/components/icon/icon-plus';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import { getTranslation } from '@/i18n';

interface FeatureLabel {
    id?: number;
    label: string;
    values: FeatureValue[];
}

interface FeatureValue {
    id?: number;
    value: string;
    price_addition: number;
}

interface ProductFeaturesProps {
    features: FeatureLabel[];
    onChange: (features: FeatureLabel[]) => void;
    disabled?: boolean;
}

const ProductFeatures: React.FC<ProductFeaturesProps> = ({ features, onChange, disabled = false }) => {
    const { t } = getTranslation();

    const addFeature = () => {
        const newFeatures = [...features, { label: '', values: [{ value: '', price_addition: 0 }] }];
        onChange(newFeatures);
    };

    const removeFeature = (index: number) => {
        const newFeatures = features.filter((_, i) => i !== index);
        onChange(newFeatures);
    };

    const updateFeatureLabel = (index: number, value: string) => {
        const newFeatures = features.map((feature, i) => (i === index ? { ...feature, label: value } : feature));
        onChange(newFeatures);
    };

    const addFeatureValue = (featureIndex: number) => {
        const newFeatures = features.map((feature, i) => (i === featureIndex ? { ...feature, values: [...feature.values, { value: '', price_addition: 0 }] } : feature));
        onChange(newFeatures);
    };

    const removeFeatureValue = (featureIndex: number, valueIndex: number) => {
        const newFeatures = features.map((feature, i) => (i === featureIndex ? { ...feature, values: feature.values.filter((_, j) => j !== valueIndex) } : feature));
        onChange(newFeatures);
    };

    const updateFeatureValue = (featureIndex: number, valueIndex: number, field: 'value' | 'price_addition', value: string | number) => {
        const newFeatures = features.map((feature, i) =>
            i === featureIndex
                ? {
                      ...feature,
                      values: feature.values.map((val, j) => (j === valueIndex ? { ...val, [field]: value } : val)),
                  }
                : feature,
        );
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
                <div className="space-y-6">
                    {features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex-1 mr-4">
                                    <label htmlFor={`feature-label-${featureIndex}`} className="block text-sm font-medium mb-2">
                                        {t('feature_label')} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id={`feature-label-${featureIndex}`}
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g., Storage, Color, Size"
                                        value={feature.label}
                                        onChange={(e) => updateFeatureLabel(featureIndex, e.target.value)}
                                        disabled={disabled}
                                    />
                                </div>
                                <button type="button" onClick={() => removeFeature(featureIndex)} disabled={disabled} className="btn btn-outline-danger p-2" title={t('remove_feature')}>
                                    <IconTrashLines className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Values</h4>
                                    <button type="button" onClick={() => addFeatureValue(featureIndex)} disabled={disabled} className="btn btn-primary btn-sm gap-1">
                                        <IconPlus className="w-3 h-3" />
                                        Add Value
                                    </button>
                                </div>

                                {feature.values.map((value, valueIndex) => (
                                    <div key={valueIndex} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-white dark:bg-gray-900 rounded border">
                                        <div>
                                            <label className="block text-xs font-medium mb-1">Value</label>
                                            <input
                                                type="text"
                                                className="form-input text-sm"
                                                placeholder="e.g., 64GB, Red, Large"
                                                value={value.value}
                                                onChange={(e) => updateFeatureValue(featureIndex, valueIndex, 'value', e.target.value)}
                                                disabled={disabled}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">Price Addition ($)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className="form-input text-sm"
                                                placeholder="0.00"
                                                value={value.price_addition}
                                                onChange={(e) => updateFeatureValue(featureIndex, valueIndex, 'price_addition', parseFloat(e.target.value) || 0)}
                                                disabled={disabled}
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                type="button"
                                                onClick={() => removeFeatureValue(featureIndex, valueIndex)}
                                                disabled={disabled}
                                                className="btn btn-outline-danger btn-sm p-2"
                                                title="Remove Value"
                                            >
                                                <IconTrashLines className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
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
