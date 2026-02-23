export interface ServiceMetrics {
    requestCount: number;
    latencyP50Ms: number | null;
    latencyP95Ms: number | null;
    latencyP99Ms: number | null;
    instanceCount: number;
    errorCount: number;
    errorRate: number;
    cpuUtilization: number | null;
    memoryUtilization: number | null;
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

// Module-level cached client for reuse across requests
let cachedMetricsClient: any = null;

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

/**
 * Sum ALL points across ALL time series to get the true total for DELTA metrics.
 * A single series may have multiple aligned points when the alignment period
 * is shorter than the query window.
 */
function sumAllPoints(timeSeries: any[]): number {
    if (!Array.isArray(timeSeries) || timeSeries.length === 0) return 0;
    let total = 0;
    for (const series of timeSeries) {
        const points = series?.points;
        if (!Array.isArray(points)) continue;
        for (const point of points) {
            total += getPointNumericValue(point);
        }
    }
    return total;
}

async function getOrCreateClient(): Promise<any> {
    if (cachedMetricsClient) {
        return cachedMetricsClient;
    }
    const { MetricServiceClient } = await import('@google-cloud/monitoring');
    cachedMetricsClient = new MetricServiceClient();
    return cachedMetricsClient;
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
    if (!unit) return Math.round(value * 1000);
    const normalized = unit.trim().toLowerCase();
    if (normalized === 'ms') return Math.round(value);
    if (normalized === 's') return Math.round(value * 1000);
    if (normalized === 'us' || normalized === 'µs') return Math.round(value / 1000);
    if (normalized === 'ns') return Math.round(value / 1_000_000);
    return Math.round(value * 1000);
}

/**
 * Fetches metrics for a Cloud Run service.
 * All API calls are made in parallel via Promise.all for maximum speed.
 * The MetricServiceClient is cached at module level for reuse.
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
        cpuUtilization: null,
        memoryUtilization: null,
    };

    let client: any;
    try {
        client = await getOrCreateClient();
        const projectName = `projects/${projectId}`;

        const now = new Date();
        const durationMs = timeRangeToMs[timeRange];
        const startTime = new Date(now.getTime() - durationMs);

        const timeInterval = {
            startTime: { seconds: Math.floor(startTime.getTime() / 1000) },
            endTime: { seconds: Math.floor(now.getTime() / 1000) },
        };

        const resourceFilter = `resource.type="cloud_run_revision" AND resource.labels.service_name="${serviceName}" AND resource.labels.location="${location}"`;

        const durationSeconds = Math.max(60, Math.floor(durationMs / 1000));

        // Common aggregation base for latency percentiles
        const latencyAggregationBase = {
            alignmentPeriod: { seconds: durationSeconds },
            crossSeriesReducer: 'REDUCE_MEAN',
            groupByFields: [],
        };

        // Fire ALL metric queries in parallel for maximum speed
        const [
            requestCountResult,
            errorCountResult,
            instanceResult,
            latencyP50Result,
            latencyP95Result,
            latencyP99Result,
            cpuResult,
            memoryResult,
            latencyUnit,
        ] = await Promise.all([
            // Request count (DELTA → SUM)
            client.listTimeSeries({
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
            }),
            // Error count (5xx responses)
            client.listTimeSeries({
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
            }),
            // Instance count (GAUGE → MAX)
            client.listTimeSeries({
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
            }),
            // Latency P50
            client.listTimeSeries({
                name: projectName,
                filter: `metric.type="run.googleapis.com/request_latencies" AND ${resourceFilter}`,
                interval: timeInterval,
                view: 'FULL',
                aggregation: { ...latencyAggregationBase, perSeriesAligner: 'ALIGN_PERCENTILE_50' },
            }),
            // Latency P95
            client.listTimeSeries({
                name: projectName,
                filter: `metric.type="run.googleapis.com/request_latencies" AND ${resourceFilter}`,
                interval: timeInterval,
                view: 'FULL',
                aggregation: { ...latencyAggregationBase, perSeriesAligner: 'ALIGN_PERCENTILE_95' },
            }),
            // Latency P99
            client.listTimeSeries({
                name: projectName,
                filter: `metric.type="run.googleapis.com/request_latencies" AND ${resourceFilter}`,
                interval: timeInterval,
                view: 'FULL',
                aggregation: { ...latencyAggregationBase, perSeriesAligner: 'ALIGN_PERCENTILE_99' },
            }),
            // CPU Utilization (distribution → P99 gives a useful upper-bound view)
            client.listTimeSeries({
                name: projectName,
                filter: `metric.type="run.googleapis.com/container/cpu/utilizations" AND ${resourceFilter}`,
                interval: timeInterval,
                view: 'FULL',
                aggregation: {
                    alignmentPeriod: { seconds: durationSeconds },
                    perSeriesAligner: 'ALIGN_PERCENTILE_99',
                    crossSeriesReducer: 'REDUCE_MEAN',
                    groupByFields: [],
                },
            }),
            // Memory Utilization (distribution → P99)
            client.listTimeSeries({
                name: projectName,
                filter: `metric.type="run.googleapis.com/container/memory/utilizations" AND ${resourceFilter}`,
                interval: timeInterval,
                view: 'FULL',
                aggregation: {
                    alignmentPeriod: { seconds: durationSeconds },
                    perSeriesAligner: 'ALIGN_PERCENTILE_99',
                    crossSeriesReducer: 'REDUCE_MEAN',
                    groupByFields: [],
                },
            }),
            // Latency unit descriptor (cached after first call)
            getRequestLatenciesUnit(client, projectName),
        ]);

        // Extract results from parallel responses
        const requestCountSeries = requestCountResult[0];
        const errorCountSeries = errorCountResult[0];
        const instanceSeries = instanceResult[0];
        const latencyP50Series = latencyP50Result[0];
        const latencyP95Series = latencyP95Result[0];
        const latencyP99Series = latencyP99Result[0];
        const cpuSeries = cpuResult[0];
        const memorySeries = memoryResult[0];
        const requestLatenciesUnit = latencyUnit;

        const requestCount = Math.round(sumAllPoints(requestCountSeries));
        const errorCount = Math.round(sumAllPoints(errorCountSeries));
        const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
        const instanceCount = Math.round(getMostRecentPointValue(instanceSeries) ?? 0);

        const latencyP50Ms = latencyToMs(getMostRecentPointValue(latencyP50Series), requestLatenciesUnit);
        const latencyP95Ms = latencyToMs(getMostRecentPointValue(latencyP95Series), requestLatenciesUnit);
        const latencyP99Ms = latencyToMs(getMostRecentPointValue(latencyP99Series), requestLatenciesUnit);

        // CPU/Memory utilizations are reported as fractions (0.0–1.0), convert to percentage
        const rawCpu = getMostRecentPointValue(cpuSeries);
        const rawMem = getMostRecentPointValue(memorySeries);
        const cpuUtilization = rawCpu !== null ? Math.round(rawCpu * 10000) / 100 : null;
        const memoryUtilization = rawMem !== null ? Math.round(rawMem * 10000) / 100 : null;

        return {
            metrics: {
                requestCount, latencyP50Ms, latencyP95Ms, latencyP99Ms,
                instanceCount, errorCount, errorRate,
                cpuUtilization, memoryUtilization,
            },
        };
    } catch (error: any) {
        // Reset cached client on error so next call creates a fresh one
        cachedMetricsClient = null;

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
