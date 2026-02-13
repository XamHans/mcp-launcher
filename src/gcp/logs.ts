export interface LogEntry {
    timestamp: string;
    severity: 'DEFAULT' | 'DEBUG' | 'INFO' | 'NOTICE' | 'WARNING' | 'ERROR' | 'CRITICAL';
    message: string;
}

/**
 * Fetches recent logs for a Cloud Run service
 * Uses dynamic import to avoid crashing when ADC is not configured
 */
export async function getServiceLogs(
    projectId: string,
    serviceName: string,
    location: string = 'us-central1',
    limit: number = 50
): Promise<{ logs: LogEntry[], error?: string }> {
    try {
        // Dynamic import to avoid loading gRPC at module initialization
        const { Logging } = await import('@google-cloud/logging');
        const logging = new Logging({ projectId });

        // Cloud Run logs filter
        const filter = [
            `resource.type="cloud_run_revision"`,
            `resource.labels.service_name="${serviceName}"`,
            `resource.labels.location="${location}"`,
        ].join(' AND ');

        const [entries] = await logging.getEntries({
            filter,
            pageSize: limit,
            orderBy: 'timestamp desc',
        });

        const logs: LogEntry[] = entries.map((entry: any) => {
            const data = entry.data;
            let message = '';

            if (typeof data === 'string') {
                message = data;
            } else if (data?.message) {
                message = data.message;
            } else if (data?.textPayload) {
                message = data.textPayload;
            } else {
                message = JSON.stringify(data);
            }

            return {
                timestamp: entry.metadata?.timestamp || new Date().toISOString(),
                severity: entry.metadata?.severity || 'DEFAULT',
                message,
            };
        });

        return { logs };
    } catch (error: any) {
        // Check for ADC-specific error message
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
