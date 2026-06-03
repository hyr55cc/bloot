module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'server/**/*.js',
        '!server/server.js'
    ],
    testMatch: [
        '**/tests/**/*.test.js'
    ]
};