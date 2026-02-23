import { Socket } from 'socket.io';
import { verifyService } from '../../gcp/verification';
import { getServiceMetrics, TimeRange as MetricsTimeRange } from '../../gcp/metrics';
import { getServiceLogs, TimeRange as LogsTimeRange } from '../../gcp/logs';
import { getServiceMetadata } from '../../gcp/service';
import { loadConfig, getFieldDefinitions, upsertServer } from '../../config/config';

export function registerGcpHandlers(socket: Socket) {
    socket.on('verify-service', async (data: { projectId: string, serviceName: string, location?: string, serverId?: string }) => {
        try {
            const { projectId, serviceName, location = 'us-central1', serverId } = data;
            const result = await verifyService(projectId, serviceName, location);

            if (!result.ready && result.error?.includes('not found') && serverId) {
                const config = await loadConfig();
                const server = config.servers.find(s => s.id === serverId);
                if (server && server.status === 'healthy') {
                    server.status = 'unhealthy';
                    await upsertServer(server);
                    socket.emit('global-config-update', { config, fieldDefinitions: getFieldDefinitions() });
                }
            }

            socket.emit('service-verified', result);
        } catch (error) {
            socket.emit('service-verified', { ready: false, error: String(error) });
        }
    });

    socket.on('get-service-metrics', async (data: { projectId: string, serviceName: string, location?: string, timeRange?: MetricsTimeRange }) => {
        try {
            const { projectId, serviceName, location, timeRange } = data;
            const result = await getServiceMetrics(projectId, serviceName, location, timeRange);
            socket.emit('service-metrics', result);
        } catch (error) {
            console.error('[GCP Metrics] Error fetching metrics:', error);
            socket.emit('service-metrics', { metrics: null, error: String(error) });
        }
    });

    socket.on('get-service-logs', async (data: { projectId: string, serviceName: string, location?: string, timeRange?: LogsTimeRange, limit?: number }) => {
        try {
            const { projectId, serviceName, location, timeRange, limit } = data;
            const result = await getServiceLogs(projectId, serviceName, location, timeRange, limit);
            socket.emit('service-logs', result);
        } catch (error) {
            socket.emit('service-logs', { logs: [], error: String(error) });
        }
    });

    socket.on('health-check', async (data: { deployedUrl: string, serverId: string }) => {
        const { deployedUrl, serverId } = data;
        let healthy = false;
        let reason = '';
        let statusCode: number | undefined;
        const checkedAt = new Date().toISOString();

        try {
            const baseUrl = new URL(deployedUrl).origin;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(baseUrl, { method: 'GET', signal: controller.signal });
            clearTimeout(timeout);
            statusCode = response.status;

            if (response.ok) {
                healthy = true;
                reason = `HTTP ${response.status} — service is running`;
            } else if (response.status === 404) {
                // Google's infra returns a generic 404 for deleted Cloud Run services
                // without the x-cloud-trace-context header that real containers add.
                if (response.headers.has('x-cloud-trace-context')) {
                    healthy = true;
                    reason = 'HTTP 404 — service is running (route not found)';
                } else {
                    reason = 'Service not found — the Cloud Run service may have been deleted';
                }
            } else if (response.status >= 500) {
                healthy = true;
                reason = `HTTP ${response.status} — service is running but returning server errors`;
            } else {
                healthy = true;
                reason = `HTTP ${response.status} — service is reachable`;
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (message.includes('abort')) {
                reason = 'Connection timed out after 5s — service may be down or unreachable';
            } else if (message.includes('ENOTFOUND') || message.includes('getaddrinfo')) {
                reason = 'DNS resolution failed — the service URL no longer exists';
            } else if (message.includes('ECONNREFUSED')) {
                reason = 'Connection refused — service is not accepting connections';
            } else {
                reason = `Connection failed — ${message}`;
            }
        }

        if (!healthy && serverId) {
            const config = await loadConfig();
            const server = config.servers.find(s => s.id === serverId);
            if (server && server.status === 'healthy') {
                server.status = 'unhealthy';
                await upsertServer(server);
                socket.emit('global-config-update', { config, fieldDefinitions: getFieldDefinitions() });
            }
        }
        socket.emit('health-check-result', { healthy, reason, statusCode, checkedAt });
    });

    socket.on('get-service-metadata', async (data: { projectId: string, serviceName: string, location?: string }) => {
        try {
            const { projectId, serviceName, location } = data;
            const result = await getServiceMetadata(projectId, serviceName, location);
            socket.emit('service-metadata', result);
        } catch (error) {
            socket.emit('service-metadata', { metadata: null, error: String(error) });
        }
    });
}
