import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Key,
  Eye,
  EyeOff,
  Info,
  Users,
  Plus,
  Cloud
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
  const [activeIntegrationId, setActiveIntegrationId] = useState<string | null>(null);

  // Type selector state
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [newIntegrationName, setNewIntegrationName] = useState('');

  // API Token form state
  const [showApiTokenForm, setShowApiTokenForm] = useState(false);
  const [apiTokenFormName, setApiTokenFormName] = useState('');

  // OAuth creation state
  const [isCreatingOAuth, setIsCreatingOAuth] = useState(false);

  // Load integrations and Claude profiles when section is shown
  useEffect(() => {
    if (isOpen) {
      loadIntegrations();
      loadClaudeProfiles();
    }
  }, [isOpen]);

  // Listen for OAuth authentication completion
  useEffect(() => {
    const unsubscribe = window.electronAPI.onTerminalOAuthToken(async (info) => {
      if (info.success && info.profileId) {
        // Update OAuth integration authentication status
        const updatedIntegrations = integrations.map(integration => {
          if (integration.type === 'oauth' && integration.profileId === info.profileId) {
            return {
              ...integration,
              isAuthenticated: true,
              email: info.email
            };
          }
          return integration;
        });

        setIntegrations(updatedIntegrations);
        onSettingsChange({
          ...settings,
          integrations: updatedIntegrations
        });

        await loadClaudeProfiles();
        alert(`✅ Integration authenticated successfully!${info.email ? `\n\nAccount: ${info.email}` : ''}`);
      }
    });

    return unsubscribe;
  }, [integrations]);


  const loadIntegrations = () => {
    setIntegrations(settings.integrations || []);
    setActiveIntegrationId(settings.activeIntegrationId || null);
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
    onSettingsChange({
      ...settings,
      integrations: updatedIntegrations,
      activeIntegrationId: activeIntegrationId === integrationId ? undefined : activeIntegrationId
    });
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

            {/* Accounts list */}
            {isLoadingProfiles ? (
              <div className="flex items-center justify-center py-4">
              </div>
            ) : claudeProfiles.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-center mb-4">
                <p className="text-sm text-muted-foreground">{t('integrations.noAccountsYet')}</p>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {claudeProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className={cn(
                      "rounded-lg border transition-colors",
                      profile.id === activeProfileId
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-between p-3",
                      expandedTokenProfileId !== profile.id && "hover:bg-muted/50"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0",
                          profile.id === activeProfileId
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {(editingProfileId === profile.id ? editingProfileName : profile.name).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          {editingProfileId === profile.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingProfileName}
                                onChange={(e) => setEditingProfileName(e.target.value)}
                                className="h-7 text-sm w-40"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRenameProfile();
                                  if (e.key === 'Escape') cancelEditingProfile();
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleRenameProfile}
                                className="h-7 w-7 text-success hover:text-success hover:bg-success/10"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={cancelEditingProfile}
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-foreground">{profile.name}</span>
                                {profile.isDefault && (
                                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{t('integrations.default')}</span>
                                )}
                                {profile.id === activeProfileId && (
                                  <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Star className="h-3 w-3" />
                                    {t('integrations.active')}
                                  </span>
                                )}
                                {(profile.oauthToken || (profile.isDefault && profile.configDir)) ? (
                                  <span className="text-xs bg-success/20 text-success px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Check className="h-3 w-3" />
                                    {t('integrations.authenticated')}
                                  </span>
                                ) : (
                                  <span className="text-xs bg-warning/20 text-warning px-1.5 py-0.5 rounded">
                                    {t('integrations.needsAuth')}
                                  </span>
                                )}
                              </div>
                              {profile.email && (
                                <span className="text-xs text-muted-foreground">{profile.email}</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      {editingProfileId !== profile.id && (
                        <div className="flex items-center gap-1">
                          {/* Authenticate button - show only if NOT authenticated */}
                          {/* A profile is authenticated if: has OAuth token OR (is default AND has configDir) */}
                          {!(profile.oauthToken || (profile.isDefault && profile.configDir)) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAuthenticateProfile(profile.id)}
                              disabled={authenticatingProfileId === profile.id}
                              className="gap-1 h-7 text-xs"
                            >
                              {authenticatingProfileId === profile.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <LogIn className="h-3 w-3" />
                              )}
                              {t('integrations.authenticate')}
                            </Button>
                          ) : (
                            /* Re-authenticate button for already authenticated profiles */
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleAuthenticateProfile(profile.id)}
                              disabled={authenticatingProfileId === profile.id}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Re-authenticate profile"
                            >
                              {authenticatingProfileId === profile.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                          {profile.id !== activeProfileId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetActiveProfile(profile.id)}
                              className="gap-1 h-7 text-xs"
                            >
                              <Check className="h-3 w-3" />
                              {t('integrations.setActive')}
                            </Button>
                          )}
                          {/* Toggle token entry button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleTokenEntry(profile.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title={expandedTokenProfileId === profile.id ? "Hide token entry" : "Enter token manually"}
                          >
                            {expandedTokenProfileId === profile.id ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditingProfile(profile)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Rename profile"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          {!profile.isDefault && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteProfile(profile.id)}
                              disabled={deletingProfileId === profile.id}
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Delete profile"
                            >
                              {deletingProfileId === profile.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Expanded token entry section */}
                    {expandedTokenProfileId === profile.id && (
                      <div className="px-3 pb-3 pt-0 border-t border-border/50 mt-0">
                        <div className="bg-muted/30 rounded-lg p-3 mt-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium text-muted-foreground">
                              {t('integrations.manualTokenEntry')}
                            </Label>
                            <span className="text-xs text-muted-foreground">
                              {t('integrations.runSetupToken')}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div className="relative">
                              <Input
                                type={showManualToken ? 'text' : 'password'}
                                placeholder={t('integrations.tokenPlaceholder')}
                                value={manualToken}
                                onChange={(e) => setManualToken(e.target.value)}
                                className="pr-10 font-mono text-xs h-8"
                              />
                              <button
                                type="button"
                                onClick={() => setShowManualToken(!showManualToken)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showManualToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </button>
                            </div>

                            <Input
                              type="email"
                              placeholder={t('integrations.emailPlaceholder')}
                              value={manualTokenEmail}
                              onChange={(e) => setManualTokenEmail(e.target.value)}
                              className="text-xs h-8"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleTokenEntry(profile.id)}
                              className="h-7 text-xs"
                            >
                              {tCommon('buttons.cancel')}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSaveManualToken(profile.id)}
                              disabled={!manualToken.trim() || savingTokenProfileId === profile.id}
                              className="h-7 text-xs gap-1"
                            >
                              {savingTokenProfileId === profile.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                              {t('integrations.saveToken')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add new account */}
            <div className="flex items-center gap-2">
              <Input
                placeholder={t('integrations.accountNamePlaceholder')}
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                className="flex-1 h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newProfileName.trim()) {
                    handleAddProfile();
                  }
                }}
              />
              <Button
                onClick={handleAddProfile}
                disabled={!newProfileName.trim() || isAddingProfile}
                size="sm"
                className="gap-1 shrink-0"
              >
                {isAddingProfile ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                {tCommon('buttons.add')}
              </Button>
            </div>
          </div>
        </div>

        {/* Auto-Switch Settings Section */}
        {claudeProfiles.length > 1 && (
          <div className="space-y-4 pt-6 border-t border-border">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold text-foreground">{t('integrations.autoSwitching')}</h4>
            </div>

            <div className="rounded-lg bg-muted/30 border border-border p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('integrations.autoSwitchingDescription')}
              </p>

              {/* Master toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">{t('integrations.enableAutoSwitching')}</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('integrations.masterSwitch')}
                  </p>
                </div>
                <Switch
                  checked={autoSwitchSettings?.enabled ?? false}
                  onCheckedChange={(enabled) => handleUpdateAutoSwitch({ enabled })}
                  disabled={isLoadingAutoSwitch}
                />
              </div>

              {autoSwitchSettings?.enabled && (
                <>
                  {/* Proactive Monitoring Section */}
                  <div className="pl-6 space-y-4 pt-2 border-l-2 border-primary/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Activity className="h-3.5 w-3.5" />
                          {t('integrations.proactiveMonitoring')}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('integrations.proactiveDescription')}
                        </p>
                      </div>
                      <Switch
                        checked={autoSwitchSettings?.proactiveSwapEnabled ?? true}
                        onCheckedChange={(value) => handleUpdateAutoSwitch({ proactiveSwapEnabled: value })}
                        disabled={isLoadingAutoSwitch}
                      />
                    </div>

                    {autoSwitchSettings?.proactiveSwapEnabled && (
                      <>
                        {/* Check interval */}
                        <div className="space-y-2">
                          <Label className="text-sm">{t('integrations.checkUsageEvery')}</Label>
                          <select
                            className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm"
                            value={autoSwitchSettings?.usageCheckInterval ?? 30000}
                            onChange={(e) => handleUpdateAutoSwitch({ usageCheckInterval: parseInt(e.target.value) })}
                            disabled={isLoadingAutoSwitch}
                          >
                            <option value={15000}>{t('integrations.seconds15')}</option>
                            <option value={30000}>{t('integrations.seconds30')}</option>
                            <option value={60000}>{t('integrations.minute1')}</option>
                            <option value={0}>{t('integrations.disabled')}</option>
                          </select>
                        </div>

                        {/* Session threshold */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">{t('integrations.sessionThreshold')}</Label>
                            <span className="text-sm font-mono">{autoSwitchSettings?.sessionThreshold ?? 95}%</span>
                          </div>
                          <input
                            type="range"
                            min="70"
                            max="99"
                            step="1"
                            value={autoSwitchSettings?.sessionThreshold ?? 95}
                            onChange={(e) => handleUpdateAutoSwitch({ sessionThreshold: parseInt(e.target.value) })}
                            disabled={isLoadingAutoSwitch}
                            className="w-full"
                          />
                          <p className="text-xs text-muted-foreground">
                            {t('integrations.sessionThresholdDescription')}
                          </p>
                        </div>

                        {/* Weekly threshold */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">{t('integrations.weeklyThreshold')}</Label>
                            <span className="text-sm font-mono">{autoSwitchSettings?.weeklyThreshold ?? 99}%</span>
                          </div>
                          <input
                            type="range"
                            min="70"
                            max="99"
                            step="1"
                            value={autoSwitchSettings?.weeklyThreshold ?? 99}
                            onChange={(e) => handleUpdateAutoSwitch({ weeklyThreshold: parseInt(e.target.value) })}
                            disabled={isLoadingAutoSwitch}
                            className="w-full"
                          />
                          <p className="text-xs text-muted-foreground">
                            {t('integrations.weeklyThresholdDescription')}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Reactive Recovery Section */}
                  <div className="pl-6 space-y-4 pt-2 border-l-2 border-orange-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {t('integrations.reactiveRecovery')}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('integrations.reactiveDescription')}
                        </p>
                      </div>
                      <Switch
                        checked={autoSwitchSettings?.autoSwitchOnRateLimit ?? false}
                        onCheckedChange={(value) => handleUpdateAutoSwitch({ autoSwitchOnRateLimit: value })}
                        disabled={isLoadingAutoSwitch}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

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

        {/* API Token Integrations Section */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground">API Token Integrations</h4>
          </div>

          <div className="rounded-lg bg-muted/30 border border-border p-4">
            <p className="text-sm text-muted-foreground mb-4">
              Connect to AI providers using API tokens (e.g., z.ai GLM models). Configure custom base URLs and model mappings.
            </p>

            {/* Existing integrations list */}
            {Object.keys(integrations).length > 0 && (
              <div className="space-y-2 mb-4">
                {Object.values(integrations).map((integration) => (
                  <div
                    key={integration.id}
                    className={cn(
                      "rounded-lg border p-3 flex items-center justify-between",
                      integration.isActive
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background"
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium">{integration.name}</p>
                      {integration.description && (
                        <p className="text-xs text-muted-foreground">{integration.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {integration.baseUrl}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {integration.isActive && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                          Active
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteIntegration(integration.id)}
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add form or button */}
            {showApiTokenForm ? (
              <div className="pt-3 border-t border-border">
                <ApiTokenIntegrationForm
                  onSave={(data) => {
                    handleSaveIntegration(data);
                  }}
                  onCancel={() => setShowApiTokenForm(false)}
                />
              </div>
            ) : (
              <Button
                onClick={() => setShowApiTokenForm(true)}
                size="sm"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add API Token Integration
              </Button>
            )}
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
