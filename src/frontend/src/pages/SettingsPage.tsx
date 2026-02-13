import { PageHeader } from '../components/Layout';
import { Save } from 'lucide-preact';
import { useState } from 'preact/hooks';
import type { GlobalConfig } from '../../../config/types';

interface SettingsPageProps {
    config: GlobalConfig;
    onSaveCredentials: (creds: { googleProjectId?: string; anthropicKey?: string }) => void;
}

export function SettingsPage({ config, onSaveCredentials }: SettingsPageProps) {
    const [googleProjectId, setGoogleProjectId] = useState(config.credentials.googleProjectId || '');
    const [anthropicKey, setAnthropicKey] = useState(config.credentials.anthropicKey || '');
    const [isDirty, setIsDirty] = useState(false);

    const handleSave = () => {
        onSaveCredentials({ googleProjectId, anthropicKey });
        setIsDirty(false);
    };

    const handleChange = (setter: (val: string) => void, val: string) => {
        setter(val);
        setIsDirty(true);
    };

    return (
        <div class="animate-in fade-in duration-500 max-w-2xl">
            <PageHeader
                title="Settings"
                description="Manage your global configuration and credentials."
            />

            <div class="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl p-6 space-y-6">
                <div class="space-y-4">
                    <h3 class="text-lg font-semibold text-white">Credentials</h3>

                    <div class="space-y-2">
                        <label class="text-xs font-medium text-zinc-300">Google Cloud Project ID</label>
                        <input
                            type="text"
                            value={googleProjectId}
                            onInput={(e) => handleChange(setGoogleProjectId, (e.target as HTMLInputElement).value)}
                            class="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                        />
                    </div>

                    <div class="space-y-2">
                        <label class="text-xs font-medium text-zinc-300">Anthropic API Key</label>
                        <input
                            type="password"
                            value={anthropicKey}
                            onInput={(e) => handleChange(setAnthropicKey, (e.target as HTMLInputElement).value)}
                            class="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                        />
                    </div>
                </div>

                <div class="pt-4 border-t border-[var(--glass-border)] flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={!isDirty}
                        class="flex items-center gap-2 bg-[hsl(var(--primary))] text-white px-4 py-2 rounded-lg font-medium hover:bg-[hsl(var(--primary))/90] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save class="w-4 h-4" />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
