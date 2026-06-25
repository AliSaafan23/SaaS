import { describe, it, expect, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import {
    signOfflineLicenseToken,
    verifyOfflineLicenseToken,
    verifyOfflineLicenseTokenAllowExpired,
    licenseSecondsUntilExpiry,
} from '../../src/helpers/api/license/licenseToken.js';

describe('licenseToken', () => {
    beforeAll(() => {
        process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-offline-license';
    });

    it('signs and verifies offline license payload', () => {
        const token = signOfflineLicenseToken({
            sub: 42,
            cashierId: 42,
            companyId: 1,
            branchId: 2,
            platform: 'desktop',
            deploymentTier: 'offline',
            entitlements: ['inventory.view'],
            deviceId: 'device-test-001',
        }, 3600);

        const decoded = verifyOfflineLicenseToken(token);
        expect(decoded.type).toBe('offline_license');
        expect(decoded.cashierId).toBe(42);
        expect(decoded.deploymentTier).toBe('offline');
        expect(decoded.entitlements).toContain('inventory.view');
    });

    it('rejects non-license JWT type', () => {
        const bad = jwt.sign({ type: 'session', sub: 1 }, process.env.JWT_SECRET);
        expect(() => verifyOfflineLicenseToken(bad)).toThrow();
    });

    it('allows expired token verification for refresh flow', () => {
        const token = signOfflineLicenseToken({
            sub: 7,
            cashierId: 7,
            companyId: 1,
            branchId: 1,
            platform: 'mobile',
            deploymentTier: 'offline',
            entitlements: [],
            deviceId: 'device-test-002',
        }, -10);

        const decoded = verifyOfflineLicenseTokenAllowExpired(token);
        expect(decoded.cashierId).toBe(7);
        expect(decoded.platform).toBe('mobile');
    });

    it('computes minimum one hour expiry window', () => {
        const seconds = licenseSecondsUntilExpiry(new Date(Date.now() - 86400000));
        expect(seconds).toBeGreaterThanOrEqual(3600);
    });
});
