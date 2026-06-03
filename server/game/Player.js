class Player {
    constructor(id, name, teamId, isBot = false) {
        this.id = id;
        this.name = name;
        this.teamId = teamId;
        this.isBot = isBot;
        this.hand = [];
        this.tricksWon = 0;
        this.ai = isBot ? require('../ai/BotAI').create(id, teamId) : null;
    }

    setHand(cards) {
        this.hand = cards;
    }

    addCards(cards) {
        this.hand.push(...cards);
    }

    addCard(card) {
        this.hand.push(card);
    }

    removeCard(card) {
        const index = this.hand.findIndex(c => 
            c.suit === card.suit && c.rank === card.rank
        );
        if (index !== -1) {
            return this.hand.splice(index, 1)[0];
        }
        return null;
    }

    hasCard(card) {
        return this.hand.some(c => c.suit === card.suit && c.rank === card.rank);
    }

    hasSuit(suit) {
        return this.hand.some(c => c.suit === suit);
    }

    getHandSize() {
        return this.hand.length;
    }

    clearHand() {
        this.hand = [];
        this.tricksWon = 0;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            teamId: this.teamId,
            isBot: this.isBot,
            handSize: this.hand.length,
            tricksWon: this.tricksWon
        };
    }
}

module.exports = Player;