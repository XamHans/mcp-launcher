import { Socket } from 'socket.io';
import { loadConfig, saveConfig, validateField, getFieldDefinitions, upsertServer, removeServer, MCPServer } from '../../config/config';
import { v4 as uuidv4 } from 'uuid';

export function registerConfigHandlers(socket: Socket) {
    socket.on('get-global-config', async () => {
        try {
            const config = await loadConfig();
            socket.emit('global-config-update', { config, fieldDefinitions: getFieldDefinitions() });
        } catch (error) {
            socket.emit('config-error', { message: String(error) });
        }
    });

    socket.on('save-credentials', async (creds: { googleProjectId?: string, anthropicKey?: string }) => {
        try {
            const config = await loadConfig();
            config.credentials = { ...config.credentials, ...creds };
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
}
