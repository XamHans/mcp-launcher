export interface ServiceMetrics {
    requestCount: number;
    latencyP50Ms: number | null;
    instanceCount: number;
}

/**
 * Fetches metrics for a Cloud Run service from the last hour
 * Uses dynamic import to avoid crashing when ADC is not configured
 */
export async function getServiceMetrics(
    projectId: string,
    serviceName: string,
    location: string = 'us-central1'
): Promise<{ metrics: ServiceMetrics, error?: string }> {
    const defaultMetrics: ServiceMetrics = {
        requestCount: 0,
        latencyP50Ms: null,
        instanceCount: 0,
    };

    try {
        // Dynamic import to avoid loading gRPC at module initialization
        const { MetricServiceClient } = await import('@google-cloud/monitoring');
        const client = new MetricServiceClient();
        const projectName = `projects/${projectId}`;

        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        const timeInterval = {
            startTime: { seconds: Math.floor(oneHourAgo.getTime() / 1000) },
            endTime: { seconds: Math.floor(now.getTime() / 1000) },
        };

        // Filter for our specific service
        const resourceFilter = `resource.type="cloud_run_revision" AND resource.labels.service_name="${serviceName}" AND resource.labels.location="${location}"`;

        // Fetch request count
        const [requestCountSeries] = await client.listTimeSeries({
            name: projectName,
            filter: `metric.type="run.googleapis.com/request_count" AND ${resourceFilter}`,
            interval: timeInterval,
            view: 'FULL',
        });

        let requestCount = 0;
        for (const series of requestCountSeries) {
            for (const point of series.points || []) {
                requestCount += Number(point.value?.int64Value || 0);
            }
        }

        // Fetch instance count (latest value)
        const [instanceSeries] = await client.listTimeSeries({
            name: projectName,
            filter: `metric.type="run.googleapis.com/container/instance_count" AND ${resourceFilter}`,
            interval: timeInterval,
            view: 'FULL',
        });

        let instanceCount = 0;
        if (instanceSeries.length > 0 && instanceSeries[0].points?.length) {
            instanceCount = Number(instanceSeries[0].points[0].value?.int64Value || 0);
        }

        // Fetch latency (using request_latencies distribution)
        const [latencySeries] = await client.listTimeSeries({
            name: projectName,
            filter: `metric.type="run.googleapis.com/request_latencies" AND ${resourceFilter}`,
            interval: timeInterval,
            view: 'FULL',
        });

        let latencyP50Ms: number | null = null;
        if (latencySeries.length > 0 && latencySeries[0].points?.length) {
            const dist = latencySeries[0].points[0].value?.distributionValue;
            if (dist?.mean) {
                latencyP50Ms = Math.round(dist.mean);
            }
        }

        // Close the client to release resources
        await client.close();

        return {
            metrics: { requestCount, latencyP50Ms, instanceCount },
        };
    } catch (error: any) {
        // Check for ADC-specific error message
        const errorMsg = String(error);
        if (errorMsg.includes('Could not load the default credentials') ||
            errorMsg.includes('NO_ADC_FOUND')) {
            return {
                metrics: defaultMetrics,
                error: 'GCP credentials not configured. Run: gcloud auth application-default login'
            };
        }
        return { metrics: defaultMetrics, error: errorMsg };
    }
}
