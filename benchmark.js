const BalootGame = require('./server/game/BalootGame');

console.log('🃏 Baloot Game Benchmark');
console.log('========================\n');

// Test 1: Game initialization
console.log('Test 1: Game Initialization');
const startInit = Date.now();
const game = new BalootGame('benchmark-room');
const initTime = Date.now() - startInit;
console.log(`✅ Initialized in ${initTime}ms`);
console.log(`   Players: ${game.players.length}`);
console.log(`   Teams: ${game.teams.length}\n`);

// Test 2: Deck shuffling
console.log('Test 2: Deck Shuffling');
const { Deck } = require('./server/game');
const deck = new Deck();
const startShuffle = Date.now();
deck.shuffle();
const shuffleTime = Date.now() - startShuffle;
console.log(`✅ Shuffled in ${shuffleTime}ms`);
console.log(`   Cards: ${deck.cards.length}\n`);

// Test 3: AI Decision Making
console.log('Test 3: AI Decision Making');
const { BotAI } = require('./server/ai');
const bot = new BotAI(1, 0, 'expert');

const sampleHand = [
    { suit: 'hearts', rank: 'A', value: 11 },
    { suit: 'hearts', rank: 'K', value: 4 },
    { suit: 'spades', rank: 'J', value: 2 },
    { suit: 'spades', rank: '9', value: 0 },
    { suit: 'diamonds', rank: '10', value: 10 }
];

const buyerCard = { suit: 'spades', rank: 'A', value: 11 };

const startAI = Date.now();
const decision = bot.biddingStrategy.evaluateHand(sampleHand, buyerCard, 0);
const aiTime = Date.now() - startAI;

console.log(`✅ AI decision in ${aiTime}ms`);
console.log(`   Recommended: ${decision.recommended.type}`);
console.log(`   Sun Score: ${decision.sun}`);
console.log(`   Hukum Score: ${decision.hukum}\n`);

// Test 4: Memory usage
console.log('Test 4: Memory Usage');
const memUsage = process.memoryUsage();
console.log(`   Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
console.log(`   Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
console.log(`   External: ${Math.round(memUsage.external / 1024 / 1024)}MB\n`);

console.log('✅ All benchmarks completed!');