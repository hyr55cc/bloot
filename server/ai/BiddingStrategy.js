class BiddingStrategy {
    constructor() {
        this.thresholds = {
            sun: { minPoints: 65, minAces: 2, minTrumpCards: 3 },
            hukum: { minPoints: 45, minAces: 1, minTrumpCards: 4 }
        };
    }

    evaluateHand(hand, buyerCard, gameScore = 0) {
        const analysis = this.analyzeHand(hand);
        const buyerSuit = buyerCard.suit;

        const sunScore = this.evaluateForSun(analysis, buyerSuit);
        const hukumScore = this.evaluateForHukum(analysis, buyerSuit);
        const projects = this.detectPotentialProjects(hand, buyerSuit);

        return {
            sun: sunScore,
            hukum: hukumScore,
            projects: projects,
            recommended: this.decideBidType(sunScore, hukumScore, projects, gameScore)
        };
    }

    analyzeHand(hand) {
        const suits = { hearts: [], diamonds: [], clubs: [], spades: [] };
        let totalPoints = 0;
        let aces = 0;
        let highCards = 0;

        for (const card of hand) {
            suits[card.suit].push(card);
            totalPoints += card.value;
            if (card.rank === 'A') aces++;
            if (['A', '10', 'K'].includes(card.rank)) highCards++;
        }

        const suitCounts = Object.values(suits).map(s => s.length);
        const maxSuit = Math.max(...suitCounts);
        const minSuit = Math.min(...suitCounts);

        return { 
            suits, 
            totalPoints, 
            aces, 
            highCards,
            cardCount: hand.length,
            maxSuit,
            minSuit,
            suitCounts
        };
    }

    evaluateForSun(analysis, buyerSuit) {
        let score = analysis.totalPoints;

        score += analysis.aces * 15;
        score += analysis.highCards * 5;

        // Reward balanced distribution
        if (analysis.maxSuit <= 3) score += 10;
        if (analysis.minSuit >= 1) score += 5;

        // Potential projects
        for (const suit in analysis.suits) {
            const count = analysis.suits[suit].length;
            if (count >= 5) score += 20;
            if (count >= 4) score += 10;
        }

        // Having cards in buyer suit is good for first round
        const buyerSuitCards = analysis.suits[buyerSuit].length;
        score += buyerSuitCards * 3;

        return score;
    }

    evaluateForHukum(analysis, buyerSuit) {
        let score = 0;
        const trumpCards = analysis.suits[buyerSuit];

        // Trump power
        const trumpPower = trumpCards.reduce((sum, c) => sum + c.getHukumValue(), 0);
        score += trumpPower * 2;

        // J and 9 in trump
        const hasJack = trumpCards.some(c => c.rank === 'J');
        const hasNine = trumpCards.some(c => c.rank === '9');
        const hasAce = trumpCards.some(c => c.rank === 'A');
        const hasTen = trumpCards.some(c => c.rank === '10');

        if (hasJack) score += 30;
        if (hasNine) score += 25;
        if (hasAce) score += 15;
        if (hasTen) score += 12;

        // Number of trump cards
        score += trumpCards.length * 10;

        // Aces in other suits for cutting
        score += analysis.aces * 12;

        // Support cards in trump
        const highTrump = trumpCards.filter(c => ['J', '9', 'A', '10'].includes(c.rank)).length;
        score += highTrump * 8;

        return score;
    }

    detectPotentialProjects(hand, trumpSuit) {
        const projects = [];
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const order = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

        for (const suit of suits) {
            const suitCards = hand
                .filter(c => c.suit === suit)
                .sort((a, b) => order.indexOf(a.rank) - order.indexOf(b.rank));

            if (suitCards.length < 3) continue;

            // Check for sequences
            for (let i = 0; i <= suitCards.length - 3; i++) {
                const seq3 = suitCards.slice(i, i + 3);
                const idx3 = seq3.map(c => order.indexOf(c.rank));
                if (idx3.every((val, idx) => idx === 0 || val === idx3[idx - 1] + 1)) {
                    projects.push({ type: 'sara', suit, confidence: 0.8 });
                }

                if (i <= suitCards.length - 4) {
                    const seq4 = suitCards.slice(i, i + 4);
                    const idx4 = seq4.map(c => order.indexOf(c.rank));
                    if (idx4.every((val, idx) => idx === 0 || val === idx4[idx - 1] + 1)) {
                        projects.push({ type: 'fifty', suit, confidence: 0.7 });
                    }
                }

                if (i <= suitCards.length - 5) {
                    const seq5 = suitCards.slice(i, i + 5);
                    const idx5 = seq5.map(c => order.indexOf(c.rank));
                    if (idx5.every((val, idx) => idx === 0 || val === idx5[idx - 1] + 1)) {
                        projects.push({ type: 'hundred', suit, confidence: 0.6 });
                    }
                }
            }
        }

        return projects;
    }

    decideBidType(sunScore, hukumScore, projects, gameScore) {
        const isDesperate = gameScore > 120;
        const sunThreshold = isDesperate ? 55 : 70;
        const hukumThreshold = isDesperate ? 40 : 55;
        const firstThreshold = isDesperate ? 35 : 45;

        // If we have strong projects, be more aggressive
        const projectBonus = projects.length * 10;
        sunScore += projectBonus;
        hukumScore += projectBonus;

        if (sunScore >= sunThreshold && sunScore > hukumScore + 15) {
            return { 
                type: 'sun', 
                confidence: Math.min(sunScore / 100, 0.95),
                reason: 'Strong balanced hand with aces'
            };
        }

        if (hukumScore >= hukumThreshold) {
            return { 
                type: 'hukum', 
                confidence: Math.min(hukumScore / 100, 0.95),
                reason: 'Strong trump cards'
            };
        }

        if (sunScore >= firstThreshold || hukumScore >= firstThreshold - 10) {
            return { 
                type: 'first', 
                confidence: 0.5,
                reason: 'Decent hand, see buyer card'
            };
        }

        return { 
            type: 'pass', 
            confidence: 0,
            reason: 'Weak hand'
        };
    }

    shouldBid(hand, buyerCard, currentBid, gameScore) {
        const evaluation = this.evaluateHand(hand, buyerCard, gameScore);

        if (!currentBid) {
            return evaluation.recommended.type !== 'pass';
        }

        // Overbidding logic
        if (evaluation.recommended.type === 'pass') return false;

        if (currentBid.type === 'first') {
            return ['sun', 'hukum'].includes(evaluation.recommended.type);
        }

        if (currentBid.type === 'hukum' && evaluation.recommended.type === 'sun') {
            return evaluation.sun > 85;
        }

        return false;
    }

    getBidSuit(bidType, buyerCard, hand) {
        if (bidType === 'sun') return null;
        if (bidType === 'hukum') return buyerCard.suit;
        return null;
    }
}

module.exports = BiddingStrategy;