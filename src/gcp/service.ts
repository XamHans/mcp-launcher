export interface ServiceMetadata {
    serviceName: string;
    region: string;
    url?: string;
    status?: string;
    latestRevision?: {
        name: string;
        image?: string;
        createTime?: string;
        trafficPercent?: number;
    };
    traffic?: { revision: string; percent: number }[];
    scaling?: {
        minInstances?: number;
        maxInstances?: number;
        concurrency?: number;
    };
    lastUpdated?: string;
    lastModifiedBy?: string;
}

/**
 * Fetch Cloud Run service metadata.
 * Uses dynamic imports to avoid loading gRPC clients at startup.
 */
export async function getServiceMetadata(
    projectId: string,
    serviceName: string,
    location: string = 'us-central1'
): Promise<{ metadata: ServiceMetadata | null; error?: string }> {
    try {
        const { ServicesClient, RevisionsClient } = await import('@google-cloud/run');

        const servicesClient = new ServicesClient();
        const revisionsClient = new RevisionsClient();

        const servicePath = `projects/${projectId}/locations/${location}/services/${serviceName}`;
        const [service] = await servicesClient.getService({ name: servicePath });

        const serviceAny: any = service;

        // Basic service info
        const url = serviceAny.uri as string | undefined;
        const readyCondition = Array.isArray(serviceAny.status?.conditions)
            ? serviceAny.status.conditions.find((c: any) => c.type === 'Ready') || serviceAny.status.conditions[0]
            : Array.isArray(serviceAny.conditions)
                ? serviceAny.conditions.find((c: any) => c.type === 'Ready') || serviceAny.conditions[0]
                : undefined;
        const status = readyCondition?.state || readyCondition?.status || readyCondition?.message || serviceAny.status?.latestReadyTransitionTime;
        const lastUpdated = serviceAny.updateTime?.seconds
            ? new Date(Number(serviceAny.updateTime.seconds) * 1000).toISOString()
            : typeof serviceAny.updateTime === 'string'
                ? serviceAny.updateTime
                : serviceAny.etag;
        const lastModifiedBy = serviceAny.creator || serviceAny.lastModifier;

        // Traffic
        const traffic: { revision: string; percent: number }[] = Array.isArray(serviceAny.traffic)
            ? serviceAny.traffic.map((t: { revision?: string; revisionName?: string; percent?: number }) => ({
                revision: t?.revision || t?.revisionName || '',
                percent: Number(t?.percent ?? 0)
            }))
            : [];

        const latestRevisionName = serviceAny.latestReadyRevision || serviceAny.latestCreatedRevision || traffic[0]?.revision || '';

        // Scaling + concurrency from template
        const template = serviceAny.template || {};
        const scaling = template.scaling || template.scalingConfig || {};
        const minInstances = scaling.minInstanceCount ?? scaling.minInstances;
        const maxInstances = scaling.maxInstanceCount ?? scaling.maxInstances;
        const concurrency = template.maxInstanceRequestConcurrency || template.containerConcurrency;

        // Grab revision details if available
        let latestRevision: ServiceMetadata['latestRevision'] | undefined;
        if (latestRevisionName) {
            try {
                const [revision] = await revisionsClient.getRevision({ name: latestRevisionName });
                const revAny: any = revision;
                const container = Array.isArray(revAny.containers) ? revAny.containers[0] : undefined;
                latestRevision = {
                    name: latestRevisionName,
                    image: container?.image,
                    createTime: revAny.createTime,
                    trafficPercent: traffic.find((t) => t.revision === latestRevisionName)?.percent
                };
            } catch {
                // Ignore revision fetch failures; still return service info
                latestRevision = {
                    name: latestRevisionName,
                    trafficPercent: traffic.find((t) => t.revision === latestRevisionName)?.percent
                };
            }
        }

        const metadata: ServiceMetadata = {
            serviceName,
            region: location,
            url,
            status,
            latestRevision,
            traffic,
            scaling: {
                minInstances: minInstances !== undefined ? Number(minInstances) : undefined,
                maxInstances: maxInstances !== undefined ? Number(maxInstances) : undefined,
                concurrency: concurrency !== undefined ? Number(concurrency) : undefined,
            },
            lastUpdated,
            lastModifiedBy,
        };

        return { metadata };
    } catch (error: any) {
        const errorMsg = String(error);
        if (errorMsg.includes('Could not load the default credentials') || errorMsg.includes('NO_ADC_FOUND')) {
            return { metadata: null, error: 'GCP credentials not configured. Run: gcloud auth application-default login' };
        }
        return { metadata: null, error: errorMsg };
    }
}
