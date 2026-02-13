import { Rocket } from 'lucide-preact';
import { cn } from '../lib/utils';

interface DeployButtonProps {
    disabled: boolean;
    deploying: boolean;
    deployOnly: boolean;
    onClick: () => void;
}

export function DeployButton({ disabled, deploying, deployOnly, onClick }: DeployButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled || deploying}
            class={cn(
                "w-full py-3 rounded-xl font-medium text-sm transition flex items-center justify-center gap-2",
                disabled || deploying
                    ? "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] cursor-not-allowed"
                    : "bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-[hsl(var(--primary-foreground))] shadow-lg shadow-[hsl(var(--primary))]/20"
            )}
        >
            {deploying ? (
                <>
                    <div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Deploying...</span>
                </>
            ) : (
                <>
                    <Rocket class="w-4 h-4" />
                    <span>{deployOnly ? 'Deploy to Cloud Run' : 'Audit & Deploy'}</span>
                </>
            )}
        </button>
    );
}
