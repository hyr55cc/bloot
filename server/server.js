const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const path = require('path');
const BalootGame = require('./game/BalootGame');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files
app.use(express.static(path.join(__dirname, '../client')));
app.use(express.json());

// Game rooms management
const rooms = new Map();
const players = new Map();

class GameRoom {
    constructor(id, settings = {}) {
        this.id = id;
        this.settings = {
            mode: settings.mode || 'solo', // solo, multiplayer, vip
            maxPlayers: settings.maxPlayers || 4,
            botDifficulty: settings.botDifficulty || 'expert',
            timeLimit: settings.timeLimit || 30,
            ...settings
        };
        this.game = null;
        this.clients = new Map();
        this.status = 'waiting'; // waiting, playing, ended
        this.createdAt = Date.now();
    }

    addClient(ws, playerData) {
        if (this.clients.size >= this.settings.maxPlayers) {
            return { success: false, error: 'Room is full' };
        }

        const playerId = this.clients.size;
        this.clients.set(ws, {
            id: playerId,
            name: playerData.name || `Player ${playerId + 1}`,
            ws: ws,
            ready: false
        });

        // If solo mode, add bots
        if (this.settings.mode === 'solo' && this.clients.size === 1) {
            this.initializeGame();
        }

        return { success: true, playerId };
    }

    removeClient(ws) {
        this.clients.delete(ws);

        if (this.clients.size === 0) {
            this.status = 'ended';
            return true; // Room should be deleted
        }

        return false;
    }

    initializeGame() {
        const playerConfigs = [];

        for (const [ws, client] of this.clients) {
            playerConfigs.push({
                name: client.name,
                isBot: false
            });
        }

        // Fill remaining slots with bots
        while (playerConfigs.length < 4) {
            playerConfigs.push({
                name: `Bot ${playerConfigs.length}`,
                isBot: true
            });
        }

        this.game = new BalootGame(this.id, playerConfigs);
        this.setupGameEvents();
        this.status = 'playing';

        return this.game;
    }

    setupGameEvents() {
        if (!this.game) return;

        const events = [
            'gameStarted', 'cardsDealt', 'buyerCardRevealed',
            'phaseChanged', 'playerPassed', 'playerBid', 'biddingEnded',
            'allPassed', 'dealingComplete', 'projectsDeclared',
            'projectsPhaseEnded', 'cardPlayed', 'turnChanged',
            'trickWon', 'roundEnded', 'gameEnded',
            'waitingForAction'
        ];

        for (const event of events) {
            this.game.on(event, (data) => {
                this.broadcast({
                    type: event,
                    data: data,
                    timestamp: Date.now()
                });
            });
        }
    }

    broadcast(message) {
        const messageStr = JSON.stringify(message);
        for (const [ws, client] of this.clients) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(messageStr);
            }
        }
    }

    sendToPlayer(playerId, message) {
        for (const [ws, client] of this.clients) {
            if (client.id === playerId && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(message));
                return true;
            }
        }
        return false;
    }

    startGame() {
        if (!this.game) {
            this.initializeGame();
        }
        this.game.startGame();
    }

    handlePlayerAction(playerId, action) {
        if (!this.game) return { success: false, error: 'Game not started' };

        switch (action.type) {
            case 'BID':
                this.game.submitPlayerAction(playerId, action);
                return { success: true };

            case 'PLAY_CARD':
                return this.game.playCard(playerId, action.card);

            case 'DECLARE_PROJECT':
                // Handle project declaration
                return { success: true };

            case 'CHAT':
                this.broadcast({
                    type: 'CHAT',
                    data: {
                        player: playerId,
                        message: action.message,
                        emoji: action.emoji
                    }
                });
                return { success: true };

            default:
                return { success: false, error: 'Unknown action type' };
        }
    }

    getState() {
        return {
            id: this.id,
            status: this.status,
            mode: this.settings.mode,
            playerCount: this.clients.size,
            maxPlayers: this.settings.maxPlayers,
            gameState: this.game ? this.game.getGameState() : null
        };
    }
}

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleWebSocketMessage(ws, data);
        } catch (error) {
            console.error('Invalid message format:', error);
            ws.send(JSON.stringify({
                type: 'ERROR',
                error: 'Invalid message format'
            }));
        }
    });

    ws.on('close', () => {
        handleDisconnect(ws);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

function handleWebSocketMessage(ws, data) {
    switch (data.type) {
        case 'CREATE_ROOM':
            createRoom(ws, data);
            break;

        case 'JOIN_ROOM':
            joinRoom(ws, data);
            break;

        case 'LEAVE_ROOM':
            leaveRoom(ws, data);
            break;

        case 'START_GAME':
            startGame(ws, data);
            break;

        case 'PLAYER_ACTION':
            handlePlayerAction(ws, data);
            break;

        case 'GET_ROOMS':
            getRooms(ws);
            break;

        case 'PING':
            ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
            break;

        default:
            ws.send(JSON.stringify({
                type: 'ERROR',
                error: `Unknown message type: ${data.type}`
            }));
    }
}

function createRoom(ws, data) {
    const roomId = uuidv4().substring(0, 8).toUpperCase();
    const room = new GameRoom(roomId, data.settings || {});

    const result = room.addClient(ws, { name: data.playerName || 'Player' });

    if (result.success) {
        rooms.set(roomId, room);
        players.set(ws, { roomId, playerId: result.playerId });

        ws.send(JSON.stringify({
            type: 'ROOM_CREATED',
            roomId: roomId,
            playerId: result.playerId,
            state: room.getState()
        }));

        console.log(`Room created: ${roomId}`);
    } else {
        ws.send(JSON.stringify({
            type: 'ERROR',
            error: result.error
        }));
    }
}

function joinRoom(ws, data) {
    const room = rooms.get(data.roomId);

    if (!room) {
        ws.send(JSON.stringify({
            type: 'ERROR',
            error: 'Room not found'
        }));
        return;
    }

    const result = room.addClient(ws, { name: data.playerName || 'Player' });

    if (result.success) {
        players.set(ws, { roomId: data.roomId, playerId: result.playerId });

        ws.send(JSON.stringify({
            type: 'ROOM_JOINED',
            roomId: data.roomId,
            playerId: result.playerId,
            state: room.getState()
        }));

        // Notify other players
        room.broadcast({
            type: 'PLAYER_JOINED',
            data: {
                playerId: result.playerId,
                name: data.playerName || 'Player',
                playerCount: room.clients.size
            }
        });

        console.log(`Player joined room: ${data.roomId}`);
    } else {
        ws.send(JSON.stringify({
            type: 'ERROR',
            error: result.error
        }));
    }
}

function leaveRoom(ws, data) {
    const playerInfo = players.get(ws);
    if (!playerInfo) return;

    const room = rooms.get(playerInfo.roomId);
    if (room) {
        const shouldDelete = room.removeClient(ws);

        if (shouldDelete) {
            rooms.delete(playerInfo.roomId);
            console.log(`Room deleted: ${playerInfo.roomId}`);
        } else {
            room.broadcast({
                type: 'PLAYER_LEFT',
                data: {
                    playerId: playerInfo.playerId,
                    playerCount: room.clients.size
                }
            });
        }
    }

    players.delete(ws);
}

function startGame(ws, data) {
    const playerInfo = players.get(ws);
    if (!playerInfo) return;

    const room = rooms.get(playerInfo.roomId);
    if (!room) return;

    room.startGame();

    ws.send(JSON.stringify({
        type: 'GAME_STARTED',
        state: room.getState()
    }));
}

function handlePlayerAction(ws, data) {
    const playerInfo = players.get(ws);
    if (!playerInfo) return;

    const room = rooms.get(playerInfo.roomId);
    if (!room) return;

    const result = room.handlePlayerAction(playerInfo.playerId, data.action);

    if (!result.success) {
        ws.send(JSON.stringify({
            type: 'ACTION_ERROR',
            error: result.error
        }));
    }
}

function getRooms(ws) {
    const roomList = Array.from(rooms.values())
        .filter(r => r.status === 'waiting')
        .map(r => ({
            id: r.id,
            mode: r.settings.mode,
            playerCount: r.clients.size,
            maxPlayers: r.settings.maxPlayers
        }));

    ws.send(JSON.stringify({
        type: 'ROOMS_LIST',
        rooms: roomList
    }));
}

function handleDisconnect(ws) {
    const playerInfo = players.get(ws);
    if (playerInfo) {
        const room = rooms.get(playerInfo.roomId);
        if (room) {
            const shouldDelete = room.removeClient(ws);
            if (shouldDelete) {
                rooms.delete(playerInfo.roomId);
            }
        }
        players.delete(ws);
    }
}

// HTTP API endpoints
app.get('/api/rooms', (req, res) => {
    const roomList = Array.from(rooms.values()).map(r => ({
        id: r.id,
        mode: r.settings.mode,
        status: r.status,
        playerCount: r.clients.size,
        maxPlayers: r.settings.maxPlayers,
        createdAt: r.createdAt
    }));

    res.json(roomList);
});

app.get('/api/room/:id', (req, res) => {
    const room = rooms.get(req.params.id);
    if (!room) {
        return res.status(404).json({ error: 'Room not found' });
    }

    res.json(room.getState());
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Baloot Game Server running on port ${PORT}`);
    console.log(`WebSocket: ws://localhost:${PORT}`);
    console.log(`HTTP API: http://localhost:${PORT}`);
});

module.exports = { server, wss, rooms };