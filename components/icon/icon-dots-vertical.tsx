import { FC } from 'react';

interface IconDotsVerticalProps {
    className?: string;
}

const IconDotsVertical: FC<IconDotsVerticalProps> = ({ className }) => {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" />
            <circle opacity="0.5" cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="12" cy="19" r="2" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    );
};

export default IconDotsVertical;
