module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/e2e/'],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
};
