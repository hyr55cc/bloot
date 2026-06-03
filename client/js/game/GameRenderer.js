class GameRenderer {
    constructor() {
        this.table = document.getElementById('table');
        this.playArea = document.getElementById('play-area');
        this.playerHand = document.getElementById('player-hand');
        this.notifications = document.getElementById('notifications');
        this.scoreBoard = document.getElementById('score-board');
        this.buyerCardDisplay = document.getElementById('buyer-card-display');
        this.buyerCardVisual = document.getElementById('buyer-card-visual');

        this.cardSlots = {
            0: document.getElementById('slot-0'),
            1: document.getElementById('slot-1'),
            2: document.getElementById('slot-2'),
            3: document.getElementById('slot-3')
        };

        this.playerSeats = {
            0: document.getElementById('seat-0') || null,
            1: document.getElementById('seat-1'),
            2: document.getElementById('seat-2'),
            3: document.getElementById('seat-3')
        };

        this.animationsEnabled = true;
        this.animationSpeed = 300; // ms
    }

    // ===== Screen Management =====
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    // ===== Score Board Updates =====
    updateScoreBoard(team0Score, team1Score, team0Round, team1Round, round, buyerType, trumpSuit) {
        document.getElementById('team0-score').textContent = team0Score;
        document.getElementById('team1-score').textContent = team1Score;
        document.getElementById('team0-round').textContent = `+${team0Round}`;
        document.getElementById('team1-round').textContent = `+${team1Round}`;
        document.getElementById('round-number').textContent = round;

        const buyerTypeEl = document.getElementById('buyer-type');
        const trumpSuitEl = document.getElementById('trump-suit');

        if (buyerType) {
            const buyerNames = { sun: '☀️ صن', hukum: '⚫ حكم', first: '1️⃣ أول' };
            buyerTypeEl.textContent = buyerNames[buyerType] || buyerType;
        } else {
            buyerTypeEl.textContent = '-';
        }

        if (trumpSuit) {
            const suitSymbols = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
            trumpSuitEl.textContent = suitSymbols[trumpSuit] || trumpSuit;
        } else {
            trumpSuitEl.textContent = '-';
        }
    }

    // ===== Player Hand Rendering =====
    renderPlayerHand(cards, onCardClick) {
        this.playerHand.innerHTML = '';

        cards.forEach((cardData, index) => {
            const card = CardRenderer.createCardElement(cardData, {
                clickable: true,
                onClick: () => onCardClick(cardData, index)
            });

            // Add staggered animation
            card.style.animationDelay = `${index * 0.05}s`;
            card.classList.add('deal-animation');

            this.playerHand.appendChild(card);
        });
    }

    updatePlayerHand(cards) {
        // Update without full re-render (preserve selections)
        const existingCards = this.playerHand.querySelectorAll('.card');

        cards.forEach((cardData, index) => {
            if (existingCards[index]) {
                // Update existing card
                existingCards[index].dataset.suit = cardData.suit;
                existingCards[index].dataset.rank = cardData.rank;
            }
        });
    }

    removeCardFromHand(cardData) {
        const cards = this.playerHand.querySelectorAll('.card');
        cards.forEach(card => {
            if (card.dataset.suit === cardData.suit && card.dataset.rank === cardData.rank) {
                card.style.animation = 'cardThrow 0.3s reverse forwards';
                setTimeout(() => card.remove(), 300);
            }
        });
    }

    // ===== Table/Play Area Rendering =====
    playCardOnTable(playerId, cardData) {
        const slot = this.cardSlots[playerId];
        if (!slot) return;

        slot.innerHTML = '';
        const card = CardRenderer.createCardElement(cardData);

        // Animate card throw
        if (this.animationsEnabled) {
            card.style.animation = `cardThrow ${this.animationSpeed}ms ease-out`;
        }

        slot.appendChild(card);

        // Highlight current player
        this.highlightCurrentPlayer(playerId);
    }

    clearTable() {
        Object.values(this.cardSlots).forEach(slot => {
            const card = slot.querySelector('.card');
            if (card && this.animationsEnabled) {
                card.style.animation = 'fadeOut 0.3s forwards';
                setTimeout(() => slot.innerHTML = '', 300);
            } else {
                slot.innerHTML = '';
            }
        });
    }

    animateTrickWin(winnerId, cards) {
        return new Promise(resolve => {
            const winnerSlot = this.cardSlots[winnerId];
            const winnerRect = winnerSlot.getBoundingClientRect();

            // Animate all cards to winner
            Object.values(this.cardSlots).forEach((slot, index) => {
                const card = slot.querySelector('.card');
                if (card) {
                    card.style.transition = `all ${this.animationSpeed}ms ease`;
                    card.style.transform = `translate(${winnerRect.left - slot.getBoundingClientRect().left}px, ${winnerRect.top - slot.getBoundingClientRect().top}px) scale(0.5)`;
                    card.style.opacity = '0';
                }
            });

            setTimeout(() => {
                this.clearTable();
                resolve();
            }, this.animationSpeed + 100);
        });
    }

    // ===== Buyer Card =====
    showBuyerCard(cardData) {
        this.buyerCardDisplay.classList.remove('hidden');
        this.buyerCardVisual.innerHTML = '';
        const card = CardRenderer.createCardElement(cardData);
        this.buyerCardVisual.appendChild(card);
    }

    hideBuyerCard() {
        this.buyerCardDisplay.classList.add('hidden');
    }

    // ===== Player Seats =====
    updatePlayerInfo(playerId, name, cardCount, isBot) {
        const nameEl = document.getElementById(`player${playerId}-name`);
        const countEl = document.getElementById(`player${playerId}-count`);
        const avatarEl = this.playerSeats[playerId]?.querySelector('.player-avatar');

        if (nameEl) nameEl.textContent = name;
        if (countEl) countEl.textContent = cardCount;
        if (avatarEl) avatarEl.textContent = isBot ? '🤖' : '👤';
    }

    highlightCurrentPlayer(playerId) {
        // Remove highlight from all
        document.querySelectorAll('.player-avatar').forEach(avatar => {
            avatar.style.borderColor = 'var(--accent-color)';
            avatar.style.transform = 'scale(1)';
        });

        // Highlight current
        const currentAvatar = this.playerSeats[playerId]?.querySelector('.player-avatar');
        if (currentAvatar) {
            currentAvatar.style.borderColor = '#fff';
            currentAvatar.style.transform = 'scale(1.2)';
            currentAvatar.style.transition = 'all 0.3s ease';
        }
    }

    // ===== Action Panel =====
    showBidOptions(onBid, onPass) {
        const panel = document.getElementById('action-panel');
        const options = document.getElementById('bid-options');
        panel.classList.remove('hidden');

        // Clear previous listeners
        const buttons = options.querySelectorAll('button');
        buttons.forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
        });

        // Add new listeners
        options.querySelectorAll('.btn-bid').forEach(btn => {
            btn.addEventListener('click', () => {
                onBid(btn.dataset.bid);
                panel.classList.add('hidden');
            });
        });

        options.querySelector('.btn-pass').addEventListener('click', () => {
            onPass();
            panel.classList.add('hidden');
        });
    }

    hideActionPanel() {
        document.getElementById('action-panel').classList.add('hidden');
    }

    // ===== Notifications =====
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        this.notifications.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, duration + 500);
    }

    showBidNotification(playerName, bidType) {
        const bidNames = { sun: 'صن ☀️', hukum: 'حكم ⚫', first: 'أول 1️⃣' };
        const message = `${playerName} يشتري ${bidNames[bidType] || bidType}!`;
        this.showNotification(message, 'warning');
    }

    showPassNotification(playerName) {
        this.showNotification(`${playerName} يمرّر 🚫`, 'info', 2000);
    }

    showTrickWinner(playerName, points) {
        this.showNotification(`${playerName} يفوز بالصكة! (+${points} نقطة)`, 'success');
    }

    showProjectNotification(playerName, projects) {
        const projectNames = projects.map(p => p.name).join('، ');
        this.showNotification(`🎉 ${playerName} يعلن: ${projectNames}!`, 'warning', 4000);
    }

    // ===== Score Details =====
    showScoreDetails(scoreData) {
        const modal = document.getElementById('score-details');
        const breakdown = document.getElementById('score-breakdown');

        breakdown.innerHTML = '';

        // Team 0 details
        const team0Div = document.createElement('div');
        team0Div.innerHTML = `
            <h4 style="color: var(--accent-color); margin: 1rem 0 0.5rem;">فريقك</h4>
            <div class="score-row">
                <span>نقاط الأوراق</span>
                <span>${scoreData.team0.points}</span>
            </div>
            <div class="score-row">
                <span>آخر صكة</span>
                <span>+10</span>
            </div>
        `;
        breakdown.appendChild(team0Div);

        // Team 1 details
        const team1Div = document.createElement('div');
        team1Div.innerHTML = `
            <h4 style="color: var(--danger); margin: 1rem 0 0.5rem;">الخصم</h4>
            <div class="score-row">
                <span>نقاط الأوراق</span>
                <span>${scoreData.team1.points}</span>
            </div>
            <div class="score-row">
                <span>آخر صكة</span>
                <span>+10</span>
            </div>
        `;
        breakdown.appendChild(team1Div);

        // Projects
        if (scoreData.projects && scoreData.projects.length > 0) {
            const projectsDiv = document.createElement('div');
            projectsDiv.innerHTML = `<h4 style="color: var(--warning); margin: 1rem 0 0.5rem;">المشاريع</h4>`;
            scoreData.projects.forEach(proj => {
                projectsDiv.innerHTML += `
                    <div class="score-row">
                        <span>${proj.playerName}: ${proj.name}</span>
                        <span>+${proj.value}</span>
                    </div>
                `;
            });
            breakdown.appendChild(projectsDiv);
        }

        // Totals
        const totalDiv = document.createElement('div');
        totalDiv.innerHTML = `
            <div class="score-row total">
                <span>المجموع - فريقك</span>
                <span>${scoreData.team0.final}</span>
            </div>
            <div class="score-row total">
                <span>المجموع - الخصم</span>
                <span>${scoreData.team1.final}</span>
            </div>
        `;
        breakdown.appendChild(totalDiv);

        modal.classList.remove('hidden');
    }

    hideScoreDetails() {
        document.getElementById('score-details').classList.add('hidden');
    }

    // ===== End Game =====
    showEndGame(winnerTeam, team0Score, team1Score) {
        this.showScreen('end-screen');

        const winnerEl = document.getElementById('winner-announcement');
        const scoresEl = document.getElementById('final-scores');

        if (winnerTeam === 0) {
            winnerEl.innerHTML = '🎉 فوز فريقك! 🎉';
        } else {
            winnerEl.innerHTML = '😔 فوز الخصم 😔';
        }

        scoresEl.innerHTML = `
            <div class="final-score-team ${winnerTeam === 0 ? 'winner' : ''}">
                <div class="team-name">فريقك</div>
                <div class="score">${team0Score}</div>
            </div>
            <div class="final-score-team ${winnerTeam === 1 ? 'winner' : ''}">
                <div class="team-name">الخصم</div>
                <div class="score">${team1Score}</div>
            </div>
        `;
    }

    // ===== Chat =====
    showChatMessage(playerName, message, isEmoji = false) {
        const chatContainer = document.getElementById('quick-chat');
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.innerHTML = `
            <span class="chat-player">${playerName}:</span>
            <span class="chat-message">${message}</span>
        `;

        // Insert at beginning
        chatContainer.insertBefore(bubble, chatContainer.firstChild);

        // Remove after delay
        setTimeout(() => {
            bubble.remove();
        }, 5000);
    }

    showEmoji(playerName, emoji) {
        this.showChatMessage(playerName, emoji, true);
    }

    // ===== Utility =====
    setAnimationEnabled(enabled) {
        this.animationsEnabled = enabled;
    }

    setAnimationSpeed(speed) {
        this.animationSpeed = speed;
    }

    // Reset game state
    reset() {
        this.clearTable();
        this.playerHand.innerHTML = '';
        this.hideBuyerCard();
        this.hideActionPanel();
        this.hideScoreDetails();

        // Reset player highlights
        document.querySelectorAll('.player-avatar').forEach(avatar => {
            avatar.style.borderColor = 'var(--accent-color)';
            avatar.style.transform = 'scale(1)';
        });
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameRenderer;
}