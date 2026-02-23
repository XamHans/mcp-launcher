import { Server, Socket } from 'socket.io';
import { registerConfigHandlers } from './handlers/config';
import { registerDeployHandlers } from './handlers/deploy';
import { registerGcpHandlers } from './handlers/gcp';
import { registerMcpHandlers } from './handlers/mcp';
import path from 'path';
import fs from 'fs/promises';

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

        // --- Domain handlers ---
        registerConfigHandlers(socket);
        registerDeployHandlers(socket);
        registerGcpHandlers(socket);
        registerMcpHandlers(socket);
    });
}
