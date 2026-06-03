class ScoringSystem {
    static PROJECTS = {
        sara: { sun: 4, hukum: 2, name: 'سرا' },
        fifty: { sun: 5, hukum: 3, name: 'خمسين' },
        hundred: { sun: 10, hukum: 5, name: 'مية' },
        fourHundred: { sun: 100, hukum: 0, name: 'أربع مية' },
        baloot: { sun: 16, hukum: 8, name: 'بلوت' }
    };

    static CARD_VALUES = {
        'A': 11, '10': 10, 'K': 4, 'Q': 3, 'J': 2, '9': 0, '8': 0, '7': 0
    };

    static HUKUM_VALUES = {
        'J': 16, '9': 15, 'A': 14, '10': 13, 'K': 12, 'Q': 11, '8': 0, '7': 0
    };

    static SUN_ORDER = ['7', '8', '9', 'J', 'Q', 'K', '10', 'A'];
    static HUKUM_ORDER = ['7', '8', 'Q', 'K', '10', 'A', '9', 'J'];

    static calculateCardValue(card, gameType, trumpSuit) {
        if (gameType === 'hukum' && card.suit === trumpSuit) {
            return this.HUKUM_VALUES[card.rank] || 0;
        }
        return this.CARD_VALUES[card.rank] || 0;
    }

    static calculateTrickPoints(trickCards, gameType, trumpSuit) {
        return trickCards.reduce((sum, {card}) => 
            sum + this.calculateCardValue(card, gameType, trumpSuit), 0
        );
    }

    static calculateProjectValue(projectType, gameType) {
        return this.PROJECTS[projectType]?.[gameType] || 0;
    }

    static getProjectName(projectType) {
        return this.PROJECTS[projectType]?.name || projectType;
    }

    static detectProjects(hand, trumpSuit) {
        const projects = [];
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const order = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

        for (const suit of suits) {
            const suitCards = hand
                .filter(c => c.suit === suit)
                .sort((a, b) => order.indexOf(a.rank) - order.indexOf(b.rank));

            if (suitCards.length < 3) continue;

            // Check sequences
            for (let len = 5; len >= 3; len--) {
                for (let i = 0; i <= suitCards.length - len; i++) {
                    const seq = suitCards.slice(i, i + len);
                    const indices = seq.map(c => order.indexOf(c.rank));
                    const isSequence = indices.every((val, idx) => 
                        idx === 0 || val === indices[idx - 1] + 1
                    );

                    if (isSequence) {
                        const type = len === 5 ? 'hundred' : len === 4 ? 'fifty' : 'sara';
                        if (!projects.some(p => p.suit === suit && p.type === type)) {
                            projects.push({ type, suit, cards: seq });
                        }
                    }
                }
            }

            // Baloot (8 cards of same suit)
            if (suitCards.length === 8) {
                projects.push({ type: 'baloot', suit, cards: suitCards });
            }
        }

        return projects;
    }

    static checkHukumViolation(buyerTeamScore) {
        return buyerTeamScore < 81;
    }

    static calculateFinalScores(team0Points, team1Points, buyerTeam, gameType, projects) {
        let scores = [0, 0];

        // Add last trick bonus (10 points)
        // This is handled in the game logic

        if (gameType === 'sun') {
            // In Sun: winner takes all
            if (team0Points > team1Points) {
                scores[0] = team0Points;
            } else {
                scores[1] = team1Points;
            }
        } else {
            // In Hukum: buyer must get 81+
            const buyerScore = buyerTeam === 0 ? team0Points : team1Points;

            if (this.checkHukumViolation(buyerScore)) {
                // Mukhalafa - opposing team gets 16
                scores[buyerTeam === 0 ? 1 : 0] = 16;
            } else {
                scores[0] = team0Points;
                scores[1] = team1Points;
            }
        }

        // Add project points
        for (const proj of projects) {
            const team = proj.team;
            const value = this.calculateProjectValue(proj.type, gameType);
            scores[team] += value;
        }

        return scores;
    }
}

module.exports = ScoringSystem;