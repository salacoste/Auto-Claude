import { useState } from 'react';
import { Eye, EyeOff, Loader2, Check, X, AlertCircle, TestTube } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import type {
    TestTokenResponse,
    GetModelsResponse,
    ModelMapping
} from '../../../../shared/types/integration';

interface ApiTokenIntegrationFormProps {
    onSave: (data: {
        name: string;
        description: string;
        apiToken: string;
        baseUrl: string;
        modelMapping?: ModelMapping;
    }) => void;
    onCancel: () => void;
    initialName?: string; // Pre-fill name if provided
}

export function ApiTokenIntegrationForm({ onSave, onCancel, initialName }: ApiTokenIntegrationFormProps) {
    const [name, setName] = useState(initialName || '');
    const [description, setDescription] = useState('');
    const [apiToken, setApiToken] = useState('');
    const [baseUrl, setBaseUrl] = useState('https://api.anthropic.com');
    const [showToken, setShowToken] = useState(false);

    // Test connection state
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<TestTokenResponse | null>(null);

    // Model retrieval state
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [modelsError, setModelsError] = useState<string | null>(null);

    // Model mapping
    const [modelMapping, setModelMapping] = useState<ModelMapping>({
        opus: '',
        sonnet: '',
        haiku: ''
    });

    const handleTestConnection = async () => {
        if (!apiToken.trim() || !baseUrl.trim()) return;

        setIsTesting(true);
        setTestResult(null);

        try {
            const result = await window.electronAPI.testApiToken(apiToken.trim(), baseUrl.trim());

            if (result.success && result.data) {
                setTestResult(result.data);
            } else {
                setTestResult({
                    status: 'error',
                    message: result.error || 'Connection test failed'
                });
            }
        } catch (error) {
            setTestResult({
                status: 'error',
                message: error instanceof Error ? error.message : 'Connection test failed'
            });
        } finally {
            setIsTesting(false);
        }
    };

    const handleGetModels = async () => {
        if (!apiToken.trim() || !baseUrl.trim()) return;

        setIsLoadingModels(true);
        setModelsError(null);
        setAvailableModels([]);

        try {
            const result = await window.electronAPI.getApiModels(apiToken.trim(), baseUrl.trim());

            if (result.success && result.data) {
                if (result.data.status === 'success' && result.data.models) {
                    setAvailableModels(result.data.models);

                    // Auto-fill default z.ai mappings if available
                    if (result.data.models.includes('GLM-4.7')) {
                        setModelMapping({
                            opus: 'GLM-4.7',
                            sonnet: 'GLM-4.7',
                            haiku: result.data.models.includes('GLM-4.5-Air') ? 'GLM-4.5-Air' : 'GLM-4.7'
                        });
                    }
                } else {
                    setModelsError(result.data.message || 'Failed to retrieve models');
                }
            } else {
                setModelsError(result.error || 'Failed to retrieve models');
            }
        } catch (error) {
            setModelsError(error instanceof Error ? error.message : 'Failed to retrieve models');
        } finally {
            setIsLoadingModels(false);
        }
    };

    const handleSave = () => {
        if (!name.trim() || !apiToken.trim() || !baseUrl.trim()) return;

        onSave({
            name: name.trim(),
            description: description.trim(),
            apiToken: apiToken.trim(),
            baseUrl: baseUrl.trim(),
            modelMapping: modelMapping.opus ? modelMapping : undefined
        });
    };

    const hasValidMapping = modelMapping.opus || modelMapping.sonnet || modelMapping.haiku;

    return (
        <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
                <Label htmlFor="integration-name" className="text-sm font-medium">
                    Integration Name
                </Label>
                <Input
                    id="integration-name"
                    placeholder="e.g., z.ai GLM Models"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-sm"
                />
            </div>

            {/* Description */}
            <div className="space-y-2">
                <Label htmlFor="integration-description" className="text-sm font-medium">
                    Description (Optional)
                </Label>
                <Input
                    id="integration-description"
                    placeholder="Provider details or notes"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="text-sm"
                />
            </div>

            {/* API Token */}
            <div className="space-y-2">
                <Label htmlFor="api-token" className="text-sm font-medium">
                    API Token
                </Label>
                <div className="relative">
                    <Input
                        id="api-token"
                        type={showToken ? 'text' : 'password'}
                        placeholder="sk-ant-api..."
                        value={apiToken}
                        onChange={(e) => setApiToken(e.target.value)}
                        className="pr-10 font-mono text-sm"
                    />
                    <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                        {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {/* Base URL */}
            <div className="space-y-2">
                <Label htmlFor="base-url" className="text-sm font-medium">
                    Base URL
                </Label>
                <Input
                    id="base-url"
                    placeholder="https://api.anthropic.com"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                    For z.ai: <code className="px-1 bg-muted rounded">https://api.z.ai/api/anthropic</code>
                </p>
            </div>

            {/* Test Connection Button */}
            <div className="space-y-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={!apiToken.trim() || !baseUrl.trim() || isTesting}
                    className="gap-2"
                >
                    {isTesting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <TestTube className="h-4 w-4" />
                    )}
                    Test Connection
                </Button>

                {testResult && (
                    <div
                        className={`flex items-center gap-2 text-sm rounded-md p-2 ${testResult.status === 'success'
                            ? 'bg-success/10 text-success'
                            : 'bg-destructive/10 text-destructive'
                            }`}
                    >
                        {testResult.status === 'success' ? (
                            <Check className="h-4 w-4" />
                        ) : (
                            <AlertCircle className="h-4 w-4" />
                        )}
                        {testResult.message}
                    </div>
                )}
            </div>

            {/* Get Models Button */}
            {testResult?.status === 'success' && (
                <div className="space-y-3 pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Model Mapping</Label>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleGetModels}
                            disabled={isLoadingModels}
                            className="gap-2"
                        >
                            {isLoadingModels ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                            Get Models
                        </Button>
                    </div>

                    {modelsError && (
                        <p className="text-xs text-destructive">{modelsError}</p>
                    )}

                    {availableModels.length > 0 && (
                        <div className="space-y-3 bg-muted/30 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">
                                Map provider models to Claude model types:
                            </p>

                            {/* Opus mapping */}
                            <div className="space-y-1">
                                <Label htmlFor="opus-model" className="text-xs">
                                    Claude Opus
                                </Label>
                                <select
                                    id="opus-model"
                                    value={modelMapping.opus}
                                    onChange={(e) => setModelMapping({ ...modelMapping, opus: e.target.value })}
                                    className="w-full px-2 py-1.5 bg-background border border-input rounded-md text-sm"
                                >
                                    <option value="">Select model...</option>
                                    {availableModels.map((model) => (
                                        <option key={model} value={model}>
                                            {model}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Sonnet mapping */}
                            <div className="space-y-1">
                                <Label htmlFor="sonnet-model" className="text-xs">
                                    Claude Sonnet
                                </Label>
                                <select
                                    id="sonnet-model"
                                    value={modelMapping.sonnet}
                                    onChange={(e) => setModelMapping({ ...modelMapping, sonnet: e.target.value })}
                                    className="w-full px-2 py-1.5 bg-background border border-input rounded-md text-sm"
                                >
                                    <option value="">Select model...</option>
                                    {availableModels.map((model) => (
                                        <option key={model} value={model}>
                                            {model}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Haiku mapping */}
                            <div className="space-y-1">
                                <Label htmlFor="haiku-model" className="text-xs">
                                    Claude Haiku
                                </Label>
                                <select
                                    id="haiku-model"
                                    value={modelMapping.haiku}
                                    onChange={(e) => setModelMapping({ ...modelMapping, haiku: e.target.value })}
                                    className="w-full px-2 py-1.5 bg-background border border-input rounded-md text-sm"
                                >
                                    <option value="">Select model...</option>
                                    {availableModels.map((model) => (
                                        <option key={model} value={model}>
                                            {model}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-4">
                <Button variant="ghost" size="sm" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!name.trim() || !apiToken.trim() || !baseUrl.trim()}
                    className="gap-2"
                >
                    <Check className="h-4 w-4" />
                    Save Integration
                </Button>
            </div>
        </div>
    );
}

// Missing import
import { RefreshCw } from 'lucide-react';
