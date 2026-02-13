import { Plus, Server, Box, MessageSquare, Sparkles, Percent } from 'lucide-preact';
import type { MCPServer } from '../../../config/types';
import { cn } from '../lib/utils';
import { StatCard } from '../components/StatCard';
import { ProgressBar } from '../components/ProgressBar';
import { ActionItem } from '../components/ActionItem';

interface DashboardPageProps {
    servers: MCPServer[];
    onAddServer: () => void;
    onManageServer: (id: string) => void;
}

export function DashboardPage({ servers, onAddServer, onManageServer }: DashboardPageProps) {
    // Calculate stats
    const totalServers = servers.length;
    const healthyServers = servers.filter(s => s.status === 'healthy').length;
    const deployingServers = servers.filter(s => s.status === 'deploying').length;
    const draftServers = servers.filter(s => s.status === 'draft').length;
    const unhealthyServers = servers.filter(s => s.status === 'unhealthy').length;

    // Calculate deployment rate
    const deployedCount = healthyServers + unhealthyServers;
    const deploymentRate = totalServers > 0
        ? Math.round((deployedCount / totalServers) * 100)
        : 0;

    // Progress bar segments
    const progressSegments = [
        { value: healthyServers, color: '#10B981' },   // green
        { value: deployingServers, color: '#F59E0B' }, // yellow
        { value: draftServers, color: '#8B5CF6' },     // purple
        { value: unhealthyServers, color: '#EF4444' }  // red
    ];

    // Generate recommendations based on server states
    const recommendations = servers
        .filter(s => s.status === 'draft' || s.status === 'unhealthy')
        .slice(0, 5)
        .map(s => ({
            id: s.id,
            title: s.status === 'draft'
                ? `Deploy "${s.name}" to Cloud Run`
                : `Fix issues with "${s.name}"`,
            priority: s.status === 'unhealthy' ? 'high' as const : 'medium' as const,
            status: 'to_deploy' as const
        }));

    return (
        <div class="animate-in fade-in duration-500 bg-gray-50 min-h-full -m-8 p-8">
            {/* Header */}
            <div class="mb-8">
                <div class="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <span>← Dashboard</span>
                </div>
                <div class="flex items-center gap-3 mb-2">
                    <span class="text-2xl">🚀</span>
                    <h1 class="text-2xl font-bold text-gray-900">Deployment Overview</h1>
                </div>
                <p class="text-gray-600">
                    You have {totalServers} MCP server{totalServers !== 1 ? 's' : ''} configured
                    {deployedCount > 0 && ` with ${deployedCount} deployed to Cloud Run`}.
                </p>
            </div>

            {/* Progress Bar */}
            {totalServers > 0 && (
                <div class="mb-8">
                    <ProgressBar segments={progressSegments} height={6} />
                </div>
            )}

            {/* Stat Cards */}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard
                    icon={<MessageSquare class="w-5 h-5" />}
                    value={totalServers}
                    title="Total Servers"
                    description="MCP servers configured"
                    accent="orange"
                />
                <StatCard
                    icon={<Sparkles class="w-5 h-5" />}
                    value={healthyServers}
                    title="Healthy"
                    description="Running on Cloud Run"
                    accent="green"
                />
                <StatCard
                    icon={<Percent class="w-5 h-5" />}
                    value={`${deploymentRate}%`}
                    title="Deployment Rate"
                    description="Servers deployed to cloud"
                    accent="purple"
                />
            </div>

            {/* Tabs */}
            <div class="border-b border-gray-200 mb-6">
                <nav class="flex gap-8">
                    <button class="pb-3 text-sm font-medium text-gray-900 border-b-2 border-gray-900">
                        Servers
                    </button>
                    <button class="pb-3 text-sm font-medium text-gray-500 hover:text-gray-700">
                        Recommendations
                    </button>
                    <button class="pb-3 text-sm font-medium text-gray-500 hover:text-gray-700">
                        Activity
                    </button>
                </nav>
            </div>

            {/* Recommendations Section */}
            {recommendations.length > 0 && (
                <div class="bg-white rounded-xl border border-gray-200 p-6 mb-8">
                    <div class="flex items-center gap-2 mb-1">
                        <h2 class="text-sm font-semibold text-red-600">High impact</h2>
                        <span class="flex gap-0.5">
                            <span class="w-1 h-3 bg-red-500 rounded-full" />
                            <span class="w-1 h-3 bg-red-500 rounded-full" />
                            <span class="w-1 h-3 bg-red-500 rounded-full" />
                        </span>
                    </div>
                    <p class="text-xs text-gray-500 mb-4">
                        Deploy these servers to get your MCP services running
                    </p>

                    <div class="border-t border-gray-100">
                        <div class="grid grid-cols-[1fr_auto] gap-4 py-2 px-2 text-xs font-medium text-gray-500 uppercase">
                            <span>Recommendation</span>
                            <span>Status</span>
                        </div>
                        {recommendations.map(rec => (
                            <ActionItem
                                key={rec.id}
                                icon={<Server class="w-4 h-4" />}
                                priority={rec.priority}
                                title={rec.title}
                                status={rec.status}
                                onClick={() => onManageServer(rec.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Server Grid */}
            {servers.length === 0 ? (
                <div class="flex flex-col items-center justify-center p-12 bg-white border border-gray-200 rounded-2xl border-dashed">
                    <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <Server class="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">No servers yet</h3>
                    <p class="text-gray-500 text-center max-w-sm mb-6">
                        Create your first MCP server deployment to get started.
                    </p>
                    <button
                        onClick={onAddServer}
                        class="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                    >
                        <Plus class="w-4 h-4" />
                        Add Server
                    </button>
                </div>
            ) : (
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {servers.map(server => (
                        <div
                            key={server.id}
                            onClick={() => onManageServer(server.id)}
                            class="group bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer"
                        >
                            <div class="flex justify-between items-start mb-3">
                                <div class={cn(
                                    "w-9 h-9 rounded-lg flex items-center justify-center",
                                    server.status === 'healthy' ? "bg-emerald-100 text-emerald-600" :
                                        server.status === 'deploying' ? "bg-yellow-100 text-yellow-600" :
                                            server.status === 'unhealthy' ? "bg-red-100 text-red-600" :
                                                "bg-gray-100 text-gray-500"
                                )}>
                                    <Box class="w-4 h-4" />
                                </div>
                                <span class={cn(
                                    "text-[10px] uppercase font-bold px-2 py-1 rounded-full",
                                    server.status === 'healthy' ? "bg-emerald-100 text-emerald-700" :
                                        server.status === 'deploying' ? "bg-yellow-100 text-yellow-700" :
                                            server.status === 'unhealthy' ? "bg-red-100 text-red-700" :
                                                "bg-gray-100 text-gray-600"
                                )}>
                                    {server.status}
                                </span>
                            </div>
                            <h3 class="text-sm font-semibold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
                                {server.name}
                            </h3>
                            <p class="text-xs text-gray-500 line-clamp-2">
                                {server.description || 'No description'}
                            </p>
                        </div>
                    ))}

                    {/* Add Server Card */}
                    <div
                        onClick={onAddServer}
                        class="flex flex-col items-center justify-center p-5 border-2 border-dashed border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50/50 transition-all cursor-pointer min-h-[120px]"
                    >
                        <Plus class="w-6 h-6 text-gray-400 mb-2" />
                        <span class="text-sm font-medium text-gray-500">Add Server</span>
                    </div>
                </div>
            )}
        </div>
    );
}
