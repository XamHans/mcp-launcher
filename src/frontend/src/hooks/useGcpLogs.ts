import { useQuery } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import { gcpService, type LogEntry } from '../services/gcpService';

interface UseGcpLogsOptions {
    socket: Socket | null;
    projectId: string | undefined;
    serviceName: string;
    location?: string;
    limit?: number;
    enabled?: boolean;
}

export function useGcpLogs({ socket, projectId, serviceName, location, limit = 50, enabled = true }: UseGcpLogsOptions) {
    return useQuery<{ logs: LogEntry[]; error?: string }>({
        queryKey: ['gcp-logs', projectId, serviceName, location, limit],
        queryFn: async () => {
            if (!socket || !projectId) {
                return { logs: [], error: 'Not connected' };
            }
            return gcpService.fetchLogs(socket, projectId, serviceName, location, limit);
        },
        enabled: enabled && !!socket && !!projectId,
        staleTime: 10 * 1000, // 10 seconds
        // No auto-refresh for logs - use manual refetch
    });
}
