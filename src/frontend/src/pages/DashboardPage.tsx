import { Plus, Server, Box, Activity } from 'lucide-preact';
import type { MCPServer } from '../../../config/types';
import { cn } from '../lib/utils';

interface DashboardPageProps {
    servers: MCPServer[];
    onAddServer: () => void;
    onManageServer: (id: string) => void;
}

export function DashboardPage({ servers, onAddServer, onManageServer }: DashboardPageProps) {
    const healthy = servers.filter(s => s.status === 'healthy').length;
    const deploying = servers.filter(s => s.status === 'deploying').length;
    const unhealthy = servers.filter(s => s.status === 'unhealthy').length;
    const draft = servers.filter(s => s.status === 'draft').length;

    const getStatusIcon = (status: MCPServer['status']) => {
        switch (status) {
            case 'healthy':
                return <span className="h-2 w-2 rounded-full bg-emerald-500" />;
            case 'deploying':
                return <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />;
            case 'unhealthy':
                return <span className="h-2 w-2 rounded-full bg-red-500" />;
            default:
                return <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />;
        }
    };

    const getStatusLabel = (status: MCPServer['status']) => {
        switch (status) {
            case 'healthy': return 'Running';
            case 'deploying': return 'Deploying';
            case 'unhealthy': return 'Error';
            default: return 'Draft';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Servers</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {servers.length === 0 
                            ? 'No servers configured'
                            : `${servers.length} server${servers.length !== 1 ? 's' : ''} · ${healthy} running`
                        }
                    </p>
                </div>
                <button
                    onClick={onAddServer}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Add Server
                </button>
            </div>

            {/* Stats */}
            {servers.length > 0 && (
                <div className="grid grid-cols-4 gap-4">
                    <div className="rounded-lg border border-border bg-card p-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Server className="h-4 w-4" />
                            <span className="text-xs">Total</span>
                        </div>
                        <p className="text-2xl font-semibold mt-1">{servers.length}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                        <div className="flex items-center gap-2 text-emerald-500">
                            <Activity className="h-4 w-4" />
                            <span className="text-xs">Running</span>
                        </div>
                        <p className="text-2xl font-semibold mt-1">{healthy}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                        <div className="flex items-center gap-2 text-amber-500">
                            <Box className="h-4 w-4" />
                            <span className="text-xs">Deploying</span>
                        </div>
                        <p className="text-2xl font-semibold mt-1">{deploying}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                        <div className="flex items-center gap-2 text-red-500">
                            <Box className="h-4 w-4" />
                            <span className="text-xs">Error</span>
                        </div>
                        <p className="text-2xl font-semibold mt-1">{unhealthy}</p>
                    </div>
                </div>
            )}

            {/* Server Grid */}
            {servers.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 py-16">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <Server className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="mt-4 text-sm font-medium">No servers</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Add your first MCP server to get started
                    </p>
                    <button
                        onClick={onAddServer}
                        className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Add Server
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {servers.map((server) => (
                        <button
                            key={server.id}
                            onClick={() => onManageServer(server.id)}
                            className="group flex flex-col rounded-lg border border-border bg-card p-4 text-left hover:border-muted-foreground/50 transition-colors"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                                        <Box className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium group-hover:text-primary transition-colors">
                                            {server.name}
                                        </h3>
                                        <p className="text-xs text-muted-foreground line-clamp-1">
                                            {server.description || 'No description'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2 py-0.5">
                                    {getStatusIcon(server.status)}
                                    <span className="text-[10px] font-medium uppercase tracking-wide">
                                        {getStatusLabel(server.status)}
                                    </span>
                                </div>
                            </div>
                            
                            {server.deployedUrl && (
                                <div className="mt-4 pt-3 border-t border-border">
                                    <p className="text-[10px] text-muted-foreground truncate">
                                        {server.deployedUrl}
                                    </p>
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
