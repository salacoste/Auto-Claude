/**
 * Integration API type definitions
 */

import type { IPCResult } from '../../../shared/types';
import type {
    TestTokenResponse,
    GetModelsResponse
} from '../../../shared/types/integration';

export interface IntegrationAPI {
    /**
     * Test API token connection
     */
    testApiToken: (
        apiToken: string,
        baseUrl: string
    ) => Promise<IPCResult<TestTokenResponse>>;

    /**
     * Get available models from API
     */
    getApiModels: (
        apiToken: string,
        baseUrl: string
    ) => Promise<IPCResult<GetModelsResponse>>;
}
