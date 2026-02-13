
import { useState } from 'preact/hooks';
import { useSocket } from './hooks/useSocket';
import { Layout } from './components/Layout';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { ServerDetailsPage } from './pages/ServerDetailsPage';

import { SettingsPage } from './pages/SettingsPage';
import { Modal } from './components/Modal';
import './index.css';


export function App() {
  const {
    config,
    socket,
    saveCredentials,
    createServer,
    updateServer,
    deleteServer,
    deployServer,
    deploying,
    logs
  } = useSocket();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');

  // Modal States
  const [isAddServerModalOpen, setIsAddServerModalOpen] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerPath, setNewServerPath] = useState('');

  // Navigation State
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);

  const handleAddServer = () => {
    if (!newServerName || !newServerPath) return; // Simple validation
    createServer({
      name: newServerName,
      sourcePath: newServerPath,
      description: 'Added via Dashboard'
    });
    setIsAddServerModalOpen(false);
    setNewServerName('');
    setNewServerPath('');
  };

  // If not onboarded, show Onboarding Page full screen
  if (!config.onboardingCompleted) {
    return (
      <OnboardingPage
        onComplete={(creds) => {
          saveCredentials(creds);
        }}
      />
    );
  }

  const selectedServer = config.servers.find(s => s.id === selectedServerId);

  return (
    <Layout activeTab={activeTab} onTabChange={(tab) => {
      setActiveTab(tab);
      setSelectedServerId(null); // Reset selection on tab change
    }}>
      {activeTab === 'dashboard' && !selectedServer && (
        <DashboardPage
          servers={config.servers}
          onAddServer={() => setIsAddServerModalOpen(true)}
          onManageServer={(id) => setSelectedServerId(id)}
        />
      )}

      {activeTab === 'dashboard' && selectedServer && (
        <ServerDetailsPage
          server={selectedServer}
          onBack={() => setSelectedServerId(null)}
          onDeploy={(deployOnly) => deployServer(selectedServer.id, deployOnly)}
          onUpdate={updateServer}
          onDelete={deleteServer}
          isDeploying={deploying}
          logs={logs}
          socket={socket}
          projectId={config.credentials.googleProjectId}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsPage
          config={config}
          onSaveCredentials={saveCredentials}
        />
      )}

      {/* Add Server Modal */}
      <Modal
        isOpen={isAddServerModalOpen}
        onClose={() => setIsAddServerModalOpen(false)}
        title="Add New Server"
      >
        <div class="space-y-4">
          <div class="space-y-2">
            <label class="text-xs font-medium text-zinc-300">Server Name</label>
            <input
              type="text"
              value={newServerName}
              onInput={(e) => setNewServerName((e.target as HTMLInputElement).value)}
              placeholder="e.g. Weather Service"
              class="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              autoFocus
            />
          </div>
          <div class="space-y-2">
            <label class="text-xs font-medium text-zinc-300">Project Path</label>
            <input
              type="text"
              value={newServerPath}
              onInput={(e) => setNewServerPath((e.target as HTMLInputElement).value)}
              placeholder="/absolute/path/to/project"
              class="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
            />
            <p class="text-xs text-zinc-500">
              Path to the directory containing your MCP server code.
            </p>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setIsAddServerModalOpen(false)}
              class="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddServer}
              disabled={!newServerName || !newServerPath}
              class="bg-[hsl(var(--primary))] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[hsl(var(--primary))/90] transition-colors disabled:opacity-50"
            >
              Add Server
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
