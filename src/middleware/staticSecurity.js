import path from 'path';
import { errorHandler } from '../helpers/index.js';

/**
 * Smart admin protection middleware
 * Allows essential assets (CSS, JS, fonts, images) for login page
 * Protects sensitive data files (JSON, PHP, etc.)
 */
export const adminProtectionMiddleware = (req, res, next) => {
    const requestPath = req.path.toLowerCase();
    
    // Define file types that are always allowed (needed for login page styling)
    const allowedExtensions = [
        '.css',   // Stylesheets
        '.js',    // JavaScript files
        '.woff',  '.woff2', '.ttf', '.eot', // Fonts
        '.png',   '.jpg', '.jpeg', '.gif', '.svg', '.ico', // Images
        '.map'    // Source maps
    ];
    
    // Define sensitive file patterns that require authentication
    const sensitivePatterns = [
        '/json/',           // JSON data files
        '.json',           // Individual JSON files
        '.php',            // PHP files
        '/config/',        // Config directories
        'admin-data',      // Admin-specific data
        'user-data',       // User data
        'permissions',     // Permission files
        'settings'         // Settings files
    ];
    
    // Check if this is a sensitive resource
    const isSensitive = sensitivePatterns.some(pattern => 
        requestPath.includes(pattern.toLowerCase())
    );
    
    // Check if this is an allowed asset type
    const isAllowedAsset = allowedExtensions.some(ext => 
        requestPath.endsWith(ext)
    );
    
    // If it's a sensitive resource, require authentication
    if (isSensitive) {
        if (req.session && req.session.token) {
            return next();
        } else {
            return errorHandler(res, 'unauthorized', 'unauthorized');
        }
    }
    
    // If it's an allowed asset type, allow access (for login page)
    if (isAllowedAsset) {
        return next();
    }
    
    // For authenticated users, allow access to everything
    if (req.session && req.session.token) {
        return next();
    }
    
    // For unauthenticated users accessing other resources, deny
    return errorHandler(res, 'unauthorized', 'unauthorized');
};

/**
 * Directory listing prevention middleware - ONLY for admin folder
 */
export const preventAdminDirectoryListing = (req, res, next) => {
    const requestPath = req.path.toLowerCase();
    
    // Only prevent directory listing for admin paths
    if (requestPath.startsWith('/admin/') && requestPath.endsWith('/')) {
        return errorHandler(res, 'forbidden', 'forbidden');
    }
    next();
};

/**
 * File extension security middleware - applies to all requests
 */
export const fileExtensionSecurity = (req, res, next) => {
    const requestPath = req.path.toLowerCase();
    
    // Define dangerous file extensions that should never be served in Node.js apps
    const dangerousExtensions = [
        '.env',           // Environment variables (.env files)
        '.log'            // Log files (might contain sensitive data)
    ];
    
    const isDangerous = dangerousExtensions.some(ext => requestPath.endsWith(ext));
    
    if (isDangerous) {
        return errorHandler(res, 'forbidden', 'forbidden');
    }
    
    next();
};
