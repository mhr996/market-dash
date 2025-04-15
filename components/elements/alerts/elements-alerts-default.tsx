import IconX from '@/components/icon/icon-x';
import PanelCodeHighlight from '@/components/panel-code-highlight';
import React, { useEffect } from 'react';

interface AlertProps {
    type: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
    message: string;
    title?: string;
    onClose?: () => void;
}

const Alert: React.FC<AlertProps> = ({ type, message, title, onClose }) => {
    const alertClasses = {
        primary: 'bg-primary-light text-primary dark:bg-primary-dark-light',
        secondary: 'bg-secondary-light text-secondary dark:bg-secondary-dark-light',
        success: 'bg-success-light text-success dark:bg-success-dark-light',
        warning: 'bg-warning-light text-warning dark:bg-warning-dark-light',
        danger: 'bg-danger-light text-danger dark:bg-danger-dark-light',
        info: 'bg-info-light text-info dark:bg-info-dark-light',
    };

    useEffect(() => {
        if (onClose) {
            const timer = setTimeout(() => {
                onClose();
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [onClose]);

    return (
        <div className={`flex items-center rounded p-3.5 mb-4 animate-fade-in ${alertClasses[type]}`}>
            <span className="ltr:pr-2 rtl:pl-2">
                {title && <strong className="ltr:mr-1 rtl:ml-1">{title}!</strong>}
                {message}
            </span>
            {onClose && (
                <button type="button" className="hover:opacity-80 ltr:ml-auto rtl:mr-auto" onClick={onClose}>
                    <IconX className="h-5 w-5" />
                </button>
            )}
        </div>
    );
};

const ElementsAlertsDefault = () => {
    // Example usage within the component
    return (
        <PanelCodeHighlight title="Default Alerts" codeHighlight={`<Alert type="primary" title="Primary" message="Lorem Ipsum is simply dummy text of the printing." />`}>
            <div className="mb-5 grid gap-5 lg:grid-cols-2">
                <Alert type="primary" title="Primary" message="Lorem Ipsum is simply dummy text of the printing." onClose={() => console.log('closed')} />
                <Alert type="secondary" title="Secondary" message="Lorem Ipsum is simply dummy text of the printing." onClose={() => console.log('closed')} />
                <Alert type="success" title="Success" message="Lorem Ipsum is simply dummy text of the printing." onClose={() => console.log('closed')} />
                <Alert type="warning" title="Warning" message="Lorem Ipsum is simply dummy text of the printing." onClose={() => console.log('closed')} />
                <Alert type="danger" title="Danger" message="Lorem Ipsum is simply dummy text of the printing." onClose={() => console.log('closed')} />
                <Alert type="info" title="Info" message="Lorem Ipsum is simply dummy text of the printing." onClose={() => console.log('closed')} />
            </div>
        </PanelCodeHighlight>
    );
};

export default ElementsAlertsDefault;
export { Alert };
