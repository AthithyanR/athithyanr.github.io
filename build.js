const { main: generateTravel } = require('./scripts/generate-travel');

if (require.main === module) {
    generateTravel();
}
