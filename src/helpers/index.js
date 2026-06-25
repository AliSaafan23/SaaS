// Common helpers
export { default as errorHandler } from './common/errorHandler.js';

// API helpers (Flutter / Cashier)
export { default as createDevice } from './api/createDevice.js';
export { default as modelMap } from './api/modelMap.js';
export { default as generateToken } from './api/token.js';
export { default as returnObject } from './merchant/returnobject.js';
export { default as dashboardReturnObject } from './dashboard/returnobject.js';
export { default as cashierAuth } from './api/cashierAuth.js';

// Dashboard helpers (Admin panel)
export { default as adminAuth } from './dashboard/adminAuth.js';
export { logAudit } from './dashboard/auditLog.js';
export { default as dashboardStats } from './dashboard/dashboardStats.js';
export {
    activateCompanySubscription,
    suspendCompanySubscription,
    getSubscriberStats,
    getFreeAccessFeatures,
    buildEntitlements,
    getMaxDevicesForCashier,
    buildCashierAccessPayload,
    getCashierPlatformSubscriptions,
    requestCompanySubscription,
    confirmSubscriptionPayment,
    listPendingPayments,
    hasPaidPlatformAccess,
    computeExpiresAt,
} from './dashboard/subscriptionService.js';

// POS helpers
export * from './pos/index.js';

// Socket helpers
export * from './socket/index.js';
