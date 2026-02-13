import type { Socket } from 'socket.io-client';

export interface ServiceMetrics {
    requestCount: number;
    latencyP50Ms: number | null;
    instanceCount: number;
}

export interface LogEntry {
    timestamp: string;
    severity: 'DEFAULT' | 'DEBUG' | 'INFO' | 'NOTICE' | 'WARNING' | 'ERROR' | 'CRITICAL';
    message: string;
}

/**
 * Dedicated service for fetching GCP metrics and logs via socket
 */
export const gcpService = {
    /**
     * Fetch metrics for a Cloud Run service
     */
    fetchMetrics(
        socket: Socket,
        projectId: string,
        serviceName: string,
        location?: string
    ): Promise<{ metrics: ServiceMetrics; error?: string }> {
        return new Promise((resolve) => {
            const handler = (data: { metrics: ServiceMetrics; error?: string }) => {
                socket.off('service-metrics', handler);
                resolve(data);
            };
            socket.on('service-metrics', handler);
            socket.emit('get-service-metrics', { projectId, serviceName, location });

            // Timeout after 30s
            setTimeout(() => {
                socket.off('service-metrics', handler);
                resolve({ metrics: { requestCount: 0, latencyP50Ms: null, instanceCount: 0 }, error: 'Request timed out' });
            }, 30000);
        });
    },

    /**
     * Fetch logs for a Cloud Run service
     */
    fetchLogs(
        socket: Socket,
        projectId: string,
        serviceName: string,
        location?: string,
        limit: number = 50
    ): Promise<{ logs: LogEntry[]; error?: string }> {
        return new Promise((resolve) => {
            const handler = (data: { logs: LogEntry[]; error?: string }) => {
                socket.off('service-logs', handler);
                resolve(data);
            };
            socket.on('service-logs', handler);
            socket.emit('get-service-logs', { projectId, serviceName, location, limit });

            // Timeout after 30s
            setTimeout(() => {
                socket.off('service-logs', handler);
                resolve({ logs: [], error: 'Request timed out' });
            }, 30000);
        });
    },
};
