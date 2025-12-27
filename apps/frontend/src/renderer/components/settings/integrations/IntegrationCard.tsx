import { useState, useEffect } from 'react';
import {
    ChevronDown,
    ChevronRight,
    Trash2,
    Check,
    Users,
    Cloud,
    Key,
    RefreshCw,
    LogIn,
    Edit,
    Activity,
    Star,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { cn } from '../../../lib/utils';
import type { UnifiedIntegration } from '../../../../shared/types/integration';
import type { ClaudeProfile } from '../../../../shared/types';

interface IntegrationCardProps {
    integration: UnifiedIntegration;
    claudeProfile?: ClaudeProfile; // For OAuth type
    isActive: boolean;
    onSetActive: () => void;
    onDelete: () => void;
    onReauthenticate?: () => void; // For OAuth
    onEdit?: () => void; // For API Token
    onTestConnection?: () => Promise<{ success: boolean; message: string }>; // Test connection
    onFetchModels?: () => Promise<string[]>; // Fetch available models (API Token)
    onUpdateModelMapping?: (mapping: { opus?: string; sonnet?: string; haiku?: string }) => void; // Update model mapping
}

export function IntegrationCard({
    integration,
    claudeProfile,
    isActive,
    onSetActive,
    onDelete,
    onReauthenticate,
    onEdit,
    onTestConnection,
    onFetchModels,
    onUpdateModelMapping
}: IntegrationCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    // Model fetching state
    const [isFetchingModels, setIsFetchingModels] = useState(false);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [modelMapping, setModelMapping] = useState(integration.type === 'api-token' ? integration.modelMapping : undefined);

    // Auto-dismiss test result after 5 seconds
    useEffect(() => {
        if (testResult) {
            const timer = setTimeout(() => {
                setTestResult(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [testResult]);

    const isOAuth = integration.type === 'oauth';
    const isApiToken = integration.type === 'api-token';

    return (
        <div
            className={cn(
                "rounded-lg border transition-colors",
                isActive
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background"
            )}
        >
            {/* Card Header */}
            <div className="p-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                        {/* Icon */}
                        <div className={cn(
                            "rounded-full p-2",
                            isActive ? "bg-primary/20" : "bg-muted"
                        )}>
                            {isOAuth ? (
                                <Users className="h-4 w-4 text-primary" />
                            ) : (
                                <Cloud className="h-4 w-4 text-primary" />
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium truncate">{integration.name}</p>

                                {/* Active Badge */}
                                {isActive && (
                                    <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <Star className="h-3 w-3" fill="currentColor" />
                                        Active
                                    </span>
                                )}

                                {/* Authenticated Badge (OAuth only) */}
                                {isOAuth && integration.isAuthenticated && (
                                    <span className="text-xs bg-success/20 text-success px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <Check className="h-3 w-3" />
                                        Authenticated
                                    </span>
                                )}

                                {/* Needs Auth Badge (OAuth only) */}
                                {isOAuth && !integration.isAuthenticated && (
                                    <span className="text-xs bg-warning/20 text-warning px-1.5 py-0.5 rounded">
                                        Needs Auth
                                    </span>
                                )}
                            </div>

                            {/* Subtitle */}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <span>{isOAuth ? 'OAuth' : 'API Token'}</span>
                                {isOAuth && integration.email && (
                                    <>
                                        <span>•</span>
                                        <span>{integration.email}</span>
                                    </>
                                )}
                                {isApiToken && integration.description && (
                                    <>
                                        <span>•</span>
                                        <span className="truncate">{integration.description}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Expand button */}
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-1 hover:bg-muted rounded"
                        >
                            {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-t border-border p-3 space-y-3 bg-muted/30">
                    {/* OAuth Details */}
                    {isOAuth && (
                        <div className="space-y-2">
                            {claudeProfile && (
                                <div className="text-xs space-y-1">
                                    <p className="text-muted-foreground">
                                        <span className="font-medium">Profile ID:</span> {integration.profileId}
                                    </p>
                                    <p className="text-muted-foreground">
                                        <span className="font-medium">Config Dir:</span> {claudeProfile.configDir}
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-2">
                                {!integration.isAuthenticated && onReauthenticate && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={onReauthenticate}
                                        className="gap-2"
                                    >
                                        <LogIn className="h-3 w-3" />
                                        Authenticate
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* API Token Details */}
                    {isApiToken && (
                        <div className="space-y-2">
                            <div className="text-xs space-y-1">
                                <p className="text-muted-foreground">
                                    <span className="font-medium">Base URL:</span>
                                </p>
                                <p className="font-mono text-xs bg-background px-2 py-1 rounded">
                                    {integration.baseUrl}
                                </p>
                            </div>

                            {integration.modelMapping && (
                                <div className="text-xs space-y-1">
                                    <p className="text-muted-foreground font-medium">Model Mapping:</p>
                                    <div className="space-y-0.5 bg-background px-2 py-1 rounded">
                                        {integration.modelMapping.opus && (
                                            <p><span className="text-muted-foreground">Opus:</span> {integration.modelMapping.opus}</p>
                                        )}
                                        {integration.modelMapping.sonnet && (
                                            <p><span className="text-muted-foreground">Sonnet:</span> {integration.modelMapping.sonnet}</p>
                                        )}
                                        {integration.modelMapping.haiku && (
                                            <p><span className="text-muted-foreground">Haiku:</span> {integration.modelMapping.haiku}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {onEdit && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={onEdit}
                                    className="gap-2"
                                >
                                    <Edit className="h-3 w-3" />
                                    Edit Settings
                                </Button>
                            )}

                            {/* Fetch Models Button */}
                            {onFetchModels && (
                                <div className="mt-3">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={async () => {
                                            setIsFetchingModels(true);
                                            try {
                                                const models = await onFetchModels();
                                                setAvailableModels(models);
                                            } finally {
                                                setIsFetchingModels(false);
                                            }
                                        }}
                                        disabled={isFetchingModels}
                                        className="gap-2 w-full"
                                    >
                                        <RefreshCw className={cn("h-3 w-3", isFetchingModels && "animate-spin")} />
                                        {isFetchingModels ? 'Fetching Models...' : 'Fetch Available Models'}
                                    </Button>

                                    {/* Model Mapping UI */}
                                    {availableModels.length > 0 && onUpdateModelMapping && (
                                        <div className="mt-3 p-3 space-y-3 bg-muted/30 rounded border border-border">
                                            <p className="text-xs font-medium">Map Models to Claude Tiers</p>

                                            {/* Opus */}
                                            <div>
                                                <Label className="text-xs text-muted-foreground">
                                                    Opus (Most Powerful)
                                                </Label>
                                                <select
                                                    value={modelMapping?.opus || ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (value) {
                                                            // Add opus to mapping
                                                            setModelMapping({
                                                                ...(modelMapping || {}),
                                                                opus: value
                                                            } as { opus: string; sonnet?: string; haiku?: string });
                                                        } else {
                                                            // Remove opus from mapping
                                                            if (modelMapping) {
                                                                const { opus, ...rest } = modelMapping;
                                                                setModelMapping(Object.keys(rest).length > 0 ? rest as any : undefined);
                                                            }
                                                        }
                                                    }}
                                                    className="w-full mt-1 h-8 px-2 text-xs rounded border border-input bg-background"
                                                >
                                                    <option value="">Select model...</option>
                                                    {availableModels.map(model => (
                                                        <option key={`opus-${model}`} value={model}>{model}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Sonnet */}
                                            <div>
                                                <Label className="text-xs text-muted-foreground">
                                                    Sonnet (Balanced)
                                                </Label>
                                                <select
                                                    value={modelMapping?.sonnet || ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (value) {
                                                            // Add sonnet to mapping
                                                            setModelMapping({
                                                                ...(modelMapping || {}),
                                                                sonnet: value
                                                            } as { opus?: string; sonnet: string; haiku?: string });
                                                        } else {
                                                            // Remove sonnet from mapping
                                                            if (modelMapping) {
                                                                const { sonnet, ...rest } = modelMapping;
                                                                setModelMapping(Object.keys(rest).length > 0 ? rest as any : undefined);
                                                            }
                                                        }
                                                    }}
                                                    className="w-full mt-1 h-8 px-2 text-xs rounded border border-input bg-background"
                                                >
                                                    <option value="">Select model...</option>
                                                    {availableModels.map(model => (
                                                        <option key={`sonnet-${model}`} value={model}>{model}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Haiku */}
                                            <div>
                                                <Label className="text-xs text-muted-foreground">
                                                    Haiku (Fast & Efficient)
                                                </Label>
                                                <select
                                                    value={modelMapping?.haiku || ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (value) {
                                                            // Add haiku to mapping
                                                            setModelMapping({
                                                                ...(modelMapping || {}),
                                                                haiku: value
                                                            } as { opus?: string; sonnet?: string; haiku: string });
                                                        } else {
                                                            // Remove haiku from mapping
                                                            if (modelMapping) {
                                                                const { haiku, ...rest } = modelMapping;
                                                                setModelMapping(Object.keys(rest).length > 0 ? rest as any : undefined);
                                                            }
                                                        }
                                                    }}
                                                    className="w-full mt-1 h-8 px-2 text-xs rounded border border-input bg-background"
                                                >
                                                    <option value="">Select model...</option>
                                                    {availableModels.map(model => (
                                                        <option key={`haiku-${model}`} value={model}>{model}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Save Button */}
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    if (modelMapping && onUpdateModelMapping) {
                                                        onUpdateModelMapping(modelMapping);
                                                    }
                                                }}
                                                className="w-full gap-2"
                                            >
                                                <Check className="h-3 w-3" />
                                                Save Model Mapping
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="border-t border-border pt-3 mt-3">
                        <div className="flex items-center justify-between gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={onDelete}
                                className="gap-2 text-destructive hover:bg-destructive/10"
                            >
                                <Trash2 className="h-3 w-3" />
                                Delete
                            </Button>

                            {!isActive && (
                                <Button
                                    size="sm"
                                    onClick={onSetActive}
                                    className="gap-2"
                                >
                                    <Check className="h-3 w-3" />
                                    Set Active
                                </Button>
                            )}
                        </div>

                        {/* Test Connection Section */}
                        {onTestConnection && (
                            <div className="mt-3">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                        setIsTesting(true);
                                        setTestResult(null);
                                        try {
                                            const result = await onTestConnection();
                                            setTestResult(result);
                                        } catch (error) {
                                            setTestResult({
                                                success: false,
                                                message: error instanceof Error ? error.message : 'Test failed'
                                            });
                                        } finally {
                                            setIsTesting(false);
                                        }
                                    }}
                                    disabled={isTesting}
                                    className="gap-2 w-full"
                                >
                                    <Activity className={cn("h-3 w-3", isTesting && "animate-pulse")} />
                                    {isTesting ? 'Testing...' : 'Test Connection'}
                                </Button>

                                {/* Test Result */}
                                {testResult && (
                                    <div className={cn(
                                        "mt-2 p-2 rounded text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-200",
                                        testResult.success
                                            ? "bg-success/10 text-success border border-success/20"
                                            : "bg-destructive/10 text-destructive border border-destructive/20"
                                    )}>
                                        {testResult.success ? (
                                            <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                        ) : (
                                            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                        )}
                                        <span className="flex-1">{testResult.message}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
