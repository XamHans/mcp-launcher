import { ServicesClient } from '@google-cloud/run';

console.log("!!! verification.ts LOADED !!!");

// Instantiate a client - MOVED INSIDE FUNCTION to avoid crash on missing credentials
// const runClient = new ServicesClient();

interface VerificationResult {
    url?: string;
    ready: boolean;
    error?: string;
}

export async function verifyService(projectId: string, serviceName: string, location: string = 'us-central1'): Promise<VerificationResult> {
    console.log("!!! verifyService CALLED !!!");
    try {
        const name = `projects/${projectId}/locations/${location}/services/${serviceName}`;

        // Instantiate client safely inside the function
        // Cloud Run client requires credentials. 
        // If this throws, we catch it instead of crashing the server.
        const runClient = new ServicesClient();

        // Wait for a bit? Or just poll?
        // Let's just get the service and check conditions

        const [service] = await runClient.getService({ name });

        if (!service) {
            return { ready: false, error: 'Service not found' };
        }

        // Cast to any because the types are sometimes restrictive or missing strict null checks
        const s = service as any;
        const conditions: any[] =
            (Array.isArray(s.status?.conditions) ? s.status.conditions : [])
            .concat(Array.isArray(s.conditions) ? s.conditions : []);
        const readyCondition = conditions.find((c: any) => c?.type === 'Ready') || conditions[0];

        const state = readyCondition?.state;
        const status = readyCondition?.status;
        const isReady =
            status === 'True' ||
            status === true ||
            state === 'CONDITION_SUCCEEDED' ||
            state === 'READY';

        const url = s.uri || s.status?.url || s.status?.uri;

        return {
            ready: isReady,
            url: url || undefined,
            error: isReady ? undefined : readyCondition?.message || readyCondition?.reason || 'Service not ready'
        };

    } catch (error) {
        return { ready: false, error: String(error) };
    }
}
