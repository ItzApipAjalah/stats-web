const express = require('express');
const axios = require('axios');
const path = require('path');
const util = require('minecraft-server-util');
require('dotenv').config();

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
    lastUpdate: 0
};

// Cache duration in milliseconds (30 seconds)
const CACHE_DURATION = 30000;

async function updateCache() {
    try {
        const [playerListResponse, onlinePlayersResponse, chatResponse] = await Promise.all([
            api.get('https://stats-mod-backend.vercel.app/api/players'),
            api.get('https://stats-mod-backend.vercel.app/api/player-online'),
            api.get('https://stats-mod-backend.vercel.app/api/chat?page=1&limit=50')
        ]);

        const serverStatus = await checkServerStatus('play.kizuserver.xyz');
        
        cache = {
            playerList: playerListResponse.data,
            onlinePlayers: onlinePlayersResponse.data,
            chat: chatResponse.data,
            serverStatus: serverStatus,
            lastUpdate: Date.now()
        };

        console.log('Cache updated:', new Date().toLocaleString());
    } catch (error) {
        console.error('Error updating cache:', error.message);
    }
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
app.get('/api/data', (req, res) => {
    res.json({
        playerList: cache.playerList,
        onlinePlayers: cache.onlinePlayers,
        chat: cache.chat,
        serverStatus: {
            online: cache.serverStatus,
            address: 'play.kizuserver.xyz'
        },
        lastUpdate: cache.lastUpdate
    });
});

app.get('/', async (req, res) => {
    // If cache is empty, update it
    if (!cache.playerList) {
        await updateCache();
    }

    res.render('index', {
        playerList: cache.playerList,
        onlinePlayers: cache.onlinePlayers,
        chat: cache.chat,
        serverStatus: {
            online: cache.serverStatus,
            address: 'play.kizuserver.xyz'
        }
    });
});

app.listen(port, () => {
    // Initial cache update
    updateCache();
    console.log(`Server running at http://localhost:${port}`);
}); 