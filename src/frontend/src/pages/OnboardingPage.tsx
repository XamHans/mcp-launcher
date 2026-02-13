import { useState } from 'preact/hooks';
import { ArrowRight, Check, Key, Cloud, Shield } from 'lucide-preact';
import { cn } from '../lib/utils';

interface OnboardingPageProps {
    onComplete: (creds: { googleProjectId: string, anthropicKey: string }) => void;
}

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
    const [step, setStep] = useState(0);
    const [googleProjectId, setGoogleProjectId] = useState('');
    const [anthropicKey, setAnthropicKey] = useState('');

    const steps = [
        { title: 'Welcome', icon: Shield },
        { title: 'Google Cloud', icon: Cloud },
        { title: 'API Key', icon: Key },
    ];

    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            onComplete({ googleProjectId, anthropicKey });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md">
                {/* Progress */}
                <div className="flex items-center justify-between mb-8">
                    {steps.map((s, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                                i === step 
                                    ? "border-foreground bg-foreground text-background" 
                                    : i < step 
                                        ? "border-emerald-500 bg-emerald-500 text-white" 
                                        : "border-border bg-card text-muted-foreground"
                            )}>
                                {i < step ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                            </div>
                            <span className={cn(
                                "text-xs",
                                i === step ? "text-foreground" : "text-muted-foreground"
                            )}>
                                {s.title}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Card */}
                <div className="rounded-lg border border-border bg-card p-6">
                    {step === 0 && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex justify-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                    <Shield className="h-6 w-6" />
                                </div>
                            </div>
                            <div className="text-center">
                                <h1 className="text-lg font-semibold">Welcome to MCP Launcher</h1>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Deploy your Model Context Protocol servers to Google Cloud in minutes.
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-4 animate-fade-in">
                            <h2 className="text-sm font-medium">Google Cloud Configuration</h2>
                            <p className="text-xs text-muted-foreground">
                                Enter your GCP Project ID to deploy services.
                            </p>
                            <div className="space-y-2">
                                <label className="text-xs font-medium">Project ID</label>
                                <input
                                    type="text"
                                    value={googleProjectId}
                                    onInput={(e) => setGoogleProjectId((e.target as HTMLInputElement).value)}
                                    placeholder="my-project-id-123"
                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                                <p className="text-[10px] text-muted-foreground">
                                    Found in your GCP Console Dashboard
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-fade-in">
                            <h2 className="text-sm font-medium">Anthropic API Key</h2>
                            <p className="text-xs text-muted-foreground">
                                Used for AI-powered code analysis and deployment file generation.
                            </p>
                            <div className="space-y-2">
                                <label className="text-xs font-medium">API Key</label>
                                <input
                                    type="password"
                                    value={anthropicKey}
                                    onInput={(e) => setAnthropicKey((e.target as HTMLInputElement).value)}
                                    placeholder="sk-ant-..."
                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                            </div>
                        </div>
                    )}

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleNext}
                            disabled={
                                (step === 1 && googleProjectId.length < 3) ||
                                (step === 2 && anthropicKey.length < 10)
                            }
                            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {step === steps.length - 1 ? 'Finish' : 'Continue'}
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
