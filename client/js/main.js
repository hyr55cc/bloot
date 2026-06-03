// ===== Main Game Controller =====
class BalootGameApp {
    constructor() {
        this.client = null;
        this.gameMode = null; // 'solo', 'multiplayer', 'vip'
        this.isGameRunning = false;

        this.init();
    }

    init() {
        // Setup global game instance
        window.game = this;

        // Setup UI event listeners
        this.setupEventListeners();

        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.client?.ui) {
                this.client.ui.handleResize();
            }
        });

        console.log('Baloot Game initialized');
    }

    setupEventListeners() {
        // Menu buttons are handled via onclick in HTML

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.showPauseMenu();
            }
        });
    }

    // ===== Game Modes =====
    async startSolo() {
        this.gameMode = 'solo';
        this.ui = new UIManager();
        this.renderer = new GameRenderer();

        try {
            // For solo mode, we can run the game logic locally
            // or connect to local server
            this.client = new GameClient();

            // Try to connect to server
            try {
                await this.client.connect();
                this.client.createRoom({ mode: 'solo' });
            } catch (error) {
                console.log('Server not available, running in demo mode');
                this.runDemoMode();
                return;
            }

            this.isGameRunning = true;

        } catch (error) {
            console.error('Failed to start solo game:', error);
            this.showError('فشل بدء اللعبة. يرجى المحاولة مرة أخرى.');
        }
    }

    async showMultiplayerMenu() {
        this.gameMode = 'multiplayer';

        // Show room selection UI
        const roomId = prompt('أدخل رمز الغرفة (أو اتركه فارغاً لإنشاء غرفة جديدة):');

        if (roomId === null) return; // Cancelled

        try {
            this.client = new GameClient();
            await this.client.connect();

            if (roomId.trim() === '') {
                // Create new room
                this.client.createRoom({ mode: 'multiplayer' });
            } else {
                // Join existing room
                this.client.joinRoom(roomId.trim().toUpperCase());
            }

            this.isGameRunning = true;

        } catch (error) {
            console.error('Failed to connect:', error);
            this.showError('فشل الاتصال بالخادم. يرجى التحقق من الاتصال.');
        }
    }

    async showVIPMenu() {
        this.gameMode = 'vip';
        this.showError('جلسات VIP قريباً! 👑');
    }

    // ===== Demo Mode (Offline) =====
    runDemoMode() {
        // Create a simple demo that shows the UI without server
        this.renderer = new GameRenderer();
        this.ui.showGameScreen();

        // Show demo cards
        const demoCards = [
            { suit: 'hearts', rank: 'A', value: 11, string: 'A♥' },
            { suit: 'spades', rank: 'K', value: 4, string: 'K♠' },
            { suit: 'diamonds', rank: '10', value: 10, string: '10♦' },
            { suit: 'clubs', rank: 'J', value: 2, string: 'J♣' },
            { suit: 'hearts', rank: '9', value: 0, string: '9♥' },
            { suit: 'spades', rank: 'Q', value: 3, string: 'Q♠' },
            { suit: 'diamonds', rank: '7', value: 0, string: '7♦' },
            { suit: 'clubs', rank: '8', value: 0, string: '8♣' }
        ];

        this.renderer.renderPlayerHand(demoCards, (card, index) => {
            console.log('Card clicked:', card);
            this.renderer.showNotification(`اخترت: ${CardRenderer.getCardString(card)}`, 'info');
        });

        // Show demo notifications
        setTimeout(() => {
            this.renderer.showNotification('مرحباً بك في بلوت! 🃏', 'success');
        }, 1000);

        setTimeout(() => {
            this.renderer.showBidOptions(
                (bid) => this.renderer.showNotification(`اخترت: ${bid}`, 'warning'),
                () => this.renderer.showNotification('مررت 🚫', 'info')
            );
        }, 2000);

        // Update score board
        this.renderer.updateScoreBoard(0, 0, 0, 0, 1, null, null);

        // Show demo buyer card
        setTimeout(() => {
            this.renderer.showBuyerCard({ suit: 'spades', rank: 'A', string: 'A♠' });
        }, 1500);
    }

    // ===== Game Actions =====
    restart() {
        if (this.client) {
            this.client.destroy();
        }

        this.isGameRunning = false;
        this.showStartScreen();
    }

    backToMenu() {
        this.restart();
    }

    showStartScreen() {
        this.ui?.showStartScreen();
        document.getElementById('start-screen').classList.add('active');
        document.getElementById('game-screen').classList.remove('active');
        document.getElementById('end-screen').classList.remove('active');
    }

    showPauseMenu() {
        if (!this.isGameRunning) return;

        const pauseMenu = document.createElement('div');
        pauseMenu.className = 'modal pause-menu';
        pauseMenu.innerHTML = `
            <div class="modal-content">
                <h3>⏸️ إيقاف مؤقت</h3>
                <button class="btn btn-primary" onclick="game.resume()">متابعة</button>
                <button class="btn btn-secondary" onclick="game.restart()">لعبة جديدة</button>
                <button class="btn btn-secondary" onclick="game.showSettings()">الإعدادات</button>
                <button class="btn btn-danger" onclick="game.backToMenu()">خروج</button>
            </div>
        `;

        document.body.appendChild(pauseMenu);
    }

    resume() {
        document.querySelector('.pause-menu')?.remove();
    }

    showSettings() {
        this.ui?.showSettings();
    }

    closeScoreDetails() {
        this.renderer?.hideScoreDetails();
    }

    // ===== Utility =====
    showError(message) {
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.textContent = message;

        const container = document.getElementById('notifications') || document.body;
        container.appendChild(notification);

        setTimeout(() => notification.remove(), 5000);
    }

    showSuccess(message) {
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.textContent = message;

        const container = document.getElementById('notifications') || document.body;
        container.appendChild(notification);

        setTimeout(() => notification.remove(), 3000);
    }

    // ===== Cleanup =====
    destroy() {
        if (this.client) {
            this.client.destroy();
        }

        window.removeEventListener('resize', this.handleResize);
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.game = new BalootGameApp();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.game?.client) {
        window.game.client.destroy();
    }
});