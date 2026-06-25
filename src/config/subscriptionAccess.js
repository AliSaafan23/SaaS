/**
 * Subscription access tiers for the cashier (app) API.
 *
 * FREE — always available without paid company subscription
 * PAID — requires active CompanySubscription for x-platform header
 */

import { DEFAULT_FREE_ACCESS_FEATURES } from './subscriptionFeatures.js';

/** Feature keys available without any paid subscription */
export const FREE_FEATURE_KEYS = [...DEFAULT_FREE_ACCESS_FEATURES];

export const PLATFORM_HEADER = 'x-platform';

export const normalizePlatform = (value) => {
    const p = String(value || 'mobile').toLowerCase();
    if (p === 'desktop') return 'desktop';
    return 'mobile';
};

/** Resolve platform from header/body; null = let server pick from company subscriptions */
export const inferLoginPlatform = (platformHeader, deviceType) => {
    const explicit = String(platformHeader || '').trim();
    if (explicit) return normalizePlatform(explicit);

    const dt = String(deviceType || '').toLowerCase();
    if (dt === 'android' || dt === 'ios') return 'mobile';
    if (dt === 'web') return 'desktop';
    return null;
};

export default {
    FREE_FEATURE_KEYS,
    PLATFORM_HEADER,
    normalizePlatform,
    inferLoginPlatform,
};
