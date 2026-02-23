export interface LogEntry {
    timestamp: string;
    severity: 'DEFAULT' | 'DEBUG' | 'INFO' | 'NOTICE' | 'WARNING' | 'ERROR' | 'CRITICAL';
    message: string;
    rawData?: Record<string, unknown>;
}

export type TimeRange = '1h' | '6h' | '24h' | '7d';

const timeRangeToMs: Record<TimeRange, number> = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
};

// Module-level cached client for reuse across requests
let cachedLoggingClient: any = null;
let cachedLoggingProjectId: string | null = null;

async function getOrCreateLoggingClient(projectId: string): Promise<any> {
    // Reuse if same project
    if (cachedLoggingClient && cachedLoggingProjectId === projectId) {
        return cachedLoggingClient;
    }
    const { Logging } = await import('@google-cloud/logging');
    cachedLoggingClient = new Logging({ projectId });
    cachedLoggingProjectId = projectId;
    return cachedLoggingClient;
}

/**
 * Fetches recent logs for a Cloud Run service.
 * Uses cached Logging client and scoped resourceNames for fast queries.
 */
export async function getServiceLogs(
    projectId: string,
    serviceName: string,
    location: string = 'us-central1',
    timeRange: TimeRange = '1h',
    limit: number = 200
): Promise<{ logs: LogEntry[], error?: string }> {
    try {
        const logging = await getOrCreateLoggingClient(projectId);

        const now = new Date();
        const durationMs = timeRangeToMs[timeRange];
        const startTime = new Date(now.getTime() - durationMs);

        // Cloud Run logs filter with time range
        const filter = [
            `resource.type="cloud_run_revision"`,
            `resource.labels.service_name="${serviceName}"`,
            `resource.labels.location="${location}"`,
            `timestamp >= "${startTime.toISOString()}"`,
        ].join(' AND ');

        const [entries] = await logging.getEntries({
            filter,
            pageSize: limit,
            orderBy: 'timestamp desc',
            // Scope to project for faster queries
            resourceNames: [`projects/${projectId}`],
        });

        const normalizeTimestamp = (ts: any): string => {
            if (!ts) return new Date().toISOString();
            if (typeof ts === 'string') return ts;
            if (ts instanceof Date) return ts.toISOString();
            if (typeof ts?.seconds === 'number') return new Date(ts.seconds * 1000).toISOString();
            if (typeof ts?.seconds === 'string') return new Date(Number(ts.seconds) * 1000).toISOString();
            if (typeof ts?.toDate === 'function') {
                try {
                    const d = ts.toDate();
                    if (d instanceof Date) return d.toISOString();
                } catch {
                    // ignore
                }
            }
            try {
                const d = new Date(ts);
                if (!Number.isNaN(d.getTime())) return d.toISOString();
            } catch {
                // ignore
            }
            return new Date().toISOString();
        };

        const logs: LogEntry[] = entries.map((entry: any) => {
            const metadata = entry?.metadata ?? {};
            const data = entry?.data;
            let message: string = '';

            const tryStringify = (value: unknown): string => {
                if (value == null) return '';
                if (typeof value === 'string') return value;
                if (typeof (value as any)?.message === 'string') return (value as any).message;
                if (typeof (value as any)?.msg === 'string') return (value as any).msg;
                try {
                    const json = JSON.stringify(value);
                    return json ?? String(value);
                } catch {
                    return String(value);
                }
            };

            // Prefer Cloud Logging payload fields first (these are the canonical ones).
            if (typeof metadata.textPayload === 'string') {
                message = metadata.textPayload;
            } else if (metadata.jsonPayload != null) {
                message = tryStringify(metadata.jsonPayload);
            } else if (metadata.protoPayload != null) {
                message = tryStringify(metadata.protoPayload);
            } else if (typeof data === 'string') {
                message = data;
            } else if (data?.message || data?.textPayload || data?.jsonPayload) {
                message = tryStringify(data?.message ?? data?.textPayload ?? data?.jsonPayload ?? data);
            } else {
                message = tryStringify(data);
            }

            // For Cloud Run request logs, extract httpRequest details (method, status, URL, latency, size)
            if (!message || !message.trim()) {
                const httpReq = metadata.httpRequest;
                if (httpReq) {
                    const method = httpReq.requestMethod || '';
                    const status = httpReq.status || '';
                    const size = httpReq.responseSize ? `${httpReq.responseSize} B` : '';
                    const latency = httpReq.latency
                        ? (typeof httpReq.latency === 'object' && httpReq.latency.seconds != null
                            ? `${httpReq.latency.seconds}s`
                            : `${httpReq.latency}`)
                        : '';
                    const url = httpReq.requestUrl || '';
                    const userAgent = httpReq.userAgent || '';

                    const parts = [method, status, size, latency, url].filter(Boolean);
                    message = parts.join('  ');
                    if (userAgent) message += `  (${userAgent})`;
                }
            }

            if (!message || !message.trim()) {
                // Show useful details instead of blank rows
                const logName = typeof metadata.logName === 'string' ? metadata.logName.split('/').pop() : '';
                const severity = metadata.severity || 'DEFAULT';
                message = logName
                    ? `[${severity}] (${logName})`
                    : `[${severity}] (no payload)`;
            }

            // Build raw data object for expandable JSON view
            const rawData: Record<string, unknown> = {};
            if (metadata.logName) rawData.logName = metadata.logName;
            if (metadata.severity) rawData.severity = metadata.severity;
            if (metadata.httpRequest) rawData.httpRequest = metadata.httpRequest;
            if (metadata.textPayload) rawData.textPayload = metadata.textPayload;
            if (metadata.jsonPayload) rawData.jsonPayload = metadata.jsonPayload;
            if (metadata.protoPayload) rawData.protoPayload = metadata.protoPayload;
            if (metadata.labels) rawData.labels = metadata.labels;
            if (metadata.resource) rawData.resource = metadata.resource;
            if (metadata.trace) rawData.trace = metadata.trace;
            if (metadata.spanId) rawData.spanId = metadata.spanId;
            if (data && Object.keys(data).length) rawData.data = data;

            return {
                timestamp: normalizeTimestamp(entry.metadata?.timestamp),
                severity: entry.metadata?.severity || 'DEFAULT',
                message,
                rawData,
            };
        });

        return { logs };
    } catch (error: any) {
        // Reset cached client on error
        cachedLoggingClient = null;
        cachedLoggingProjectId = null;

        const errorMsg = String(error);
        if (errorMsg.includes('Could not load the default credentials') ||
            errorMsg.includes('NO_ADC_FOUND')) {
            return {
                logs: [],
                error: 'GCP credentials not configured. Run: gcloud auth application-default login'
            };
        }
        return { logs: [], error: errorMsg };
    }
}
