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
            label: 'Requests',
            value: metrics?.requestCount ?? '-',
            icon: Activity,
        },
        {
            label: 'Latency',
            value: metrics?.latencyP50Ms ? `${metrics.latencyP50Ms}ms` : '-',
            icon: Clock,
        },
        {
            label: 'Instances',
            value: metrics?.instanceCount ?? '-',
            icon: ServerIcon,
        },
    ];

    return (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Metrics</span>
                </div>
                <button
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                </button>
            </div>

            <div className="p-4">
                {error ? (
                    <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
                        <AlertTriangle className="h-4 w-4" />
                        <span>{error}</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-4">
                        {stats.map((stat) => (
                            <div key={stat.label} className="text-center">
                                <div className="flex justify-center">
                                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className={cn(
                                    "mt-1 text-lg font-semibold",
                                    isLoading && "animate-pulse text-muted-foreground"
                                )}>
                                    {isLoading ? '...' : stat.value}
                                </div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
