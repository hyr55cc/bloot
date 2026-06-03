const EventEmitter = require('events');
const Deck = require('./Deck');
const Player = require('./Player');
const Team = require('./Team');
const ScoringSystem = require('./ScoringSystem');

class BalootGame extends EventEmitter {
    constructor(roomId, playerConfigs = []) {
        super();
        this.roomId = roomId;
        this.currentRound = 0;
        this.currentPhase = 'WAITING'; // WAITING, DEALING, BIDDING, PROJECTS, PLAYING, SCORING
        this.deck = new Deck();

        // Initialize players
        this.players = [];
        this.teams = [];
        this.initializePlayers(playerConfigs);

        this.buyerCard = null;
        this.buyerType = null;
        this.trumpSuit = null;
        this.currentPlayer = 0;
        this.dealer = 3; // Starts with player 3 dealing
        this.tableCards = [];
        this.trickLeader = 0;
        this.projects = [];
        this.roundScores = [0, 0];
        this.gameWinner = null;

        this.antiCheat = new (require('./AntiCheat'))();
    }

    initializePlayers(configs) {
        // Default: 1 human + 3 bots
        const defaultConfigs = [
            { name: 'Player 1', isBot: false },
            { name: 'Bot 1', isBot: true },
            { name: 'Bot 2', isBot: true },
            { name: 'Bot 3', isBot: true }
        ];

        const finalConfigs = configs.length > 0 ? configs : defaultConfigs;

        for (let i = 0; i < 4; i++) {
            const config = finalConfigs[i] || defaultConfigs[i];
            const player = new Player(i, config.name, i % 2, config.isBot);
            this.players.push(player);
        }

        // Create teams
        this.teams = [
            new Team(0, [this.players[0], this.players[2]]),
            new Team(1, [this.players[1], this.players[3]])
        ];
    }

    async startGame() {
        this.currentPhase = 'DEALING';
        this.emit('gameStarted', { roomId: this.roomId });
        await this.startNewRound();
    }

    async startNewRound() {
        this.currentRound++;
        this.currentPhase = 'DEALING';
        this.tableCards = [];
        this.projects = [];
        this.roundScores = [0, 0];

        // Reset hands and tricks
        for (const player of this.players) {
            player.clearHand();
        }
        for (const team of this.teams) {
            team.resetRound();
        }

        // Shuffle and deal
        this.deck.initialize().shuffle();

        // First round: 5 cards each
        for (let i = 0; i < 4; i++) {
            const cards = this.deck.deal(5);
            this.players[i].setHand(cards);
            this.emit('cardsDealt', { 
                player: i, 
                cards: cards.map(c => c.toJSON()),
                isFirstRound: true 
            });
        }

        // Reveal buyer card
        this.buyerCard = this.deck.deal(1)[0];
        this.emit('buyerCardRevealed', { 
            card: this.buyerCard.toJSON(),
            remainingCards: this.deck.getRemaining()
        });

        // Move to bidding
        this.currentPhase = 'BIDDING';
        this.currentPlayer = (this.dealer + 1) % 4;

        this.emit('phaseChanged', { 
            phase: 'BIDDING', 
            currentPlayer: this.currentPlayer 
        });

        // Start bidding process
        await this.processBidding();
    }

    async processBidding() {
        const bids = [];
        let passCount = 0;
        let currentBid = null;
        let lastBidder = null;
        let rounds = 0;

        while ((passCount < 3 || (passCount === 3 && currentBid === null)) && rounds < 20) {
            rounds++;
            const player = this.players[this.currentPlayer];

            let decision;
            if (player.isBot) {
                decision = await player.ai.decideBid(
                    player.hand,
                    this.buyerCard,
                    currentBid,
                    this.teams[player.teamId].score
                );
            } else {
                // Wait for human player decision
                decision = await this.waitForPlayerAction(this.currentPlayer, 'BID');
            }

            if (decision.type === 'pass') {
                passCount++;
                this.emit('playerPassed', { 
                    player: this.currentPlayer,
                    name: player.name 
                });
            } else {
                currentBid = {
                    type: decision.type,
                    suit: decision.suit || this.buyerCard.suit,
                    player: this.currentPlayer,
                    confidence: decision.confidence
                };
                lastBidder = this.currentPlayer;
                passCount = 0;

                bids.push(currentBid);
                this.emit('playerBid', {
                    player: this.currentPlayer,
                    name: player.name,
                    bid: currentBid,
                    reason: decision.reason
                });
            }

            this.currentPlayer = (this.currentPlayer + 1) % 4;
        }

        // Determine buyer
        if (currentBid) {
            this.buyerType = currentBid.type;
            this.trumpSuit = currentBid.suit;
            this.currentPlayer = lastBidder;

            this.emit('biddingEnded', {
                winner: lastBidder,
                buyerType: this.buyerType,
                trumpSuit: this.trumpSuit,
                bids: bids
            });

            await this.completeDealing(lastBidder);
            await this.processProjects();
            await this.startPlaying();
        } else {
            // All passed - redraw
            this.emit('allPassed', { message: 'All players passed. Redrawing...' });
            setTimeout(() => this.startNewRound(), 2000);
        }
    }

    async completeDealing(buyerPosition) {
        const cardsToDeal = this.buyerType === 'first' ? 3 : 2;

        for (let i = 0; i < 4; i++) {
            const additionalCards = this.deck.deal(cardsToDeal);
            this.players[i].addCards(additionalCards);

            this.emit('cardsDealt', {
                player: i,
                cards: additionalCards.map(c => c.toJSON()),
                isFirstRound: false
            });
        }

        // Give buyer card to buyer
        this.players[buyerPosition].addCard(this.buyerCard);

        this.emit('dealingComplete', {
            buyer: buyerPosition,
            buyerType: this.buyerType,
            trumpSuit: this.trumpSuit
        });
    }

    async processProjects() {
        this.currentPhase = 'PROJECTS';

        for (let i = 0; i < 4; i++) {
            const player = this.players[i];
            const detectedProjects = ScoringSystem.detectProjects(player.hand, this.trumpSuit);

            if (detectedProjects.length > 0) {
                const projectsWithValues = detectedProjects.map(p => ({
                    ...p,
                    value: ScoringSystem.calculateProjectValue(p.type, this.buyerType),
                    name: ScoringSystem.getProjectName(p.type)
                }));

                this.projects.push({
                    player: i,
                    team: player.teamId,
                    projects: projectsWithValues
                });

                this.emit('projectsDeclared', {
                    player: i,
                    name: player.name,
                    team: player.teamId,
                    projects: projectsWithValues
                });
            }
        }

        this.emit('projectsPhaseEnded', { projects: this.projects });
    }

    async startPlaying() {
        this.currentPhase = 'PLAYING';
        this.trickLeader = this.currentPlayer;

        this.emit('phaseChanged', {
            phase: 'PLAYING',
            currentPlayer: this.currentPlayer,
            message: 'Starting play phase'
        });

        // If first player is bot, trigger their turn
        if (this.players[this.currentPlayer].isBot) {
            setTimeout(() => this.processBotTurn(), 1500);
        }
    }

    async playCard(playerId, cardData) {
        if (this.currentPlayer !== playerId || this.currentPhase !== 'PLAYING') {
            return { success: false, error: 'Not your turn or wrong phase' };
        }

        const player = this.players[playerId];
        const card = player.hand.find(c => 
            c.suit === cardData.suit && c.rank === cardData.rank
        );

        if (!card) {
            return { success: false, error: 'Card not found in hand' };
        }

        // Anti-cheat validation
        const validation = this.validatePlay(player, card);
        if (!validation.valid) {
            return { success: false, error: validation.reason, code: validation.code };
        }

        // Remove card from hand and place on table
        player.removeCard(card);
        this.tableCards.push({ player: playerId, card });

        // Record in AI memory
        for (const p of this.players) {
            if (p.isBot && p.ai) {
                const expectedSuit = this.tableCards.length > 1 ? this.tableCards[0].card.suit : null;
                p.ai.recordPlay(playerId, card, expectedSuit);
            }
        }

        this.emit('cardPlayed', {
            player: playerId,
            name: player.name,
            card: card.toJSON(),
            position: this.tableCards.length - 1
        });

        // Check if trick is complete
        if (this.tableCards.length === 4) {
            setTimeout(() => this.resolveTrick(), 1000);
        } else {
            this.currentPlayer = (this.currentPlayer + 1) % 4;
            this.emit('turnChanged', {
                currentPlayer: this.currentPlayer,
                name: this.players[this.currentPlayer].name
            });

            if (this.players[this.currentPlayer].isBot) {
                setTimeout(() => this.processBotTurn(), 1500);
            }
        }

        return { success: true };
    }

    validatePlay(player, card) {
        if (this.tableCards.length === 0) {
            return { valid: true };
        }

        const leadSuit = this.tableCards[0].card.suit;

        // Must follow suit
        if (card.suit !== leadSuit) {
            const hasLeadSuit = player.hasSuit(leadSuit);
            if (hasLeadSuit) {
                return { 
                    valid: false, 
                    reason: `Must follow suit: ${leadSuit}`,
                    code: 'FOLLOW_SUIT'
                };
            }
        }

        return { valid: true };
    }

    async resolveTrick() {
        const winner = this.calculateTrickWinner();
        const winningTeam = this.players[winner].teamId;

        // Add trick to winning team
        this.teams[winningTeam].addTrick([...this.tableCards]);
        this.players[winner].tricksWon++;

        // Calculate trick points
        const trickPoints = ScoringSystem.calculateTrickPoints(
            this.tableCards.map(t => t.card),
            this.buyerType,
            this.trumpSuit
        );

        this.emit('trickWon', {
            winner: winner,
            name: this.players[winner].name,
            team: winningTeam,
            cards: this.tableCards.map(t => t.card.toJSON()),
            points: trickPoints,
            trickNumber: this.teams[0].tricks.length + this.teams[1].tricks.length
        });

        this.tableCards = [];
        this.currentPlayer = winner;
        this.trickLeader = winner;

        // Check if round is over (8 tricks)
        const totalTricks = this.teams[0].tricks.length + this.teams[1].tricks.length;

        if (totalTricks >= 8) {
            setTimeout(() => this.endRound(), 2000);
        } else {
            this.emit('turnChanged', {
                currentPlayer: this.currentPlayer,
                name: this.players[this.currentPlayer].name,
                trickNumber: totalTricks + 1
            });

            if (this.players[this.currentPlayer].isBot) {
                setTimeout(() => this.processBotTurn(), 1500);
            }
        }
    }

    calculateTrickWinner() {
        if (this.tableCards.length === 0) return this.trickLeader;

        const leadSuit = this.tableCards[0].card.suit;
        let winner = this.tableCards[0].player;
        let winningCard = this.tableCards[0].card;

        const order = this.buyerType === 'hukum' 
            ? ScoringSystem.HUKUM_ORDER 
            : ScoringSystem.SUN_ORDER;

        for (let i = 1; i < this.tableCards.length; i++) {
            const { card, player } = this.tableCards[i];

            if (this.isCardHigher(card, winningCard, leadSuit, order)) {
                winner = player;
                winningCard = card;
            }
        }

        return winner;
    }

    isCardHigher(card1, card2, leadSuit, order) {
        // Trump beats everything
        if (card1.suit === this.trumpSuit && card2.suit !== this.trumpSuit) return true;
        if (card2.suit === this.trumpSuit && card1.suit !== this.trumpSuit) return false;

        // Must follow lead suit
        if (card1.suit === leadSuit && card2.suit !== leadSuit) return true;
        if (card2.suit === leadSuit && card1.suit !== leadSuit) return false;

        if (card1.suit !== card2.suit) return false;

        return order.indexOf(card1.rank) > order.indexOf(card2.rank);
    }

    async processBotTurn() {
        if (this.currentPhase !== 'PLAYING') return;

        const bot = this.players[this.currentPlayer];
        if (!bot.isBot || !bot.ai) return;

        try {
            const isLeader = this.tableCards.length === 0;
            const card = bot.ai.chooseCard(
                bot.hand,
                this.tableCards,
                this.trumpSuit,
                isLeader,
                this.buyerType
            );

            if (card) {
                await this.playCard(this.currentPlayer, {
                    suit: card.suit,
                    rank: card.rank
                });
            }
        } catch (error) {
            console.error('Bot turn error:', error);
            // Fallback: play first card
            if (bot.hand.length > 0) {
                const fallback = bot.hand[0];
                await this.playCard(this.currentPlayer, {
                    suit: fallback.suit,
                    rank: fallback.rank
                });
            }
        }
    }

    async endRound() {
        this.currentPhase = 'SCORING';

        // Calculate round scores
        let team0Points = this.teams[0].getTotalPoints();
        let team1Points = this.teams[1].getTotalPoints();

        // Last trick bonus (10 points)
        const lastTrickWinner = this.trickLeader;
        const lastTrickTeam = this.players[lastTrickWinner].teamId;
        if (lastTrickTeam === 0) team0Points += 10;
        else team1Points += 10;

        // Apply game type rules
        let finalScores = [0, 0];

        if (this.buyerType === 'sun') {
            if (team0Points > team1Points) {
                finalScores[0] = team0Points;
            } else {
                finalScores[1] = team1Points;
            }
        } else {
            // Hukum rules
            const buyerTeam = this.players[this.findBuyer()].teamId;
            const buyerPoints = buyerTeam === 0 ? team0Points : team1Points;

            if (ScoringSystem.checkHukumViolation(buyerPoints)) {
                // Mukhalafa
                finalScores[buyerTeam === 0 ? 1 : 0] = 16;
            } else {
                finalScores = [team0Points, team1Points];
            }
        }

        // Add project points
        for (const proj of this.projects) {
            const value = proj.projects.reduce((s, p) => s + p.value, 0);
            finalScores[proj.team] += value;
        }

        // Update total scores
        this.teams[0].addScore(finalScores[0]);
        this.teams[1].addScore(finalScores[1]);
        this.roundScores = finalScores;

        this.emit('roundEnded', {
            round: this.currentRound,
            scores: {
                team0: { points: team0Points, final: finalScores[0], total: this.teams[0].score },
                team1: { points: team1Points, final: finalScores[1], total: this.teams[1].score }
            },
            projects: this.projects,
            buyerType: this.buyerType,
            tricks: {
                team0: this.teams[0].tricks.length,
                team1: this.teams[1].tricks.length
            }
        });

        // Check for game winner (152 points)
        if (this.teams[0].score >= 152 || this.teams[1].score >= 152) {
            const winner = this.teams[0].score > this.teams[1].score ? 0 : 1;
            this.gameWinner = winner;

            this.emit('gameEnded', {
                winner: winner,
                winnerName: this.teams[winner].players.map(p => p.name).join(' & '),
                finalScores: [this.teams[0].score, this.teams[1].score],
                totalRounds: this.currentRound
            });
        } else {
            // Next round
            this.dealer = (this.dealer + 1) % 4;
            setTimeout(() => this.startNewRound(), 3000);
        }
    }

    findBuyer() {
        // Find who made the winning bid
        // This is tracked during bidding
        return this.currentPlayer; // Simplified
    }

    waitForPlayerAction(playerId, actionType) {
        return new Promise((resolve) => {
            this.pendingAction = { playerId, actionType, resolve };
            this.emit('waitingForAction', { playerId, actionType });
        });
    }

    submitPlayerAction(playerId, action) {
        if (this.pendingAction && 
            this.pendingAction.playerId === playerId && 
            this.pendingAction.actionType === action.type) {
            this.pendingAction.resolve(action);
            this.pendingAction = null;
        }
    }

    getGameState() {
        return {
            roomId: this.roomId,
            currentRound: this.currentRound,
            currentPhase: this.currentPhase,
            currentPlayer: this.currentPlayer,
            buyerType: this.buyerType,
            trumpSuit: this.trumpSuit,
            tableCards: this.tableCards.map(t => ({
                player: t.player,
                card: t.card.toJSON()
            })),
            teams: this.teams.map(t => t.toJSON()),
            players: this.players.map(p => p.toJSON()),
            scores: [this.teams[0].score, this.teams[1].score]
        };
    }
}

module.exports = BalootGame;