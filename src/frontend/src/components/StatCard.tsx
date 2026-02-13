import type { ComponentChildren } from 'preact';
import { cn } from '../lib/utils';

type AccentColor = 'orange' | 'green' | 'purple' | 'blue';

interface StatCardProps {
    icon: ComponentChildren;
    value: number | string;
    title: string;
    description: string;
    accent?: AccentColor;
}

const accentStyles: Record<AccentColor, { bg: string; icon: string; border: string }> = {
    orange: {
        bg: 'bg-orange-50',
        icon: 'text-orange-500',
        border: 'border-orange-100'
    },
    green: {
        bg: 'bg-emerald-50',
        icon: 'text-emerald-500',
        border: 'border-emerald-100'
    },
    purple: {
        bg: 'bg-purple-50',
        icon: 'text-purple-500',
        border: 'border-purple-100'
    },
    blue: {
        bg: 'bg-blue-50',
        icon: 'text-blue-500',
        border: 'border-blue-100'
    }
};

export function StatCard({ icon, value, title, description, accent = 'blue' }: StatCardProps) {
    const styles = accentStyles[accent];

    return (
        <div class={cn(
            "bg-white rounded-xl p-6 border",
            styles.border
        )}>
            <div class={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center mb-4",
                styles.bg,
                styles.icon
            )}>
                {icon}
            </div>
            <div class="text-4xl font-bold text-gray-900 mb-1">
                {value}
            </div>
            <div class="text-sm font-medium text-gray-900 mb-0.5">
                {title}
            </div>
            <div class="text-xs text-gray-500">
                {description}
            </div>
        </div>
    );
}
