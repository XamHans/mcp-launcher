import { Socket } from 'socket.io';
import { runAuditAndGeneration } from '../../agent/audit';
import { runDeploymentPipeline } from '../../orchestrator/runner';
import { loadConfig, getFieldDefinitions, upsertServer } from '../../config/config';
import { execa } from 'execa';

export function registerDeployHandlers(socket: Socket) {
    socket.on('deploy-server', async (data: { serverId: string, deployOnly?: boolean }) => {
        const { serverId, deployOnly } = data;

        const config = await loadConfig();
        const server = config.servers.find(s => s.id === serverId);

        if (!server) {
            socket.emit('deploy-error', { message: 'Server not found' });
            return;
        }

        const projectId = config.credentials.googleProjectId;
        const anthropicKey = config.credentials.anthropicKey;

        if (!projectId) {
            socket.emit('deploy-error', { message: 'Missing Global Project ID' });
            return;
        }

        server.status = 'deploying';
        await upsertServer(server);
        socket.emit('global-config-update', { config, fieldDefinitions: getFieldDefinitions() });

        console.log(`Deploy started for ${server.name} (${server.id})`);
        socket.emit('log', { message: `Starting deployment for ${server.name}...`, type: 'info' });

        const projectPath = server.sourcePath;

        try {
            if (!deployOnly) {
                socket.emit('step-update', { stepIndex: 0 });

                if (!anthropicKey) {
                    socket.emit('deploy-error', { message: 'Missing API Key (required for audit mode)' });
                    server.status = 'unhealthy';
                    await upsertServer(server);
                    return;
                }

                const auditResult = await runAuditAndGeneration({
                    projectPath,
                    apiKey: anthropicKey,
                    projectId: projectId,
                    onLog: (message, type = 'info') => {
                        socket.emit('log', { message, type });
                    }
                });

                if (!auditResult.success) {
                    const errorMsg = auditResult.error || 'Audit failed';
                    socket.emit('deploy-error', { message: errorMsg });
                    server.status = 'unhealthy';
                    await upsertServer(server);
                    return;
                }

                socket.emit('log', { message: 'Audit & Generation Complete.', type: 'success' });
            } else {
                socket.emit('log', { message: 'Deploy Only mode: Skipping agent audit...', type: 'info' });
            }

            socket.emit('step-update', { stepIndex: 1 });

            const serviceName = server.cloudRunServiceName || server.name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50) || 'mcp-server';
            const region = server.cloudRunRegion || 'us-central1';

            const deployResult = await runDeploymentPipeline({
                projectId,
                projectPath,
                serviceName,
                region,
                onLog: (message, type = 'info') => {
                    socket.emit('log', { message, type });
                    if (message.includes('GCP Setup')) socket.emit('step-update', { stepIndex: 1 });
                    if (message.includes('Building Container')) socket.emit('step-update', { stepIndex: 2 });
                    if (message.includes('Pushing to Registry')) socket.emit('step-update', { stepIndex: 3 });
                }
            });

            if (!deployResult.success) {
                const errorMsg = deployResult.error || 'Deployment failed';
                socket.emit('deploy-error', { message: errorMsg });
                server.status = 'unhealthy';
                await upsertServer(server);
                return;
            }

            if (deployResult.url) {
                const finalUrl = `${deployResult.url}/mcp`;

                server.status = 'healthy';
                server.deployedUrl = finalUrl;
                server.lastDeployedAt = new Date().toISOString();
                server.cloudRunServiceName = serviceName;
                server.cloudRunRegion = region;
                await upsertServer(server);

                socket.emit('global-config-update', { config, fieldDefinitions: getFieldDefinitions() });

                socket.emit('log', { message: '─'.repeat(50), type: 'info' });
                socket.emit('log', { message: '✅ Deployment completed successfully!', type: 'success' });
                socket.emit('log', { message: `🌐 Service URL: ${deployResult.url}`, type: 'success' });
                socket.emit('log', { message: `🔗 SSE Endpoint: ${finalUrl}`, type: 'success' });
                socket.emit('deploy-complete', { url: finalUrl });

            } else {
                socket.emit('deploy-error', { message: 'Deployment succeeded but URL could not be captured' });
                server.status = 'unhealthy';
                await upsertServer(server);
            }

        } catch (err) {
            socket.emit('deploy-error', { message: String(err) });
            server.status = 'unhealthy';
            await upsertServer(server);
        }
    });

    socket.on('check-prerequisites', async () => {
        const result = {
            gcloud: { installed: false, authenticated: false, fix: 'gcloud auth login' },
            docker: { installed: false, running: false, fix: 'open -a Docker' },
            adc: { configured: false, fix: 'gcloud auth application-default login' }
        };

        try {
            await execa('which', ['gcloud']);
            result.gcloud.installed = true;
            try {
                await execa('gcloud', ['auth', 'print-identity-token'], { timeout: 5000 });
                result.gcloud.authenticated = true;
            } catch { result.gcloud.authenticated = false; }

            try {
                await execa('gcloud', ['auth', 'application-default', 'print-access-token'], { timeout: 5000 });
                result.adc.configured = true;
            } catch {
                result.adc.configured = false;
            }
        } catch { result.gcloud.installed = false; }

        try {
            await execa('which', ['docker']);
            result.docker.installed = true;
            try {
                await execa('docker', ['info'], { timeout: 5000 });
                result.docker.running = true;
            } catch { result.docker.running = false; }
        } catch { result.docker.installed = false; }

        socket.emit('prerequisites-checked', result);
    });
}
