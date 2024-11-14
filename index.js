const express = require('express');
const axios = require('axios');
const path = require('path');
const util = require('minecraft-server-util');
const app = express();
const port = process.env.PORT || 3000;

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

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use('/fonts', express.static(path.join(__dirname, 'public/fonts')));

app.get('/', async (req, res) => {
    try {
        const [playerListResponse, onlinePlayersResponse, chatResponse] = await Promise.all([
            axios.get('https://stats-mod-backend.vercel.app/api/players'),
            axios.get('https://stats-mod-backend.vercel.app/api/player-online'),
            axios.get('https://stats-mod-backend.vercel.app/api/chat?page=1&limit=50')
        ]);

        const serverStatus = await checkServerStatus('play.kizuserver.xyz');
        console.log('Server status:', serverStatus ? 'Online' : 'Offline');

        res.render('index', {
            playerList: playerListResponse.data,
            onlinePlayers: onlinePlayersResponse.data,
            chat: chatResponse.data,
            serverStatus: {
                online: serverStatus,
                address: 'play.kizuserver.xyz'
            }
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).render('error', { error: 'Failed to fetch data' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 