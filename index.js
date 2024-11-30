const express = require('express');
const axios = require('axios');
const path = require('path');
const util = require('minecraft-server-util');
require('dotenv').config();
const http = require('http');
const httpProxy = require('http-proxy');
const proxy = httpProxy.createProxyServer({
    changeOrigin: true,
    ws: true,
    secure: false,
    followRedirects: true
});

const app = express();
const port = process.env.PORT || 3000;

const api = axios.create({
    headers: {
        'x-api-token': process.env.API_TOKEN
    }
});

// Cache storage
let cache = {
    playerList: null,
    onlinePlayers: null,
    chat: null,
    serverStatus: false,
    lastUpdate: 0,
    errors: {}
};

// Cache duration in milliseconds (30 seconds)
const CACHE_DURATION = 30000;

async function updateSingleEndpoint(endpoint, cacheKey) {
    try {
        const response = await api.get(`https://stats-mod-backend.vercel.app/api/${endpoint}`);
        cache[cacheKey] = response.data;
        delete cache.errors[cacheKey];
        return true;
    } catch (error) {
        console.error(`Error updating ${cacheKey}:`, error.message);
        cache.errors[cacheKey] = error.message;
        return false;
    }
}

async function updateCache() {
    const updates = [
        updateSingleEndpoint('players', 'playerList'),
        updateSingleEndpoint('player-online', 'onlinePlayers'),
        updateSingleEndpoint('chat?page=1&limit=50', 'chat')
    ];

    try {
        const serverStatus = await checkServerStatus('play.kizuserver.xyz');
        cache.serverStatus = serverStatus;
    } catch (error) {
        console.error('Server status check error:', error.message);
        cache.errors.serverStatus = error.message;
    }

    await Promise.allSettled(updates);
    cache.lastUpdate = Date.now();
    console.log('Cache updated:', new Date().toLocaleString());
}

async function checkServerStatus(host, port = 25689) {
    try {
        const result = await util.status(host, port, {
            timeout: 5000,
            enableSRV: true
        });
        return true;
    } catch (error) {
        console.error('Server status check error:', error.message);
        return false;
    }
}

// Initialize cache update interval
setInterval(updateCache, CACHE_DURATION);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use('/fonts', express.static(path.join(__dirname, 'public/fonts')));

// API endpoints for client-side updates
app.get('/api/data', async (req, res) => {
    // Check if cache needs updating
    const now = Date.now();
    if (!cache.lastUpdate || (now - cache.lastUpdate) >= CACHE_DURATION) {
        await updateCache();
    }

    res.json({
        playerList: cache.playerList,
        onlinePlayers: cache.onlinePlayers,
        chat: cache.chat,
        serverStatus: {
            online: cache.serverStatus,
            address: 'play.kizuserver.xyz'
        },
        lastUpdate: cache.lastUpdate,
        errors: cache.errors
    });
});

app.get('/', async (req, res) => {
    // Always update cache on page load
    await updateCache();

    res.render('index', {
        playerList: cache.playerList,
        onlinePlayers: cache.onlinePlayers,
        chat: cache.chat,
        serverStatus: {
            online: cache.serverStatus,
            address: 'play.kizuserver.xyz'
        },
        errors: cache.errors
    });
});

// Add error handling for the proxy
proxy.on('error', (err, req, res) => {
    console.error('Proxy error:', err);
    if (!res.headersSent) {
        res.status(500).send('Proxy error');
    }
});

// Handle all map-related requests
app.all('/map-proxy*', (req, res) => {
    const target = 'http://play.kizuserver.xyz:25684';
    
    proxy.web(req, res, {
        target: target,
        changeOrigin: true,
        secure: false,
        ws: true
    });
});

// Add a specific handler for assets
app.get('/assets/*', (req, res) => {
    const target = 'http://play.kizuserver.xyz:25684';
    
    proxy.web(req, res, {
        target: target,
        changeOrigin: true,
        secure: false
    });
});

// Update the map endpoint
app.get('/map', (req, res) => {
    res.header('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval'; img-src * data: blob:; connect-src *");
    res.header('Access-Control-Allow-Origin', '*');
    res.render('map');
});

app.listen(port, () => {
    // Initial cache update
    updateCache();
    console.log(`Server running at http://localhost:${port}`);
}); 