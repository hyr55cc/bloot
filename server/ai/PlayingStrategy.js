class PlayingStrategy {
    constructor(memory, playerId, teamId) {
        this.memory = memory;
        this.playerId = playerId;
        this.teamId = teamId;
    }

    chooseCard(hand, tableCards, trumpSuit, isLeader, gameType) {
        if (isLeader) {
            return this.leadCard(hand, tableCards, trumpSuit, gameType);
        }
        return this.followCard(hand, tableCards, trumpSuit, gameType);
    }

    leadCard(hand, tableCards, trumpSuit, gameType) {
        const analysis = this.analyzeHand(hand, trumpSuit);
        const partnerId = (this.playerId + 2) % 4;
        const partnerStrength = this.memory.getPartnerStrength(partnerId);

        // If partner is strong, play weak cards to support
        if (partnerStrength === 'strong') {
            return this.findWeakestLead(hand, trumpSuit, gameType);
        }

        // If we have strong cards, play them
        if (analysis.hasStrongCards) {
            return this.findStrongestLead(hand, trumpSuit, gameType);
        }

        // Try to extract high cards from opponents
        return this.findBaitCard(hand, trumpSuit, gameType);
    }

    followCard(hand, tableCards, trumpSuit, gameType) {
        const leadCard = tableCards[0].card;
        const leadSuit = leadCard.suit;
        const currentWinner = this.getCurrentWinner(tableCards, trumpSuit, gameType);
        const isPartnerWinning = currentWinner === (this.playerId + 2) % 4;
        const validCards = this.getValidCards(hand, leadSuit, trumpSuit, gameType, tableCards);

        if (validCards.length === 0) {
            // We are empty (Tanqee') - play lowest value card
            return this.findLowestCard(hand);
        }

        if (isPartnerWinning) {
            // Partner is winning - support with low card (Kabsh)
            return this.findSupportCard(validCards, tableCards, trumpSuit, gameType);
        }

        // We need to win
        const winningCards = validCards.filter(c => 
            this.canWinTrick(c, tableCards, trumpSuit, gameType)
        );

        if (winningCards.length > 0) {
            // Win with lowest possible card
            return this.findLowestWinner(winningCards, tableCards, trumpSuit, gameType);
        }

        // Cannot win - play weakest card
        return this.findWeakestCard(validCards, trumpSuit, gameType);
    }

    getValidCards(hand, leadSuit, trumpSuit, gameType, tableCards) {
        // Must follow suit if possible
        const followCards = hand.filter(c => c.suit === leadSuit);
        if (followCards.length > 0) return followCards;

        // In Hukum: if trump is played and we have trump, must play trump
        if (gameType === 'hukum' && tableCards.some(c => c.card.suit === trumpSuit)) {
            const trumpCards = hand.filter(c => c.suit === trumpSuit);
            if (trumpCards.length > 0) return trumpCards;
        }

        return hand;
    }

    canWinTrick(card, tableCards, trumpSuit, gameType) {
        const tempTable = [...tableCards, { card, player: this.playerId }];
        return this.calculateWinner(tempTable, trumpSuit, gameType) === this.playerId;
    }

    getCurrentWinner(tableCards, trumpSuit, gameType) {
        return this.calculateWinner(tableCards, trumpSuit, gameType);
    }

    calculateWinner(tableCards, trumpSuit, gameType) {
        if (tableCards.length === 0) return -1;

        const leadSuit = tableCards[0].card.suit;
        let winner = tableCards[0].player;
        let winningCard = tableCards[0].card;

        const order = gameType === 'hukum' 
            ? ['7', '8', 'Q', 'K', '10', 'A', '9', 'J']
            : ['7', '8', '9', 'J', 'Q', 'K', '10', 'A'];

        for (let i = 1; i < tableCards.length; i++) {
            const { card, player } = tableCards[i];

            if (this.isCardHigher(card, winningCard, leadSuit, trumpSuit, order)) {
                winner = player;
                winningCard = card;
            }
        }

        return winner;
    }

    isCardHigher(card1, card2, leadSuit, trumpSuit, order) {
        // Trump beats everything
        if (card1.suit === trumpSuit && card2.suit !== trumpSuit) return true;
        if (card2.suit === trumpSuit && card1.suit !== trumpSuit) return false;

        // Must follow lead suit
        if (card1.suit === leadSuit && card2.suit !== leadSuit) return true;
        if (card2.suit === leadSuit && card1.suit !== leadSuit) return false;

        if (card1.suit !== card2.suit) return false;

        return order.indexOf(card1.rank) > order.indexOf(card2.rank);
    }

    findStrongestLead(hand, trumpSuit, gameType) {
        // Play ace if available and it's likely to win
        const aces = hand.filter(c => c.rank === 'A');
        if (aces.length > 0) {
            // Check if ace is cut (not played yet)
            const cutAces = aces.filter(a => this.memory.isAceCut(a, hand));
            if (cutAces.length > 0) return cutAces[0];
        }

        // Play high non-trump cards
        const nonTrump = hand.filter(c => c.suit !== trumpSuit);
        if (nonTrump.length > 0) {
            return nonTrump.sort((a, b) => b.value - a.value)[0];
        }

        return hand[0];
    }

    findWeakestLead(hand, trumpSuit, gameType) {
        // Play lowest non-trump, non-ace card
        const safeCards = hand.filter(c => 
            c.suit !== trumpSuit && c.rank !== 'A' && c.value < 5
        );
        if (safeCards.length > 0) {
            return safeCards.sort((a, b) => a.value - b.value)[0];
        }

        // Play lowest card
        return hand.sort((a, b) => a.value - b.value)[0];
    }

    findBaitCard(hand, trumpSuit, gameType) {
        // Play a card that might draw out high cards from opponents
        const mediumCards = hand.filter(c => 
            c.value >= 3 && c.value <= 5 && c.suit !== trumpSuit
        );
        if (mediumCards.length > 0) return mediumCards[0];

        return this.findWeakestLead(hand, trumpSuit, gameType);
    }

    findSupportCard(validCards, tableCards, trumpSuit, gameType) {
        // Play lowest valid card to support partner
        return validCards.sort((a, b) => a.value - b.value)[0];
    }

    findLowestWinner(winningCards, tableCards, trumpSuit, gameType) {
        return winningCards.sort((a, b) => a.value - b.value)[0];
    }

    findWeakestCard(cards, trumpSuit, gameType) {
        return cards.sort((a, b) => a.value - b.value)[0];
    }

    findLowestCard(hand) {
        return hand.sort((a, b) => a.value - b.value)[0];
    }

    analyzeHand(hand, trumpSuit) {
        const hasStrongCards = hand.some(c => 
            c.rank === 'A' || (c.suit === trumpSuit && ['J', '9'].includes(c.rank))
        );
        return { hasStrongCards };
    }
}

module.exports = PlayingStrategy;