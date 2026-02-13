import type { ComponentChildren } from 'preact';
import { X } from 'lucide-preact';
import { useEffect } from 'preact/hooks';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ComponentChildren;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                class="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in active:animate-out fade-out"
                onClick={onClose}
            />

            {/* Content */}
            <div class="relative w-full max-w-lg bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl animate-in zoom-in-95 active:animate-out zoom-out-95">
                <div class="flex items-center justify-between p-6 border-b border-[var(--border)]">
                    <h3 class="text-lg font-semibold text-white">{title}</h3>
                    <button
                        onClick={onClose}
                        class="text-zinc-400 hover:text-white transition-colors"
                    >
                        <X class="w-5 h-5" />
                    </button>
                </div>

                <div class="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}
