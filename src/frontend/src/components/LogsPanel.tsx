import { cn } from '../lib/utils';

interface LogEntry {
    id: string;
    time: string;
    message: string;
    type?: 'info' | 'warn' | 'error' | 'success';
}

interface LogsPanelProps {
    logs: LogEntry[];
}

export function LogsPanel({ logs }: LogsPanelProps) {
    return (
        <div class="w-80 border-r border-[hsl(var(--border))] flex flex-col bg-[hsl(var(--card))]">
            <div class="h-14 border-b border-[hsl(var(--border))] flex items-center px-4 font-semibold text-[hsl(var(--foreground))]">
                Logs
            </div>
            <div class="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
                {logs.length === 0 && (
                    <div class="text-[hsl(var(--muted-foreground))] italic text-center py-4">
                        No logs yet...
                    </div>
                )}
                {logs.map((log) => (
                    <div key={log.id} class="flex flex-col gap-1">
                        <span class="text-[hsl(var(--muted-foreground))] text-[10px]">{log.time}</span>
                        <span class={cn(
                            "break-words",
                            log.type === 'error' && "text-red-400",
                            log.type === 'success' && "text-green-400",
                            log.type === 'warn' && "text-yellow-400",
                            (!log.type || log.type === 'info') && "text-[hsl(var(--foreground))]"
                        )}>
                            {log.message}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
