
import { useState } from 'preact/hooks';
import { ArrowRight, Check, Key, Cloud, Shield } from 'lucide-preact';
import { cn } from '../lib/utils';


// We'll define local interface if types aren't available to frontend yet
// Ideally we share types, but for now let's just use primitives or loose typing for the event props
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
        <div class="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] p-4">
            {/* Background Decoration */}
            <div class="fixed inset-0 overflow-hidden pointer-events-none">
                <div class="absolute top-[20%] left-[20%] w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
                <div class="absolute bottom-[20%] right-[20%] w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl" />
            </div>

            <div class="w-full max-w-lg z-10">
                {/* Progress */}
                <div class="flex items-center justify-between mb-8 px-4">
                    {steps.map((s, i) => (
                        <div key={i} class="flex flex-col items-center gap-2">
                            <div class={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                                i === step ? "bg-[hsl(var(--primary))] text-white shadow-lg shadow-violet-500/30 scale-110" :
                                    i < step ? "bg-green-500 text-white" : "bg-[hsl(var(--secondary))] text-zinc-500"
                            )}>
                                {i < step ? <Check class="w-5 h-5" /> : <s.icon class="w-5 h-5" />}
                            </div>
                            <span class={cn(
                                "text-xs font-medium",
                                i === step ? "text-white" : "text-zinc-500"
                            )}>{s.title}</span>
                        </div>
                    ))}
                    {/* Lines */}
                    <div class="absolute top-[50%] left-0 w-full h-0.5 -z-10" />
                </div>

                {/* Card */}
                <div class="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
                    {step === 0 && (
                        <div class="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <h1 class="text-3xl font-bold text-white">Welcome to MCP Launcher</h1>
                            <p class="text-zinc-400 text-lg">
                                Deploy your Model Context Protocol servers to Google Cloud in minutes.
                                Let's get you set up with the necessary credentials.
                            </p>
                        </div>
                    )}

                    {step === 1 && (
                        <div class="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <h2 class="text-xl font-semibold text-white">Google Cloud Configuration</h2>
                            <p class="text-sm text-zinc-400">
                                We need your GCP Project ID to deploy services.
                            </p>

                            <div class="space-y-2">
                                <label class="text-xs font-medium text-zinc-300">Project ID</label>
                                <input
                                    type="text"
                                    value={googleProjectId}
                                    onInput={(e) => setGoogleProjectId((e.target as HTMLInputElement).value)}
                                    placeholder="my-project-id-123"
                                    class="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                                />
                                <p class="text-xs text-zinc-500">
                                    Found in GCP Console Dashboard.
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div class="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <h2 class="text-xl font-semibold text-white">Agent Audit</h2>
                            <p class="text-sm text-zinc-400">
                                We use Anthropic's Claude to analyze your code and generate deployment files.
                            </p>

                            <div class="space-y-2">
                                <label class="text-xs font-medium text-zinc-300">Anthropic API Key</label>
                                <input
                                    type="password"
                                    value={anthropicKey}
                                    onInput={(e) => setAnthropicKey((e.target as HTMLInputElement).value)}
                                    placeholder="sk-ant-..."
                                    class="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                                />
                            </div>
                        </div>
                    )}

                    <div class="mt-8 flex justify-end">
                        <button
                            onClick={handleNext}
                            disabled={
                                (step === 1 && googleProjectId.length < 3) ||
                                (step === 2 && anthropicKey.length < 10)
                            }
                            class="flex items-center gap-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/90] text-white px-6 py-3 rounded-xl font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                        >
                            {step === steps.length - 1 ? 'Finish Setup' : 'Continue'}
                            <ArrowRight class="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
