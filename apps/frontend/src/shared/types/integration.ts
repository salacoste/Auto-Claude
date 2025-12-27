/**
 * Integration types for unified OAuth and API token-based integrations
 */

export type IntegrationType = 'oauth' | 'api-token';

export interface ModelMapping {
    opus: string;    // e.g., "GLM-4.7" or "claude-3-opus-20240229"
    sonnet: string;  // e.g., "GLM-4.7" or "claude-3-5-sonnet-20241022"
    haiku: string;   // e.g., "GLM-4.5-Air" or "claude-3-haiku-20240307"
}

/**
 * OAuth integration (Claude account)
 */
export interface OAuthIntegration {
    id: string;
    type: 'oauth';
    name: string;
    email?: string;
    isAuthenticated: boolean;
    profileId: string; // Link to ClaudeProfile
    createdAt: string;
}

/**
 * API Token based integration
 */
export interface ApiTokenIntegration {
    id: string;
    type: 'api-token';
    name: string;
    description?: string;
    apiToken: string;
    baseUrl: string;
    modelMapping?: ModelMapping;
    createdAt: string;
}

/**
 * Unified integration type
 */
export type UnifiedIntegration = OAuthIntegration | ApiTokenIntegration;

// IPC Request/Response types

export interface TestTokenRequest {
    apiToken: string;
    baseUrl: string;
}

export interface TestTokenResponse {
    status: 'success' | 'error';
    message: string;
}

export interface GetModelsRequest {
    apiToken: string;
    baseUrl: string;
}

export interface GetModelsResponse {
    status: 'success' | 'error';
    models?: string[];
    message?: string;
}

export interface SaveApiIntegrationRequest {
    name: string;
    description?: string;
    apiToken: string;
    baseUrl: string;
    modelMapping?: ModelMapping;
}
