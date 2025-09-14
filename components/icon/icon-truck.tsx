import { FC } from 'react';

interface IconTruckProps {
    className?: string;
}

const IconTruck: FC<IconTruckProps> = ({ className = '', ...others }) => {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...others}>
            <path
                d="M1 3H15L17 5H22L23 8V16H21C21 17.1046 20.1046 18 19 18C17.8954 18 17 17.1046 17 16H7C7 17.1046 6.10457 18 5 18C3.89543 18 3 17.1046 3 16H1V3Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M5 18C6.10457 18 7 17.1046 7 16C7 14.8954 6.10457 14 5 14C3.89543 14 3 14.8954 3 16C3 17.1046 3.89543 18 5 18Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M19 18C20.1046 18 21 17.1046 21 16C21 14.8954 20.1046 14 19 14C17.8954 14 17 14.8954 17 16C17 17.1046 17.8954 18 19 18Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

export default IconTruck;
