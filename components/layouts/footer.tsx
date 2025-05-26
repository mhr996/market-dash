'use client';
import { getTranslation } from '@/i18n';

const Footer = () => {
    const { t } = getTranslation();
    return (
        <div className="p-6 pt-0 mt-auto text-center dark:text-white-dark ltr:sm:text-left rtl:sm:text-right">
            © {new Date().getFullYear()}. {t('copyright_text')}
        </div>
    );
};

export default Footer;
