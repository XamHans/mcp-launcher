import { ArrowLeft, ExternalLink, Play, Clock, Terminal, Globe, ChevronDown, RefreshCw, Zap, Trash2 } from 'lucide-preact';
import type { MCPServer } from '../../../config/types';
import { cn } from '../lib/utils';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Socket } from 'socket.io-client';
import { useGcpMetrics } from '../hooks/useGcpMetrics';
import { useGcpLogs } from '../hooks/useGcpLogs';
import { MetricsPanel } from '../components/MetricsPanel';
import { LogsViewer } from '../components/LogsViewer';

interface ServerDetailsPageProps {
    server: MCPServer;
    onBack: () => void;
    onDeploy: (deployOnly?: boolean) => void;
    onUpdate: (server: MCPServer) => void;
    onDelete: (serverId: string) => void;
    isDeploying: boolean;
    logs: { time: string; message: string; type: 'info' | 'error' | 'success' | 'warn' }[];
    socket: Socket | null;
    projectId: string | undefined;
}

export function ServerDetailsPage({ server, onBack, onDeploy, onUpdate, onDelete, isDeploying, logs, socket, projectId }: ServerDetailsPageProps) {
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editPath, setEditPath] = useState(server.sourcePath);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showDeployMenu, setShowDeployMenu] = useState(false);

    const serviceName = server.deployedUrl
        ? server.name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50)
        : '';

    const isDeployed = server.status === 'healthy' && !!server.deployedUrl;

    const { data: metricsData, isLoading: metricsLoading, refetch: refetchMetrics } = useGcpMetrics({
        socket,
        projectId,
        serviceName,
        enabled: isDeployed,
    });

    const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useGcpLogs({
        socket,
        projectId,
        serviceName,
        enabled: isDeployed,
    });

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const handleSavePath = () => {
        onUpdate({ ...server, sourcePath: editPath });
        setIsEditing(false);
    };

    const handleDelete = () => {
        onDelete(server.id);
        onBack();
    };

    const getStatusStyles = (status: MCPServer['status']) => {
        switch (status) {
            case 'healthy':
                return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'deploying':
                return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'unhealthy':
                return 'bg-red-500/10 text-red-500 border-red-500/20';
            default:
                return 'bg-muted text-muted-foreground border-border';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card hover:bg-muted transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-semibold">{server.name}</h1>
                            <span className={cn(
                                "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                                getStatusStyles(server.status)
                            )}>
                                {server.status}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{server.description || 'No description'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {server.deployedUrl && (
                        <a
                            href={server.deployedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                        >
                            <Globe className="h-4 w-4" />
                            <span>Open</span>
                            <ExternalLink className="h-3 w-3 opacity-50" />
                        </a>
                    )}

                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-red-500 hover:border-red-500/30 transition-colors"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowDeployMenu(!showDeployMenu)}
                            disabled={isDeploying}
                            className={cn(
                                "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                                isDeploying
                                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                            )}
                        >
                            <Play className={cn("h-4 w-4", isDeploying && "animate-spin")} />
                            {isDeploying ? 'Deploying...' : 'Deploy'}
                            {!isDeploying && <ChevronDown className="h-3 w-3" />}
                        </button>

                        {showDeployMenu && !isDeploying && (
                            <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-border bg-popover shadow-md animate-fade-in">
                                <button
                                    onClick={() => { setShowDeployMenu(false); onDeploy(false); }}
                                    className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors"
                                >
                                    <Play className="h-4 w-4 mt-0.5 text-primary" />
                                    <div>
                                        <div className="text-sm font-medium">Full Deploy</div>
                                        <div className="text-xs text-muted-foreground">AI analysis + build + deploy</div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => { setShowDeployMenu(false); onDeploy(true); }}
                                    className="flex w-full items-start gap-3 border-t border-border px-3 py-2.5 text-left hover:bg-muted transition-colors"
                                >
                                    <Zap className="h-4 w-4 mt-0.5 text-amber-500" />
                                    <div>
                                        <div className="text-sm font-medium">Deploy Only</div>
                                        <div className="text-xs text-muted-foreground">Skip AI analysis</div>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-lg">
                        <h3 className="text-sm font-semibold">Delete Server</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Are you sure you want to delete <strong>{server.name}</strong>? This cannot be undone.
                        </p>
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="rounded-md bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Configuration */}
                <div className="space-y-4">
                    <div className="rounded-lg border border-border bg-card">
                        <div className="border-b border-border px-4 py-3">
                            <h3 className="text-sm font-medium">Configuration</h3>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="text-xs text-muted-foreground">Source Path</label>
                                {isEditing ? (
                                    <div className="mt-1.5 flex gap-2">
                                        <input
                                            type="text"
                                            value={editPath}
                                            onInput={(e) => setEditPath((e.target as HTMLInputElement).value)}
                                            className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                            autoFocus
                                        />
                                        <button onClick={handleSavePath} className="text-xs font-medium text-emerald-500 hover:text-emerald-600">Save</button>
                                        <button onClick={() => { setIsEditing(false); setEditPath(server.sourcePath); }} className="text-xs font-medium text-muted-foreground">Cancel</button>
                                    </div>
                                ) : (
                                    <div className="mt-1.5 flex items-center justify-between gap-2">
                                        <code className="text-xs truncate" title={server.sourcePath}>{server.sourcePath}</code>
                                        <button onClick={() => setIsEditing(true)} className="text-xs font-medium text-muted-foreground hover:text-foreground">Edit</button>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">Last Deployed</label>
                                <div className="mt-1.5 flex items-center gap-2 text-sm">
                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                    {server.lastDeployedAt 
                                        ? new Date(server.lastDeployedAt).toLocaleString() 
                                        : 'Never'
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Logs */}
                <div className="lg:col-span-2">
                    <div className="rounded-lg border border-border bg-card overflow-hidden">
                        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                            <div className="flex items-center gap-2">
                                <Terminal className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Deployment Logs</span>
                            </div>
                            {isDeploying && (
                                <span className="flex items-center gap-1.5 text-xs text-emerald-500">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Live
                                </span>
                            )}
                        </div>
                        <div className="h-[400px] overflow-auto bg-black/50 p-4 font-mono text-xs">
                            {logs.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center text-muted-foreground/50">
                                    <Terminal className="h-8 w-8 mb-2 opacity-20" />
                                    <p>No logs yet</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {logs.map((log, i) => (
                                        <div key={i} className={cn(
                                            "break-words",
                                            log.type === 'error' && "text-red-400",
                                            log.type === 'success' && "text-emerald-400",
                                            log.type !== 'error' && log.type !== 'success' && "text-muted-foreground"
                                        )}>
                                            <span className="opacity-40 mr-2">{log.time}</span>
                                            <span>{log.message}</span>
                                        </div>
                                    ))}
                                    <div ref={logsEndRef} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Cloud Metrics */}
            {isDeployed && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-medium">Cloud Run Metrics</h2>
                        <button
                            onClick={() => { refetchMetrics(); refetchLogs(); }}
                            disabled={metricsLoading || logsLoading}
                            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={cn("h-3 w-3", (metricsLoading || logsLoading) && "animate-spin")} />
                            Refresh
                        </button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <MetricsPanel metrics={metricsData?.metrics ?? null} isLoading={metricsLoading} error={metricsData?.error} onRefresh={refetchMetrics} />
                        <LogsViewer logs={logsData?.logs ?? []} isLoading={logsLoading} error={logsData?.error} onRefresh={refetchLogs} />
                    </div>
                </div>
            )}
        </div>
    );
}
