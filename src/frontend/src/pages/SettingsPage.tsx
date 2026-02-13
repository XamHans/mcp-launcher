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
        <div className="max-w-xl animate-fade-in">
            <div className="mb-6">
                <h1 className="text-lg font-semibold">Settings</h1>
                <p className="text-sm text-muted-foreground">Manage your credentials and configuration</p>
            </div>

            <div className="rounded-lg border border-border bg-card">
                <div className="border-b border-border px-4 py-3">
                    <h2 className="text-sm font-medium">Credentials</h2>
                </div>
                <div className="p-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Google Cloud Project ID</label>
                        <input
                            type="text"
                            value={googleProjectId}
                            onInput={(e) => handleChange(setGoogleProjectId, (e.target as HTMLInputElement).value)}
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Anthropic API Key</label>
                        <input
                            type="password"
                            value={anthropicKey}
                            onInput={(e) => handleChange(setAnthropicKey, (e.target as HTMLInputElement).value)}
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                    </div>
                </div>
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                    {isDirty ? (
                        <span className="text-xs text-amber-500">Unsaved changes</span>
                    ) : (
                        <span className="text-xs text-muted-foreground">Up to date</span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={!isDirty}
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
