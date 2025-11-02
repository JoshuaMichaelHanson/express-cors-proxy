require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
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

    // Manual proxy handler
    app.use('/', async (req, res) => {
        try {
            // Extract the target URL from the request path
            const targetUrl = req.path.substring(1) + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
            console.log('Proxying to:', targetUrl);

            // Make the request to the target URL
            const response = await axios({
                method: req.method,
                url: targetUrl,
                headers: {
                    'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
                    'Accept': req.headers['accept'] || '*/*',
                    'Accept-Encoding': req.headers['accept-encoding'] || 'gzip, deflate, br'
                },
                data: req.body,
                validateStatus: () => true, // Don't throw on any status
                responseType: 'arraybuffer' // Get raw response
            });

            console.log('Response status:', response.status);

            // Copy response headers (excluding some problematic ones)
            Object.keys(response.headers).forEach(key => {
                if (!['connection', 'transfer-encoding', 'content-encoding'].includes(key.toLowerCase())) {
                    res.setHeader(key, response.headers[key]);
                }
            });

            // Send the response
            res.status(response.status).send(response.data);
        } catch (error) {
            console.error('Proxy error:', error.message);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Proxy error occurred', message: error.message });
            }
        }
    });

    return app;
}

// Only start the server if running directly (not imported for testing)
if (require.main === module) {
    const app = createApp();
    const PORT = process.env.PORT || 8088;
    const server = app.listen(PORT, () => {
        const address = server.address();
        console.log(`Secure CORS proxy server running on ${address.address}:${address.port}`);
        console.log(`Loaded ${process.env.API_KEYS ? process.env.API_KEYS.split(',').length : 0} API keys`);
    });
}

module.exports = { createApp };