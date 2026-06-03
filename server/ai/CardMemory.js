class CardMemory {
    constructor() {
        this.playedCards = new Set();
        this.knownHands = new Map();
        this.suitDistribution = { hearts: 8, diamonds: 8, clubs: 8, spades: 8 };
        this.acesLocation = {
            'A♥': 'unknown', 'A♦': 'unknown', 
            'A♣': 'unknown', 'A♠': 'unknown'
        };
        this.emptySuits = new Map();
        this.partnerStrength = new Map();
    }

    reset() {
        this.playedCards.clear();
        this.knownHands.clear();
        this.suitDistribution = { hearts: 8, diamonds: 8, clubs: 8, spades: 8 };
        this.emptySuits.clear();
        this.partnerStrength.clear();
    }

    recordPlay(playerId, card, expectedSuit = null) {
        const cardStr = typeof card === 'string' ? card : `${card.rank}${this.getSuitSymbol(card.suit)}`;
        this.playedCards.add(cardStr);

        if (typeof card === 'object') {
            this.suitDistribution[card.suit]--;

            if (card.rank === 'A') {
                this.acesLocation[cardStr] = 'played';
            }
        }

        if (expectedSuit && card.suit !== expectedSuit) {
            this.markSuitEmpty(playerId, expectedSuit);
        }
    }

    markSuitEmpty(playerId, suit) {
        if (!this.emptySuits.has(playerId)) {
            this.emptySuits.set(playerId, new Set());
        }
        this.emptySuits.get(playerId).add(suit);
    }

    isSuitEmpty(playerId, suit) {
        return this.emptySuits.get(playerId)?.has(suit) || false;
    }

    getSuitSymbol(suit) {
        const symbols = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
        return symbols[suit] || suit;
    }

    isAceCut(aceCard, playerHand) {
        const aceStr = typeof aceCard === 'string' ? aceCard : aceCard.toString();
        if (this.playedCards.has(aceStr)) return false;
        if (playerHand.some(c => c.toString() === aceStr)) return false;
        return true;
    }

    getRemainingCards(suit) {
        return this.suitDistribution[suit] || 0;
    }

    getPlayedCardsInSuit(suit) {
        return Array.from(this.playedCards).filter(c => {
            const suitSymbol = this.getSuitSymbol(suit);
            return c.includes(suitSymbol);
        }).length;
    }

    setPartnerStrength(playerId, strength) {
        this.partnerStrength.set(playerId, strength);
    }

    getPartnerStrength(playerId) {
        return this.partnerStrength.get(playerId) || 'unknown';
    }

    getUnknownCards(suit, hand) {
        const allRanks = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        const handRanks = hand.filter(c => c.suit === suit).map(c => c.rank);
        const playedInSuit = Array.from(this.playedCards)
            .filter(c => c.includes(this.getSuitSymbol(suit)))
            .map(c => c.replace(/[^0-9JQKA]/g, ''));

        return allRanks.filter(r => !handRanks.includes(r) && !playedInSuit.includes(r));
    }

    calculateProbability(suit, rank, excludedPlayers = []) {
        const remaining = this.getRemainingCards(suit);
        if (remaining <= 0) return 0;

        const unknownPlayers = 4 - excludedPlayers.length - 1; // -1 for self
        return 1 / Math.max(unknownPlayers, 1);
    }
}

module.exports = CardMemory;