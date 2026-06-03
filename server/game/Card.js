class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
        this.value = this.calculateValue();
    }

    calculateValue() {
        const values = {
            'A': 11, '10': 10, 'K': 4, 'Q': 3, 'J': 2,
            '9': 0, '8': 0, '7': 0
        };
        return values[this.rank] || 0;
    }

    getHukumValue() {
        if (this.suit === 'spades') {
            const hukumValues = { 'J': 16, '9': 15, 'A': 14, '10': 13, 'K': 12, 'Q': 11, '8': 0, '7': 0 };
            return hukumValues[this.rank] || 0;
        }
        return this.value;
    }

    toString() {
        const suits = { 'hearts': '♥', 'diamonds': '♦', 'clubs': '♣', 'spades': '♠' };
        return `${this.rank}${suits[this.suit]}`;
    }

    toJSON() {
        return {
            suit: this.suit,
            rank: this.rank,
            value: this.value,
            string: this.toString()
        };
    }
}

module.exports = Card;