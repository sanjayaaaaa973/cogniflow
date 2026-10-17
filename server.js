// =============================================================================
// CogniFlow Local Development Server
//
// Runs static files AND executes /api/chat locally with zero npm dependencies.
// Automatically loads GEMINI_API_KEY from .env or .env.local if present.
// =============================================================================

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chatHandler from './api/chat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = parseInt(process.env.PORT || '8080', 10);

// Load environment variables from .env or .env.local without needing dotenv package
function loadEnvFile(fileName) {
    const envPath = path.join(__dirname, fileName);
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
            if (val) {
                process.env[key] = val;
            }
        }
    });
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp'
};

const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // Route: /api/chat -> Vercel serverless function handler
    if (pathname === '/api/chat') {
        loadEnvFile('.env.local');
        loadEnvFile('.env');
        let bodyBuffer = '';
        req.on('data', chunk => { bodyBuffer += chunk; });
        req.on('end', async () => {
            // Emulate Vercel request object
            try {
                req.body = bodyBuffer ? JSON.parse(bodyBuffer) : {};
            } catch (e) {
                req.body = bodyBuffer;
            }

            // Emulate Vercel response helper methods
            res.status = function (statusCode) {
                res.statusCode = statusCode;
                return res;
            };
            res.json = function (jsonObj) {
                if (!res.getHeader('Content-Type')) {
                    res.setHeader('Content-Type', 'application/json; charset=UTF-8');
                }
                res.end(JSON.stringify(jsonObj));
                return res;
            };

            try {
                await chatHandler(req, res);
            } catch (err) {
                console.error('[Server Error in /api/chat]:', err);
                if (!res.headersSent) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
                }
            }
        });
        return;
    }

    // Serve static files
    let relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
    let filePath = path.join(__dirname, relativePath);

    // Normalize and prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.statusCode = 403;
        res.end('Access Denied');
        return;
    }

    // If directory, look for index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        res.end('404 Not Found');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(filePath).pipe(res);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        const fallbackPort = PORT === 8080 ? 3000 : (PORT === 3000 ? 8081 : PORT + 1);
        console.log(`Port ${PORT} is already in use. Switching to port ${fallbackPort}...`);
        server.listen(fallbackPort);
    } else {
        console.error('Server error:', err);
    }
});

server.listen(PORT, () => {
    const activePort = server.address().port;
    console.log(`=======================================================`);
    console.log(` CogniFlow Server running at http://localhost:${activePort}`);
    console.log(` AI Tutor Endpoint: http://localhost:${activePort}/api/chat`);
    console.log(` GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'Configured (Active)' : 'Not set (Add to .env or Vercel)'}`);
    console.log(`=======================================================`);
});
