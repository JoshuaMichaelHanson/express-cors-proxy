require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');

function createApp(config = {}) {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Load API keys from the environment or config
    const API_KEYS = config.apiKeys || (process.env.API_KEYS ? process.env.API_KEYS.split(',') : []);
    const MAX_REQUESTS = config.maxRequests || parseInt(process.env.MAX_REQUESTS_PER_MINUTE) || 60;
    const WINDOW_MS = config.windowMs || 60 * 1000; // 1 minute

    // Rate limiter configuration
    const limiter = rateLimit({
        windowMs: WINDOW_MS,
        limit: MAX_REQUESTS,

        standardHeaders: 'draft-7',
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                error: 'Too many requests, please try again later.',
                retryAfter: Math.ceil(WINDOW_MS / 1000)
            });
        }
    });

    // Authentication middleware
    const authenticate = (req, res, next) => {
        const apiKey = req.headers['x-api-key'];

        if (!apiKey) {
            return res.status(401).json({ error: 'API key is required' });
        }

        if (!API_KEYS.includes(apiKey)) {
            return res.status(401).json({ error: 'Invalid API key' });
        }

        next();
    };

    // Apply middlewares
    app.use(authenticate);
    app.use(limiter);

    // Configure a proxy
    app.use('/', createProxyMiddleware({
        router: (req) => {
            return req.path.substring(1);
        },
        pathRewrite: (path, req) => {
            try {
                return new URL(req.path.substring(1)).pathname;
            } catch (e) {
                return '/';
            }
        },
        changeOrigin: true,
        logger: console,
        onError: (err, req, res) => {
            console.error('Proxy error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Proxy error occurred' });
            }
        }
    }));

    return app;
}

// Only start server if running directly (not imported for testing)
if (require.main === module) {
    const app = createApp();
    const PORT = process.env.PORT || 8088;
    app.listen(PORT, () => {
        console.log(`Secure CORS proxy server running on port ${PORT}`);
        console.log(`Loaded ${process.env.API_KEYS ? process.env.API_KEYS.split(',').length : 0} API keys`);
    });
}

module.exports = { createApp };