import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';
import type { EventSourceInit } from 'eventsource';

type TransportType = 'streamable-http' | 'sse';

export interface McpToolSummary {
    name: string;
    description?: string;
    inputSchema?: unknown;
    annotations?: unknown;
    title?: string;
    icons?: {
        src: string;
        mimeType?: string;
        sizes?: string[];
        theme?: 'light' | 'dark';
    }[];
}

export interface McpResourceSummary {
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
    annotations?: unknown;
    title?: string;
    icons?: {
        src: string;
        mimeType?: string;
        sizes?: string[];
        theme?: 'light' | 'dark';
    }[];
}

export interface McpResourceTemplateSummary {
    uriTemplate: string;
    name: string;
    description?: string;
    mimeType?: string;
    annotations?: unknown;
    title?: string;
    icons?: {
        src: string;
        mimeType?: string;
        sizes?: string[];
        theme?: 'light' | 'dark';
    }[];
}

export interface McpPromptSummary {
    name: string;
    description?: string;
    arguments?: {
        name: string;
        description?: string;
        required?: boolean;
    }[];
    title?: string;
    icons?: {
        src: string;
        mimeType?: string;
        sizes?: string[];
        theme?: 'light' | 'dark';
    }[];
}

export interface McpInspectionResult {
    server?: {
        name?: string;
        version?: string;
        transport: TransportType;
        capabilities?: ServerCapabilities;
        instructions?: string;
    };
    tools: McpToolSummary[];
    resources: McpResourceSummary[];
    resourceTemplates: McpResourceTemplateSummary[];
    prompts: McpPromptSummary[];
    errors: string[];
}

interface ConnectionResult {
    client: Client;
    transport: StreamableHTTPClientTransport | SSEClientTransport;
    transportType: TransportType;
    warnings: string[];
}

function sanitizeHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
    if (!headers) return undefined;
    const cleanedEntries = Object.entries(headers)
        .filter(([, value]) => typeof value === 'string' && value.trim() !== '')
        .map(([key, value]) => [key, value.trim()] as const);

    if (cleanedEntries.length === 0) return undefined;
    return Object.fromEntries(cleanedEntries);
}

async function connectWithFallback(url: URL, headers?: Record<string, string>): Promise<ConnectionResult> {
    const warnings: string[] = [];

    // Try modern Streamable HTTP first
    const streamableClient = new Client({ name: 'mcp-launcher-inspector', version: '1.0.0' });
    const streamableTransport = new StreamableHTTPClientTransport(url, {
        requestInit: headers ? { headers } : undefined
    });

    try {
        await streamableClient.connect(streamableTransport);
        return {
            client: streamableClient,
            transport: streamableTransport,
            transportType: 'streamable-http',
            warnings
        };
    } catch (err) {
        warnings.push(`Streamable HTTP connect failed: ${err instanceof Error ? err.message : String(err)}`);
        await streamableTransport.close().catch(() => undefined);
    }

    // Fallback to deprecated SSE
    const sseClient = new Client({ name: 'mcp-launcher-inspector', version: '1.0.0' });
    const eventSourceInit = headers ? { headers } as unknown as EventSourceInit : undefined;
    const sseTransport = new SSEClientTransport(url, {
        requestInit: headers ? { headers } : undefined,
        eventSourceInit
    });

    await sseClient.connect(sseTransport);
    return {
        client: sseClient,
        transport: sseTransport,
        transportType: 'sse',
        warnings
    };
}

export interface McpToolInvocationResult {
    toolName: string;
    success: boolean;
    result?: unknown;
    error?: string;
    content?: Array<{
        type: string;
        text?: string;
        data?: unknown;
    }>;
}

export async function inspectMcpServer(options: { url: string; headers?: Record<string, string> }): Promise<McpInspectionResult> {
    const { url, headers: rawHeaders } = options;

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(url);
    } catch {
        throw new Error('Invalid MCP endpoint URL');
    }

    const headers = sanitizeHeaders(rawHeaders);
    const connection = await connectWithFallback(parsedUrl, headers);
    const errors: string[] = [...connection.warnings];

    const result: McpInspectionResult = {
        server: {
            transport: connection.transportType,
            capabilities: connection.client.getServerCapabilities(),
            version: connection.client.getServerVersion()?.version,
            name: connection.client.getServerVersion()?.name,
            instructions: connection.client.getInstructions()
        },
        tools: [],
        resources: [],
        resourceTemplates: [],
        prompts: [],
        errors
    };

    try {
        try {
            const toolResult = await connection.client.listTools();
            result.tools = toolResult.tools.map((tool): McpToolSummary => ({
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema,
                annotations: tool.annotations,
                title: tool.title,
                icons: tool.icons
            }));
        } catch (err) {
            errors.push(`tools/list failed: ${err instanceof Error ? err.message : String(err)}`);
        }

        try {
            const resourceResult = await connection.client.listResources();
            result.resources = resourceResult.resources.map((resource): McpResourceSummary => ({
                uri: resource.uri,
                name: resource.name,
                description: resource.description,
                mimeType: resource.mimeType,
                annotations: resource.annotations,
                title: resource.title,
                icons: resource.icons
            }));
        } catch (err) {
            errors.push(`resources/list failed: ${err instanceof Error ? err.message : String(err)}`);
        }

        try {
            const resourceTemplateResult = await connection.client.listResourceTemplates();
            result.resourceTemplates = resourceTemplateResult.resourceTemplates.map((template): McpResourceTemplateSummary => ({
                uriTemplate: template.uriTemplate,
                name: template.name,
                description: template.description,
                mimeType: template.mimeType,
                annotations: template.annotations,
                title: template.title,
                icons: template.icons
            }));
        } catch (err) {
            errors.push(`resources/templates failed: ${err instanceof Error ? err.message : String(err)}`);
        }

        try {
            const promptResult = await connection.client.listPrompts();
            result.prompts = promptResult.prompts.map((prompt): McpPromptSummary => ({
                name: prompt.name,
                description: prompt.description,
                arguments: prompt.arguments,
                title: prompt.title,
                icons: prompt.icons
            }));
        } catch (err) {
            errors.push(`prompts/list failed: ${err instanceof Error ? err.message : String(err)}`);
        }
    } finally {
        await connection.client.close().catch(() => undefined);
        await connection.transport.close().catch(() => undefined);
    }

    return result;
}

export async function invokeMcpTool(options: {
    url: string;
    headers?: Record<string, string>;
    toolName: string;
    args: Record<string, unknown>;
}): Promise<McpToolInvocationResult> {
    const { url, headers: rawHeaders, toolName, args } = options;

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(url);
    } catch {
        throw new Error('Invalid MCP endpoint URL');
    }

    const headers = sanitizeHeaders(rawHeaders);
    const connection = await connectWithFallback(parsedUrl, headers);

    try {
        const result = await connection.client.callTool({
            name: toolName,
            arguments: args
        });

        return {
            toolName,
            success: true,
            content: result.content as Array<{ type: string; text?: string; data?: unknown }>,
            result
        };
    } catch (err) {
        return {
            toolName,
            success: false,
            error: err instanceof Error ? err.message : String(err)
        };
    } finally {
        await connection.client.close().catch(() => undefined);
        await connection.transport.close().catch(() => undefined);
    }
}

export async function readMcpResource(options: {
    url: string;
    headers?: Record<string, string>;
    uri: string;
}): Promise<{ success: boolean; content?: string; mimeType?: string; error?: string }> {
    const { url, headers: rawHeaders, uri } = options;

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(url);
    } catch {
        throw new Error('Invalid MCP endpoint URL');
    }

    const headers = sanitizeHeaders(rawHeaders);
    const connection = await connectWithFallback(parsedUrl, headers);

    try {
        const result = await connection.client.readResource({ uri });
        
        // Extract text content from the resource
        let content = '';
        let mimeType = '';
        
        if (result.contents && result.contents.length > 0) {
            const firstContent = result.contents[0];
            if ('text' in firstContent && firstContent.text) {
                content = firstContent.text;
            }
            mimeType = firstContent.mimeType || '';
        }

        return {
            success: true,
            content,
            mimeType
        };
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : String(err)
        };
    } finally {
        await connection.client.close().catch(() => undefined);
        await connection.transport.close().catch(() => undefined);
    }
}

export async function getMcpPrompt(options: {
    url: string;
    headers?: Record<string, string>;
    promptName: string;
    args?: Record<string, string>;
}): Promise<{ success: boolean; messages?: Array<{ role: string; content: string }>; description?: string; error?: string }> {
    const { url, headers: rawHeaders, promptName, args } = options;

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(url);
    } catch {
        throw new Error('Invalid MCP endpoint URL');
    }

    const headers = sanitizeHeaders(rawHeaders);
    const connection = await connectWithFallback(parsedUrl, headers);

    try {
        const result = await connection.client.getPrompt({
            name: promptName,
            arguments: args
        });

        const messages = result.messages.map(msg => ({
            role: msg.role,
            content: typeof msg.content === 'object' && 'text' in msg.content 
                ? String(msg.content.text) 
                : String(msg.content)
        }));

        return {
            success: true,
            messages,
            description: result.description
        };
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : String(err)
        };
    } finally {
        await connection.client.close().catch(() => undefined);
        await connection.transport.close().catch(() => undefined);
    }
}
