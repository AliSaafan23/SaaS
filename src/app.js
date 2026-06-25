import express from 'express';
import path from 'path';
import cors from 'cors';
// import MongoStore from 'connect-mongo'; // [LEGACY] MongoDB session — replaced with MemoryStore until Sequelize session
import session from 'express-session';
import layout_template from 'express-ejs-layouts';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import i18n from 'i18n';
import helmet from 'helmet';
import upload from 'express-fileupload';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES6 module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);



// Import services
import { errorHandler } from './helpers/index.js';

// Import organized routes
import { apiRoutes, publicRoutes, dashboardRoutes, merchantRoutes } from './routes/index.js';

// Import CSRF middleware
// import { generateCsrfToken } from './middleware/index.js'; // enable with dashboard routes

function createApp() {
    const app = express();

    // 1. BASIC EXPRESS SETUP (First)
    app.set('trust proxy', 1);
    app.set("view engine", "ejs");
    app.set('views', path.join(__dirname, "views"));
    app.set('layout', './layouts/layout');
    app.set("layout extractStyles", true)
    app.set("layout extractScripts", true)


    // 2. BODY PARSING (Early - before most middleware)
    app.use(express.json({ 
        limit: '50mb',
        verify: (req, res, buf) => {
            req.rawBody = buf;
        }
    }));
    app.use(express.urlencoded({ 
        limit: '50mb', 
        extended: true,
        parameterLimit: 100000
    }));

    // 3. COMPRESSION (After body parsing, before other middleware)
    app.use(compression());

    // 4. SECURITY & CORS (Early security layer)
    // app.use(helmet({
    //     contentSecurityPolicy: false // Disable CSP for development
    // }));
    const allowedOrigins = process.env.ALLOWED_ORIGINS_API
        ? process.env.ALLOWED_ORIGINS_API.split(",")
        : ["http://localhost:3000", "http://127.0.0.1:3000"];

    app.use(cors({
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allowedHeaders: [
            "Origin",
            "X-Requested-With",
            "Content-Type",
            "Accept",
            "Authorization",
            "Cache-Control",
            "Pragma",
            "lang",
            "x-csrf-token",
            "x-platform"
        ],
        credentials: true,
        optionsSuccessStatus: 200
    }));


    // 5. RATE LIMITING (After CORS, before other processing)
    const rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
    const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX) || 100;

    const limiter = rateLimit({
        windowMs: rateLimitWindowMs,
        max: rateLimitMax,
        handler: (req, res) => {
            if (req.path.startsWith('/dashboard') || req.path.startsWith('/merchant') || req.session?.token) {
                if (req.path.startsWith('/merchant')) {
                    return res.status(429).send('طلبات كثيرة — حاول لاحقاً');
                }
                // Send 429 file for admin requests
                return res.sendFile(path.join(__dirname, "views", "admin", "429Page", "429.html"));
            }
            return errorHandler(res, 'tooManyRequests', 'tooManyRequests');
        },
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => {
            // Skip rate limiting for static assets and certain paths
            const skipPaths = [
                '/favicon.ico',
                '/robots.txt',
                '/firebase-messaging-sw.js',
                '/manifest.json',
                '/admin/',
                '/merchant/',
                '/assets/',  // Skip all uploaded assets (images, files, etc.)
            ];
            return skipPaths.some(path => req.path.startsWith(path));
        }
    });
    app.use(limiter);

    // 6. COOKIE PARSER (Before session)
    app.use(cookieParser());

    // 7. SESSION CONFIGURATION
    function configureSession(name) {
        return session({
            secret: process.env.SESSION_SECRET || "secretKeySession",
            cookie: {
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                maxAge: parseInt( 86400000, 10), // 24 hours
                sameSite: 'lax' // Use 'lax' for both dev and production for better compatibility
            },
            name : name,
            resave: false,
            saveUninitialized: true, // Changed to true for both dev and production to ensure session is created
        });
    }

    // 8. FILE UPLOAD (After body parsing)
    const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024;
    app.use(upload({
        limits: { fileSize: maxFileSize },
        abortOnLimit: true,
        limitHandler: (req, res) => {
            return errorHandler(res, 'forbidden', 'fileSizeTooLarge');
        }
    }));

    // 9. STATIC FILES
    app.use(express.static(path.join(__dirname, '..', 'public')));
    // Add an additional path with /public prefix for consistent image loading
    app.use('/public', express.static(path.join(__dirname, '..', 'public')));

    // 10. INTERNATIONALIZATION
    i18n.configure({
        locales: ["ar", "en"],
        directory: path.join(__dirname, 'locales'),
        register: global,
        defaultLocale: "ar",
        updateFiles: false,
        syncFiles: false
    });
    app.use(i18n.init);

    // 11. LANGUAGE MIDDLEWARE
    app.use((req, res, next) => {
        let lang = req.headers['lang'];
        if (!lang && req.headers['accept-language']) {
            const al = String(req.headers['accept-language']).toLowerCase();
            if (al.startsWith('en')) lang = 'en';
            else if (al.startsWith('ar')) lang = 'ar';
        }
        if (!lang) {
            lang = 'ar';
        }
        i18n.setLocale(lang);
        next();
    });

    // 12. TEMPLATE ENGINE SETUP
    app.use(layout_template);


    // 13. REQUEST LOGGING (Development only)
    if ((process.env.NODE_ENV || 'development').trim() === 'development') {
        app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
            next();
        });
    }

    // 14. COMMON BROWSER REQUESTS (Before main routes)
    const commonBrowserRequests = [
        '/favicon.ico',
        '/firebase-messaging-sw.js',
        '/manifest.json', 
        '/service-worker.js',
        '/sw.js'
    ];

    commonBrowserRequests.forEach(path => {
        app.get(path, (req, res) => {
            if (path === '/favicon.ico') {
                res.status(204).end(); // No content for favicon
            } else {
                res.status(404).end(); // Silent 404 for others
            }
        });
    });

    // Standard web files
    app.get('/robots.txt', (req, res) => {
        res.type('text/plain');
        res.send('User-agent: *\nDisallow: /');
    });

    // 16. HEALTH CHECK
    app.get('/health', (req, res) => {
        res.json({
            success: true,
            message: 'Gold Pos API Server',
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString()
        });
    });

    // 17. PREFLIGHT REQUESTS
    app.options('*', cors({
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allowedHeaders: [
            "Origin",
            "X-Requested-With",
            "Content-Type",
            "Accept",
            "Authorization",
            "Cache-Control",
            "Pragma",
            "lang",
            "x-csrf-token",
            "x-platform"
        ],
        credentials: true,
        optionsSuccessStatus: 200
    }));

    // 18. MAIN ROUTES (After all middleware setup)
    app.use('/', publicRoutes);

    app.use('/api/v1', apiRoutes);

    app.use('/dashboard', configureSession('admin'), dashboardRoutes);
    app.use('/merchant', configureSession('merchant'), merchantRoutes);

    // 19. 404 HANDLER (After all routes)
    app.use((request, response) => {
        const requestPath = request.path.toLowerCase();
        const acceptHeader = request.get('Accept') || '';
        
        // Check if this is a request for static assets (CSS, JS, images, fonts, etc.)
        const isStaticAsset = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|json|xml|txt)$/i.test(requestPath);
        
        // Check if this is an API request
        const isApiRequest = requestPath.startsWith('/api/');
        
        // Check if client prefers JSON (AJAX requests)
        const prefersJson = acceptHeader.includes('application/json') && !acceptHeader.includes('text/html');
        
        if (isStaticAsset || isApiRequest || prefersJson) {
            // For static assets, API requests, or AJAX requests - return simple JSON
            // return errorHandler(response, 'notFound', 'routeNotFound');
            return response.status(404).sendFile(path.join(__dirname, "views", "admin", "404Page", "404.html"));
        } else {
            // For regular page requests - return the full HTML 404 page
            return response.status(404).sendFile(path.join(__dirname, "views", "admin", "404Page", "404.html"));
        }
    });

    // 20. GLOBAL ERROR HANDLER (Last)
    app.use((err, req, res, next) => {
        console.error('Global error handler:', err);

        // Handle CSRF token errors
        if (err.code === 'EBADCSRFTOKEN' || err.message === 'Invalid CSRF token') {
            return errorHandler(res, 'forbidden', 'invalidCsrfToken');
        }

        // Handle validation errors
        if (err.name === 'SequelizeValidationError' || err.name === 'ValidationError') {
            return errorHandler(res, 'fail', 'validationFailed');
        }

        // Handle duplicate entries
        if (err.name === 'SequelizeUniqueConstraintError' || err.code === 11000) {
            return errorHandler(res, 'fail', 'duplicateEntry');
        }

        // Handle invalid ID format
        if (err.name === 'CastError') {
            return errorHandler(res, 'fail', 'invalidIdFormat');
        }

        // Handle JWT errors
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return errorHandler(res, 'unauthorized', 'invalidToken');
        }

        // Default error handling
        return errorHandler(res, 'exception', 'returnDeveloper');
    });

    return app;
}

export default createApp;