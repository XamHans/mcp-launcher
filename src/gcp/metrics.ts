export interface ServiceMetrics {
    requestCount: number;
    latencyP50Ms: number | null;
    latencyP95Ms: number | null;
    latencyP99Ms: number | null;
    instanceCount: number;
    errorCount: number;
    errorRate: number;
}

export type TimeRange = '1h' | '6h' | '24h' | '7d';

const timeRangeToMs: Record<TimeRange, number> = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
};

type PointValue = { doubleValue?: number; int64Value?: unknown } | null | undefined;

let cachedRequestLatenciesUnit: string | null | undefined;

function toNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '') return Number(value);
    return 0;
}

function getPointNumericValue(point: any): number {
    const v: PointValue = point?.value;
    if (!v) return 0;
    if (typeof v.doubleValue === 'number') return v.doubleValue;
    if (v.int64Value !== undefined) return toNumber(v.int64Value);
    return 0;
}

function getMostRecentPointValue(timeSeries: any[]): number | null {
    if (!Array.isArray(timeSeries) || timeSeries.length === 0) return null;
    const points = timeSeries[0]?.points;
    if (!Array.isArray(points) || points.length === 0) return null;
    return getPointNumericValue(points[0]);
}

async function getRequestLatenciesUnit(client: any, projectName: string): Promise<string | null> {
    if (cachedRequestLatenciesUnit !== undefined) return cachedRequestLatenciesUnit ?? null;
    try {
        const [descriptor] = await client.getMetricDescriptor({
            name: `${projectName}/metricDescriptors/run.googleapis.com/request_latencies`,
        });
        cachedRequestLatenciesUnit = typeof descriptor?.unit === 'string' ? descriptor.unit : null;
    } catch {
        cachedRequestLatenciesUnit = null;
    }
    return cachedRequestLatenciesUnit ?? null;
}

function latencyToMs(value: number | null, unit: string | null): number | null {
    if (value === null) return null;
    // https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.metricDescriptors
    // Units are typically "s", but can vary; convert conservatively.
    if (!unit) return Math.round(value * 1000);
    const normalized = unit.trim().toLowerCase();
    if (normalized === 'ms') return Math.round(value);
    if (normalized === 's') return Math.round(value * 1000);
    if (normalized === 'us' || normalized === 'µs') return Math.round(value / 1000);
    if (normalized === 'ns') return Math.round(value / 1_000_000);
    // default to seconds
    return Math.round(value * 1000);
}

/**
 * Fetches metrics for a Cloud Run service
 * Uses dynamic import to avoid crashing when ADC is not configured
 */
export async function getServiceMetrics(
    projectId: string,
    serviceName: string,
    location: string = 'us-central1',
    timeRange: TimeRange = '1h'
): Promise<{ metrics: ServiceMetrics, error?: string }> {
    const defaultMetrics: ServiceMetrics = {
        requestCount: 0,
        latencyP50Ms: null,
        latencyP95Ms: null,
        latencyP99Ms: null,
        instanceCount: 0,
        errorCount: 0,
        errorRate: 0,
    };

    let client: any;
    try {
        // Dynamic import to avoid loading gRPC at module initialization
        const { MetricServiceClient } = await import('@google-cloud/monitoring');
        client = new MetricServiceClient();
        const projectName = `projects/${projectId}`;

        const now = new Date();
        const durationMs = timeRangeToMs[timeRange];
        const startTime = new Date(now.getTime() - durationMs);

        const timeInterval = {
            startTime: { seconds: Math.floor(startTime.getTime() / 1000) },
            endTime: { seconds: Math.floor(now.getTime() / 1000) },
        };

        // Filter for our specific service
        const resourceFilter = `resource.type="cloud_run_revision" AND resource.labels.service_name="${serviceName}" AND resource.labels.location="${location}"`;

        const durationSeconds = Math.max(60, Math.floor(durationMs / 1000));

        // Request count across the whole time range.
        // `run.googleapis.com/request_count` is a DELTA metric; we align by SUM and reduce by SUM across revisions.
        const [requestCountSeries] = await client.listTimeSeries({
            name: projectName,
            filter: `metric.type="run.googleapis.com/request_count" AND ${resourceFilter}`,
            interval: timeInterval,
            view: 'FULL',
            aggregation: {
                alignmentPeriod: { seconds: durationSeconds },
                perSeriesAligner: 'ALIGN_SUM',
                crossSeriesReducer: 'REDUCE_SUM',
                groupByFields: [],
            },
        });

        const requestCount = Array.isArray(requestCountSeries) && requestCountSeries.length > 0
            ? Math.round(getPointNumericValue(requestCountSeries[0]?.points?.[0]))
            : 0;

        // Fetch error count (5xx responses)
        const [errorCountSeries] = await client.listTimeSeries({
            name: projectName,
            filter: `metric.type="run.googleapis.com/request_count" AND metric.labels.response_code_class="5xx" AND ${resourceFilter}`,
            interval: timeInterval,
            view: 'FULL',
            aggregation: {
                alignmentPeriod: { seconds: durationSeconds },
                perSeriesAligner: 'ALIGN_SUM',
                crossSeriesReducer: 'REDUCE_SUM',
                groupByFields: [],
            },
        });

        const errorCount = Array.isArray(errorCountSeries) && errorCountSeries.length > 0
            ? Math.round(getPointNumericValue(errorCountSeries[0]?.points?.[0]))
            : 0;

        const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;

        // Instance count (GAUGE): use 60s alignment and take most recent point.
        const [instanceSeries] = await client.listTimeSeries({
            name: projectName,
            filter: `metric.type="run.googleapis.com/container/instance_count" AND ${resourceFilter}`,
            interval: timeInterval,
            view: 'FULL',
            aggregation: {
                alignmentPeriod: { seconds: 60 },
                perSeriesAligner: 'ALIGN_MAX',
                crossSeriesReducer: 'REDUCE_MAX',
                groupByFields: [],
            },
        });

        const instanceCount = Math.round(getMostRecentPointValue(instanceSeries) ?? 0);

        // Latency percentiles:
        // `run.googleapis.com/request_latencies` is a distribution metric (unit: seconds).
        // Use built-in percentile aligners to get scalar values and convert to ms.
        const latencyAggregationBase = {
            alignmentPeriod: { seconds: durationSeconds },
            crossSeriesReducer: 'REDUCE_MEAN',
            groupByFields: [],
        };

        const [latencyP50Series] = await client.listTimeSeries({
            name: projectName,
            filter: `metric.type="run.googleapis.com/request_latencies" AND ${resourceFilter}`,
            interval: timeInterval,
            view: 'FULL',
            aggregation: { ...latencyAggregationBase, perSeriesAligner: 'ALIGN_PERCENTILE_50' },
        });
        const [latencyP95Series] = await client.listTimeSeries({
            name: projectName,
            filter: `metric.type="run.googleapis.com/request_latencies" AND ${resourceFilter}`,
            interval: timeInterval,
            view: 'FULL',
            aggregation: { ...latencyAggregationBase, perSeriesAligner: 'ALIGN_PERCENTILE_95' },
        });
        const [latencyP99Series] = await client.listTimeSeries({
            name: projectName,
            filter: `metric.type="run.googleapis.com/request_latencies" AND ${resourceFilter}`,
            interval: timeInterval,
            view: 'FULL',
            aggregation: { ...latencyAggregationBase, perSeriesAligner: 'ALIGN_PERCENTILE_99' },
        });

        const latencyP50Seconds = getMostRecentPointValue(latencyP50Series);
        const latencyP95Seconds = getMostRecentPointValue(latencyP95Series);
        const latencyP99Seconds = getMostRecentPointValue(latencyP99Series);

        const requestLatenciesUnit = await getRequestLatenciesUnit(client, projectName);

        const latencyP50Ms = latencyToMs(latencyP50Seconds, requestLatenciesUnit);
        const latencyP95Ms = latencyToMs(latencyP95Seconds, requestLatenciesUnit);
        const latencyP99Ms = latencyToMs(latencyP99Seconds, requestLatenciesUnit);

        return {
            metrics: { requestCount, latencyP50Ms, latencyP95Ms, latencyP99Ms, instanceCount, errorCount, errorRate },
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
    } finally {
        try {
            await client?.close?.();
        } catch {
            // ignore
        }
    }
}
