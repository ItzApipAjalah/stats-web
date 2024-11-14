const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;

// Serve static files from public directory
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Main route
app.get('/', async (req, res) => {
    try {
        // Fetch player list, online players, and chat messages
        const [playerListResponse, onlinePlayersResponse, chatResponse] = await Promise.all([
            axios.get('https://stats-mod-backend.vercel.app/api/players'),
            axios.get('https://stats-mod-backend.vercel.app/api/player-online'),
            axios.get('https://stats-mod-backend.vercel.app/api/chat?page=1&limit=50')
        ]);

        res.render('index', {
            playerList: playerListResponse.data,
            onlinePlayers: onlinePlayersResponse.data,
            chat: chatResponse.data
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).render('error', { error: 'Failed to fetch data' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 