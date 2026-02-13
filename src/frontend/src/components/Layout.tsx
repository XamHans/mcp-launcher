import type { ComponentChildren } from 'preact';
import { LayoutDashboard, Settings, Terminal, Box } from 'lucide-preact';
import { cn } from '../lib/utils';

interface LayoutProps {
    children: ComponentChildren;
    activeTab?: 'dashboard' | 'settings';
    onTabChange?: (tab: 'dashboard' | 'settings') => void;
}

export function Layout({ children, activeTab = 'dashboard', onTabChange }: LayoutProps) {
    return (
        <div class="flex h-screen overflow-hidden bg-gray-100">
            {/* Sidebar - Clean Gray Style */}
            <aside class="w-56 flex flex-col bg-[#1a1a1f] border-r border-gray-800">
                {/* Logo Area */}
                <div class="h-14 flex items-center px-5 border-b border-gray-800">
                    <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mr-2.5 shadow-lg">
                        <Box class="text-white w-4 h-4" />
                    </div>
                    <span class="font-semibold text-sm text-white">
                        MCP Launcher
                    </span>
                </div>

                {/* Navigation */}
                <nav class="flex-1 p-3 space-y-1">
                    <button
                        onClick={() => onTabChange?.('dashboard')}
                        class={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                            activeTab === 'dashboard'
                                ? "bg-white/10 text-white"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <LayoutDashboard class="w-4 h-4" />
                        Dashboard
                    </button>

                    <button
                        class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                        <Terminal class="w-4 h-4" />
                        Logs
                    </button>
                </nav>

                {/* Bottom Actions */}
                <div class="p-3 border-t border-gray-800">
                    <button
                        onClick={() => onTabChange?.('settings')}
                        class={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                            activeTab === 'settings'
                                ? "bg-white/10 text-white"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <Settings class="w-4 h-4" />
                        Settings
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main class="flex-1 flex flex-col h-full overflow-hidden">
                <div class="flex-1 overflow-y-auto p-8 bg-gray-50">
                    {children}
                </div>
            </main>
        </div>
    );
}

// Simple Container for Page Content
export function PageHeader({ title, description, action }: { title: string, description?: string, action?: ComponentChildren }) {
    return (
        <div class="flex items-center justify-between mb-8">
            <div>
                <h1 class="text-3xl font-bold tracking-tight text-white mb-2">{title}</h1>
                {description && <p class="text-zinc-400">{description}</p>}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}
