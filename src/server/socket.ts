import { Server, Socket } from 'socket.io';
import { runAuditAndGeneration } from '../agent/audit';
import { runDeploymentPipeline } from '../orchestrator/runner';
import { verifyService } from '../gcp/verification';
import { getServiceMetrics, TimeRange as MetricsTimeRange } from '../gcp/metrics';
import { getServiceLogs, TimeRange as LogsTimeRange } from '../gcp/logs';
import { getServiceMetadata } from '../gcp/service';
import { loadConfig, saveConfig, validateField, getFieldDefinitions, upsertServer, removeServer, GlobalConfig, MCPServer } from '../config/config';
import { inspectMcpServer, invokeMcpTool, readMcpResource, getMcpPrompt } from './mcpClient';
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

        // --- MCP Inspection ---

        socket.on('inspect-mcp', async (data: { url: string; headers?: Record<string, string>; requestId?: string }) => {
            const { url, headers, requestId } = data || {};
            console.log(`[Socket] inspect-mcp received from ${socket.id}, requestId: ${requestId}, url: ${url}`);

            if (!url) {
                console.log(`[Socket] inspect-mcp error: no URL provided`);
                socket.emit('mcp-inspection-error', { requestId, message: 'MCP endpoint URL is required' });
                return;
            }

            try {
                console.log(`[Socket] Calling inspectMcpServer...`);
                const result = await inspectMcpServer({ url, headers });
                console.log(`[Socket] inspectMcpServer success, tools: ${result.tools.length}, resources: ${result.resources.length}`);
                socket.emit('mcp-inspection-result', { requestId, result });
                console.log(`[Socket] mcp-inspection-result emitted`);
            } catch (error) {
                console.error(`[Socket] inspectMcpServer error:`, error);
                socket.emit('mcp-inspection-error', { requestId, message: String(error) });
            }
        });

        // --- MCP Tool Invocation ---

        socket.on('invoke-mcp-tool', async (data: { 
            url: string; 
            headers?: Record<string, string>; 
            toolName: string; 
            args: Record<string, unknown>;
            requestId?: string;
        }) => {
            const { url, headers, toolName, args, requestId } = data || {};

            if (!url || !toolName) {
                socket.emit('mcp-tool-invocation-error', { 
                    requestId, 
                    message: 'URL and tool name are required' 
                });
                return;
            }

            try {
                const result = await invokeMcpTool({ url, headers, toolName, args });
                socket.emit('mcp-tool-invocation-result', { requestId, result });
            } catch (error) {
                socket.emit('mcp-tool-invocation-error', { 
                    requestId, 
                    message: String(error) 
                });
            }
        });

        // --- MCP Resource Reading ---

        socket.on('read-mcp-resource', async (data: { 
            url: string; 
            headers?: Record<string, string>; 
            uri: string;
            requestId?: string;
        }) => {
            const { url, headers, uri, requestId } = data || {};

            if (!url || !uri) {
                socket.emit('mcp-resource-read-error', { 
                    requestId, 
                    message: 'URL and resource URI are required' 
                });
                return;
            }

            try {
                const result = await readMcpResource({ url, headers, uri });
                socket.emit('mcp-resource-read-result', { requestId, result });
            } catch (error) {
                socket.emit('mcp-resource-read-error', { 
                    requestId, 
                    message: String(error) 
                });
            }
        });

        // --- MCP Prompt Fetching ---

        socket.on('get-mcp-prompt', async (data: { 
            url: string; 
            headers?: Record<string, string>; 
            promptName: string;
            args?: Record<string, string>;
            requestId?: string;
        }) => {
            const { url, headers, promptName, args, requestId } = data || {};

            if (!url || !promptName) {
                socket.emit('mcp-prompt-error', { 
                    requestId, 
                    message: 'URL and prompt name are required' 
                });
                return;
            }

            try {
                const result = await getMcpPrompt({ url, headers, promptName, args });
                socket.emit('mcp-prompt-result', { requestId, result });
            } catch (error) {
                socket.emit('mcp-prompt-error', { 
                    requestId, 
                    message: String(error) 
                });
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
                const serviceName = server.cloudRunServiceName || server.name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50) || 'mcp-server';
                const region = server.cloudRunRegion || 'us-central1';

                const deployResult = await runDeploymentPipeline({
                    projectId,
                    projectPath,
                    serviceName,
                    region,
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

        // --- GCP Metrics & Logs ---

        socket.on('verify-service', async (data: { projectId: string, serviceName: string, location?: string, serverId?: string }) => {
            try {
                const { projectId, serviceName, location = 'us-central1', serverId } = data;
                const result = await verifyService(projectId, serviceName, location);
                
                // If service not found and we have a serverId, update the local status
                if (!result.ready && result.error?.includes('not found') && serverId) {
                    const config = await loadConfig();
                    const server = config.servers.find(s => s.id === serverId);
                    if (server && server.status === 'healthy') {
                        server.status = 'unhealthy';
                        await upsertServer(server);
                        socket.emit('global-config-update', { config, fieldDefinitions: getFieldDefinitions() });
                    }
                }
                
                socket.emit('service-verified', result);
            } catch (error) {
                socket.emit('service-verified', { ready: false, error: String(error) });
            }
        });

        socket.on('get-service-metrics', async (data: { projectId: string, serviceName: string, location?: string, timeRange?: MetricsTimeRange }) => {
            try {
                const { projectId, serviceName, location, timeRange } = data;
                
                // First verify service exists
                const verification = await verifyService(projectId, serviceName, location);
                if (!verification.ready && verification.error?.toLowerCase().includes('not found')) {
                    socket.emit('service-metrics', { 
                        metrics: null, 
                        error: verification.error || 'Service not found on GCP. It may have been deleted.' 
                    });
                    return;
                }
                
                const result = await getServiceMetrics(projectId, serviceName, location, timeRange);
                socket.emit('service-metrics', result);
            } catch (error) {
                socket.emit('service-metrics', { metrics: null, error: String(error) });
            }
        });

        socket.on('get-service-logs', async (data: { projectId: string, serviceName: string, location?: string, timeRange?: LogsTimeRange, limit?: number }) => {
            try {
                const { projectId, serviceName, location, timeRange, limit } = data;
                const result = await getServiceLogs(projectId, serviceName, location, timeRange, limit);
                socket.emit('service-logs', result);
            } catch (error) {
                socket.emit('service-logs', { logs: [], error: String(error) });
            }
        });

        socket.on('get-service-metadata', async (data: { projectId: string, serviceName: string, location?: string }) => {
            try {
                const { projectId, serviceName, location } = data;
                const result = await getServiceMetadata(projectId, serviceName, location);
                socket.emit('service-metadata', result);
            } catch (error) {
                socket.emit('service-metadata', { metadata: null, error: String(error) });
            }
        });
    });
}
