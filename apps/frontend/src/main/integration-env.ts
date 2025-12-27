/**
 * Integration Environment Helper
 * ===============================
 *
 * Provides environment variables based on active integration settings.
 * Checks both OAuth (Claude Code) and API Token integrations.
 */

import { readSettingsFile } from './settings-utils';
import { DEFAULT_APP_SETTINGS } from '../shared/constants';
import { getClaudeProfileManager } from './claude-profile-manager';
import type { UnifiedIntegration, ApiTokenIntegration } from '../shared/types/integration';

interface AppSettings {
    activeIntegrationId?: string;
    integrations?: UnifiedIntegration[];
    [key: string]: unknown;
}

/**
 * Get environment variables for the active integration.
 *
 * Priority:
 * 1. API Token integration (if active) - sets ANTHROPIC_API_KEY and ANTHROPIC_BASE_URL
 * 2. OAuth integration (if active) - sets CLAUDE_CODE_OAUTH_TOKEN
 * 3. Fallback to empty (backend will use its own fallbacks)
 *
 * @returns Environment variables object
 */
export function getActiveIntegrationEnv(): Record<string, string> {
    const env: Record<string, string> = {};

    // Read settings from disk and merge with defaults
    const rawSettings = readSettingsFile() || {};
    const settings: AppSettings = { ...DEFAULT_APP_SETTINGS, ...rawSettings };

    // Check if there's an active integration
    if (!settings.activeIntegrationId || !settings.integrations) {
        console.log('[IntegrationEnv] No active integration, using default auth');
        return env;
    }

    // Find the active integration
    const activeIntegration = settings.integrations.find(
        (i: UnifiedIntegration) => i.id === settings.activeIntegrationId
    );

    if (!activeIntegration) {
        console.warn('[IntegrationEnv] Active integration not found:', settings.activeIntegrationId);
        return env;
    }

    // Handle API Token integration
    if (activeIntegration.type === 'api-token') {
        const apiIntegration = activeIntegration as ApiTokenIntegration;

        console.log('[IntegrationEnv] Using API Token integration:', apiIntegration.name);

        // Set API key (backend expects ANTHROPIC_API_KEY for direct API calls)
        env.ANTHROPIC_API_KEY = apiIntegration.apiToken;

        // Set base URL if provided
        if (apiIntegration.baseUrl) {
            env.ANTHROPIC_BASE_URL = apiIntegration.baseUrl;
        }

        console.log('[IntegrationEnv] API Token env:', {
            hasApiKey: !!env.ANTHROPIC_API_KEY,
            baseUrl: env.ANTHROPIC_BASE_URL
        });

        return env;
    }

    // Handle OAuth integration
    if (activeIntegration.type === 'oauth') {
        console.log('[IntegrationEnv] Using OAuth integration:', activeIntegration.name);

        // Get OAuth token from Claude Profile Manager
        const profileManager = getClaudeProfileManager();
        const profileEnv = profileManager.getActiveProfileEnv();

        if (profileEnv.CLAUDE_CODE_OAUTH_TOKEN) {
            env.CLAUDE_CODE_OAUTH_TOKEN = profileEnv.CLAUDE_CODE_OAUTH_TOKEN;
            console.log('[IntegrationEnv] OAuth token set from profile');
        } else {
            console.warn('[IntegrationEnv] OAuth integration active but no token found');
        }

        return env;
    }

    console.warn('[IntegrationEnv] Unknown integration type:', (activeIntegration as any).type);
    return env;
}

/**
 * Check if API Token integration is active.
 *
 * @returns true if an API Token integration is active
 */
export function isApiTokenIntegrationActive(): boolean {
    // Read settings from disk and merge with defaults
    const rawSettings = readSettingsFile() || {};
    const settings: AppSettings = { ...DEFAULT_APP_SETTINGS, ...rawSettings };

    if (!settings.activeIntegrationId || !settings.integrations) {
        return false;
    }

    const activeIntegration = settings.integrations.find(
        (i: UnifiedIntegration) => i.id === settings.activeIntegrationId
    );

    return activeIntegration?.type === 'api-token';
}
