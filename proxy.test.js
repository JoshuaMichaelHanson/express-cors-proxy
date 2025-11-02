const request = require('supertest');
const express = require('express');
const { createApp } = require('./proxy');

describe('CORS Proxy Server', () => {
    let app;
    const testApiKey = 'test-key-123';

    beforeEach(() => {
        // Create app with test configuration
        app = createApp({
            apiKeys: [testApiKey],
            maxRequests: 100, // High limit to avoid rate limiting in most tests
            windowMs: 60000
        });
    });

    describe('Authentication', () => {
        test('should reject requests without API key', async () => {
            const response = await request(app)
                .get('/https://api.example.com/data');

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('API key is required');
        });

        test('should reject requests with invalid API key', async () => {
            const response = await request(app)
                .get('/https://api.example.com/data')
                .set('x-api-key', 'invalid-key');

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Invalid API key');
        });

        test('should accept requests with valid API key', async () => {
            // This will fail to proxy (no real server), but authentication should pass
            // We expect a 500 from proxy failure, not 401 from auth failure
            const response = await request(app)
                .get('/https://httpbin.org/get')
                .set('x-api-key', testApiKey);

            // Should not be 401 (auth passed)
            expect(response.status).not.toBe(401);
        });
    });

    describe('Rate Limiting', () => {
        test('should block requests exceeding limit', async () => {
            // Create app with very low rate limit for testing
            const limitedApp = createApp({
                apiKeys: [testApiKey],
                maxRequests: 3,
                windowMs: 60000
            });

            // Make 4 requests (exceeds limit of 3)
            const responses = [];
            for (let i = 0; i < 4; i++) {
                const response = await request(limitedApp)
                    .get('/https://httpbin.org/get')
                    .set('x-api-key', testApiKey);

                responses.push(response);
            }

            // First 3 should not be rate limited (might fail proxy, but not 429)
            expect(responses[0].status).not.toBe(429);
            expect(responses[1].status).not.toBe(429);
            expect(responses[2].status).not.toBe(429);

            // 4th should be rate limited
            expect(responses[3].status).toBe(429);
            expect(responses[3].body.error).toBe('Too many requests, please try again later.');
        });
    });

    describe('CORS', () => {
        test('should include CORS headers', async () => {
            const response = await request(app)
                .get('/https://httpbin.org/get')
                .set('x-api-key', testApiKey)
                .set('Origin', 'http://localhost:3000');

            expect(response.headers['access-control-allow-origin']).toBeDefined();
        });

        test('should handle OPTIONS preflight requests', async () => {
            const response = await request(app)
                .options('/https://httpbin.org/get')
                .set('Origin', 'http://localhost:3000')
                .set('Access-Control-Request-Method', 'GET');

            expect(response.status).toBe(204);
            expect(response.headers['access-control-allow-origin']).toBeDefined();
        });
    });

    describe('Middleware Order', () => {
        test('should check authentication before rate limiting', async () => {
            // Request without API key should fail at auth, not rate limit
            const response = await request(app)
                .get('/https://httpbin.org/get');

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('API key is required');
        });

        test('should check rate limit before proxying', async () => {
            const limitedApp = createApp({
                apiKeys: [testApiKey],
                maxRequests: 1,
                windowMs: 60000
            });

            // First request
            await request(limitedApp)
                .get('/https://httpbin.org/get')
                .set('x-api-key', testApiKey);

            // Second request should be rate limited
            const response = await request(limitedApp)
                .get('/https://httpbin.org/get')
                .set('x-api-key', testApiKey);

            expect(response.status).toBe(429);
        });
    });

    describe('Configuration', () => {
        test('should use custom API keys from config', () => {
            const customApp = createApp({
                apiKeys: ['custom-key-1', 'custom-key-2']
            });

            return request(customApp)
                .get('/https://httpbin.org/get')
                .set('x-api-key', 'custom-key-1')
                .then(response => {
                    expect(response.status).not.toBe(401);
                });
        });

        test('should reject keys not in custom config', async () => {
            const customApp = createApp({
                apiKeys: ['custom-key-1']
            });

            const response = await request(customApp)
                .get('/https://httpbin.org/get')
                .set('x-api-key', 'wrong-key');

            expect(response.status).toBe(401);
        });
    });

    describe('Query Parameters', () => {
        test('should preserve query parameters in proxied request', async () => {
            const response = await request(app)
                .get('/https://httpbin.org/get?foo=bar&baz=qux')
                .set('x-api-key', testApiKey);

            // httpbin.org/get returns the query params in the response
            expect(response.status).toBe(200);
            const bodyText = Buffer.isBuffer(response.body) ? response.body.toString() : JSON.stringify(response.body);
            const body = JSON.parse(bodyText);
            expect(body.args.foo).toBe('bar');
            expect(body.args.baz).toBe('qux');
        });

        test('should handle complex query parameters with API keys', async () => {
            const response = await request(app)
                .get('/https://httpbin.org/get?stateCode=MN&limit=5&api_key=fake-api-key-12345')
                .set('x-api-key', testApiKey);

            expect(response.status).toBe(200);
            const bodyText = Buffer.isBuffer(response.body) ? response.body.toString() : JSON.stringify(response.body);
            const body = JSON.parse(bodyText);
            expect(body.args.stateCode).toBe('MN');
            expect(body.args.limit).toBe('5');
            expect(body.args.api_key).toBe('fake-api-key-12345');
        });
    });

    describe('Error Handling', () => {
        test('should handle malformed URLs gracefully', async () => {
            const response = await request(app)
                .get('/not-a-valid-url')
                .set('x-api-key', testApiKey);

            // Should get some error response, not crash
            expect(response.status).toBeGreaterThanOrEqual(400);
        });

        test('should handle empty path', async () => {
            const response = await request(app)
                .get('/')
                .set('x-api-key', testApiKey);

            // Should handle gracefully
            expect(response.status).toBeGreaterThanOrEqual(400);
        });
    });
});