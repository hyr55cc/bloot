class CardRenderer {
    static SUITS = {
        hearts: { symbol: '♥', color: 'red', name: 'دلّة' },
        diamonds: { symbol: '♦', color: 'red', name: 'شيري' },
        clubs: { symbol: '♣', color: 'black', name: 'كَبّة' },
        spades: { symbol: '♠', color: 'black', name: 'حُكُم' }
    };

    static RANKS = {
        '7': { name: '7', value: 0 },
        '8': { name: '8', value: 0 },
        '9': { name: '9', value: 0 },
        '10': { name: '10', value: 10 },
        'J': { name: 'جاك', value: 2 },
        'Q': { name: 'ملكة', value: 3 },
        'K': { name: 'ملك', value: 4 },
        'A': { name: 'آس', value: 11 }
    };

    static createCardElement(cardData, options = {}) {
        const { suit, rank, string } = cardData;
        const suitInfo = this.SUITS[suit] || { symbol: '?', color: 'black' };
        const rankInfo = this.RANKS[rank] || { name: rank };

        const card = document.createElement('div');
        card.className = `card ${suitInfo.color}`;
        card.dataset.suit = suit;
        card.dataset.rank = rank;

        if (options.clickable) {
            card.classList.add('clickable');
            card.addEventListener('click', options.onClick);
        }

        if (options.selected) {
            card.classList.add('selected');
        }

        card.innerHTML = `
            <div class="card-corner top-left">
                <span class="rank">${rank}</span>
                <span class="suit">${suitInfo.symbol}</span>
            </div>
            <div class="card-center">
                <span class="suit-large">${suitInfo.symbol}</span>
            </div>
            <div class="card-corner bottom-right">
                <span class="rank">${rank}</span>
                <span class="suit">${suitInfo.symbol}</span>
            </div>
        `;

        return card;
    }

    static createBackCard() {
        const card = document.createElement('div');
        card.className = 'card card-back';
        card.innerHTML = `
            <div class="card-back-pattern">
                <span class="back-logo">🃏</span>
            </div>
        `;
        return card;
    }

    static getCardString(cardData) {
        if (cardData.string) return cardData.string;
        const suitInfo = this.SUITS[cardData.suit];
        return `${cardData.rank}${suitInfo ? suitInfo.symbol : ''}`;
    }

    static getSuitName(suit) {
        return this.SUITS[suit]?.name || suit;
    }

    static getRankName(rank) {
        return this.RANKS[rank]?.name || rank;
    }

    static isRed(suit) {
        return this.SUITS[suit]?.color === 'red';
    }

    static formatCardForDisplay(cardData) {
        const suitInfo = this.SUITS[cardData.suit];
        const rankInfo = this.RANKS[cardData.rank];
        return {
            ...cardData,
            display: `${rankInfo?.name || cardData.rank} ${suitInfo?.name || cardData.suit}`,
            symbol: suitInfo?.symbol || '',
            color: suitInfo?.color || 'black'
        };
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CardRenderer;
}