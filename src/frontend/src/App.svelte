<script lang="ts">
  import { onMount } from "svelte";
  import { socketStore } from "./lib/stores/socketStore";
  import Layout from "./lib/components/Layout.svelte";
  import Modal from "./lib/components/Modal.svelte";
  import { Button, Input } from "./lib/components/ui";
  import OnboardingPage from "./lib/pages/OnboardingPage.svelte";
  import DashboardPage from "./lib/pages/DashboardPage.svelte";
  import ServerDetailsPage from "./lib/pages/ServerDetailsPage.svelte";
  import SettingsPage from "./lib/pages/SettingsPage.svelte";

  // Destructure the nested stores from socketStore
  const configStore = socketStore.config;
  const logsStore = socketStore.logs;
  const deployingStore = socketStore.deploying;

  let activeTab: "dashboard" | "settings" = "dashboard";
  let selectedServerId: string | null = null;
  let isAddServerModalOpen = false;
  let newServerName = "";
  let newServerPath = "";

  $: config = $configStore;
  $: logs = $logsStore;
  $: deploying = $deployingStore;
  $: selectedServer =
    config.servers.find((s) => s.id === selectedServerId) || null;

  onMount(() => {
    socketStore.connect();
  });

  function handleAddServer() {
    if (newServerName && newServerPath) {
      socketStore.createServer({
        name: newServerName,
        sourcePath: newServerPath,
        description: "Added via Dashboard",
      });
      isAddServerModalOpen = false;
      newServerName = "";
      newServerPath = "";
    }
  }

  function handleTabChange(tab: "dashboard" | "settings") {
    activeTab = tab;
    selectedServerId = null;
  }

  function handleManageServer(id: string) {
    selectedServerId = id;
  }

  function handleBack() {
    selectedServerId = null;
  }

  function handleDeploy(deployOnly: boolean) {
    if (selectedServerId) {
      socketStore.deployServer(selectedServerId, deployOnly);
    }
  }

  function handleDelete() {
    if (selectedServerId) {
      socketStore.deleteServer(selectedServerId);
      selectedServerId = null;
    }
  }
</script>

{#if !config.onboardingCompleted}
  <OnboardingPage />
{:else}
  <Layout {activeTab} onTabChange={handleTabChange}>
    {#if activeTab === "dashboard" && !selectedServer}
      <DashboardPage
        servers={config.servers}
        onAddServer={() => (isAddServerModalOpen = true)}
        onManageServer={handleManageServer}
      />
    {:else if activeTab === "dashboard" && selectedServer}
      <ServerDetailsPage
        server={selectedServer}
        onBack={handleBack}
        onDeploy={handleDeploy}
        onDelete={handleDelete}
        isDeploying={deploying}
        {logs}
        projectId={config.credentials.googleProjectId}
      />
    {:else if activeTab === "settings"}
      <SettingsPage {config} />
    {/if}
  </Layout>
{/if}

<Modal
  isOpen={isAddServerModalOpen}
  title="Add New Server"
  on:close={() => (isAddServerModalOpen = false)}
>
  <div class="modal-form">
    <div class="field">
      <label class="field-label" for="server-name">Server Name</label>
      <Input
        id="server-name"
        placeholder="e.g. Weather Service"
        bind:value={newServerName}
      />
    </div>
    <div class="field">
      <label class="field-label" for="server-path">Project Path</label>
      <Input
        id="server-path"
        placeholder="/absolute/path/to/project"
        bind:value={newServerPath}
      />
      <p class="hint">Path to the directory containing your MCP server code.</p>
    </div>
    <div class="modal-actions">
      <Button variant="outline" onclick={() => (isAddServerModalOpen = false)}>
        Cancel
      </Button>
      <Button
        variant="default"
        onclick={handleAddServer}
        disabled={!newServerName || !newServerPath}
      >
        Add Server
      </Button>
    </div>
  </div>
</Modal>

<style>
  .modal-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field-label {
    font-size: 12px;
    font-weight: 500;
    color: #475569;
  }

  .hint {
    font-size: 12px;
    color: #94a3b8;
    margin: 0;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 4px;
  }
</style>
