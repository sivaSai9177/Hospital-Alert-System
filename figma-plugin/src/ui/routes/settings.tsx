import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { 
  Settings as SettingsIcon,
  Server,
  Palette,
  Bell,
  Database,
  Shield,
  Check
} from 'lucide-react';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

interface SettingsSection {
  id: string;
  title: string;
  icon: any;
}

const sections: SettingsSection[] = [
  { id: 'connection', title: 'Connection', icon: Server },
  { id: 'theme', title: 'Theme', icon: Palette },
  { id: 'notifications', title: 'Notifications', icon: Bell },
  { id: 'data', title: 'Data & Storage', icon: Database },
  { id: 'security', title: 'Security', icon: Shield },
];

function SettingsPage() {
  const [activeSection, setActiveSection] = useState('connection');
  const [settings, setSettings] = useState({
    mcpUrl: 'http://localhost:3456',
    wsUrl: 'ws://localhost:3456',
    theme: 'dark',
    autoSync: true,
    notifications: true,
    saveHistory: true,
    historyLimit: 100,
    apiKey: '',
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Save settings to localStorage
    localStorage.setItem('figma-plugin-settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex h-full">
      {/* Settings Navigation */}
      <div className="w-48 border-r border-figma-border p-figma-sm">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={cn(
              "w-full flex items-center gap-2 px-figma-sm py-figma-xs rounded-figma mb-1",
              "hover:bg-figma-border transition-colors",
              activeSection === section.id && "bg-figma-border text-figma-blue"
            )}
          >
            <section.icon className="w-4 h-4" />
            <span className="text-figma-sm">{section.title}</span>
          </button>
        ))}
      </div>

      {/* Settings Content */}
      <div className="flex-1 p-figma-lg overflow-y-auto">
        <div className="max-w-md">
          {activeSection === 'connection' && (
            <div>
              <h2 className="text-figma-base font-semibold mb-figma-lg">Connection Settings</h2>
              
              <div className="space-y-figma-md">
                <div>
                  <label className="text-figma-sm text-figma-text-secondary">MCP Server URL</label>
                  <input
                    type="text"
                    value={settings.mcpUrl}
                    onChange={(e) => setSettings({ ...settings, mcpUrl: e.target.value })}
                    className="input-figma w-full mt-1"
                  />
                  <p className="text-figma-xs text-figma-text-secondary mt-1">
                    URL of the Model Context Protocol server
                  </p>
                </div>

                <div>
                  <label className="text-figma-sm text-figma-text-secondary">WebSocket URL</label>
                  <input
                    type="text"
                    value={settings.wsUrl}
                    onChange={(e) => setSettings({ ...settings, wsUrl: e.target.value })}
                    className="input-figma w-full mt-1"
                  />
                  <p className="text-figma-xs text-figma-text-secondary mt-1">
                    WebSocket URL for real-time updates
                  </p>
                </div>

                <div className="pt-figma-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoSync}
                      onChange={(e) => setSettings({ ...settings, autoSync: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-figma-sm">Enable auto-sync with codebase</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'theme' && (
            <div>
              <h2 className="text-figma-base font-semibold mb-figma-lg">Theme Settings</h2>
              
              <div className="space-y-figma-md">
                <div>
                  <label className="text-figma-sm text-figma-text-secondary">Theme</label>
                  <select
                    value={settings.theme}
                    onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                    className="input-figma w-full mt-1"
                  >
                    <option value="dark">Dark (Default)</option>
                    <option value="light">Light</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                </div>

                <div className="pt-figma-sm">
                  <p className="text-figma-xs text-figma-text-secondary">
                    Note: Light theme is experimental and may have visual issues.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div>
              <h2 className="text-figma-base font-semibold mb-figma-lg">Notification Settings</h2>
              
              <div className="space-y-figma-md">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications}
                    onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-figma-sm">Enable notifications</span>
                </label>

                <p className="text-figma-xs text-figma-text-secondary">
                  Get notified about sync status, errors, and AI suggestions.
                </p>
              </div>
            </div>
          )}

          {activeSection === 'data' && (
            <div>
              <h2 className="text-figma-base font-semibold mb-figma-lg">Data & Storage</h2>
              
              <div className="space-y-figma-md">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.saveHistory}
                    onChange={(e) => setSettings({ ...settings, saveHistory: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-figma-sm">Save mutation history</span>
                </label>

                <div>
                  <label className="text-figma-sm text-figma-text-secondary">History limit</label>
                  <input
                    type="number"
                    value={settings.historyLimit}
                    onChange={(e) => setSettings({ ...settings, historyLimit: parseInt(e.target.value) || 100 })}
                    className="input-figma w-full mt-1"
                    min="10"
                    max="1000"
                  />
                  <p className="text-figma-xs text-figma-text-secondary mt-1">
                    Maximum number of history items to keep
                  </p>
                </div>

                <div className="pt-figma-md">
                  <button className="btn-figma-secondary">
                    Clear All Data
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div>
              <h2 className="text-figma-base font-semibold mb-figma-lg">Security</h2>
              
              <div className="space-y-figma-md">
                <div>
                  <label className="text-figma-sm text-figma-text-secondary">API Key (Optional)</label>
                  <input
                    type="password"
                    value={settings.apiKey}
                    onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                    className="input-figma w-full mt-1"
                    placeholder="Enter your API key"
                  />
                  <p className="text-figma-xs text-figma-text-secondary mt-1">
                    Required only if your MCP server uses authentication
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex items-center gap-2 mt-figma-xl pt-figma-lg border-t border-figma-border">
            <button onClick={handleSave} className="btn-figma">
              Save Settings
            </button>
            {saved && (
              <div className="flex items-center gap-1 text-figma-green">
                <Check className="w-4 h-4" />
                <span className="text-figma-sm">Saved!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}