class UIManager {
    constructor() {
        this.screens = {
            start: document.getElementById('start-screen'),
            game: document.getElementById('game-screen'),
            end: document.getElementById('end-screen')
        };

        this.currentScreen = 'start';
        this.chatHistory = [];
        this.maxChatHistory = 50;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Quick chat buttons
        document.querySelectorAll('.chat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const emoji = btn.dataset.emoji;
                const message = btn.dataset.message;

                if (emoji) {
                    this.onEmojiClick?.(emoji);
                } else if (message) {
                    this.onChatMessage?.(message);
                }
            });
        });

        // Score board click for details
        document.getElementById('score-board')?.addEventListener('click', () => {
            this.onScoreBoardClick?.();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
    }

    handleKeyboard(e) {
        // ESC to close modals
        if (e.key === 'Escape') {
            this.closeAllModals();
        }

        // Number keys for bidding
        if (this.currentScreen === 'game') {
            switch(e.key) {
                case '1':
                    this.onBidClick?.('sun');
                    break;
                case '2':
                    this.onBidClick?.('hukum');
                    break;
                case '3':
                    this.onBidClick?.('first');
                    break;
                case 'p':
                case 'P':
                    this.onPassClick?.();
                    break;
            }
        }
    }

    // ===== Screen Navigation =====
    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });

        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
            this.currentScreen = screenName;
        }
    }

    showStartScreen() {
        this.showScreen('start');
    }

    showGameScreen() {
        this.showScreen('game');
    }

    showEndScreen() {
        this.showScreen('end');
    }

    // ===== Modal Management =====
    closeAllModals() {
        document.querySelectorAll('.modal, .score-details').forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    // ===== Loading States =====
    showLoading(message = 'جاري التحميل...') {
        const loader = document.createElement('div');
        loader.id = 'loading-overlay';
        loader.className = 'loading-overlay';
        loader.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
        `;
        document.body.appendChild(loader);
    }

    hideLoading() {
        const loader = document.getElementById('loading-overlay');
        if (loader) loader.remove();
    }

    // ===== Connection Status =====
    showConnectionStatus(status, message) {
        let statusEl = document.getElementById('connection-status');

        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'connection-status';
            statusEl.className = 'connection-status';
            document.body.appendChild(statusEl);
        }

        statusEl.className = `connection-status ${status}`;
        statusEl.textContent = message;

        if (status === 'connected') {
            setTimeout(() => {
                statusEl.classList.add('hidden');
            }, 3000);
        } else {
            statusEl.classList.remove('hidden');
        }
    }

    // ===== Chat System =====
    addChatMessage(playerId, playerName, message, type = 'text') {
        const chatEntry = {
            playerId,
            playerName,
            message,
            type,
            timestamp: Date.now()
        };

        this.chatHistory.push(chatEntry);

        if (this.chatHistory.length > this.maxChatHistory) {
            this.chatHistory.shift();
        }

        this.renderChatMessage(chatEntry);
    }

    renderChatMessage(entry) {
        const notifications = document.getElementById('notifications');

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';

        if (entry.type === 'emoji') {
            bubble.innerHTML = `
                <span class="chat-emoji">${entry.message}</span>
                <span class="chat-player-name">${entry.playerName}</span>
            `;
        } else {
            bubble.innerHTML = `
                <span class="chat-player-name">${entry.playerName}:</span>
                <span class="chat-text">${entry.message}</span>
            `;
        }

        notifications.appendChild(bubble);

        // Auto remove
        setTimeout(() => {
            bubble.style.animation = 'fadeOut 0.5s forwards';
            setTimeout(() => bubble.remove(), 500);
        }, 4000);
    }

    // ===== Game Settings =====
    showSettings() {
        // Create settings modal
        const modal = document.createElement('div');
        modal.className = 'modal settings-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>⚙️ الإعدادات</h3>
                <div class="setting-item">
                    <label>سرعة الأنيميشن</label>
                    <input type="range" id="anim-speed" min="0" max="100" value="50">
                </div>
                <div class="setting-item">
                    <label>صوت التأثيرات</label>
                    <input type="checkbox" id="sound-effects" checked>
                </div>
                <div class="setting-item">
                    <label>الموسيقى</label>
                    <input type="checkbox" id="music" checked>
                </div>
                <button class="btn btn-close" onclick="this.closest('.modal').remove()">إغلاق</button>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // ===== Player List =====
    updatePlayerList(players) {
        players.forEach(player => {
            const nameEl = document.getElementById(`player${player.id}-name`);
            const countEl = document.getElementById(`player${player.id}-count`);

            if (nameEl) nameEl.textContent = player.name;
            if (countEl) countEl.textContent = player.handSize || 8;
        });
    }

    // ===== Timer =====
    startTurnTimer(seconds, onTimeout) {
        this.stopTurnTimer();

        const timerEl = document.createElement('div');
        timerEl.id = 'turn-timer';
        timerEl.className = 'turn-timer';
        document.body.appendChild(timerEl);

        let remaining = seconds;

        this.timerInterval = setInterval(() => {
            remaining--;
            timerEl.textContent = remaining;

            if (remaining <= 5) {
                timerEl.classList.add('urgent');
            }

            if (remaining <= 0) {
                this.stopTurnTimer();
                onTimeout?.();
            }
        }, 1000);
    }

    stopTurnTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        const timerEl = document.getElementById('turn-timer');
        if (timerEl) timerEl.remove();
    }

    // ===== Tooltip/Help =====
    showTooltip(element, message) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = message;

        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.bottom + 5}px`;

        document.body.appendChild(tooltip);

        return tooltip;
    }

    hideTooltip(tooltip) {
        if (tooltip) tooltip.remove();
    }

    // ===== Error Handling =====
    showError(message, duration = 5000) {
        const error = document.createElement('div');
        error.className = 'notification error';
        error.textContent = message;

        document.getElementById('notifications').appendChild(error);

        setTimeout(() => {
            error.remove();
        }, duration);
    }

    // ===== Responsive =====
    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Adjust card sizes for mobile
        if (width < 768) {
            document.documentElement.style.setProperty('--card-width', '60px');
            document.documentElement.style.setProperty('--card-height', '90px');
        } else {
            document.documentElement.style.setProperty('--card-width', '80px');
            document.documentElement.style.setProperty('--card-height', '120px');
        }
    }

    // ===== Cleanup =====
    destroy() {
        this.stopTurnTimer();
        this.closeAllModals();

        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyboard);
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}