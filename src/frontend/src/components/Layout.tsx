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
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Sidebar */}
            <aside className="w-56 flex flex-col border-r border-border bg-card">
                {/* Logo */}
                <div className="flex h-12 items-center gap-2 border-b border-border px-4">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-muted">
                        <Box className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-semibold">MCP Launcher</span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-2 space-y-0.5">
                    <button
                        onClick={() => onTabChange?.('dashboard')}
                        className={cn(
                            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                            activeTab === 'dashboard'
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                    </button>

                    <button
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                    >
                        <Terminal className="h-4 w-4" />
                        Logs
                    </button>
                </nav>

                {/* Bottom Actions */}
                <div className="border-t border-border p-2">
                    <button
                        onClick={() => onTabChange?.('settings')}
                        className={cn(
                            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                            activeTab === 'settings'
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                    >
                        <Settings className="h-4 w-4" />
                        Settings
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
