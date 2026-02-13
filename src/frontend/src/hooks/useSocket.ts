import { io, Socket } from 'socket.io-client';
import { useEffect, useState, useCallback } from 'preact/hooks';

export interface LogEntry {
    id: string;
    time: string;
    message: string;
    type: 'info' | 'warn' | 'error' | 'success';
}

export interface ValidationState {
    valid: boolean | null;
    message: string | null;
}

export interface Prerequisites {
    gcloud: { installed: boolean; authenticated: boolean; fix: string };
    docker: { installed: boolean; running: boolean; fix: string };
}

// Mirroring the backend models
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

export function useSocket() {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [deploying, setDeploying] = useState(false);

    const [config, setConfig] = useState<GlobalConfig>({
        onboardingCompleted: false,
        credentials: {},
        servers: []
    });

    // UI Local State derived from validation events
    const [validation, setValidation] = useState<Record<string, ValidationState>>({});
    const [prerequisites, setPrerequisites] = useState<Prerequisites | null>(null);

    const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
        const time = new Date().toLocaleTimeString('en-US', {
            hour12: false, hour: 'numeric', minute: 'numeric', second: 'numeric'
        });
        setLogs(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, time, message, type }]);
    }, []);

    useEffect(() => {
        const socketInstance = io();

        socketInstance.on('connect', () => {
            setConnected(true);
            // Request initial state
            socketInstance.emit('get-global-config');
            socketInstance.emit('check-prerequisites');
        });

        socketInstance.on('disconnect', () => {
            setConnected(false);
            addLog('Disconnected from Orchestrator', 'error');
        });

        socketInstance.on('global-config-update', (data: { config: GlobalConfig }) => {
            if (data.config) {
                setConfig(data.config);
            }
        });

        socketInstance.on('prerequisites-checked', (data: Prerequisites) => {
            setPrerequisites(data);
        });

        socketInstance.on('field-validated', (data) => {
            setValidation(prev => ({
                ...prev,
                [data.field]: { valid: data.valid, message: data.message }
            }));
        });

        socketInstance.on('log', (data) => {
            addLog(data.message, data.type);
        });

        // Use this to track deployment status directly from events if needed, 
        // though config updates will also reflect server status changes.
        socketInstance.on('deploy-complete', (data) => {
            setDeploying(false);
            addLog(`Deployment complete! URL: ${data.url}`, 'success');
        });

        socketInstance.on('deploy-error', (data) => {
            setDeploying(false);
            addLog(`Deployment failed: ${data.message}`, 'error');
        });

        // Server event feedback
        socketInstance.on('server-error', (data) => {
            addLog(`Server Error: ${data.message}`, 'error');
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, [addLog]);

    // --- Actions ---

    const validateField = useCallback((field: string, value: string) => {
        socket?.emit('validate-field', { field, value });
    }, [socket]);

    const saveCredentials = useCallback((creds: { googleProjectId?: string, anthropicKey?: string }) => {
        socket?.emit('save-credentials', creds);
    }, [socket]);

    const createServer = useCallback((serverData: Partial<MCPServer>) => {
        socket?.emit('create-server', serverData);
    }, [socket]);

    const deleteServer = useCallback((serverId: string) => {
        socket?.emit('delete-server', serverId);
    }, [socket]);

    const updateServer = useCallback((server: MCPServer) => {
        socket?.emit('update-server', server);
    }, [socket]);

    const deployServer = useCallback((serverId: string, deployOnly: boolean = false) => {
        setDeploying(true);
        setLogs([]); // Clear logs for new run
        socket?.emit('deploy-server', { serverId, deployOnly });
    }, [socket]);

    const checkPrerequisites = useCallback(() => {
        socket?.emit('check-prerequisites');
    }, [socket]);

    return {
        connected,
        socket,
        config,
        logs,
        deploying,
        prerequisites,
        validation,

        // Actions
        saveCredentials,
        createServer,
        updateServer,
        deleteServer,
        deployServer,
        validateField,
        checkPrerequisites
    };
}
