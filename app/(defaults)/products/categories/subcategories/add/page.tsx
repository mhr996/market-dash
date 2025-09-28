'use client';
import SubCategoryForm from '@/components/subcategories/subcategory-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getTranslation } from '@/i18n';

const AddSubCategoryPage = () => {
    const router = useRouter();
    const { t } = getTranslation();

    return (
        <div className="container mx-auto p-6 w-full max-w-none">
            <div className="flex items-center gap-5 mb-6">
                <div onClick={() => router.back()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </div>
                <ul className="flex space-x-2 rtl:space-x-reverse mb-4">
                    <li>
                        <Link href="/" className="text-primary hover:underline">
                            {t('home')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <Link href="/categories/subcategories" className="text-primary hover:underline">
                            {t('sub_categories')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>{t('add_new_subcategory')}</span>
                    </li>
                </ul>
            </div>

            <div className="mb-6">
                <h1 className="text-2xl font-bold">{t('add_new_subcategory')}</h1>
                <p className="text-gray-500">{t('create_subcategory_listing')}</p>
            </div>

            <SubCategoryForm />
        </div>
    );
};

export default AddSubCategoryPage;
