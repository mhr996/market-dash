'use client';
import ProductForm from '@/components/products/product-form';

const AddProductPage = () => {
    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Add New Product</h1>
                <p className="text-gray-500">Create a new product listing</p>
            </div>
            <ProductForm />
        </div>
    );
};

export default AddProductPage;
