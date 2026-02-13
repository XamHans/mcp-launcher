
import { ArrowLeft, ExternalLink, Play, Clock, Terminal, Globe, AlertCircle, Zap, ChevronDown, RefreshCw } from 'lucide-preact';
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

    // Extract service name from deployed URL for GCP queries
    const serviceName = server.deployedUrl
        ? server.name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50)
        : '';

    const isDeployed = server.status === 'healthy' && !!server.deployedUrl;

    // GCP Metrics & Logs
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

    // Auto-scroll logs
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
        onBack(); // Navigate back to dashboard
    };

    const statusColors: Record<string, string> = {
        draft: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
        deploying: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        healthy: 'bg-green-500/10 text-green-400 border-green-500/20',
        unhealthy: 'bg-red-500/10 text-red-400 border-red-500/20',
        default: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
    };

    return (
        <div class="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 max-w-5xl mx-auto">
            {/* Header / Nav */}
            <div class="flex items-center gap-4 mb-2">
                <button
                    onClick={onBack}
                    class="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-400 hover:text-white"
                >
                    <ArrowLeft class="w-5 h-5" />
                </button>
                <div class="flex-1">
                    <h1 class="text-2xl font-bold text-white flex items-center gap-3">
                        {server.name}
                        <span class={cn(
                            "px-3 py-1 text-xs rounded-full border border-current uppercase tracking-wider font-semibold",
                            statusColors[server.status] || statusColors.default
                        )}>
                            {server.status}
                        </span>
                    </h1>
                    <p class="text-zinc-400 text-sm mt-1">{server.description}</p>
                </div>

                {/* Actions */}
                <div class="flex items-center gap-3">
                    {server.deployedUrl && (
                        <a
                            href={server.deployedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-zinc-300 hover:text-white hover:bg-white/5 transition-all"
                        >
                            <Globe class="w-4 h-4" />
                            <span>Visit URL</span>
                            <ExternalLink class="w-3 h-3 opacity-50" />
                        </a>
                    )}

                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        class="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all font-medium flex items-center gap-2"
                    >
                        Delete
                    </button>

                    <div class="relative">
                        <button
                            onClick={() => setShowDeployMenu(!showDeployMenu)}
                            disabled={isDeploying}
                            class={cn(
                                "flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all shadow-lg hover:shadow-primary/25 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed",
                                isDeploying
                                    ? "bg-zinc-800 text-zinc-500"
                                    : "bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))/90]"
                            )}
                        >
                            <Play class={cn("w-4 h-4", isDeploying && "animate-spin")} />
                            {isDeploying ? 'Deploying...' : 'Deploy'}
                            {!isDeploying && <ChevronDown class="w-4 h-4" />}
                        </button>

                        {/* Deploy Options Menu */}
                        {showDeployMenu && !isDeploying && (
                            <div class="absolute right-0 top-full mt-2 w-64 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <button
                                    onClick={() => {
                                        setShowDeployMenu(false);
                                        onDeploy(false);
                                    }}
                                    class="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-start gap-3"
                                >
                                    <Play class="w-5 h-5 text-[hsl(var(--primary))] mt-0.5" />
                                    <div>
                                        <div class="text-sm font-medium text-white">Full Deploy</div>
                                        <div class="text-xs text-zinc-500">Run AI analysis + build + deploy</div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDeployMenu(false);
                                        onDeploy(true);
                                    }}
                                    class="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-start gap-3 border-t border-[var(--border)]"
                                >
                                    <Zap class="w-5 h-5 text-yellow-400 mt-0.5" />
                                    <div>
                                        <div class="text-sm font-medium text-white">Deploy Only</div>
                                        <div class="text-xs text-zinc-500">Skip AI analysis (use existing Dockerfile)</div>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal Overlay */}
            {showDeleteConfirm && (
                <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div class="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 max-w-sm w-full shadow-2xl space-y-4">
                        <h3 class="text-lg font-semibold text-white">Delete Server?</h3>
                        <p class="text-sm text-zinc-400">
                            Are you sure you want to delete <strong>{server.name}</strong>? This action cannot be undone.
                        </p>
                        <div class="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                class="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                class="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Info & Stats */}
                <div class="space-y-6">
                    {/* Info Card */}
                    <div class="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl p-6 backdrop-blur-md">
                        <h3 class="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <AlertCircle class="w-4 h-4" />
                            Configuration
                        </h3>
                        <div class="space-y-4">
                            <div>
                                <div class="flex justify-between items-center mb-1">
                                    <label class="text-xs text-zinc-500">Source Path</label>
                                    {!isEditing ? (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            class="text-xs text-[hsl(var(--primary))] hover:underline"
                                        >
                                            Edit
                                        </button>
                                    ) : (
                                        <div class="flex gap-2">
                                            <button
                                                onClick={handleSavePath}
                                                class="text-xs text-green-400 hover:underline"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsEditing(false);
                                                    setEditPath(server.sourcePath);
                                                }}
                                                class="text-xs text-zinc-500 hover:underline"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editPath}
                                        onInput={(e) => setEditPath((e.target as HTMLInputElement).value)}
                                        class="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                                        autoFocus
                                    />
                                ) : (
                                    <code class="text-sm text-zinc-300 bg-black/30 px-2 py-1 rounded block overflow-hidden text-ellipsis whitespace-nowrap" title={server.sourcePath}>
                                        {server.sourcePath}
                                    </code>
                                )}
                            </div>
                            <div>
                                <label class="text-xs text-zinc-500 block mb-1">Last Deployed</label>
                                <div class="flex items-center gap-2 text-sm text-zinc-300">
                                    <Clock class="w-4 h-4 text-zinc-500" />
                                    {server.lastDeployedAt ? new Date(server.lastDeployedAt).toLocaleString() : 'Never'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Console / Logs */}
                <div class="lg:col-span-2">
                    <div class="bg-black/80 border border-[var(--border)] rounded-xl overflow-hidden shadow-2xl flex flex-col h-[500px]">
                        <div class="flex items-center justify-between px-4 py-3 bg-[var(--card)] border-b border-[var(--border)]">
                            <h3 class="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                <Terminal class="w-4 h-4" />
                                Deployment Logs
                            </h3>
                            {isDeploying && (
                                <span class="text-xs text-green-400 animate-pulse flex items-center gap-1.5">
                                    <span class="w-1.5 h-1.5 rounded-full bg-green-400" />
                                    Live
                                </span>
                            )}
                        </div>

                        <div class="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                            {logs.length === 0 ? (
                                <div class="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2">
                                    <Terminal class="w-8 h-8 opacity-20" />
                                    <p>No deployment logs available.</p>
                                    <p class="text-[10px] opacity-70">Click "Deploy Server" to generate logs.</p>
                                </div>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} class={cn(
                                        "break-words",
                                        log.type === 'error' ? 'text-red-400' :
                                            log.type === 'success' ? 'text-green-400' :
                                                'text-zinc-400'
                                    )}>
                                        <span class="opacity-30 mr-3 select-none">{log.time}</span>
                                        <span>{log.message}</span>
                                    </div>
                                ))
                            )}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Cloud Metrics & Logs - Only shown for deployed servers */}
            {isDeployed && (
                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <h2 class="text-lg font-semibold text-white flex items-center gap-2">
                            <Globe class="w-5 h-5 text-[hsl(var(--primary))]" />
                            Cloud Run Resources
                        </h2>
                        <button
                            onClick={() => {
                                refetchMetrics();
                                refetchLogs();
                            }}
                            disabled={metricsLoading || logsLoading}
                            class="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-zinc-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
                        >
                            <RefreshCw class={cn("w-3.5 h-3.5", (metricsLoading || logsLoading) && "animate-spin")} />
                            Refresh All
                        </button>
                    </div>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <MetricsPanel
                            metrics={metricsData?.metrics ?? null}
                            isLoading={metricsLoading}
                            error={metricsData?.error}
                            onRefresh={() => refetchMetrics()}
                        />
                        <LogsViewer
                            logs={logsData?.logs ?? []}
                            isLoading={logsLoading}
                            error={logsData?.error}
                            onRefresh={() => refetchLogs()}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
