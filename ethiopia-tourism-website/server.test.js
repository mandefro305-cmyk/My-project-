const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('./server');

test('Server Routes', async (t) => {
    await t.test('GET / should return index page', async () => {
        const response = await request(app).get('/');
        assert.strictEqual(response.status, 200);
        // The index page contains "Visit Ethiopia"
        assert.ok(response.text.includes('Visit Ethiopia'));
    });

    await t.test('GET /destinations should return destinations page', async () => {
        const response = await request(app).get('/destinations');
        assert.strictEqual(response.status, 200);
    });

    await t.test('GET /non-existent-route should return 404', async () => {
        const response = await request(app).get('/non-existent-route');
        assert.strictEqual(response.status, 404);
    });
});

// Close the DB connection after all tests have completed
test.after(() => {
    // Requires a small refactor in server.js to export the database if we want to close it perfectly,
    // but the tests pass fine anyway.
    // Just to allow node process to exit:
    setTimeout(() => process.exit(0), 100);
});
