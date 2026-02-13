import type { Prerequisites } from '../hooks/useSocket';
import { CheckCircle2, XCircle, RefreshCw, Terminal } from 'lucide-preact';
import { cn } from '../lib/utils';

interface PrerequisitesCheckProps {
    prerequisites: Prerequisites | null;
    onRefresh: () => void;
}

export function PrerequisitesCheck({ prerequisites, onRefresh }: PrerequisitesCheckProps) {
    if (!prerequisites) {
        return (
            <div class="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <div class="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
                    <RefreshCw class="w-4 h-4 animate-spin" />
                    <span class="text-sm">Checking prerequisites...</span>
                </div>
            </div>
        );
    }

    const allGood = prerequisites.gcloud.installed &&
        prerequisites.gcloud.authenticated &&
        prerequisites.docker.installed &&
        prerequisites.docker.running;

    const items = [
        {
            label: 'gcloud CLI installed',
            ok: prerequisites.gcloud.installed,
            fix: 'brew install google-cloud-sdk'
        },
        {
            label: 'gcloud authenticated',
            ok: prerequisites.gcloud.authenticated,
            fix: prerequisites.gcloud.fix
        },
        {
            label: 'Docker installed',
            ok: prerequisites.docker.installed,
            fix: 'brew install --cask docker'
        },
        {
            label: 'Docker running',
            ok: prerequisites.docker.running,
            fix: prerequisites.docker.fix
        }
    ];

    return (
        <div class={cn(
            "p-4 rounded-xl border",
            allGood
                ? "border-green-500/30 bg-green-500/5"
                : "border-[hsl(var(--border))] bg-[hsl(var(--card))]"
        )}>
            <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">
                    Prerequisites
                </h3>
                <button
                    onClick={onRefresh}
                    class="p-1.5 rounded-md hover:bg-[hsl(var(--secondary))] transition text-[hsl(var(--muted-foreground))]"
                >
                    <RefreshCw class="w-4 h-4" />
                </button>
            </div>

            <div class="space-y-2">
                {items.map((item, i) => (
                    <div key={i} class="flex items-center gap-3">
                        {item.ok ? (
                            <CheckCircle2 class="w-4 h-4 text-green-400 shrink-0" />
                        ) : (
                            <XCircle class="w-4 h-4 text-red-400 shrink-0" />
                        )}
                        <span class={cn(
                            "text-sm flex-1",
                            item.ok ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))]"
                        )}>
                            {item.label}
                        </span>
                        {!item.ok && (
                            <code class="text-xs px-2 py-1 rounded bg-[hsl(var(--secondary))] text-[hsl(var(--primary))] font-mono flex items-center gap-1">
                                <Terminal class="w-3 h-3" />
                                {item.fix}
                            </code>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
