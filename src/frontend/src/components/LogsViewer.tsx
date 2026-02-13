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

const severityStyles: Record<string, { text: string; badge: string }> = {
    DEFAULT: { text: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground' },
    DEBUG: { text: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground' },
    INFO: { text: 'text-foreground', badge: 'bg-primary/10 text-primary' },
    NOTICE: { text: 'text-foreground', badge: 'bg-primary/10 text-primary' },
    WARNING: { text: 'text-amber-500', badge: 'bg-amber-500/10 text-amber-500' },
    ERROR: { text: 'text-red-500', badge: 'bg-red-500/10 text-red-500' },
    CRITICAL: { text: 'text-red-500 font-medium', badge: 'bg-red-500/20 text-red-500' },
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

    const getStyles = (severity: string) => severityStyles[severity] || severityStyles.DEFAULT;

    return (
        <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col h-[350px]">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Cloud Logs</span>
                </div>
                <button
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
                    Refresh
                </button>
            </div>

            <div className="flex-1 overflow-auto bg-black/30 p-3 font-mono text-[11px]">
                {error ? (
                    <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-amber-500">
                        <AlertTriangle className="h-4 w-4" />
                        <span>{error}</span>
                    </div>
                ) : isLoading && logs.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-muted-foreground/50">
                        <RefreshCw className="h-5 w-5 animate-spin mb-2" />
                        <p>Loading...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-muted-foreground/50">
                        <FileText className="h-6 w-6 mb-2 opacity-20" />
                        <p>No logs</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {logs.map((log, i) => {
                            const styles = getStyles(log.severity);
                            return (
                                <div key={i} className="flex items-start gap-2">
                                    <span className="text-muted-foreground/40 whitespace-nowrap">
                                        {formatTimestamp(log.timestamp)}
                                    </span>
                                    <span className={cn("rounded px-1 py-0.5 text-[9px] uppercase font-medium", styles.badge)}>
                                        {log.severity.slice(0, 4)}
                                    </span>
                                    <span className={cn("break-words", styles.text)}>
                                        {log.message}
                                    </span>
                                </div>
                            );
                        })}
                        <div ref={logsEndRef} />
                    </div>
                )}
            </div>
        </div>
    );
}
