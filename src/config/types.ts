export interface MCPServer {
    id: string;
    name: string;
    description: string;
    sourcePath: string;
    status: 'draft' | 'deploying' | 'healthy' | 'unhealthy';
    deployedUrl?: string;
    lastDeployedAt?: string;
}

export interface GlobalConfig {
    onboardingCompleted: boolean;
    credentials: {
        googleProjectId?: string;
        anthropicKey?: string;
    };
    servers: MCPServer[];
}

export interface OldUserConfig {
    projectId?: string;
    anthropicKey?: string;
    projectPath?: string;
}

export interface ValidationResult {
    valid: boolean;
    message?: string;
}

export interface FieldInfo {
    name: string;
    label: string;
    explanation: string;
    helpTip: string;
    helpLink?: string;
    placeholder: string;
    type: 'text' | 'password' | 'path';
}
