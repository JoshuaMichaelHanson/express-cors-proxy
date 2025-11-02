# 🔒 CORS Proxy Server

A secure, production-ready CORS proxy server built with Node.js and Express. This proxy enables frontend applications to bypass CORS restrictions when accessing third-party APIs, with built-in authentication, rate limiting, and comprehensive test coverage.

## ✨ Features

- **🛡️ Secure Authentication** - API key-based authentication to prevent unauthorized access
- **⚡ Rate Limiting** - Configurable request limits to prevent abuse
- **🌐 CORS Enabled** - Full CORS support with preflight request handling
- **🔄 Dynamic Routing** - Automatically routes requests to any target URL
- **📊 Comprehensive Testing** - Full test suite with 100% coverage
- **⚙️ Flexible Configuration** - Environment-based or programmatic configuration
- **🚀 Production Ready** - Error handling, logging, and middleware orchestration

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## 🚀 Quick Start

### Installation

```bash
git clone <repository-url>
cd cors-proxy-1
npm install
```

### Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and configure your settings:
```env
API_KEYS=your-secret-key-1,your-secret-key-2
MAX_REQUESTS_PER_MINUTE=60
PORT=8088
```

### Running the Server

```bash
# Production
npm start

# Development
npm run dev
```

The server will start on `http://localhost:8088` (or your configured port).

## 📖 Usage

### Basic Request

To proxy a request through the server, prepend the target URL to the proxy server path:

```javascript
// Example: Proxying a request to https://api.example.com/data
fetch('http://localhost:8088/https://api.example.com/data', {
  headers: {
    'x-api-key': 'your-secret-key-1'
  }
})
  .then(response => response.json())
  .then(data => console.log(data));
```

### cURL Example

```bash
curl -H "x-api-key: your-secret-key-1" \
  http://localhost:8088/https://api.example.com/data
```

### Request Format

The proxy extracts the target URL from the request path:
- **Proxy URL**: `http://localhost:8088/https://api.example.com/endpoint`
- **Target URL**: `https://api.example.com/endpoint`

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_KEYS` | Comma-separated list of valid API keys | - |
| `MAX_REQUESTS_PER_MINUTE` | Maximum requests per minute per client | `60` |
| `PORT` | Server port | `8088` |

### Programmatic Configuration

```javascript
const { createApp } = require('./proxy');

const app = createApp({
  apiKeys: ['key1', 'key2'],
  maxRequests: 100,
  windowMs: 60000 // 1 minute in milliseconds
});

app.listen(3000);
```

## 🧪 Testing

The project includes a comprehensive test suite covering:
- ✅ Authentication
- ✅ Rate limiting
- ✅ CORS functionality
- ✅ Middleware order
- ✅ Configuration
- ✅ Error handling

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🏗️ Architecture

### Middleware Stack

1. **CORS** - Enables cross-origin requests
2. **JSON Parser** - Parses JSON request bodies
3. **Authentication** - Validates API keys
4. **Rate Limiter** - Enforces request limits
5. **Proxy** - Forwards requests to target URLs

### Project Structure

```
cors-proxy-1/
├── proxy.js           # Main server and proxy logic
├── proxy.test.js      # Comprehensive test suite
├── package.json       # Project dependencies and scripts
├── .env.example       # Example environment configuration
├── .env              # Your environment configuration (not in git)
└── readme.md         # This file
```

## 🔐 Security Features

- **API Key Authentication**: All requests require a valid API key in the `x-api-key` header
- **Rate Limiting**: Prevents abuse with configurable request limits
- **Error Handling**: Graceful error handling prevents information leakage
- **CORS Protection**: Properly configured CORS headers

## 📊 Response Codes

| Code | Description |
|------|-------------|
| `200` | Successful proxy request |
| `401` | Missing or invalid API key |
| `429` | Rate limit exceeded |
| `500` | Proxy or server error |

## 🛠️ Development

### Adding Features

The proxy is designed to be extensible. The `createApp` function returns an Express app that can be enhanced with additional middleware or routes.

### Example: Custom Logging

```javascript
const { createApp } = require('./proxy');
const app = createApp();

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
```

## 📝 Common Use Cases

1. **Frontend Development**: Access APIs without CORS restrictions during development
2. **Third-Party API Integration**: Bypass CORS when integrating external APIs
3. **API Aggregation**: Combine multiple API calls through a single proxy
4. **Rate Limit Management**: Control and monitor API usage across applications

## 🤝 Contributing

Contributions are welcome! Please ensure all tests pass before submitting a pull request.

```bash
npm test
```

## 📄 License

ISC

## 🐛 Troubleshooting

### Issue: Authentication fails
- Verify your API key is set correctly in `.env`
- Ensure the `x-api-key` header is included in your requests

### Issue: Rate limiting too strict
- Adjust `MAX_REQUESTS_PER_MINUTE` in `.env`
- Consider implementing per-key rate limiting for different user tiers

### Issue: Proxy errors
- Check that the target URL is valid and accessible
- Verify the target server is running and responding
- Review server logs for detailed error messages

## 📧 Support

For issues and questions, please open an issue on the GitHub repository.

---

**Built with ❤️ using Node.js, Express, and modern JavaScript**
