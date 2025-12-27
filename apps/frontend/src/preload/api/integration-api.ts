/**
 * Integration API type definitions and implementation
 */

import { ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants/ipc';
import type { IPCResult } from '../../shared/types';
import type {
    TestTokenResponse,
    GetModelsResponse
} from '../../shared/types/integration';

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

export function createIntegrationAPI(): IntegrationAPI {
    return {
        testApiToken: (apiToken: string, baseUrl: string) =>
            ipcRenderer.invoke(IPC_CHANNELS.INTEGRATION_TEST_TOKEN, { apiToken, baseUrl }),

        getApiModels: (apiToken: string, baseUrl: string) =>
            ipcRenderer.invoke(IPC_CHANNELS.INTEGRATION_GET_MODELS, { apiToken, baseUrl })
    };
}
