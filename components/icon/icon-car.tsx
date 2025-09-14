import { FC } from 'react';

interface IconCarProps {
    className?: string;
}

const IconCar: FC<IconCarProps> = ({ className = '', ...others }) => {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...others}>
            <path
                d="M7 17C8.10457 17 9 16.1046 9 15C9 13.8954 8.10457 13 7 13C5.89543 13 5 13.8954 5 15C5 16.1046 5.89543 17 7 17Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M17 17C18.1046 17 19 16.1046 19 15C19 13.8954 18.1046 13 17 13C15.8954 13 15 13.8954 15 15C15 16.1046 15.8954 17 17 17Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M5 15H3L2 12H4L5 15Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M19 15H21L22 12H20L19 15Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 12H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
};

export default IconCar;
