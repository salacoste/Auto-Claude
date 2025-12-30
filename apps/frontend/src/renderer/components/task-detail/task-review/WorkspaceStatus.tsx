import {
  GitBranch,
  FileCode,
  Plus,
  Minus,
  Eye,
  ExternalLink,
  GitMerge,
  Folder,
  FolderX,
  Loader2,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  GitCommit,
  Terminal
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { cn } from '../../../lib/utils';
import type { Task, WorktreeStatus, MergeConflict, MergeStats, GitConflictInfo } from '../../../../shared/types';
import { useTerminalHandler } from '../hooks/useTerminalHandler';
import { TerminalDropdown } from './TerminalDropdown';

interface WorkspaceStatusProps {
  task: Task;
  worktreeStatus: WorktreeStatus;
  workspaceError: string | null;
  stageOnly: boolean;
  mergePreview: { files: string[]; conflicts: MergeConflict[]; summary: MergeStats; gitConflicts?: GitConflictInfo; uncommittedChanges?: { hasChanges: boolean; files: string[]; count: number } | null } | null;
  isLoadingPreview: boolean;
  isMerging: boolean;
  isDiscarding: boolean;
  onShowDiffDialog: (show: boolean) => void;
  onShowDiscardDialog: (show: boolean) => void;
  onShowConflictDialog: (show: boolean) => void;
  onLoadMergePreview: () => void;
  onStageOnlyChange: (value: boolean) => void;
  onMerge: () => void;
  onClose?: () => void;
  onSwitchToTerminals?: () => void;
  onOpenInbuiltTerminal?: (id: string, cwd: string) => void;
}

/**
 * Displays the workspace status including change summary, merge preview, and action buttons
 */
export function WorkspaceStatus({
  task,
  worktreeStatus,
  workspaceError,
  stageOnly,
  mergePreview,
  isLoadingPreview,
  isMerging,
  isDiscarding,
  onShowDiffDialog,
  onShowDiscardDialog,
  onShowConflictDialog,
  onLoadMergePreview,
  onStageOnlyChange,
  onMerge,
  onOpenInbuiltTerminal
}: WorkspaceStatusProps) {
  const { t } = useTranslation('taskReview');
  const { openExternalTerminal, error: terminalError, isOpening } = useTerminalHandler();
  const hasGitConflicts = mergePreview?.gitConflicts?.hasConflicts;
  const hasUncommittedChanges = mergePreview?.uncommittedChanges?.hasChanges;
  const uncommittedCount = mergePreview?.uncommittedChanges?.count || 0;
  const hasAIConflicts = mergePreview && mergePreview.conflicts.length > 0;

  // Check if branch needs rebase (main has advanced since spec was created)
  // This requires AI merge even if no explicit file conflicts are detected
  const needsRebase = mergePreview?.gitConflicts?.needsRebase;
  const commitsBehind = mergePreview?.gitConflicts?.commitsBehind || 0;

  // Path-mapped files that need AI merge due to file renames
  const pathMappedAIMergeCount = mergePreview?.summary?.pathMappedAIMergeCount || 0;
  const totalRenames = mergePreview?.gitConflicts?.totalRenames || 0;

  // Branch is behind if needsRebase is true and there are commits to catch up on
  // This triggers AI merge for path-mapped files even without explicit conflicts
  const isBranchBehind = needsRebase && commitsBehind > 0;

  // Has path-mapped files that need AI merge
  const hasPathMappedMerges = pathMappedAIMergeCount > 0;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header with stats */}
	      <div className="px-4 py-3 bg-muted/30 border-b border-border">
	        <div className="flex items-center justify-between mb-3">
	          <h3 className="font-medium text-sm text-foreground flex items-center gap-2">
	            <GitBranch className="h-4 w-4 text-purple-400" />
	            {t('workspaceStatus.title')}
	          </h3>
	          <div className="flex items-center gap-1">
	            <Button
	              variant="ghost"
	              size="sm"
              onClick={() => onShowDiffDialog(true)}
	              className="h-7 px-2 text-xs"
	            >
	              <Eye className="h-3.5 w-3.5 mr-1" />
	              {t('workspaceStatus.view')}
	            </Button>
            {worktreeStatus.worktreePath && (
              <TerminalDropdown
                onOpenInbuilt={() => {
                  if (onOpenInbuiltTerminal) {
                    onOpenInbuiltTerminal(`open-${task.id}`, worktreeStatus.worktreePath!);
                  }
                }}
                onOpenExternal={() => openExternalTerminal(worktreeStatus.worktreePath!)}
                disabled={isOpening}
                className="h-7 px-2"
              />
            )}
          </div>
        </div>

        {/* Compact stats row */}
	        <div className="flex items-center gap-4 text-xs">
	          <span className="flex items-center gap-1.5 text-muted-foreground">
	            <FileCode className="h-3.5 w-3.5" />
	            <span className="font-medium text-foreground">{worktreeStatus.filesChanged || 0}</span> {t('workspaceStatus.files', { count: worktreeStatus.filesChanged || 0 })}
	          </span>
	          <span className="flex items-center gap-1.5 text-muted-foreground">
	            <GitCommit className="h-3.5 w-3.5" />
	            <span className="font-medium text-foreground">{worktreeStatus.commitCount || 0}</span> {t('workspaceStatus.commits', { count: worktreeStatus.commitCount || 0 })}
	          </span>
          <span className="flex items-center gap-1 text-success">
            <Plus className="h-3.5 w-3.5" />
            <span className="font-medium">{worktreeStatus.additions || 0}</span>
          </span>
          <span className="flex items-center gap-1 text-destructive">
            <Minus className="h-3.5 w-3.5" />
            <span className="font-medium">{worktreeStatus.deletions || 0}</span>
          </span>
        </div>

        {/* Branch info */}
        {worktreeStatus.branch && (
          <div className="mt-2 text-xs text-muted-foreground">
            <code className="bg-background/80 px-1.5 py-0.5 rounded text-[11px]">{worktreeStatus.branch}</code>
            <span className="mx-1.5">→</span>
            <code className="bg-background/80 px-1.5 py-0.5 rounded text-[11px]">{worktreeStatus.baseBranch || 'main'}</code>
          </div>
        )}

	        {/* Worktree path display */}
	        {worktreeStatus.worktreePath && (
	          <div className="mt-2 text-xs text-muted-foreground font-mono flex items-center gap-1.5">
	            <Folder className="h-3.5 w-3.5" />
	            <span>{worktreeStatus.worktreePath}</span>
	          </div>
	        )}

        {/* Terminal error display */}
        {terminalError && (
          <div className="mt-2 text-sm text-red-600">
            {terminalError}
          </div>
        )}
      </div>

      {/* Status/Warnings Section */}
      <div className="px-4 py-3 space-y-3">
        {/* Workspace Error */}
        {workspaceError && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{workspaceError}</p>
          </div>
        )}

        {/* Uncommitted Changes Warning */}
	        {hasUncommittedChanges && (
	          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-warning/10 border border-warning/20">
	            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
	            <div className="flex-1 min-w-0">
	              <p className="text-sm font-medium text-warning">
	                {t('workspaceStatus.uncommittedChangesTitle', { count: uncommittedCount })}
	              </p>
	              <p className="text-xs text-muted-foreground mt-0.5">
	                {t('workspaceStatus.uncommittedChangesHint')}
	              </p>
              <TerminalDropdown
                onOpenInbuilt={() => {
                  const mainProjectPath = worktreeStatus.worktreePath?.replace('.worktrees/' + task.specId, '') || '';
                  if (mainProjectPath && onOpenInbuiltTerminal) {
                    onOpenInbuiltTerminal(`stash-${task.id}`, mainProjectPath);
                  }
                }}
                onOpenExternal={() => {
                  const mainProjectPath = worktreeStatus.worktreePath?.replace('.worktrees/' + task.specId, '') || '';
                  if (mainProjectPath) {
                    openExternalTerminal(mainProjectPath);
                  }
                }}
                disabled={isOpening}
                className="text-xs h-6 mt-2"
              />
            </div>
          </div>
        )}

        {/* Loading indicator */}
	        {isLoadingPreview && !mergePreview && (
	          <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
	            <Loader2 className="h-4 w-4 animate-spin" />
	            {t('workspaceStatus.checkingConflicts')}
	          </div>
	        )}

        {/* Merge Status */}
        {mergePreview && (
          <div className={cn(
            "flex items-center justify-between p-2.5 rounded-lg border",
            hasGitConflicts || isBranchBehind || hasPathMappedMerges
              ? "bg-warning/10 border-warning/20"
              : !hasAIConflicts
                ? "bg-success/10 border-success/20"
                : "bg-warning/10 border-warning/20"
          )}>
            <div className="flex items-center gap-2">
	              {hasGitConflicts ? (
	                <>
	                  <AlertTriangle className="h-4 w-4 text-warning" />
	                  <div>
	                    <span className="text-sm font-medium text-warning">{t('workspaceStatus.branchDiverged')}</span>
	                    <span className="text-xs text-muted-foreground ml-2">{t('workspaceStatus.aiWillResolve')}</span>
	                  </div>
	                </>
	              ) : isBranchBehind || hasPathMappedMerges ? (
	                <>
	                  <AlertTriangle className="h-4 w-4 text-warning" />
	                  <div>
	                    <span className="text-sm font-medium text-warning">
	                      {hasPathMappedMerges ? t('workspaceStatus.filesRenamed') : t('workspaceStatus.branchBehind')}
	                    </span>
	                    <span className="text-xs text-muted-foreground ml-2">
	                      {t('workspaceStatus.aiWillResolve')} ({hasPathMappedMerges
	                        ? t('workspaceStatus.filesWithCount', { count: pathMappedAIMergeCount })
	                        : t('workspaceStatus.commitsWithCount', { count: commitsBehind })
	                      })
	                    </span>
	                  </div>
	                </>
	              ) : !hasAIConflicts ? (
	                <>
	                  <CheckCircle className="h-4 w-4 text-success" />
	                  <span className="text-sm font-medium text-success">{t('workspaceStatus.readyToMerge')}</span>
	                  <span className="text-xs text-muted-foreground ml-1">
	                    {t('workspaceStatus.filesWithCount', { count: mergePreview.summary.totalFiles })}
	                  </span>
	                </>
	              ) : (
	                <>
	                  <AlertTriangle className="h-4 w-4 text-warning" />
	                  <span className="text-sm font-medium text-warning">
	                    {t('workspaceStatus.conflictsWithCount', { count: mergePreview.conflicts.length })}
	                  </span>
	                </>
	              )}
            </div>
            <div className="flex items-center gap-1">
              {(hasGitConflicts || isBranchBehind || hasPathMappedMerges || hasAIConflicts) && (
                <Button
                  variant="ghost"
                  size="sm"
	                  onClick={() => onShowConflictDialog(true)}
	                  className="h-7 text-xs"
	                >
	                  {t('workspaceStatus.details')}
	                </Button>
	              )}
	              <Button
	                variant="ghost"
                size="sm"
                onClick={onLoadMergePreview}
	                disabled={isLoadingPreview}
	                className="h-7 px-2"
	                title={t('workspaceStatus.refresh')}
	              >
                {isLoadingPreview ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        )}

	        {/* Git Conflicts Details */}
	        {hasGitConflicts && mergePreview?.gitConflicts && (
	          <div className="text-xs text-muted-foreground pl-6">
	            {t('workspaceStatus.mainBranchHasNewCommits', { count: mergePreview.gitConflicts.commitsBehind })}
	            {mergePreview.gitConflicts.conflictingFiles.length > 0 && (
	              <span className="text-warning">
	                {' '}{t('workspaceStatus.filesNeedMerging', { count: mergePreview.gitConflicts.conflictingFiles.length })}
	              </span>
	            )}
	          </div>
	        )}

        {/* Branch Behind Details (no explicit conflicts but needs AI merge due to path mappings) */}
	        {!hasGitConflicts && isBranchBehind && mergePreview?.gitConflicts && (
	          <div className="text-xs text-muted-foreground pl-6">
	            {t('workspaceStatus.targetBranchHasNewCommitsSinceBuild', { count: commitsBehind })}
	            {hasPathMappedMerges ? (
	              <span className="text-warning">
	                {' '}{t('workspaceStatus.aiMergeDueToRenames', {
	                  filesText: t('workspaceStatus.filesWithCount', { count: pathMappedAIMergeCount }),
	                  renamesText: t('workspaceStatus.fileRenamesWithCount', { count: totalRenames })
	                })}
	              </span>
	            ) : totalRenames > 0 ? (
	              <span className="text-warning"> {t('workspaceStatus.fileRenamesDetectedAiWillHandle', { count: totalRenames })}</span>
	            ) : (
	              <span className="text-warning"> {t('workspaceStatus.filesMayHaveBeenRenamedAiWillHandle')}</span>
	            )}
	          </div>
	        )}
      </div>

      {/* Actions Footer */}
      <div className="px-4 py-3 bg-muted/20 border-t border-border space-y-3">
        {/* Stage Only Option */}
	        <label className="inline-flex items-center gap-2.5 text-sm cursor-pointer select-none px-3 py-2 rounded-lg border border-border bg-background/50 hover:bg-background/80 transition-colors">
          <Checkbox
            checked={stageOnly}
            onCheckedChange={(checked) => onStageOnlyChange(checked === true)}
            className="border-muted-foreground/50 data-[state=checked]:border-primary"
          />
	          <span className={cn(
	            "transition-colors",
	            stageOnly ? "text-foreground" : "text-muted-foreground"
	          )}>{t('workspaceStatus.stageOnlyLabel')}</span>
	        </label>

        {/* Primary Actions */}
        <div className="flex gap-2">
          <Button
            variant={hasGitConflicts || isBranchBehind || hasPathMappedMerges ? "warning" : "success"}
            onClick={onMerge}
            disabled={isMerging || isDiscarding}
            className="flex-1"
          >
	            {isMerging ? (
	              <>
	                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
	                {hasGitConflicts || isBranchBehind || hasPathMappedMerges
	                  ? t('workspaceStatus.resolving')
	                  : stageOnly
	                    ? t('workspaceStatus.staging')
	                    : t('workspaceStatus.merging')}
	              </>
	            ) : (
	              <>
	                <GitMerge className="mr-2 h-4 w-4" />
	                {hasGitConflicts || isBranchBehind || hasPathMappedMerges
	                  ? (stageOnly ? t('workspaceStatus.stageWithAiMerge') : t('workspaceStatus.mergeWithAi'))
	                  : (stageOnly ? t('workspaceStatus.stageChanges') : t('workspaceStatus.mergeToMain'))}
	              </>
	            )}
	          </Button>
          <Button
            variant="outline"
            size="icon"
	            onClick={() => onShowDiscardDialog(true)}
	            disabled={isMerging || isDiscarding}
	            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
	            title={t('workspaceStatus.discardBuild')}
	          >
	            <FolderX className="h-4 w-4" />
	          </Button>
        </div>
      </div>
    </div>
  );
}
