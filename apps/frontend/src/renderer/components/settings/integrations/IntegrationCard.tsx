import { useState } from 'react';
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
    Star
} from 'lucide-react';
import { Button } from '../../ui/button';
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
    onTestConnection?: () => Promise<void>; // Test connection
}

export function IntegrationCard({
    integration,
    claudeProfile,
    isActive,
    onSetActive,
    onDelete,
    onReauthenticate,
    onEdit,
    onTestConnection
}: IntegrationCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

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
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">{integration.name}</p>
                                {isActive && (
                                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                                        Active
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <span>{isOAuth ? 'OAuth' : 'API Token'}</span>
                                {isOAuth && integration.email && (
                                    <>
                                        <span>•</span>
                                        <span>{integration.email}</span>
                                    </>
                                )}
                                {isOAuth && (
                                    <>
                                        <span>•</span>
                                        <span className={integration.isAuthenticated ? 'text-success' : 'text-warning'}>
                                            {integration.isAuthenticated ? 'Authenticated' : 'Not authenticated'}
                                        </span>
                                    </>
                                )}
                                {isApiToken && integration.description && (
                                    <>
                                        <span>•</span>
                                        <span>{integration.description}</span>
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
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={onDelete}
                                className="gap-2 text-destructive hover:bg-destructive/10"
                            >
                                <Trash2 className="h-3 w-3" />
                                Delete
                            </Button>

                            {onTestConnection && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                        setIsTesting(true);
                                        try {
                                            await onTestConnection();
                                        } finally {
                                            setIsTesting(false);
                                        }
                                    }}
                                    disabled={isTesting}
                                    className="gap-2"
                                >
                                    <Activity className={cn("h-3 w-3", isTesting && "animate-pulse")} />
                                    {isTesting ? 'Testing...' : 'Test Connection'}
                                </Button>
                            )}
                        </div>

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
                </div>
            )}
        </div>
    );
}
