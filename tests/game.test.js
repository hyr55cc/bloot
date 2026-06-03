const BalootGame = require('../server/game/BalootGame');
const Card = require('../server/game/Card');
const Deck = require('../server/game/Deck');
const ScoringSystem = require('../server/game/ScoringSystem');

describe('Baloot Game Tests', () => {
    let game;

    beforeEach(() => {
        game = new BalootGame('test-room');
    });

    test('Game initializes correctly', () => {
        expect(game.roomId).toBe('test-room');
        expect(game.players).toHaveLength(4);
        expect(game.teams).toHaveLength(2);
    });

    test('Deck has 32 cards', () => {
        const deck = new Deck();
        expect(deck.cards).toHaveLength(32);
    });

    test('Card values are correct', () => {
        const ace = new Card('hearts', 'A');
        expect(ace.value).toBe(11);

        const ten = new Card('spades', '10');
        expect(ten.value).toBe(10);

        const seven = new Card('clubs', '7');
        expect(seven.value).toBe(0);
    });

    test('Hukum values are different', () => {
        const jack = new Card('spades', 'J');
        expect(jack.getHukumValue()).toBe(16);

        const nine = new Card('spades', '9');
        expect(nine.getHukumValue()).toBe(15);
    });

    test('Dealing gives 5 cards first round', () => {
        const deck = new Deck();
        deck.shuffle();
        const dealt = deck.dealBalootRound();

        expect(dealt.firstRound).toHaveLength(5);
        expect(dealt.buyerCard).toBeDefined();
    });

    test('Project detection works', () => {
        const hand = [
            new Card('hearts', '7'),
            new Card('hearts', '8'),
            new Card('hearts', '9'),
            new Card('hearts', '10'),
            new Card('hearts', 'J')
        ];

        const projects = ScoringSystem.detectProjects(hand, 'spades');
        expect(projects.length).toBeGreaterThan(0);
    });

    test('Sun scoring - winner takes all', () => {
        const scores = ScoringSystem.calculateFinalScores(100, 50, 0, 'sun', []);
        expect(scores[0]).toBe(100);
        expect(scores[1]).toBe(0);
    });

    test('Hukum violation check', () => {
        expect(ScoringSystem.checkHukumViolation(80)).toBe(true);
        expect(ScoringSystem.checkHukumViolation(81)).toBe(false);
        expect(ScoringSystem.checkHukumViolation(100)).toBe(false);
    });
});