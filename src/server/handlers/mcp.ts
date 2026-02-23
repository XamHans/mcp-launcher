import { Socket } from 'socket.io';
import { inspectMcpServer, invokeMcpTool, readMcpResource, getMcpPrompt } from '../mcpClient';

export function registerMcpHandlers(socket: Socket) {
    socket.on('inspect-mcp', async (data: { url: string; headers?: Record<string, string>; requestId?: string }) => {
        const { url, headers, requestId } = data || {};

        if (!url) {
            socket.emit('mcp-inspection-error', { requestId, message: 'MCP endpoint URL is required' });
            return;
        }

        try {
            const result = await inspectMcpServer({ url, headers });
            socket.emit('mcp-inspection-result', { requestId, result });
        } catch (error) {
            console.error(`[MCP] Inspection error:`, error);
            socket.emit('mcp-inspection-error', { requestId, message: String(error) });
        }
    });

    socket.on('invoke-mcp-tool', async (data: {
        url: string;
        headers?: Record<string, string>;
        toolName: string;
        args: Record<string, unknown>;
        requestId?: string;
    }) => {
        const { url, headers, toolName, args, requestId } = data || {};

        if (!url || !toolName) {
            socket.emit('mcp-tool-invocation-error', { requestId, message: 'URL and tool name are required' });
            return;
        }

        try {
            const result = await invokeMcpTool({ url, headers, toolName, args });
            socket.emit('mcp-tool-invocation-result', { requestId, result });
        } catch (error) {
            socket.emit('mcp-tool-invocation-error', { requestId, message: String(error) });
        }
    });

    socket.on('read-mcp-resource', async (data: {
        url: string;
        headers?: Record<string, string>;
        uri: string;
        requestId?: string;
    }) => {
        const { url, headers, uri, requestId } = data || {};

        if (!url || !uri) {
            socket.emit('mcp-resource-read-error', { requestId, message: 'URL and resource URI are required' });
            return;
        }

        try {
            const result = await readMcpResource({ url, headers, uri });
            socket.emit('mcp-resource-read-result', { requestId, result });
        } catch (error) {
            socket.emit('mcp-resource-read-error', { requestId, message: String(error) });
        }
    });

    socket.on('get-mcp-prompt', async (data: {
        url: string;
        headers?: Record<string, string>;
        promptName: string;
        args?: Record<string, string>;
        requestId?: string;
    }) => {
        const { url, headers, promptName, args, requestId } = data || {};

        if (!url || !promptName) {
            socket.emit('mcp-prompt-error', { requestId, message: 'URL and prompt name are required' });
            return;
        }

        try {
            const result = await getMcpPrompt({ url, headers, promptName, args });
            socket.emit('mcp-prompt-result', { requestId, result });
        } catch (error) {
            socket.emit('mcp-prompt-error', { requestId, message: String(error) });
        }
    });
}
