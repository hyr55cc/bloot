const Card = require('./Card');

class Deck {
    constructor() {
        this.suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        this.ranks = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        this.cards = [];
        this.initialize();
    }

    initialize() {
        this.cards = [];
        for (const suit of this.suits) {
            for (const rank of this.ranks) {
                this.cards.push(new Card(suit, rank));
            }
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
        return this;
    }

    deal(count) {
        return this.cards.splice(0, count);
    }

    dealBalootRound() {
        return {
            firstRound: this.deal(5),
            buyerCard: this.deal(1)[0],
            remaining: this.cards.length
        };
    }

    getRemaining() {
        return this.cards.length;
    }
}

module.exports = Deck;