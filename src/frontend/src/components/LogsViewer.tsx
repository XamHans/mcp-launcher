import { FileText, RefreshCw, AlertTriangle } from 'lucide-preact';
import type { LogEntry } from '../services/gcpService';
import { cn } from '../lib/utils';
import { useRef, useEffect } from 'preact/hooks';

interface LogsViewerProps {
    logs: LogEntry[];
    isLoading: boolean;
    error?: string;
    onRefresh: () => void;
}

const severityColors: Record<string, string> = {
    DEFAULT: 'text-zinc-400',
    DEBUG: 'text-zinc-500',
    INFO: 'text-blue-400',
    NOTICE: 'text-cyan-400',
    WARNING: 'text-yellow-400',
    ERROR: 'text-red-400',
    CRITICAL: 'text-red-500 font-bold',
};

const severityBadgeColors: Record<string, string> = {
    DEFAULT: 'bg-zinc-500/20 text-zinc-400',
    DEBUG: 'bg-zinc-500/20 text-zinc-500',
    INFO: 'bg-blue-500/20 text-blue-400',
    NOTICE: 'bg-cyan-500/20 text-cyan-400',
    WARNING: 'bg-yellow-500/20 text-yellow-400',
    ERROR: 'bg-red-500/20 text-red-400',
    CRITICAL: 'bg-red-600/30 text-red-500',
};

export function LogsViewer({ logs, isLoading, error, onRefresh }: LogsViewerProps) {
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const formatTimestamp = (ts: string) => {
        try {
            return new Date(ts).toLocaleTimeString('en-US', {
                hour12: false,
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
            });
        } catch {
            return ts;
        }
    };

    return (
        <div class="bg-black/80 border border-[var(--border)] rounded-xl overflow-hidden shadow-2xl flex flex-col h-[350px]">
            <div class="flex items-center justify-between px-4 py-3 bg-[var(--card)] border-b border-[var(--border)]">
                <h3 class="text-sm font-medium text-zinc-400 flex items-center gap-2">
                    <FileText class="w-4 h-4" />
                    Cloud Logs
                </h3>
                <button
                    onClick={onRefresh}
                    disabled={isLoading}
                    class="p-1.5 rounded-md hover:bg-white/5 transition-colors text-zinc-500 hover:text-white disabled:opacity-50 flex items-center gap-1.5"
                    title="Refresh logs"
                >
                    <RefreshCw class={cn("w-4 h-4", isLoading && "animate-spin")} />
                    <span class="text-xs">Refresh</span>
                </button>
            </div>

            <div class="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                {error ? (
                    <div class="flex items-center gap-2 text-sm text-yellow-500 bg-yellow-500/10 px-3 py-2 rounded-lg">
                        <AlertTriangle class="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                ) : isLoading && logs.length === 0 ? (
                    <div class="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2">
                        <RefreshCw class="w-6 h-6 animate-spin" />
                        <p>Loading logs...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div class="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2">
                        <FileText class="w-8 h-8 opacity-20" />
                        <p>No logs available</p>
                        <p class="text-[10px] opacity-70">Click refresh to fetch latest logs</p>
                    </div>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} class="flex items-start gap-2 break-words">
                            <span class="opacity-40 select-none whitespace-nowrap">
                                {formatTimestamp(log.timestamp)}
                            </span>
                            <span class={cn(
                                "px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold whitespace-nowrap",
                                severityBadgeColors[log.severity] || severityBadgeColors.DEFAULT
                            )}>
                                {log.severity}
                            </span>
                            <span class={severityColors[log.severity] || severityColors.DEFAULT}>
                                {log.message}
                            </span>
                        </div>
                    ))
                )}
                <div ref={logsEndRef} />
            </div>
        </div>
    );
}
