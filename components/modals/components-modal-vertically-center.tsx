'use client';
import IconX from '@/components/icon/icon-x';
import PanelCodeHighlight from '@/components/panel-code-highlight';
import { Transition, Dialog, DialogPanel, TransitionChild } from '@headlessui/react';
import React, { Fragment, useState } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

const VerticallyCenter = ({ isOpen, onClose, title, children, actions, size = 'lg' }: ModalProps) => {
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" open={isOpen} onClose={onClose}>
                <TransitionChild as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0" />
                </TransitionChild>
                <div className="fixed inset-0 z-[999] overflow-y-auto bg-[black]/60">
                    <div className="flex min-h-screen items-center justify-center px-4">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <DialogPanel
                                as="div"
                                className={`panel my-8 w-full ${sizeClasses[size]} overflow-hidden rounded-lg border-0 p-0 text-black dark:text-white`}
                            >
                                <div className="flex items-center justify-between bg-[#fbfbfb] px-5 py-3 dark:bg-[#121c2c]">
                                    <h5 className="text-lg font-bold">{title}</h5>
                                    <button type="button" className="text-white-dark hover:text-dark" onClick={onClose}>
                                        <IconX />
                                    </button>
                                </div>
                                <div className="p-5">
                                    {children}
                                    {actions && <div className="mt-8 flex items-center justify-end">{actions}</div>}
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

// Example usage component
const ComponentsModalVerticallyCenter = () => {
    const [modal2, setModal2] = useState(false);

    const modalActions = (
        <>
            <button type="button" className="btn btn-outline-danger" onClick={() => setModal2(false)}>
                Discard
            </button>
            <button type="button" className="btn btn-primary ltr:ml-4 rtl:mr-4" onClick={() => setModal2(false)}>
                Save
            </button>
        </>
    );

    return (
        <PanelCodeHighlight title="Vertically Centered">
            <div className="mb-5">
                <div className="flex items-center justify-center">
                    <button type="button" onClick={() => setModal2(true)} className="btn btn-info">
                        Launch modal
                    </button>
                </div>

                <VerticallyCenter isOpen={modal2} onClose={() => setModal2(false)} title="Modal Title" actions={modalActions}>
                    <p>
                        Mauris mi tellus, pharetra vel mattis sed, tempus ultrices eros. Phasellus egestas sit amet velit sed luctus. Orci varius natoque penatibus et magnis dis parturient montes,
                        nascetur ridiculus mus. Suspendisse potenti. Vivamus ultrices sed urna ac pulvinar. Ut sit amet ullamcorper mi.
                    </p>
                </VerticallyCenter>
            </div>
        </PanelCodeHighlight>
    );
};

export default ComponentsModalVerticallyCenter;
export { VerticallyCenter };
