import type { Prerequisites } from '../hooks/useSocket';
import { Check, X, RefreshCw, Terminal, AlertCircle, Container } from 'lucide-preact';
import { cn } from '../lib/utils';

interface PrerequisitesCheckProps {
    prerequisites: Prerequisites | null;
    onRefresh: () => void;
}

export function PrerequisitesCheck({ prerequisites, onRefresh }: PrerequisitesCheckProps) {
    if (!prerequisites) {
        return (
            <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Checking prerequisites...</span>
                </div>
            </div>
        );
    }

    const dockerRunning = prerequisites.docker.installed && prerequisites.docker.running;
    const allReady = prerequisites.gcloud.installed && 
                     prerequisites.gcloud.authenticated && 
                     dockerRunning;

    const checks = [
        { 
            label: 'gcloud CLI', 
            ready: prerequisites.gcloud.installed && prerequisites.gcloud.authenticated,
            subtext: prerequisites.gcloud.installed 
                ? (prerequisites.gcloud.authenticated ? 'Authenticated' : 'Not authenticated')
                : 'Not installed'
        },
        { 
            label: 'Docker', 
            ready: dockerRunning,
            subtext: prerequisites.docker.installed 
                ? (prerequisites.docker.running ? 'Running' : 'Not running')
                : 'Not installed'
        },
    ];

    return (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <h3 className="text-sm font-medium">System Status</h3>
                    {allReady ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">
                            <Check className="h-3 w-3" />
                            Ready
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500">
                            <AlertCircle className="h-3 w-3" />
                            Action required
                        </span>
                    )}
                </div>
                <button
                    onClick={onRefresh}
                    className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                    <RefreshCw className="h-4 w-4" />
                </button>
            </div>

            {/* Docker Warning - Only show if not running */}
            {!dockerRunning && (
                <div className="px-4 py-3 border-b border-border bg-muted/30">
                    <div className="flex gap-3">
                        <div className="mt-0.5">
                            <Container className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                                Docker is required
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {!prerequisites.docker.installed 
                                    ? "Install Docker to build and deploy containers"
                                    : "Start Docker Desktop to continue"
                                }
                            </p>
                            <code className="mt-2 inline-flex items-center gap-1.5 rounded bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">
                                <Terminal className="h-3 w-3" />
                                {!prerequisites.docker.installed 
                                    ? 'brew install --cask docker'
                                    : 'open -a Docker'
                                }
                            </code>
                        </div>
                    </div>
                </div>
            )}

            {/* Check List */}
            <div className="divide-y divide-border">
                {checks.map((check) => (
                    <div key={check.label} className="flex items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "flex h-5 w-5 items-center justify-center rounded-full",
                                check.ready 
                                    ? "bg-emerald-500/10 text-emerald-500" 
                                    : "bg-muted text-muted-foreground"
                            )}>
                                {check.ready ? (
                                    <Check className="h-3 w-3" />
                                ) : (
                                    <X className="h-3 w-3" />
                                )}
                            </div>
                            <span className="text-sm">{check.label}</span>
                        </div>
                        <span className={cn(
                            "text-xs",
                            check.ready ? "text-emerald-500" : "text-muted-foreground"
                        )}>
                            {check.subtext}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
