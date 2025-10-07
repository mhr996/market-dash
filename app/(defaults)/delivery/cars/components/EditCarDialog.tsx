'use client';
import React, { useState, useEffect } from 'react';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import supabase from '@/lib/supabase';
import IconX from '@/components/icon/icon-x';
import IconLink from '@/components/icon/icon-link';

interface DeliveryCar {
    id: number;
    plate_number: string;
    brand: string;
    model: string;
    color: string | null;
    capacity: number | null;
    car_number: string | null;
    car_model: string | null;
    delivery_drivers_id: number | null;
    created_at?: string;
    delivery_drivers?: {
        id: number;
        name: string;
        phone: string | null;
    };
}

interface EditCarDialogProps {
    isOpen: boolean;
    onClose: () => void;
    car: DeliveryCar | null;
    onSuccess: () => void;
}

const EditCarDialog: React.FC<EditCarDialogProps> = ({ isOpen, onClose, car, onSuccess }) => {
    const { t } = getTranslation();
    const [form, setForm] = useState({
        plate_number: '',
        brand: '',
        model: '',
        color: '',
        capacity: '',
        car_number: '',
        car_model: '',
    });
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        if (car) {
            setForm({
                plate_number: car.plate_number || '',
                brand: car.brand || '',
                model: car.model || '',
                color: car.color || '',
                capacity: car.capacity?.toString() || '',
                car_number: car.car_number || '',
                car_model: car.car_model || '',
            });
        }
    }, [car]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!car) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('delivery_cars')
                .update({
                    plate_number: form.plate_number,
                    brand: form.brand,
                    model: form.model,
                    color: form.color || null,
                    capacity: form.capacity ? parseInt(form.capacity) : null,
                    car_number: form.car_number || null,
                    car_model: form.car_model || null,
                })
                .eq('id', car.id);

            if (error) throw error;

            setAlert({ visible: true, message: t('car_updated_successfully'), type: 'success' });
            onSuccess();
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error: any) {
            setAlert({ visible: true, message: error.message || t('error_updating_car'), type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenFullEdit = () => {
        if (car) {
            window.open(`/delivery/cars/edit/${car.id}`, '_blank');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('edit_car')}</h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleOpenFullEdit}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                        >
                            <IconLink className="h-4 w-4 mr-1" />
                            {t('open_full_edit')}
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <IconX className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {alert.visible && (
                        <div className="mb-4">
                            <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="plate_number" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                {t('plate_number')} <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="plate_number"
                                name="plate_number"
                                type="text"
                                value={form.plate_number}
                                onChange={handleInputChange}
                                placeholder={t('enter_plate_number')}
                                required
                                className="form-input w-full"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="brand" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                    {t('brand')} <span className="text-red-500">*</span>
                                </label>
                                <input id="brand" name="brand" type="text" value={form.brand} onChange={handleInputChange} placeholder={t('enter_brand')} required className="form-input w-full" />
                            </div>
                            <div>
                                <label htmlFor="model" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                    {t('model')} <span className="text-red-500">*</span>
                                </label>
                                <input id="model" name="model" type="text" value={form.model} onChange={handleInputChange} placeholder={t('enter_model')} required className="form-input w-full" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="color" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                    {t('color')}
                                </label>
                                <input id="color" name="color" type="text" value={form.color} onChange={handleInputChange} placeholder={t('enter_color')} className="form-input w-full" />
                            </div>
                            <div>
                                <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                    {t('capacity')}
                                </label>
                                <input id="capacity" name="capacity" type="number" value={form.capacity} onChange={handleInputChange} placeholder={t('enter_capacity')} className="form-input w-full" />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="car_number" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                {t('car_number')}
                            </label>
                            <input
                                id="car_number"
                                name="car_number"
                                type="text"
                                value={form.car_number}
                                onChange={handleInputChange}
                                placeholder={t('enter_car_number')}
                                className="form-input w-full"
                            />
                        </div>

                        <div>
                            <label htmlFor="car_model" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                {t('car_model')}
                            </label>
                            <input id="car_model" name="car_model" type="text" value={form.car_model} onChange={handleInputChange} placeholder={t('enter_car_model')} className="form-input w-full" />
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <button type="button" onClick={onClose} disabled={loading} className="btn btn-outline-danger">
                                {t('cancel')}
                            </button>
                            <button type="submit" disabled={loading} className="btn btn-primary">
                                {loading ? t('saving') : t('save_changes')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditCarDialog;
