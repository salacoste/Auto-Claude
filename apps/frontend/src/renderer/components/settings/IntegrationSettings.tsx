import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Key,
  Eye,
  EyeOff,
  Info,
  Users,
  Plus,
  Cloud,
  Trash2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { cn } from '../../lib/utils';
import { SettingsSection } from './SettingsSection';
import { loadClaudeProfiles as loadGlobalClaudeProfiles } from '../../stores/claude-profile-store';
import { IntegrationCard } from './integrations/IntegrationCard';
import { ApiTokenIntegrationForm } from './integrations/ApiTokenIntegrationForm';
import type { AppSettings, ClaudeProfile } from '../../../shared/types';
import type { UnifiedIntegration, OAuthIntegration, ApiTokenIntegration } from '../../../shared/types/integration';

interface IntegrationSettingsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  isOpen: boolean;
}

/**
 * Integration settings for Claude accounts and API keys
 */
export function IntegrationSettings({ settings, onSettingsChange, isOpen }: IntegrationSettingsProps) {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');

  // Password visibility toggle for global API keys
  const [showGlobalOpenAIKey, setShowGlobalOpenAIKey] = useState(false);

  // Unified integrations state
  const [integrations, setIntegrations] = useState<UnifiedIntegration[]>([]);
  const [claudeProfiles, setClaudeProfiles] = useState<Record<string, ClaudeProfile>>({});
  const [activeIntegrationId, setActiveIntegrationId] = useState<string | undefined>(settings.activeIntegrationId);

  // Type selector state
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [newIntegrationName, setNewIntegrationName] = useState('');

  // API Token form state
  const [showApiTokenForm, setShowApiTokenForm] = useState(false);
  const [apiTokenFormName, setApiTokenFormName] = useState('');

  // OAuth creation state
  const [isCreatingOAuth, setIsCreatingOAuth] = useState(false);

  // Load integrations when component mounts or settings change
  useEffect(() => {
    if (isOpen) {
      loadIntegrations();
      loadClaudeProfiles();
    }
  }, [isOpen, settings.integrations, settings.activeIntegrationId]); // Re-load when settings change

  // Listen for OAuth authentication completion
  useEffect(() => {
    console.log('[IntegrationSettings] Setting up OAuth listener...');

    const unsubscribe = window.electronAPI.onTerminalOAuthToken(async (info) => {
      console.log('[IntegrationSettings] OAuth event received!', info);

      if (info.success && info.profileId) {
        console.log('[IntegrationSettings] Processing successful OAuth for profile:', info.profileId);

        // Update OAuth integration authentication status
        // Use functional update to avoid stale closure over integrations
        setIntegrations(currentIntegrations => {
          console.log('[IntegrationSettings] Current integrations:', currentIntegrations.length);

          const updatedIntegrations = currentIntegrations.map(integration => {
            if (integration.type === 'oauth' && integration.profileId === info.profileId) {
              console.log('[IntegrationSettings] Found matching integration, updating...');
              return {
                ...integration,
                isAuthenticated: true,
                email: info.email
              };
            }
            return integration;
          });

          console.log('[IntegrationSettings] Updated integrations:', updatedIntegrations.length);

          // Save to settings
          onSettingsChange({
            ...settings,
            integrations: updatedIntegrations
          });

          return updatedIntegrations;
        });

        await loadClaudeProfiles();
        alert(`✅ Integration authenticated successfully!${info.email ? `\n\nAccount: ${info.email}` : ''}`);
      } else {
        console.log('[IntegrationSettings] OAuth event not successful or missing profileId:', info);
      }
    });

    return () => {
      console.log('[IntegrationSettings] Cleaning up OAuth listener');
      unsubscribe();
    };
  }, []); // Empty deps - listener only needs to be set up once


  const loadIntegrations = () => {
    setIntegrations(settings.integrations || []);
    setActiveIntegrationId(settings.activeIntegrationId);
  };

  const loadClaudeProfiles = async () => {
    try {
      const result = await window.electronAPI.getClaudeProfiles();
      if (result.success && result.data) {
        const profilesMap: Record<string, ClaudeProfile> = {};
        result.data.profiles.forEach(profile => {
          profilesMap[profile.id] = profile;
        });
        setClaudeProfiles(profilesMap);
        await loadGlobalClaudeProfiles();
      }
    } catch (err) {
      console.error('Failed to load Claude profiles:', err);
    }
  };

  // Type selector handlers
  const handleStartAddIntegration = () => {
    if (!newIntegrationName.trim()) return;
    setShowTypeSelector(true);
  };

  const handleSelectIntegrationType = async (type: 'oauth' | 'api-token') => {
    if (type === 'oauth') {
      await handleCreateOAuthIntegration();
    } else {
      setApiTokenFormName(newIntegrationName);
      setShowApiTokenForm(true);
      setShowTypeSelector(false);
    }
  };

  const handleCancelTypeSelector = () => {
    setShowTypeSelector(false);
    setNewIntegrationName('');
  };

  // OAuth integration creation
  const handleCreateOAuthIntegration = async () => {
    if (!newIntegrationName.trim()) return;

    setIsCreatingOAuth(true);
    try {
      const profileName = newIntegrationName.trim();
      const profileSlug = profileName.toLowerCase().replace(/\s+/g, '-');

      const result = await window.electronAPI.saveClaudeProfile({
        id: `profile-${Date.now()}`,
        name: profileName,
        configDir: `~/.claude-profiles/${profileSlug}`,
        isDefault: false,
        createdAt: new Date()
      });

      if (result.success && result.data) {
        const initResult = await window.electronAPI.initializeClaudeProfile(result.data.id);

        if (initResult.success) {
          const oauthIntegration: OAuthIntegration = {
            id: `oauth-${Date.now()}`,
            type: 'oauth',
            name: profileName,
            isAuthenticated: false,
            profileId: result.data.id,
            createdAt: new Date().toISOString()
          };

          const updatedIntegrations = [...integrations, oauthIntegration];
          setIntegrations(updatedIntegrations);
          onSettingsChange({ ...settings, integrations: updatedIntegrations });

          setNewIntegrationName('');
          setShowTypeSelector(false);
          await loadClaudeProfiles();

          alert(
            `Authenticating "${profileName}"...\n\n` +
            `A browser window will open for you to log in with your Claude account.\n\n` +
            `The authentication will be saved automatically once complete.`
          );
        } else {
          alert(`Failed to start authentication: ${initResult.error || 'Please try again.'}`);
        }
      }
    } catch (err) {
      console.error('Failed to create OAuth integration:', err);
      alert('Failed to create integration. Please try again.');
    } finally {
      setIsCreatingOAuth(false);
    }
  };

  const handleReauthenticate = async (integration: OAuthIntegration) => {
    try {
      const result = await window.electronAPI.initializeClaudeProfile(integration.profileId);
      if (result.success) {
        alert(`Authenticating "${integration.name}"...`);
      } else {
        alert(`Failed to start authentication: ${result.error || 'Please try again.'}`);
      }
    } catch (err) {
      console.error('Failed to re-authenticate:', err);
      alert('Failed to start authentication. Please try again.');
    }
  };


  // API Token integration handlers
  const handleSaveApiTokenIntegration = (data: {
    name: string;
    description: string;
    apiToken: string;
    baseUrl: string;
    modelMapping?: import('../../../shared/types/integration').ModelMapping;
  }) => {
    const apiTokenIntegration: ApiTokenIntegration = {
      id: `api-${Date.now()}`,
      type: 'api-token',
      name: data.name,
      description: data.description,
      apiToken: data.apiToken,
      baseUrl: data.baseUrl,
      modelMapping: data.modelMapping,
      createdAt: new Date().toISOString()
    };

    const updatedIntegrations = [...integrations, apiTokenIntegration];

    setIntegrations(updatedIntegrations);
    onSettingsChange({
      ...settings,
      integrations: updatedIntegrations
    });

    setShowApiTokenForm(false);
    setApiTokenFormName('');
    setNewIntegrationName('');
  };

  const handleCancelApiTokenForm = () => {
    setShowApiTokenForm(false);
    setApiTokenFormName('');
    setNewIntegrationName('');
  };

  // Common integration handlers
  const handleSetActive = (integrationId: string) => {
    setActiveIntegrationId(integrationId);
    onSettingsChange({
      ...settings,
      activeIntegrationId: integrationId
    });
  };

  const handleDeleteIntegration = async (integrationId: string) => {
    const integration = integrations.find(i => i.id === integrationId);
    if (!integration) return;

    if (!confirm(`Delete integration "${integration.name}"?`)) return;

    // If OAuth, also delete Claude profile
    if (integration.type === 'oauth') {
      try {
        await window.electronAPI.deleteClaudeProfile(integration.profileId);
      } catch (err) {
        console.error('Failed to delete Claude profile:', err);
      }
    }

    const updatedIntegrations = integrations.filter(i => i.id !== integrationId);
    setIntegrations(updatedIntegrations);

    // Clear active if deleting active integration
    if (integrationId === activeIntegrationId) {
      setActiveIntegrationId(undefined);
      onSettingsChange({
        ...settings,
        integrations: updatedIntegrations,
        activeIntegrationId: undefined
      });
    } else {
      onSettingsChange({
        ...settings,
        integrations: updatedIntegrations
      });
    }

    // Reload profiles
    await loadClaudeProfiles();
  };

  const handleTestConnection = async (integration: UnifiedIntegration): Promise<{ success: boolean; message: string }> => {
    try {
      if (integration.type === 'oauth') {
        // Test OAuth by making REAL API request via backend
        const profile = claudeProfiles[integration.profileId];

        if (!profile) {
          return {
            success: false,
            message: 'Profile not found. Please re-authenticate.'
          };
        }

        if (!integration.isAuthenticated || !profile.oauthToken) {
          return {
            success: false,
            message: 'No OAuth token found. Please authenticate first.'
          };
        }

        // Make REAL API call via Python backend
        try {
          const result = await window.electronAPI.testOAuthToken(profile.oauthToken);

          if (result.success && result.data) {
            if (result.data.status === 'success') {
              return {
                success: true,
                message: `✓ Connection successful! OAuth integration "${integration.name}" is verified${integration.email ? ` as ${integration.email}` : ''} and ready to use.`
              };
            } else {
              return {
                success: false,
                message: result.data.message || 'Connection test failed'
              };
            }
          } else {
            return {
              success: false,
              message: result.error || 'Failed to test connection'
            };
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return {
            success: false,
            message: `Connection test failed: ${errorMessage}`
          };
        }
      } else {
        // Test API Token by making REAL API request via backend
        if (!integration.apiToken || !integration.baseUrl) {
          return {
            success: false,
            message: 'API Token or Base URL is missing.'
          };
        }

        // Validate URL format
        try {
          new URL(integration.baseUrl);
        } catch {
          return {
            success: false,
            message: 'Invalid Base URL format.'
          };
        }

        // Make REAL API call via Python backend
        try {
          const result = await window.electronAPI.testApiToken(
            integration.apiToken,
            integration.baseUrl
          );

          if (result.success && result.data) {
            if (result.data.status === 'success') {
              return {
                success: true,
                message: `✓ Connection successful! API Token integration "${integration.name}" is verified and ready for ${integration.baseUrl}`
              };
            } else {
              return {
                success: false,
                message: result.data.message || 'Connection test failed'
              };
            }
          } else {
            return {
              success: false,
              message: result.error || 'Failed to test connection'
            };
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return {
            success: false,
            message: `Connection test failed: ${errorMessage}`
          };
        }
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Test failed with unknown error'
      };
    }
  };

  const handleFetchModels = async (integration: UnifiedIntegration & { type: 'api-token' }): Promise<string[]> => {
    try {
      const result = await window.electronAPI.getApiModels(
        integration.apiToken,
        integration.baseUrl
      );

      if (result.success && result.data?.models) {
        return result.data.models;
      } else {
        alert(`❌ Failed to fetch models:\n\n${result.error || 'Unknown error'}`);
        return [];
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ Failed to fetch models:\n\n${errorMessage}`);
      return [];
    }
  };

  const handleUpdateModelMapping = (integrationId: string, modelMapping: { opus?: string; sonnet?: string; haiku?: string }) => {
    // Clean mapping - remove undefined values
    const cleanMapping: any = {};
    if (modelMapping.opus) cleanMapping.opus = modelMapping.opus;
    if (modelMapping.sonnet) cleanMapping.sonnet = modelMapping.sonnet;
    if (modelMapping.haiku) cleanMapping.haiku = modelMapping.haiku;

    const updatedIntegrations = integrations.map(int => {
      if (int.id === integrationId && int.type === 'api-token') {
        return {
          ...int,
          modelMapping: Object.keys(cleanMapping).length > 0 ? cleanMapping : undefined
        };
      }
      return int;
    });

    setIntegrations(updatedIntegrations);
    onSettingsChange({
      ...settings,
      integrations: updatedIntegrations
    });

    // Show success feedback (could use toast in future)
    alert('✓ Model mapping saved successfully!');
  };

  return (
    <SettingsSection
      title={t('integrations.title')}
      description={t('integrations.description')}
    >
      <div className="space-y-6">
        {/* Integrations Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Integrations</h4>
            <p className="text-xs text-muted-foreground">
              {integrations.length} integration{integrations.length !== 1 ? 's' : ''}
              {activeIntegrationId && ' · 1 active'}
            </p>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Manage Claude OAuth accounts and API token-based integrations. Only one integration can be active at a time.
            </p>


            {/* Integrations list */}
            {integrations.length > 0 && (
              <div className="space-y-2">
                {integrations.map((integration) => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    claudeProfile={integration.type === 'oauth' ? claudeProfiles[integration.profileId] : undefined}
                    isActive={integration.id === activeIntegrationId}
                    onSetActive={() => handleSetActive(integration.id)}
                    onDelete={() => handleDeleteIntegration(integration.id)}
                    onReauthenticate={integration.type === 'oauth' ? () => handleReauthenticate(integration) : undefined}
                    onTestConnection={() => handleTestConnection(integration)}
                    onFetchModels={integration.type === 'api-token' ? () => handleFetchModels(integration) : undefined}
                    onUpdateModelMapping={integration.type === 'api-token' ? (mapping) => handleUpdateModelMapping(integration.id, mapping) : undefined}
                  />
                ))}
              </div>
            )}

            {/* Add integration form or selector */}
            {showApiTokenForm ? (
              <div className="pt-3 border-t border-border">
                <ApiTokenIntegrationForm
                  initialName={apiTokenFormName}
                  onSave={handleSaveApiTokenIntegration}
                  onCancel={handleCancelApiTokenForm}
                />
              </div>
            ) : showTypeSelector ? (
              <div className="rounded-lg border border-primary bg-primary/5 p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Choose Integration Type</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select how you want to authenticate for "{newIntegrationName}"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleSelectIntegrationType('oauth')}
                    disabled={isCreatingOAuth}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                  >
                    <Users className="h-8 w-8 text-primary" />
                    <div className="text-center">
                      <p className="text-sm font-medium">Claude OAuth</p>
                      <p className="text-xs text-muted-foreground">Use your Claude account</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleSelectIntegrationType('api-token')}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/10 transition-colors"
                  >
                    <Cloud className="h-8 w-8 text-primary" />
                    <div className="text-center">
                      <p className="text-sm font-medium">API Token</p>
                      <p className="text-xs text-muted-foreground">Use z.ai or custom provider</p>
                    </div>
                  </button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelTypeSelector}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <Input
                  placeholder="Integration name (e.g., Work, Personal, z.ai)"
                  value={newIntegrationName}
                  onChange={(e) => setNewIntegrationName(e.target.value)}
                  className="flex-1 h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newIntegrationName.trim()) {
                      handleStartAddIntegration();
                    }
                  }}
                />
                <Button
                  onClick={handleStartAddIntegration}
                  disabled={!newIntegrationName.trim()}
                  size="sm"
                  className="gap-1 shrink-0"
                >
                  <Plus className="h-3 w-3" />
                  Add Integration
                </Button>
              </div>
            )}
          </div>
        </div>
        {/* API Keys Section */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground">{t('integrations.apiKeys')}</h4>
          </div>

          <div className="rounded-lg bg-info/10 border border-info/30 p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                {t('integrations.apiKeysInfo')}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="globalOpenAIKey" className="text-sm font-medium text-foreground">
                {t('integrations.openaiKey')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('integrations.openaiKeyDescription')}
              </p>
              <div className="relative max-w-lg">
                <Input
                  id="globalOpenAIKey"
                  type={showGlobalOpenAIKey ? 'text' : 'password'}
                  placeholder="sk-..."
                  value={settings.globalOpenAIApiKey || ''}
                  onChange={(e) =>
                    onSettingsChange({ ...settings, globalOpenAIApiKey: e.target.value || undefined })
                  }
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowGlobalOpenAIKey(!showGlobalOpenAIKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showGlobalOpenAIKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>


      </div>
    </SettingsSection>
  );
}
