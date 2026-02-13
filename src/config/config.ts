import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { GlobalConfig, MCPServer, OldUserConfig, FieldInfo, ValidationResult } from './types';

export * from './types';
import { v4 as uuidv4 } from 'uuid';

// Config file location: ~/.deploy-mcp/config.json
const CONFIG_DIR = path.join(os.homedir(), '.deploy-mcp');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// --- Old Config Interface (for migration) ---


// Field definitions for UI
export const FIELD_DEFINITIONS: Record<string, FieldInfo> = {
    anthropicKey: {
        name: 'anthropicKey',
        label: 'Anthropic API Key',
        explanation: 'Required for the AI agent that audits your code and generates deployment files.',
        helpTip: 'Go to console.anthropic.com → Settings → API Keys → Create Key',
        helpLink: 'https://console.anthropic.com/settings/keys',
        placeholder: 'sk-ant-api03-...',
        type: 'password'
    },
    googleProjectId: {
        name: 'googleProjectId',
        label: 'GCP Project ID',
        explanation: 'Your Google Cloud project where the MCP servers will be deployed.',
        helpTip: 'Go to console.cloud.google.com → Click the project dropdown at the top → Copy the ID (not the name)',
        helpLink: 'https://console.cloud.google.com/home/dashboard',
        placeholder: 'my-ai-project-123',
        type: 'text'
    },
    serverName: {
        name: 'serverName',
        label: 'Server Name',
        explanation: 'A friendly name for your MCP server.',
        helpTip: 'e.g., "Weather Service" or "Stock Tracker"',
        placeholder: 'My MCP Server',
        type: 'text'
    },
    sourcePath: {
        name: 'sourcePath',
        label: 'Project Path',
        explanation: 'Directory containing your MCP server code (e.g., server.py).',
        helpTip: 'Select the folder containing your Python MCP server file.',
        placeholder: '/path/to/my-mcp-server',
        type: 'path'
    }
};

/**
 * Validate Anthropic API Key
 */
export function validateAnthropicKey(key: string): ValidationResult {
    if (!key || key.trim() === '') return { valid: false, message: 'API key is required' };
    if (!key.startsWith('sk-ant-')) return { valid: false, message: 'Invalid format. Key should start with "sk-ant-"' };
    if (key.length < 20) return { valid: false, message: 'API key appears too short' };
    return { valid: true };
}

/**
 * Validate GCP Project ID
 */
export function validateProjectId(projectId: string): ValidationResult {
    if (!projectId || projectId.trim() === '') return { valid: false, message: 'Project ID is required' };
    const id = projectId.trim();
    if (id.length < 6) return { valid: false, message: 'Project ID must be at least 6 characters' };
    if (id.length > 30) return { valid: false, message: 'Project ID must be 30 characters or less' };
    if (!/^[a-z]/.test(id)) return { valid: false, message: 'Project ID must start with a lowercase letter' };
    if (!/^[a-z][a-z0-9-]*$/.test(id)) return { valid: false, message: 'Project ID can only contain lowercase letters, digits, and hyphens' };
    if (id.endsWith('-')) return { valid: false, message: 'Project ID cannot end with a hyphen' };
    return { valid: true };
}

/**
 * Validate project path (async)
 */
export async function validateProjectPath(projectPath: string): Promise<ValidationResult> {
    if (!projectPath || projectPath.trim() === '') return { valid: false, message: 'Project path is required' };
    try {
        const stats = await fs.stat(projectPath);
        if (!stats.isDirectory()) return { valid: false, message: 'Path is not a directory' };

        // Optional: Check for python files, but don't block
        const files = await fs.readdir(projectPath);
        const hasPythonFile = files.some(f => f.endsWith('.py'));
        if (!hasPythonFile) {
            return { valid: true, message: 'Warning: No Python files found, but directory is valid.' };
        }
        return { valid: true };
    } catch {
        return { valid: false, message: 'Directory does not exist or is not accessible' };
    }
}

/**
 * Validate generic field
 */
export async function validateField(field: string, value: string): Promise<ValidationResult> {
    switch (field) {
        case 'anthropicKey': return validateAnthropicKey(value);
        case 'googleProjectId': return validateProjectId(value);
        case 'sourcePath': return await validateProjectPath(value);
        case 'serverName':
            return value.trim().length > 0 ? { valid: true } : { valid: false, message: 'Name is required' };
        default: return { valid: true };
    }
}

/**
 * Load Config with Migration Support
 */
export async function loadConfig(): Promise<GlobalConfig> {
    try {
        await fs.mkdir(CONFIG_DIR, { recursive: true });

        // Try reading existing config
        let rawData: string;
        try {
            rawData = await fs.readFile(CONFIG_FILE, 'utf-8');
        } catch {
            // No file exists, return default
            return createDefaultConfig();
        }

        const parsed = JSON.parse(rawData);

        // Check if it's the old format (legacy has no 'servers' array)
        if (!parsed.servers && !parsed.credentials) {
            console.log('Migrating legacy config...');
            return migrateLegacyConfig(parsed as OldUserConfig);
        }

        return parsed as GlobalConfig;
    } catch (error) {
        console.error('Failed to load config, returning default:', error);
        return createDefaultConfig();
    }
}

function createDefaultConfig(): GlobalConfig {
    return {
        onboardingCompleted: false,
        credentials: {},
        servers: []
    };
}

/**
 * Migrate old config format to new GlobalConfig
 */
function migrateLegacyConfig(old: OldUserConfig): GlobalConfig {
    const newConfig: GlobalConfig = {
        onboardingCompleted: false, // Force onboarding or check if fields are present? 
        // Let's assume if they have a project ID and key, they are "onboarded" but maybe want to review steps?
        // Safest is to set onboardingCompleted = false so they see the new UI flow, but prefill values.
        credentials: {
            googleProjectId: old.projectId,
            anthropicKey: old.anthropicKey
        },
        servers: []
    };

    // If there was a project path, create a default server entry
    if (old.projectPath) {
        newConfig.servers.push({
            id: uuidv4(),
            name: "My First Server",
            description: "Imported from legacy configuration",
            sourcePath: old.projectPath,
            status: 'draft'
        });
        // If we successfully migrated a server, mark onboarding as complete if creds exist
        if (old.projectId && old.anthropicKey) {
            newConfig.onboardingCompleted = true;
        }
    }

    return newConfig;
}

/**
 * Save generic config
 */
export async function saveConfig(config: GlobalConfig): Promise<{ success: boolean; error?: string }> {
    try {
        await fs.mkdir(CONFIG_DIR, { recursive: true });
        await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
        return { success: true };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

/**
 * Helper to add or update a server
 */
export async function upsertServer(server: MCPServer): Promise<GlobalConfig> {
    const config = await loadConfig();
    const index = config.servers.findIndex(s => s.id === server.id);

    if (index >= 0) {
        config.servers[index] = server;
    } else {
        config.servers.push(server);
    }

    await saveConfig(config);
    return config;
}

/**
 * Helper to remove a server
 */
export async function removeServer(id: string): Promise<GlobalConfig> {
    const config = await loadConfig();
    config.servers = config.servers.filter(s => s.id !== id);
    await saveConfig(config);
    return config;
}

export function getFieldDefinitions() {
    return FIELD_DEFINITIONS;
}
