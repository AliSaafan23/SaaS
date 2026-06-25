import subscriptionFeatures, { DEFAULT_FREE_ACCESS_FEATURES } from './subscriptionFeatures.js';

/**
 * Maps API feature keys to human-readable metadata.
 * Route handlers use requireSubscription('sales.create') — see middleware/protection.
 */
export const SUBSCRIPTION_SETTING_KEYS = {
    freeAccessFeatures: 'subscription.freeAccessFeatures',
    lockedMessage: 'subscription.lockedMessage',
};

export { subscriptionFeatures, DEFAULT_FREE_ACCESS_FEATURES };

export default subscriptionFeatures;
