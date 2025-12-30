
import { describe, it, expect, afterEach } from 'vitest';
import { isPathLookingLikePackagedApp } from '../path-resolver';

describe('path-resolver', () => {
    const originalPlatformDescriptor = Object.getOwnPropertyDescriptor(process, 'platform');

    afterEach(() => {
        if (originalPlatformDescriptor) {
            Object.defineProperty(process, 'platform', originalPlatformDescriptor);
        }
    });

    describe('isPathLookingLikePackagedApp', () => {
        it('should identify macOS packaged app paths', () => {
            Object.defineProperty(process, 'platform', { value: 'darwin' });

            expect(isPathLookingLikePackagedApp('/Applications/Auto-Claude.app/Contents/Resources/backend')).toBe(true);
            expect(isPathLookingLikePackagedApp('/Users/user/Applications/Auto-Claude.app/Contents/Resources/backend')).toBe(true);
        });

        it('should NOT identify macOS dev paths that contain "Applications"', () => {
            Object.defineProperty(process, 'platform', { value: 'darwin' });

            expect(isPathLookingLikePackagedApp('/Users/dev/My-Applications/project')).toBe(false);
            expect(isPathLookingLikePackagedApp('/Users/dev/Projects/Applications/frontend')).toBe(false);
        });

        it('should identify Windows packaged app paths', () => {
            Object.defineProperty(process, 'platform', { value: 'win32' });

            // Standard install
            expect(isPathLookingLikePackagedApp('C:\\Program Files\\Auto-Claude\\resources\\backend')).toBe(true);
            expect(isPathLookingLikePackagedApp('C:\\Program Files (x86)\\Auto-Claude\\resources\\backend')).toBe(true);

            // WindowsApps
            expect(isPathLookingLikePackagedApp('C:\\Program Files\\WindowsApps\\Auto-Claude\\resources\\backend')).toBe(true);

            // Asar
            expect(isPathLookingLikePackagedApp('C:\\Program Files\\Auto-Claude\\resources\\app.asar')).toBe(true);
        });

        it('should NOT identify Windows dev paths that vaguely look like system paths', () => {
            Object.defineProperty(process, 'platform', { value: 'win32' });

            // Path containing "Program Files" but not at start
            expect(isPathLookingLikePackagedApp('C:\\Projects\\Program Files Stuff\\backend')).toBe(false);

            // Just at start but no electron structure
            expect(isPathLookingLikePackagedApp('C:\\Program Files\\NotElectronApp')).toBe(false);
        });

        it('should identify Linux packaged app paths', () => {
            Object.defineProperty(process, 'platform', { value: 'linux' });

            expect(isPathLookingLikePackagedApp('/opt/Auto-Claude/backend')).toBe(true);
            expect(isPathLookingLikePackagedApp('/usr/lib/Auto-Claude/backend')).toBe(true);
            expect(isPathLookingLikePackagedApp('/usr/share/Auto-Claude/backend')).toBe(true);
        });

        it('should NOT identify Linux dev paths', () => {
            Object.defineProperty(process, 'platform', { value: 'linux' });

            expect(isPathLookingLikePackagedApp('/home/user/projects/backend')).toBe(false);
            expect(isPathLookingLikePackagedApp('/home/user/opt-dev/backend')).toBe(false);
        });
    });
});
