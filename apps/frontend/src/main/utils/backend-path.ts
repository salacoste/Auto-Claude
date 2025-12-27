/**
 * Backend Path Utility for Integration Handlers
 * 
 * Provides centralized, validated backend and Python path resolution
 * for integration-related IPC handlers.
 * 
 * Uses similar logic to path-resolver.ts but adapted for integration handlers.
 */

import path from 'path';
import fs from 'fs';
import { getBundledSourcePath } from '../updater/path-resolver';

let cachedBackendPath: string | null = null;
let cachedPythonPath: string | null = null;

/**
 * Get the backend path for integration handlers.
 * Uses similar logic to path-resolver with fallback strategies.
 * 
 * @returns Absolute path to backend directory
 * @throws Error if backend cannot be located
 */
export function getBackendPathForIntegrations(): string {
    if (cachedBackendPath) {
        return cachedBackendPath;
    }

    // Try bundled source path first (handles dev/prod modes)
    try {
        const bundledPath = getBundledSourcePath();
        if (bundledPath && fs.existsSync(path.join(bundledPath, 'providers', 'token_provider.py'))) {
            cachedBackendPath = bundledPath;
            return bundledPath;
        }
    } catch (error) {
        // getBundledSourcePath may throw in some environments, continue to fallbacks
    }

    // Fallback strategies
    const fallbacks = [
        // Dev: from dist/main/ipc-handlers → apps/backend
        path.resolve(__dirname, '..', '..', '..', 'backend'),
        // Alternative: from app root
        path.resolve(process.cwd(), 'apps', 'backend'),
    ];

    for (const fallback of fallbacks) {
        // Validate by checking for marker file
        if (fs.existsSync(path.join(fallback, 'providers', 'token_provider.py'))) {
            cachedBackendPath = fallback;
            return fallback;
        }
    }

    throw new Error(
        'Backend path not found. Cannot initialize integration handlers.\n' +
        'Expected backend directory with providers/token_provider.py'
    );
}

/**
 * Get the Python executable path for integration handlers.
 * Validates that venv exists and provides helpful error messages.
 * 
 * @returns Absolute path to Python executable in venv
 * @throws Error if Python venv not found or not set up
 */
export function getPythonPathForIntegrations(): string {
    if (cachedPythonPath) {
        return cachedPythonPath;
    }

    const backend = getBackendPathForIntegrations();
    const pythonPath = path.join(backend, '.venv', 'bin', 'python');

    if (!fs.existsSync(pythonPath)) {
        throw new Error(
            `Python virtual environment not found at: ${pythonPath}\n\n` +
            `Please set up the virtual environment:\n` +
            `  cd ${backend}\n` +
            `  python -m venv .venv\n` +
            `  .venv/bin/pip install -r requirements.txt`
        );
    }

    cachedPythonPath = pythonPath;
    return pythonPath;
}

/**
 * Reset cached paths (for testing or when paths change)
 */
export function resetBackendPathCache(): void {
    cachedBackendPath = null;
    cachedPythonPath = null;
}
