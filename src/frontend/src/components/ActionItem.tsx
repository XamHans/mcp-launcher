import type { ComponentChildren } from 'preact';
import { ArrowRight } from 'lucide-preact';
import { cn } from '../lib/utils';

type Priority = 'high' | 'medium' | 'low';
type Status = 'to_deploy' | 'in_progress' | 'review' | 'done';

interface ActionItemProps {
    icon?: ComponentChildren;
    priority?: Priority;
    title: string;
    status?: Status;
    onClick?: () => void;
}

const priorityColors: Record<Priority, string> = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500'
};

const statusLabels: Record<Status, { label: string; className: string }> = {
    to_deploy: { label: 'To deploy', className: 'text-gray-500' },
    in_progress: { label: 'In progress', className: 'text-yellow-600' },
    review: { label: 'To review', className: 'text-purple-600' },
    done: { label: 'Done', className: 'text-green-600' }
};

export function ActionItem({
    icon,
    priority = 'medium',
    title,
    status = 'to_deploy',
    onClick
}: ActionItemProps) {
    const statusInfo = statusLabels[status];

    return (
        <div
            class={cn(
                "flex items-center gap-4 py-4 px-2 border-b border-gray-100 last:border-0",
                onClick && "cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
            )}
            onClick={onClick}
        >
            {/* Priority indicator */}
            <div class="flex items-center gap-2">
                <div class={cn(
                    "w-2 h-2 rounded-full",
                    priorityColors[priority]
                )} />
                {icon && (
                    <span class="text-gray-400">
                        {icon}
                    </span>
                )}
            </div>

            {/* Title */}
            <div class="flex-1 text-sm text-gray-700">
                {title}
            </div>

            {/* Status */}
            <div class={cn(
                "flex items-center gap-2 text-sm",
                statusInfo.className
            )}>
                <span>{statusInfo.label}</span>
                {onClick && <ArrowRight class="w-4 h-4" />}
            </div>
        </div>
    );
}
