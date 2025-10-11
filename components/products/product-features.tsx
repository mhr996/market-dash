import React, { useState, useRef } from 'react';
import IconPlus from '@/components/icon/icon-plus';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconCamera from '@/components/icon/icon-camera';
import { getTranslation } from '@/i18n';
import supabase from '@/lib/supabase';

interface FeatureLabel {
    id?: number;
    label: string;
    values: FeatureValue[];
}

interface FeatureValue {
    id?: number;
    value: string;
    price_addition: number;
    image?: string | null;
    options?: FeatureValueOption[];
}

interface FeatureValueOption {
    id?: number;
    option_name: string;
    image?: string | null;
    is_active?: boolean;
}

interface ProductFeaturesProps {
    features: FeatureLabel[];
    onChange: (features: FeatureLabel[]) => void;
    disabled?: boolean;
}

const ProductFeatures: React.FC<ProductFeaturesProps> = ({ features, onChange, disabled = false }) => {
    const { t } = getTranslation();
    const [uploadingImages, setUploadingImages] = useState<Set<string>>(new Set());
    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

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

    const updateFeatureValue = (featureIndex: number, valueIndex: number, field: 'value' | 'price_addition' | 'image', value: string | number | null) => {
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

    // Image upload functions
    const uploadImage = async (file: File, bucket: string): Promise<string | null> => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${bucket}/${fileName}`;

            const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);

            if (uploadError) {
                return null;
            }

            const {
                data: { publicUrl },
            } = supabase.storage.from(bucket).getPublicUrl(filePath);
            return publicUrl;
        } catch (error) {
            return null;
        }
    };

    const handleImageUpload = async (file: File, featureIndex: number, valueIndex: number, type: 'value' | 'option', optionIndex?: number) => {
        const uploadKey = `${featureIndex}-${valueIndex}-${type}${optionIndex !== undefined ? `-${optionIndex}` : ''}`;
        setUploadingImages((prev) => new Set(prev).add(uploadKey));

        try {
            const bucket = type === 'value' ? 'feature-value-images' : 'feature-value-options-images';
            const imageUrl = await uploadImage(file, bucket);

            if (imageUrl) {
                if (type === 'value') {
                    updateFeatureValue(featureIndex, valueIndex, 'image', imageUrl);
                } else if (optionIndex !== undefined) {
                    updateFeatureValueOption(featureIndex, valueIndex, optionIndex, 'image', imageUrl);
                }
            }
        } finally {
            setUploadingImages((prev) => {
                const newSet = new Set(prev);
                newSet.delete(uploadKey);
                return newSet;
            });
        }
    };

    // Options management functions
    const addFeatureValueOption = (featureIndex: number, valueIndex: number) => {
        const newFeatures = features.map((feature, i) =>
            i === featureIndex
                ? {
                      ...feature,
                      values: feature.values.map((val, j) =>
                          j === valueIndex
                              ? {
                                    ...val,
                                    options: [...(val.options || []), { option_name: '', is_active: true }],
                                }
                              : val,
                      ),
                  }
                : feature,
        );
        onChange(newFeatures);
    };

    const removeFeatureValueOption = (featureIndex: number, valueIndex: number, optionIndex: number) => {
        const newFeatures = features.map((feature, i) =>
            i === featureIndex
                ? {
                      ...feature,
                      values: feature.values.map((val, j) =>
                          j === valueIndex
                              ? {
                                    ...val,
                                    options: val.options?.filter((_, k) => k !== optionIndex) || [],
                                }
                              : val,
                      ),
                  }
                : feature,
        );
        onChange(newFeatures);
    };

    const updateFeatureValueOption = (featureIndex: number, valueIndex: number, optionIndex: number, field: 'option_name' | 'image', value: string | null) => {
        const newFeatures = features.map((feature, i) =>
            i === featureIndex
                ? {
                      ...feature,
                      values: feature.values.map((val, j) =>
                          j === valueIndex
                              ? {
                                    ...val,
                                    options: val.options?.map((opt, k) => (k === optionIndex ? { ...opt, [field]: value } : opt)) || [],
                                }
                              : val,
                      ),
                  }
                : feature,
        );
        onChange(newFeatures);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Product Features</h3>
                <button type="button" onClick={addFeature} disabled={disabled} className="btn btn-primary">
                    <IconPlus className="w-4 h-4 mr-2" />
                    Add Feature
                </button>
            </div>

            {features.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <div className="mb-4">
                        <svg className="w-20 h-20 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                    </div>
                    <p className="text-lg font-medium mb-2">No features added yet</p>
                    <p className="text-sm">Click "Add Feature" to start creating product features</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                            {/* Feature Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex-1">
                                    <label className="block text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Feature {featureIndex + 1}</label>
                                    <input
                                        type="text"
                                        className="form-input text-lg"
                                        placeholder="e.g., Topping, Size, Color"
                                        value={feature.label}
                                        onChange={(e) => updateFeatureLabel(featureIndex, e.target.value)}
                                        disabled={disabled}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeFeature(featureIndex)}
                                    disabled={disabled}
                                    className="ml-4 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                    title="Remove Feature"
                                >
                                    <IconTrashLines className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Values Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300">Values</h4>
                                    <button type="button" onClick={() => addFeatureValue(featureIndex)} disabled={disabled} className="btn btn-primary">
                                        <IconPlus className="w-4 h-4 mr-2" />
                                        Add Value
                                    </button>
                                </div>

                                {feature.values.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                        <p>No values added yet. Click "Add Value" to start.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {feature.values.map((value, valueIndex) => (
                                            <div key={valueIndex} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                                {/* Value Header */}
                                                <div className="flex items-center justify-between mb-3">
                                                    <h5 className="font-medium text-gray-800 dark:text-gray-200">Value {valueIndex + 1}</h5>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFeatureValue(featureIndex, valueIndex)}
                                                        disabled={disabled}
                                                        className="text-red-500 hover:text-red-700 p-1"
                                                        title="Remove Value"
                                                    >
                                                        <IconTrashLines className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                {/* Value Inputs */}
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            placeholder="e.g., Tomato, Large, Red"
                                                            value={value.value}
                                                            onChange={(e) => updateFeatureValue(featureIndex, valueIndex, 'value', e.target.value)}
                                                            disabled={disabled}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price Addition ($)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            className="form-input"
                                                            placeholder="0.00"
                                                            value={value.price_addition}
                                                            onChange={(e) => updateFeatureValue(featureIndex, valueIndex, 'price_addition', parseFloat(e.target.value) || 0)}
                                                            disabled={disabled}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Value Image */}
                                                <div className="mt-3">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Image</label>
                                                    {value.image ? (
                                                        <div className="flex items-center gap-3">
                                                            <img src={value.image} alt={value.value} className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-600" />
                                                            <button
                                                                type="button"
                                                                onClick={() => updateFeatureValue(featureIndex, valueIndex, 'image', null)}
                                                                disabled={disabled}
                                                                className="btn btn-outline-danger btn-sm"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                ref={(el) => {
                                                                    fileInputRefs.current[`value-${featureIndex}-${valueIndex}`] = el;
                                                                }}
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) handleImageUpload(file, featureIndex, valueIndex, 'value');
                                                                }}
                                                                disabled={disabled}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => fileInputRefs.current[`value-${featureIndex}-${valueIndex}`]?.click()}
                                                                disabled={disabled || uploadingImages.has(`${featureIndex}-${valueIndex}-value`)}
                                                                className="btn btn-outline-primary btn-sm"
                                                            >
                                                                <IconCamera className="w-4 h-4 mr-1" />
                                                                {uploadingImages.has(`${featureIndex}-${valueIndex}-value`) ? 'Uploading...' : 'Upload'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Options Section */}
                                                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300">Options</h6>
                                                        <button type="button" onClick={() => addFeatureValueOption(featureIndex, valueIndex)} disabled={disabled} className="btn btn-primary btn-sm">
                                                            <IconPlus className="w-3 h-3 mr-1" />
                                                            Add
                                                        </button>
                                                    </div>

                                                    {value.options && value.options.length > 0 ? (
                                                        <div className="space-y-3">
                                                            {value.options.map((option, optionIndex) => (
                                                                <div key={optionIndex} className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-600 p-3">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <input
                                                                            type="text"
                                                                            className="form-input text-sm flex-1"
                                                                            placeholder="Option name"
                                                                            value={option.option_name}
                                                                            onChange={(e) => updateFeatureValueOption(featureIndex, valueIndex, optionIndex, 'option_name', e.target.value)}
                                                                            disabled={disabled}
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeFeatureValueOption(featureIndex, valueIndex, optionIndex)}
                                                                            disabled={disabled}
                                                                            className="text-red-500 hover:text-red-700 p-1"
                                                                            title="Remove Option"
                                                                        >
                                                                            <IconTrashLines className="w-3 h-3" />
                                                                        </button>
                                                                    </div>

                                                                    {/* Option Image */}
                                                                    <div className="mt-2">
                                                                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Option Image</label>
                                                                        {option.image ? (
                                                                            <div className="flex items-center gap-2">
                                                                                <img
                                                                                    src={option.image}
                                                                                    alt={option.option_name}
                                                                                    className="w-8 h-8 rounded object-cover border border-gray-200 dark:border-gray-600"
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => updateFeatureValueOption(featureIndex, valueIndex, optionIndex, 'image', null)}
                                                                                    disabled={disabled}
                                                                                    className="btn btn-outline-danger btn-xs"
                                                                                >
                                                                                    Remove
                                                                                </button>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex items-center gap-2">
                                                                                <input
                                                                                    ref={(el) => {
                                                                                        fileInputRefs.current[`option-${featureIndex}-${valueIndex}-${optionIndex}`] = el;
                                                                                    }}
                                                                                    type="file"
                                                                                    accept="image/*"
                                                                                    className="hidden"
                                                                                    onChange={(e) => {
                                                                                        const file = e.target.files?.[0];
                                                                                        if (file) handleImageUpload(file, featureIndex, valueIndex, 'option', optionIndex);
                                                                                    }}
                                                                                    disabled={disabled}
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => fileInputRefs.current[`option-${featureIndex}-${valueIndex}-${optionIndex}`]?.click()}
                                                                                    disabled={disabled || uploadingImages.has(`${featureIndex}-${valueIndex}-option-${optionIndex}`)}
                                                                                    className="btn btn-outline-primary btn-xs"
                                                                                >
                                                                                    <IconCamera className="w-3 h-3 mr-1" />
                                                                                    {uploadingImages.has(`${featureIndex}-${valueIndex}-option-${optionIndex}`) ? 'Uploading...' : 'Upload'}
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">No options yet. Click "Add" to create variations.</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProductFeatures;
