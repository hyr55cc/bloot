class GameClient {
    constructor() {
        this.ws = null;
        this.roomId = null;
        this.playerId = null;
        this.gameState = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;

        this.renderer = new GameRenderer();
        this.ui = new UIManager();

        this.pendingActions = new Map();
        this.actionTimeout = 30000; // 30 seconds

        this.setupCallbacks();
    }

    setupCallbacks() {
        // UI callbacks
        this.ui.onBidClick = (bidType) => this.sendBid(bidType);
        this.ui.onPassClick = () => this.sendPass();
        this.ui.onEmojiClick = (emoji) => this.sendEmoji(emoji);
        this.ui.onChatMessage = (message) => this.sendChat(message);
        this.ui.onScoreBoardClick = () => this.showScoreDetails();
    }

    // ===== Connection =====
    connect(url = 'ws://localhost:8080') {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(url);

                this.ws.onopen = () => {
                    console.log('Connected to game server');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.ui.showConnectionStatus('connected', 'متصل');
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(JSON.parse(event.data));
                };

                this.ws.onclose = () => {
                    console.log('Disconnected from server');
                    this.isConnected = false;
                    this.ui.showConnectionStatus('disconnected', 'غير متصل');
                    this.attemptReconnect();
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.ui.showConnectionStatus('error', 'خطأ في الاتصال');
                    reject(error);
                };

            } catch (error) {
                reject(error);
            }
        });
    }

    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.ui.showError('فشل إعادة الاتصال. يرجى تحديث الصفحة.');
            return;
        }

        this.reconnectAttempts++;
        this.ui.showConnectionStatus('reconnecting', `إعادة الاتصال... (${this.reconnectAttempts})`);

        setTimeout(() => {
            this.connect().catch(() => {
                // Reconnect failed, will try again
            });
        }, 3000 * this.reconnectAttempts);
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }

    // ===== Message Handling =====
    handleMessage(message) {
        console.log('Received:', message.type, message);

        switch (message.type) {
            case 'ROOM_CREATED':
                this.handleRoomCreated(message);
                break;
            case 'ROOM_JOINED':
                this.handleRoomJoined(message);
                break;
            case 'GAME_STARTED':
                this.handleGameStarted(message);
                break;
            case 'cardsDealt':
                this.handleCardsDealt(message.data);
                break;
            case 'buyerCardRevealed':
                this.handleBuyerCardRevealed(message.data);
                break;
            case 'phaseChanged':
                this.handlePhaseChanged(message.data);
                break;
            case 'playerPassed':
                this.handlePlayerPassed(message.data);
                break;
            case 'playerBid':
                this.handlePlayerBid(message.data);
                break;
            case 'biddingEnded':
                this.handleBiddingEnded(message.data);
                break;
            case 'dealingComplete':
                this.handleDealingComplete(message.data);
                break;
            case 'projectsDeclared':
                this.handleProjectsDeclared(message.data);
                break;
            case 'cardPlayed':
                this.handleCardPlayed(message.data);
                break;
            case 'turnChanged':
                this.handleTurnChanged(message.data);
                break;
            case 'trickWon':
                this.handleTrickWon(message.data);
                break;
            case 'roundEnded':
                this.handleRoundEnded(message.data);
                break;
            case 'gameEnded':
                this.handleGameEnded(message.data);
                break;
            case 'waitingForAction':
                this.handleWaitingForAction(message.data);
                break;
            case 'CHAT':
                this.handleChatMessage(message.data);
                break;
            case 'ERROR':
                this.handleError(message);
                break;
            case 'ACTION_ERROR':
                this.handleActionError(message);
                break;
            case 'PONG':
                // Heartbeat response
                break;
            default:
                console.warn('Unknown message type:', message.type);
        }
    }

    // ===== Game Event Handlers =====
    handleRoomCreated(data) {
        this.roomId = data.roomId;
        this.playerId = data.playerId;
        console.log('Room created:', this.roomId);
    }

    handleRoomJoined(data) {
        this.roomId = data.roomId;
        this.playerId = data.playerId;
        this.ui.showNotification(`انضممت للغرفة ${this.roomId}`, 'success');
    }

    handleGameStarted(data) {
        this.ui.showGameScreen();
        this.ui.showNotification('بدأت اللعبة! 🎮', 'success');
    }

    handleCardsDealt(data) {
        if (data.player === this.playerId) {
            if (data.isFirstRound) {
                // Initial 5 cards
                this.renderer.renderPlayerHand(data.cards, (card, index) => {
                    this.onCardClick(card, index);
                });
            } else {
                // Additional cards
                // Update hand with new cards
                const currentCards = this.renderer.playerHand.querySelectorAll('.card');
                // Re-render with all cards
            }
        } else {
            // Update opponent card count
            this.renderer.updatePlayerInfo(data.player, null, 8, true);
        }
    }

    handleBuyerCardRevealed(data) {
        this.renderer.showBuyerCard(data.card);
        this.ui.showNotification(`ورقة المشتري: ${CardRenderer.getCardString(data.card)}`, 'info', 3000);
    }

    handlePhaseChanged(data) {
        console.log('Phase changed:', data.phase);

        if (data.phase === 'BIDDING') {
            this.ui.showNotification('مرحلة المزاد! 💰', 'warning');
        } else if (data.phase === 'PLAYING') {
            this.ui.showNotification('بدأ اللعب! 🃏', 'success');
        }
    }

    handlePlayerPassed(data) {
        this.renderer.showPassNotification(data.name);
    }

    handlePlayerBid(data) {
        this.renderer.showBidNotification(data.name, data.bid.type);
    }

    handleBiddingEnded(data) {
        this.ui.showNotification(
            `المشتري: ${data.buyerType} - ${CardRenderer.SUITS[data.trumpSuit]?.symbol || data.trumpSuit}`,
            'warning',
            5000
        );
    }

    handleDealingComplete(data) {
        this.renderer.hideBuyerCard();
        this.ui.showNotification('اكتمل التوزيع!', 'success', 2000);
    }

    handleProjectsDeclared(data) {
        this.renderer.showProjectNotification(data.name, data.projects);
    }

    handleCardPlayed(data) {
        this.renderer.playCardOnTable(data.player, data.card);

        // If it's our card, remove from hand
        if (data.player === this.playerId) {
            this.renderer.removeCardFromHand(data.card);
        } else {
            // Update opponent card count
            const countEl = document.getElementById(`player${data.player}-count`);
            if (countEl) {
                const current = parseInt(countEl.textContent) || 8;
                countEl.textContent = Math.max(0, current - 1);
            }
        }
    }

    handleTurnChanged(data) {
        this.renderer.highlightCurrentPlayer(data.currentPlayer);

        if (data.currentPlayer === this.playerId) {
            this.ui.showNotification('دورك! ⏰', 'warning', 2000);
            this.ui.startTurnTimer(30, () => {
                // Auto-play if timeout
                this.playRandomCard();
            });
        } else {
            this.ui.stopTurnTimer();
        }
    }

    handleTrickWon(data) {
        this.renderer.animateTrickWin(data.winner, data.cards).then(() => {
            this.renderer.showTrickWinner(data.name, data.points);
        });
    }

    handleRoundEnded(data) {
        const scoreData = {
            team0: {
                points: data.scores.team0.points,
                final: data.scores.team0.final
            },
            team1: {
                points: data.scores.team1.points,
                final: data.scores.team1.final
            },
            projects: data.projects
        };

        this.renderer.updateScoreBoard(
            data.scores.team0.total,
            data.scores.team1.total,
            data.scores.team0.final,
            data.scores.team1.final,
            data.round
        );

        this.renderer.showScoreDetails(scoreData);
    }

    handleGameEnded(data) {
        this.renderer.showEndGame(
            data.winner,
            data.finalScores[0],
            data.finalScores[1]
        );
    }

    handleWaitingForAction(data) {
        if (data.playerId === this.playerId) {
            if (data.actionType === 'BID') {
                this.renderer.showBidOptions(
                    (bidType) => this.sendBid(bidType),
                    () => this.sendPass()
                );
            }
        }
    }

    handleChatMessage(data) {
        if (data.data.emoji) {
            this.renderer.showEmoji(data.data.player, data.data.emoji);
        } else {
            this.renderer.showChatMessage(data.data.player, data.data.message);
        }
    }

    handleError(message) {
        this.ui.showError(message.error || 'حدث خطأ غير معروف');
    }

    handleActionError(message) {
        this.ui.showError(message.error || 'خطأ في الإجراء');
    }

    // ===== User Actions =====
    onCardClick(card, index) {
        if (this.gameState?.currentPlayer !== this.playerId) {
            this.ui.showError('ليس دورك!');
            return;
        }

        this.sendPlayCard(card);
    }

    playRandomCard() {
        const cards = this.renderer.playerHand.querySelectorAll('.card');
        if (cards.length > 0) {
            const randomCard = cards[0];
            this.sendPlayCard({
                suit: randomCard.dataset.suit,
                rank: randomCard.dataset.rank
            });
        }
    }

    // ===== Server Communication =====
    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('WebSocket not connected');
            this.ui.showError('غير متصل بالخادم');
        }
    }

    createRoom(settings = {}) {
        this.send({
            type: 'CREATE_ROOM',
            settings: {
                mode: 'solo',
                ...settings
            },
            playerName: 'Player'
        });
    }

    joinRoom(roomId) {
        this.send({
            type: 'JOIN_ROOM',
            roomId: roomId,
            playerName: 'Player'
        });
    }

    startGame() {
        this.send({
            type: 'START_GAME'
        });
    }

    sendBid(bidType) {
        this.send({
            type: 'PLAYER_ACTION',
            action: {
                type: 'BID',
                bid: bidType
            }
        });
    }

    sendPass() {
        this.send({
            type: 'PLAYER_ACTION',
            action: {
                type: 'BID',
                bid: 'pass'
            }
        });
    }

    sendPlayCard(card) {
        this.send({
            type: 'PLAYER_ACTION',
            action: {
                type: 'PLAY_CARD',
                card: card
            }
        });
    }

    sendEmoji(emoji) {
        this.send({
            type: 'PLAYER_ACTION',
            action: {
                type: 'CHAT',
                emoji: emoji
            }
        });
    }

    sendChat(message) {
        this.send({
            type: 'PLAYER_ACTION',
            action: {
                type: 'CHAT',
                message: message
            }
        });
    }

    showScoreDetails() {
        // Request score details from server or use cached data
        this.renderer.showScoreDetails({
            team0: { points: 0, final: 0 },
            team1: { points: 0, final: 0 },
            projects: []
        });
    }

    // ===== Heartbeat =====
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.send({ type: 'PING' });
            }
        }, 30000); // Every 30 seconds
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
    }

    // ===== Cleanup =====
    destroy() {
        this.stopHeartbeat();
        this.disconnect();
        this.ui.destroy();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameClient;
}