const BiddingStrategy = require('./BiddingStrategy');
const PlayingStrategy = require('./PlayingStrategy');
const CardMemory = require('./CardMemory');

class BotAI {
    constructor(playerId, teamId, difficulty = 'expert') {
        this.playerId = playerId;
        this.teamId = teamId;
        this.difficulty = difficulty;
        this.biddingStrategy = new BiddingStrategy();
        this.playingStrategy = null;
        this.memory = new CardMemory();
        this.gameState = {
            hand: [],
            tableCards: [],
            trumpSuit: null,
            gameType: null,
            scores: [0, 0],
            currentRound: 0
        };
    }

    static create(playerId, teamId, difficulty = 'expert') {
        return new BotAI(playerId, teamId, difficulty);
    }

    updateGameState(state) {
        this.gameState = { ...this.gameState, ...state };
        if (state.hand) this.gameState.hand = state.hand;
        if (state.tableCards) this.gameState.tableCards = state.tableCards;
        if (state.trumpSuit) this.gameState.trumpSuit = state.trumpSuit;
        if (state.gameType) this.gameState.gameType = state.gameType;
    }

    async decideBid(hand, buyerCard, currentBid, teamScore) {
        // Add small delay for realism
        await this.delay(500 + Math.random() * 1000);

        const evaluation = this.biddingStrategy.evaluateHand(hand, buyerCard, teamScore);

        if (!currentBid) {
            if (evaluation.recommended.type === 'pass') {
                return { type: 'pass', reason: evaluation.recommended.reason };
            }
            return {
                type: evaluation.recommended.type,
                suit: this.biddingStrategy.getBidSuit(evaluation.recommended.type, buyerCard, hand),
                confidence: evaluation.recommended.confidence,
                reason: evaluation.recommended.reason
            };
        }

        // Overbidding logic
        if (this.biddingStrategy.shouldBid(hand, buyerCard, currentBid, teamScore)) {
            return {
                type: evaluation.recommended.type,
                suit: this.biddingStrategy.getBidSuit(evaluation.recommended.type, buyerCard, hand),
                confidence: evaluation.recommended.confidence,
                reason: 'Overbidding'
            };
        }

        return { type: 'pass', reason: 'Cannot beat current bid' };
    }

    chooseCard(hand, tableCards, trumpSuit, isLeader, gameType) {
        if (!this.playingStrategy) {
            this.playingStrategy = new PlayingStrategy(this.memory, this.playerId, this.teamId);
        }

        // Update memory
        for (const play of tableCards) {
            this.memory.recordPlay(play.player, play.card);
        }

        return this.playingStrategy.chooseCard(hand, tableCards, trumpSuit, isLeader, gameType);
    }

    recordPlay(playerId, card, expectedSuit) {
        this.memory.recordPlay(playerId, card, expectedSuit);
    }

    setPartnerStrength(partnerId, strength) {
        this.memory.setPartnerStrength(partnerId, strength);
    }

    resetMemory() {
        this.memory.reset();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Advanced: Analyze opponent patterns
    analyzeOpponents() {
        // Track opponent bidding and playing patterns
        // This can be used to predict their hands
        return {
            aggressiveBidders: [],
            conservativePlayers: [],
            suitPreferences: {}
        };
    }

    // Calculate probability of opponents having certain cards
    calculateCardProbabilities(suit, rank) {
        return this.memory.calculateProbability(suit, rank, [this.playerId]);
    }
}

module.exports = BotAI;