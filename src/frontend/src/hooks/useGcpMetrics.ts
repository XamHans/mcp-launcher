import { useQuery } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import { gcpService, type ServiceMetrics } from '../services/gcpService';

interface UseGcpMetricsOptions {
    socket: Socket | null;
    projectId: string | undefined;
    serviceName: string;
    location?: string;
    enabled?: boolean;
}

export function useGcpMetrics({ socket, projectId, serviceName, location, enabled = true }: UseGcpMetricsOptions) {
    return useQuery<{ metrics: ServiceMetrics; error?: string }>({
        queryKey: ['gcp-metrics', projectId, serviceName, location],
        queryFn: async () => {
            if (!socket || !projectId) {
                return { metrics: { requestCount: 0, latencyP50Ms: null, instanceCount: 0 }, error: 'Not connected' };
            }
            return gcpService.fetchMetrics(socket, projectId, serviceName, location);
        },
        enabled: enabled && !!socket && !!projectId,
        staleTime: 30 * 1000, // 30 seconds
        refetchInterval: 60 * 1000, // Auto-refresh every 60 seconds
    });
}
