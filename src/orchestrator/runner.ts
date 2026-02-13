import { execa } from 'execa';

type LogCallback = (message: string, type?: 'info' | 'warn' | 'error' | 'success') => void;

interface OrchestrationOptions {
    projectId: string;
    projectPath: string;
    onLog: LogCallback;
}

export async function runDeploymentPipeline({ projectId, projectPath, onLog }: OrchestrationOptions): Promise<{ success: boolean; error?: string; url?: string }> {

    let capturedUrl: string | undefined;

    const runStep = async (stepName: string, command: string, args: string[]) => {
        onLog(`Starting ${stepName}...`, 'info');
        try {
            // Use shell mode to pipe "Y" to the command for automatic confirmation
            // This bypasses gcloud prompts like "Do you want to continue (Y/n)?"
            const fullCommand = `printf "Y\\n" | ${command} ${args.map(a => `"${a}"`).join(' ')}`;
            const subprocess = execa('sh', ['-c', fullCommand], {
                cwd: projectPath, // Run make in the user's project directory
                env: { ...process.env, PROJECT_ID: projectId, FORCE_COLOR: '1' },
                all: true
            });

            // Stream output
            if (subprocess.all) {
                subprocess.all.on('data', (data) => {
                    const lines = data.toString().split('\n');
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed) {
                            onLog(trimmed);
                            // Capture Service URL from gcloud output
                            // Format: Service URL: [1mhttps://mcp-server-xyz.us-central1.run.app[m
                            // Note: gcloud adds ANSI codes like [1m (bold) and [m (reset) around URLs

                            // Strip ANSI escape codes first before matching
                            const cleanLine = trimmed.replace(/\u001b\[[0-9;]*m|\[[0-9;]*m/g, '');

                            const urlMatch = cleanLine.match(/Service URL:\s*(https?:\/\/[^\s]+)/);
                            if (urlMatch) {
                                capturedUrl = urlMatch[1];
                            }
                        }
                    }
                });
            }

            await subprocess;
            onLog(`${stepName} completed successfully.`, 'success');
            return true;
        } catch (error) {
            onLog(`${stepName} failed: ${error}`, 'error');
            throw error;
        }
    };

    try {
        // 1. Setup GCP - Enables APIs and creates Artifact Registry
        await runStep('GCP Setup', 'make', ['gcp-setup']);

        // 2. Deploy - Builds, pushes, and deploys to Cloud Run
        // Note: The Makefile 'deploy' target includes docker build and push
        await runStep('Deploy', 'make', ['deploy']);

        // Refine URL if it has ANSI codes (common in gcloud output)
        // Example: [1mhttps://url[m or \x1b[m
        if (capturedUrl) {
            // Strip ANSI codes (simple version)
            // Matches ESC [ ... m
            capturedUrl = capturedUrl.replace(/\u001b\[.*?m/g, '');
        }

        return { success: true, url: capturedUrl };

    } catch (error) {
        return { success: false, error: String(error) };
    }
}

