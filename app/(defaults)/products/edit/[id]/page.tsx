'use client';
import ProductForm from '@/components/products/product-form';

interface EditProductPageProps {
    params: {
        id: string;
    };
}

const EditProductPage = ({ params }: EditProductPageProps) => {
    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Edit Product</h1>
                <p className="text-gray-500">Update your product information</p>
            </div>
            <ProductForm productId={params.id} />
        </div>
    );
};

export default EditProductPage;
