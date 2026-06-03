const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

// Serve static files
app.use(express.static(path.join(__dirname, '../client')));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// Game state
const rooms = new Map();
const players = new Map();

// WebSocket
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    ws.isAlive = true;
    
    ws.on('pong', () => ws.isAlive = true);
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(ws, data);
        } catch (e) {
            ws.send(JSON.stringify({ type: 'ERROR', error: 'Invalid JSON' }));
        }
    });
    
    ws.on('close', () => handleDisconnect(ws));
    ws.on('error', () => handleDisconnect(ws));
});

function handleMessage(ws, data) {
    switch(data.type) {
        case 'CREATE_ROOM':
            createRoom(ws);
            break;
        case 'JOIN_ROOM':
            joinRoom(ws, data);
            break;
        case 'START_GAME':
            startGame(ws);
            break;
        default:
            ws.send(JSON.stringify({ type: 'ERROR', error: 'Unknown type' }));
    }
}

function createRoom(ws) {
    const roomId = uuidv4().substring(0, 8).toUpperCase();
    rooms.set(roomId, { id: roomId, clients: [ws], status: 'waiting' });
    players.set(ws, { roomId, playerId: 0 });
    
    ws.send(JSON.stringify({
        type: 'ROOM_CREATED',
        roomId,
        playerId: 0
    }));
}

function joinRoom(ws, data) {
    const room = rooms.get(data.roomId);
    if (!room || room.clients.length >= 4) {
        return ws.send(JSON.stringify({ type: 'ERROR', error: 'Room full or not found' }));
    }
    
    const playerId = room.clients.length;
    room.clients.push(ws);
    players.set(ws, { roomId: data.roomId, playerId });
    
    ws.send(JSON.stringify({ type: 'ROOM_JOINED', roomId: data.roomId, playerId }));
}

function startGame(ws) {
    const player = players.get(ws);
    if (!player) return;
    
    const room = rooms.get(player.roomId);
    if (!room) return;
    
    room.status = 'playing';
    
    room.clients.forEach(client => {
        client.send(JSON.stringify({ type: 'GAME_STARTED' }));
    });
}

function handleDisconnect(ws) {
    const player = players.get(ws);
    if (player) {
        const room = rooms.get(player.roomId);
        if (room) {
            room.clients = room.clients.filter(c => c !== ws);
            if (room.clients.length === 0) {
                rooms.delete(player.roomId);
            }
        }
        players.delete(ws);
    }
    try { ws.terminate(); } catch(e) {}
}

// Heartbeat
setInterval(() => {
    wss.clients.forEach(ws => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
