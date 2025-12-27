/**
 * Integration types for API token-based integrations
 */

export type IntegrationType = 'oauth' | 'api-token';

export interface ModelMapping {
    opus: string;    // e.g., "GLM-4.7" or "claude-3-opus-20240229"
    sonnet: string;  // e.g., "GLM-4.7" or "claude-3-5-sonnet-20241022"
    haiku: string;   // e.g., "GLM-4.5-Air" or "claude-3-haiku-20240307"
}

export interface Integration {
    id: string;
    type: IntegrationType;
    name: string;
    isActive: boolean;
    createdAt: string;

    // OAuth specific
    oauthToken?: string;
    refreshToken?: string;
    email?: string;

    // API Token specific
    apiToken?: string;
    baseUrl?: string;
    description?: string;
    modelMapping?: ModelMapping;
}

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
