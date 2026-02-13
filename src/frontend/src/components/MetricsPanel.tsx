import { Activity, Clock, Server as ServerIcon, RefreshCw, AlertTriangle } from 'lucide-preact';
import type { ServiceMetrics } from '../services/gcpService';
import { cn } from '../lib/utils';

interface MetricsPanelProps {
    metrics: ServiceMetrics | null;
    isLoading: boolean;
    error?: string;
    onRefresh: () => void;
}

export function MetricsPanel({ metrics, isLoading, error, onRefresh }: MetricsPanelProps) {
    const stats = [
        {
            label: 'Requests (1h)',
            value: metrics?.requestCount ?? '-',
            icon: Activity,
            color: 'text-blue-400',
        },
        {
            label: 'Avg Latency',
            value: metrics?.latencyP50Ms ? `${metrics.latencyP50Ms}ms` : '-',
            icon: Clock,
            color: 'text-purple-400',
        },
        {
            label: 'Instances',
            value: metrics?.instanceCount ?? '-',
            icon: ServerIcon,
            color: 'text-green-400',
        },
    ];

    return (
        <div class="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl p-5 backdrop-blur-md">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <Activity class="w-4 h-4" />
                    Service Metrics
                </h3>
                <button
                    onClick={onRefresh}
                    disabled={isLoading}
                    class="p-1.5 rounded-md hover:bg-white/5 transition-colors text-zinc-500 hover:text-white disabled:opacity-50"
                    title="Refresh metrics"
                >
                    <RefreshCw class={cn("w-4 h-4", isLoading && "animate-spin")} />
                </button>
            </div>

            {error ? (
                <div class="flex items-center gap-2 text-sm text-yellow-500 bg-yellow-500/10 px-3 py-2 rounded-lg">
                    <AlertTriangle class="w-4 h-4 flex-shrink-0" />
                    <span class="truncate">{error}</span>
                </div>
            ) : (
                <div class="grid grid-cols-3 gap-4">
                    {stats.map((stat) => (
                        <div key={stat.label} class="text-center">
                            <div class={cn("inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 mb-2", stat.color)}>
                                <stat.icon class="w-4 h-4" />
                            </div>
                            <div class={cn(
                                "text-xl font-bold text-white",
                                isLoading && "animate-pulse text-zinc-500"
                            )}>
                                {isLoading ? '...' : stat.value}
                            </div>
                            <div class="text-xs text-zinc-500 mt-1">{stat.label}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
