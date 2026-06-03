class AntiCheat {
    constructor() {
        this.violations = [];
        this.playerHistory = new Map();
        this.suspiciousPatterns = [];
    }

    validatePlay(player, card, gameState) {
        const errors = [];
        const warnings = [];

        // 1. Card ownership check
        if (!player.hasCard(card)) {
            errors.push({
                type: 'INVALID_CARD',
                message: 'الورقة ليست في يد اللاعب',
                severity: 'CRITICAL'
            });
            return { valid: false, errors, warnings };
        }

        // 2. Turn order check
        if (gameState.currentPlayer !== player.id) {
            errors.push({
                type: 'WRONG_TURN',
                message: 'ليس دور هذا اللاعب',
                severity: 'CRITICAL'
            });
        }

        // 3. Follow suit validation (الحكم)
        if (gameState.tableCards.length > 0) {
            const leadSuit = gameState.tableCards[0].card.suit;

            if (card.suit !== leadSuit) {
                const hasLeadSuit = player.hasSuit(leadSuit);

                if (hasLeadSuit) {
                    errors.push({
                        type: 'RENEGE',
                        message: `يجب اتباع الرمز: ${leadSuit}`,
                        severity: 'CRITICAL',
                        details: { expectedSuit: leadSuit, playedSuit: card.suit }
                    });
                }
            }
        }

        // 4. Hukum-specific rules
        if (gameState.buyerType === 'hukum' && gameState.tableCards.length > 0) {
            const leadSuit = gameState.tableCards[0].card.suit;
            const hasLeadSuit = player.hasSuit(leadSuit);

            if (!hasLeadSuit) {
                // Player is empty of lead suit
                const trumpSuit = gameState.trumpSuit;
                const hasTrump = player.hasSuit(trumpSuit);
                const trumpPlayed = gameState.tableCards.some(c => c.card.suit === trumpSuit);

                // Complex Hukum rules here
                // If trump is played and player has trump, must play trump
                if (trumpPlayed && hasTrump && card.suit !== trumpSuit) {
                    errors.push({
                        type: 'HUKUM_VIOLATION',
                        message: 'يجب لعب الحكم عند التنقيع',
                        severity: 'CRITICAL'
                    });
                }
            }
        }

        // 5. Timing check (anti-botting)
        const now = Date.now();
        const lastAction = this.playerHistory.get(player.id);
        if (lastAction && (now - lastAction.time) < 500) {
            warnings.push({
                type: 'SUSPICIOUS_TIMING',
                message: 'سرعة استجابة مشبوهة',
                severity: 'WARNING'
            });
        }

        this.playerHistory.set(player.id, { time: now, action: 'PLAY' });

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    detectCollusion(actions) {
        // Analyze patterns between players
        const patterns = {
            suspicious: false,
            confidence: 0,
            details: []
        };

        // Check for impossible coordination
        const teamPlays = this.analyzeTeamPlays(actions);

        if (teamPlays.unusualSupport > 5) {
            patterns.suspicious = true;
            patterns.confidence += 0.2;
            patterns.details.push('دعم غير طبيعي بين الفريق');
        }

        // Check bidding patterns
        const biddingPatterns = this.analyzeBiddingPatterns(actions);
        if (biddingPatterns.artificialPasses > 3) {
            patterns.suspicious = true;
            patterns.confidence += 0.3;
            patterns.details.push('تمريرات اصطناعية في المزاد');
        }

        return patterns;
    }

    analyzeTeamPlays(actions) {
        let unusualSupport = 0;

        for (let i = 0; i < actions.length - 1; i++) {
            const current = actions[i];
            const next = actions[i + 1];

            if (current.team === next.team && current.type === 'SUPPORT') {
                // Check if support was mathematically optimal
                // This is a simplified check
                unusualSupport++;
            }
        }

        return { unusualSupport };
    }

    analyzeBiddingPatterns(actions) {
        let artificialPasses = 0;

        const bidActions = actions.filter(a => a.type === 'BID');
        for (let i = 0; i < bidActions.length - 1; i++) {
            const current = bidActions[i];
            const next = bidActions[i + 1];

            // Check if pass was suspicious (had good hand but passed)
            if (next.action === 'PASS' && next.handStrength > 60) {
                artificialPasses++;
            }
        }

        return { artificialPasses };
    }

    recordViolation(playerId, violation) {
        this.violations.push({
            playerId,
            ...violation,
            timestamp: Date.now()
        });
    }

    getViolations(playerId = null) {
        if (playerId) {
            return this.violations.filter(v => v.playerId === playerId);
        }
        return this.violations;
    }

    reset() {
        this.violations = [];
        this.playerHistory.clear();
        this.suspiciousPatterns = [];
    }
}

module.exports = AntiCheat;