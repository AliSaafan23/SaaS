import { doubleCsrf } from "csrf-csrf";

const { invalidCsrfTokenError, generateCsrfToken, doubleCsrfProtection } =
    doubleCsrf({
        getSecret: () => process.env.CSRF_SECRET || "your-csrf-secret-key-change-in-production",
        cookieName: process.env.NODE_ENV === "production" ? "__Secure-seda.csrf" : "seda-csrf-token",
        cookieOptions: {
            httpOnly: true,
            sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax", // Changed to 'lax' for production compatibility
            path: "/",
            secure: process.env.NODE_ENV === "production", // Must be true in production for __Secure- prefix
            maxAge: 3600000, // 1 hour
        },
        size: 64, // Increased from 32 to 64 for better security
        ignoredMethods: ["GET", "HEAD", "OPTIONS"],
        getCsrfTokenFromRequest: (req) => req.headers["x-csrf-token"] || req.body._csrf,
        getSessionIdentifier: (req) => {
            // Use session ID for CSRF token binding
            return req.sessionID || req.session?.id || '';
        },
        errorConfig: {
            statusCode: 403,
            message: "Invalid CSRF token",
            code: "EBADCSRFTOKEN"
        }
    });

export {
    doubleCsrfProtection,
    invalidCsrfTokenError,
    generateCsrfToken
};
