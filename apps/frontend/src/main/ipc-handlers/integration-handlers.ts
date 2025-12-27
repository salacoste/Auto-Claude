import { ipcMain } from 'electron';
import { spawn } from 'child_process';
import path from 'path';
import { IPC_CHANNELS } from '../../shared/constants';
import type { IPCResult } from '../../shared/types';
import { getPythonPath } from './github/utils/subprocess-runner';

/**
 * Call Python backend to test API token connection
 */
async function testApiConnection(
    apiToken: string,
    baseUrl: string
): Promise<IPCResult<{ status: string; message: string }>> {
    return new Promise((resolve) => {
        try {
            const backendPath = path.join(__dirname, '..', '..', '..', '..', 'backend');
            const pythonScript = path.join(backendPath, 'providers', 'token_provider.py');
            const pythonPath = getPythonPath(backendPath);

            const python = spawn(pythonPath, [
                '-c',
                `
from providers.token_provider import test_connection_sync
import json
result = test_connection_sync("${apiToken.replace(/"/g, '\\"')}", "${baseUrl.replace(/"/g, '\\"')}")
print(json.dumps(result))
        `.trim()
            ], {
                cwd: backendPath,
                env: { ...process.env, PYTHONPATH: backendPath }
            });

            let output = '';
            let errorOutput = '';

            python.stdout.on('data', (data) => {
                output += data.toString();
            });

            python.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            python.on('close', (code) => {
                if (code !== 0) {
                    resolve({
                        success: false,
                        error: `Python script failed: ${errorOutput}`
                    });
                    return;
                }

                try {
                    const result = JSON.parse(output.trim());
                    resolve({ success: true, data: result });
                } catch (e) {
                    resolve({
                        success: false,
                        error: `Failed to parse Python output: ${e}`
                    });
                }
            });

            python.on('error', (error) => {
                resolve({
                    success: false,
                    error: `Failed to spawn Python: ${error.message}`
                });
            });
        } catch (error) {
            resolve({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}

/**
 * Call Python backend to get available models
 */
async function getApiModels(
    apiToken: string,
    baseUrl: string
): Promise<IPCResult<{ status: string; models?: string[]; message?: string }>> {
    return new Promise((resolve) => {
        try {
            const backendPath = path.join(__dirname, '..', '..', '..', '..', 'backend');
            const pythonPath = getPythonPath(backendPath);

            const python = spawn(pythonPath, [
                '-c',
                `
from providers.token_provider import get_models_sync
import json
result = get_models_sync("${apiToken.replace(/"/g, '\\"')}", "${baseUrl.replace(/"/g, '\\"')}")
print(json.dumps(result))
        `.trim()
            ], {
                cwd: backendPath,
                env: { ...process.env, PYTHONPATH: backendPath }
            });

            let output = '';
            let errorOutput = '';

            python.stdout.on('data', (data) => {
                output += data.toString();
            });

            python.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            python.on('close', (code) => {
                if (code !== 0) {
                    resolve({
                        success: false,
                        error: `Python script failed: ${errorOutput}`
                    });
                    return;
                }

                try {
                    const result = JSON.parse(output.trim());
                    resolve({ success: true, data: result });
                } catch (e) {
                    resolve({
                        success: false,
                        error: `Failed to parse Python output: ${e}`
                    });
                }
            });

            python.on('error', (error) => {
                resolve({
                    success: false,
                    error: `Failed to spawn Python: ${error.message}`
                });
            });
        } catch (error) {
            resolve({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}

/**
 * Call Python backend to test OAuth token connection
 */
async function testOAuthConnection(
    oauthToken: string
): Promise<IPCResult<{ status: string; message: string }>> {
    return new Promise((resolve) => {
        try {
            const backendPath = path.join(__dirname, '..', '..', '..', '..', 'backend');
            const pythonPath = getPythonPath(backendPath);

            const python = spawn(pythonPath, [
                '-c',
                `
from providers.token_provider import test_oauth_connection_sync
import json
result = test_oauth_connection_sync("${oauthToken.replace(/"/g, '\\"')}")
print(json.dumps(result))
        `.trim()
            ], {
                cwd: backendPath,
                env: { ...process.env, PYTHONPATH: backendPath }
            });

            let output = '';
            let errorOutput = '';

            python.stdout.on('data', (data) => {
                output += data.toString();
            });

            python.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            python.on('close', (code) => {
                if (code !== 0) {
                    resolve({
                        success: false,
                        error: `Python script failed: ${errorOutput}`
                    });
                    return;
                }

                try {
                    const result = JSON.parse(output.trim());
                    resolve({ success: true, data: result });
                } catch (e) {
                    resolve({
                        success: false,
                        error: `Failed to parse Python output: ${e}`
                    });
                }
            });

            python.on('error', (error) => {
                resolve({
                    success: false,
                    error: `Failed to spawn Python: ${error.message}`
                });
            });
        } catch (error) {
            resolve({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}

/**
 * Register integration-related IPC handlers
 */
export function registerIntegrationHandlers(): void {
    // Test API token connection
    ipcMain.handle(
        IPC_CHANNELS.INTEGRATION_TEST_TOKEN,
        async (_, apiToken: string, baseUrl: string) => {
            return testApiConnection(apiToken, baseUrl);
        }
    );

    // Get available models
    ipcMain.handle(
        IPC_CHANNELS.INTEGRATION_GET_MODELS,
        async (_, apiToken: string, baseUrl: string) => {
            return getApiModels(apiToken, baseUrl);
        }
    );

    // Test OAuth connection
    ipcMain.handle(
        IPC_CHANNELS.INTEGRATION_TEST_OAUTH,
        async (_, oauthToken: string) => {
            return testOAuthConnection(oauthToken);
        }
    );
}
