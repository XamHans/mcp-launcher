import { useState } from 'preact/hooks';
import { useSocket } from './hooks/useSocket';
import { Layout } from './components/Layout';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { ServerDetailsPage } from './pages/ServerDetailsPage';
import { PrerequisitesCheck } from './components/PrerequisitesCheck';
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
    logs,
    prerequisites,
    checkPrerequisites
  } = useSocket();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');
  const [isAddServerModalOpen, setIsAddServerModalOpen] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerPath, setNewServerPath] = useState('');
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);

  const handleAddServer = () => {
    if (!newServerName || !newServerPath) return;
    createServer({
      name: newServerName,
      sourcePath: newServerPath,
      description: 'Added via Dashboard'
    });
    setIsAddServerModalOpen(false);
    setNewServerName('');
    setNewServerPath('');
  };

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
      setSelectedServerId(null);
    }}>
      {activeTab === 'dashboard' && !selectedServer && (
        <>
          <div className="mb-6">
            <PrerequisitesCheck 
              prerequisites={prerequisites} 
              onRefresh={checkPrerequisites}
            />
          </div>
          <DashboardPage
            servers={config.servers}
            onAddServer={() => setIsAddServerModalOpen(true)}
            onManageServer={(id) => setSelectedServerId(id)}
          />
        </>
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
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Server Name</label>
            <input
              type="text"
              value={newServerName}
              onInput={(e) => setNewServerName((e.target as HTMLInputElement).value)}
              placeholder="e.g. Weather Service"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Project Path</label>
            <input
              type="text"
              value={newServerPath}
              onInput={(e) => setNewServerPath((e.target as HTMLInputElement).value)}
              placeholder="/absolute/path/to/project"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Path to the directory containing your MCP server code.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsAddServerModalOpen(false)}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddServer}
              disabled={!newServerName || !newServerPath}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Add Server
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
