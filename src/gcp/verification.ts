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
        const readyCondition = s.status?.conditions?.find((c: any) => c.type === 'Ready');
        const isReady = readyCondition?.status === 'True';
        const url = s.status?.url;

        return {
            ready: isReady,
            url: url || undefined,
            error: isReady ? undefined : readyCondition?.message || 'Service not ready'
        };

    } catch (error) {
        return { ready: false, error: String(error) };
    }
}
