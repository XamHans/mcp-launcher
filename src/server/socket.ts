import { Server, Socket } from 'socket.io';
import { runAuditAndGeneration } from '../agent/audit';
import { runDeploymentPipeline } from '../orchestrator/runner';
import { verifyService } from '../gcp/verification';
import { getServiceMetrics } from '../gcp/metrics';
import { getServiceLogs } from '../gcp/logs';
import { loadConfig, saveConfig, validateField, getFieldDefinitions, upsertServer, removeServer, GlobalConfig, MCPServer } from '../config/config';
import { execa } from 'execa';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export function setupSocketHandlers(io: Server) {
    io.on('connection', (socket: Socket) => {
        console.log('Client connected:', socket.id);

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });

        // --- Utility ---
        socket.on('get-system-info', () => {
            socket.emit('system-info', { cwd: process.cwd() });
        });

        socket.on('list-directory', async (requestPath: string) => {
            try {
                const targetPath = requestPath || process.cwd();
                const entries = await fs.readdir(targetPath, { withFileTypes: true });

                const folders = entries
                    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
                    .map(entry => ({
                        name: entry.name,
                        path: path.join(targetPath, entry.name)
                    }));

                // Add parent directory option if not at root
                const parentPath = path.dirname(targetPath);
                if (parentPath !== targetPath) {
                    folders.unshift({ name: '..', path: parentPath });
                }

                socket.emit('directory-listing', {
                    path: targetPath,
                    folders: folders
                });
            } catch (error) {
                socket.emit('directory-error', { message: String(error) });
            }
        });

        // --- Configuration & Server Management ---

        socket.on('get-global-config', async () => {
            try {
                const config = await loadConfig();
                // Send field definitions along with config for the UI
                socket.emit('global-config-update', { config, fieldDefinitions: getFieldDefinitions() });
            } catch (error) {
                socket.emit('config-error', { message: String(error) });
            }
        });

        socket.on('save-credentials', async (creds: { googleProjectId?: string, anthropicKey?: string }) => {
            try {
                const config = await loadConfig();
                config.credentials = { ...config.credentials, ...creds };
                // If both present, mark onboarding? Let's leave that to the frontend to decide when to proceed.
                if (creds.googleProjectId && creds.anthropicKey) {
                    config.onboardingCompleted = true;
                }
                const result = await saveConfig(config);
                socket.emit('config-saved', result);
                socket.emit('global-config-update', { config, fieldDefinitions: getFieldDefinitions() });
            } catch (error) {
                socket.emit('config-error', { message: String(error) });
            }
        });

        socket.on('create-server', async (serverData: Partial<MCPServer>) => {
            try {
                const newServer: MCPServer = {
                    id: uuidv4(),
                    name: serverData.name || 'Untitled Server',
                    description: serverData.description || '',
                    sourcePath: serverData.sourcePath || '',
                    status: 'draft',
                    ...serverData
                };

                // Validate source path before adding
                if (!newServer.sourcePath) {
                    socket.emit('server-error', { message: 'Source path is required' });
                    return;
                }

                const config = await upsertServer(newServer);
                socket.emit('server-created', newServer);
                socket.emit('global-config-update', { config, fieldDefinitions: getFieldDefinitions() });
            } catch (error) {
                socket.emit('server-error', { message: String(error) });
            }
        });

        socket.on('update-server', async (serverData: MCPServer) => {
            try {
                if (!serverData.id) {
                    socket.emit('server-error', { message: 'Server ID is required for updates' });
                    return;
                }
                const config = await upsertServer(serverData);
                socket.emit('global-config-update', { config, fieldDefinitions: getFieldDefinitions() });
            } catch (error) {
                socket.emit('server-error', { message: String(error) });
            }
        });

        socket.on('delete-server', async (serverId: string) => {
            try {
                const config = await removeServer(serverId);
                socket.emit('global-config-update', { config, fieldDefinitions: getFieldDefinitions() });
            } catch (error) {
                socket.emit('server-error', { message: String(error) });
            }
        });

        socket.on('validate-field', async (data: { field: string; value: string }) => {
            try {
                const result = await validateField(data.field, data.value);
                socket.emit('field-validated', { field: data.field, ...result });
            } catch (error) {
                socket.emit('field-validated', { field: data.field, valid: false, message: String(error) });
            }
        });

        // --- Deployment ---

        socket.on('deploy-server', async (data: { serverId: string, deployOnly?: boolean }) => {
            const { serverId, deployOnly } = data;

            // 1. Get Config & Server
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

            // Update status to deploying
            server.status = 'deploying';
            await upsertServer(server);
            socket.emit('global-config-update', { config, fieldDefinitions: getFieldDefinitions() });

            console.log(`Deploy started for ${server.name} (${server.id})`);
            socket.emit('log', { message: `Starting deployment for ${server.name}...`, type: 'info' });

            const projectPath = server.sourcePath;

            try {
                // 2. Audit (skip if deployOnly mode)
                if (!deployOnly) {
                    socket.emit('step-update', { stepIndex: 0 }); // Agent Audit

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

                socket.emit('step-update', { stepIndex: 1 }); // Infrastructure

                // 3. Orchestration
                const deployResult = await runDeploymentPipeline({
                    projectId,
                    projectPath,
                    onLog: (message, type = 'info') => {
                        socket.emit('log', { message, type });
                        // Simple heuristic step updates
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

                // 4. Capture URL & Finalize
                if (deployResult.url) {
                    const finalUrl = `${deployResult.url}/mcp`;
                    // Verification (Optional - can be skipped for speed if requested, but good to have)
                    // For now, let's trust the deployment url if captured

                    server.status = 'healthy';
                    server.deployedUrl = finalUrl;
                    server.lastDeployedAt = new Date().toISOString();
                    await upsertServer(server);

                    socket.emit('global-config-update', { config, fieldDefinitions: getFieldDefinitions() });

                    socket.emit('log', { message: '─'.repeat(50), type: 'info' });
                    socket.emit('log', { message: '✅ Deployment completed successfully!', type: 'success' });
                    socket.emit('log', { message: `🌐 Service URL: ${deployResult.url}`, type: 'success' });
                    socket.emit('log', { message: `🔗 SSE Endpoint: ${finalUrl}`, type: 'success' });
                    socket.emit('deploy-complete', { url: finalUrl });

                } else {
                    socket.emit('deploy-error', { message: 'Deployment succeeded but URL could not be captured' });
                    server.status = 'unhealthy'; // ambiguous state
                    await upsertServer(server);
                }

            } catch (err) {
                socket.emit('deploy-error', { message: String(err) });
                server.status = 'unhealthy';
                await upsertServer(server);
            }
        });

        // Check prerequisites (gcloud, docker) - Same as before
        socket.on('check-prerequisites', async () => {
            const result = {
                gcloud: { installed: false, authenticated: false, fix: 'gcloud auth login' },
                docker: { installed: false, running: false, fix: 'open -a Docker' }
            };

            try {
                await execa('which', ['gcloud']);
                result.gcloud.installed = true;
                try {
                    await execa('gcloud', ['auth', 'print-identity-token'], { timeout: 5000 });
                    result.gcloud.authenticated = true;
                } catch { result.gcloud.authenticated = false; }
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

        // --- GCP Metrics & Logs ---

        socket.on('get-service-metrics', async (data: { projectId: string, serviceName: string, location?: string }) => {
            try {
                const { projectId, serviceName, location } = data;
                const result = await getServiceMetrics(projectId, serviceName, location);
                socket.emit('service-metrics', result);
            } catch (error) {
                socket.emit('service-metrics', { metrics: null, error: String(error) });
            }
        });

        socket.on('get-service-logs', async (data: { projectId: string, serviceName: string, location?: string, limit?: number }) => {
            try {
                const { projectId, serviceName, location, limit } = data;
                const result = await getServiceLogs(projectId, serviceName, location, limit);
                socket.emit('service-logs', result);
            } catch (error) {
                socket.emit('service-logs', { logs: [], error: String(error) });
            }
        });
    });
}
