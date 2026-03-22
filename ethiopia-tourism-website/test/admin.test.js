const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../server.js');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

test('Admin routes integration tests', async (t) => {
    // Wait a little bit for the DB to be ready, as it connects asynchronously in server.js
    await new Promise(resolve => setTimeout(resolve, 500));

    // We'll insert a test user so we know the password
    const testUsername = 'testadmin_' + Date.now();
    const testPassword = 'testpassword';
    const testPasswordHash = await bcrypt.hash(testPassword, 10);

    // Let's connect to db to add a test user
    const db = new sqlite3.Database('./tourism.db');

    await new Promise((resolve, reject) => {
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [testUsername, testPasswordHash], function(err) {
            if (err) reject(err);
            else resolve();
        });
    });

    await t.test('Unauthenticated user is redirected to login', async () => {
        const response = await request(app).get('/admin');
        assert.strictEqual(response.status, 302);
        assert.strictEqual(response.header.location, '/login');
    });

    await t.test('Authenticated user can view admin dashboard', async () => {
        const agent = request.agent(app);

        // 1. Log in
        const loginResponse = await agent.post('/login').send({
            username: testUsername,
            password: testPassword
        });
        assert.strictEqual(loginResponse.status, 302);
        assert.strictEqual(loginResponse.header.location, '/admin');

        // 2. Access admin page
        const adminResponse = await agent.get('/admin');
        assert.strictEqual(adminResponse.status, 200);
        // The admin page should render the text Admin or something similar
        // Based on the routes, it likely has /admin/add forms, checking for generic 'Admin' text is safer
        assert.match(adminResponse.text, /Admin/i);
    });

    await t.test('Authenticated user can add and delete a place', async () => {
        const agent = request.agent(app);

        // Log in first
        await agent.post('/login').send({
            username: testUsername,
            password: testPassword
        });

        const testPlaceName = 'Test Place ' + Date.now();

        // Add place
        const addResponse = await agent.post('/admin/add').send({
            name: testPlaceName,
            description: 'A place for testing',
            image_url: 'test.jpg',
            video_url: 'test.mp4'
        });
        assert.strictEqual(addResponse.status, 302);
        assert.strictEqual(addResponse.header.location, '/admin');

        // Check if place was added to DB
        const row = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM places WHERE name = ?', [testPlaceName], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        assert.ok(row, 'Place should be inserted into database');

        // Delete place
        const deleteResponse = await agent.post(`/admin/delete/${row.id}`);
        assert.strictEqual(deleteResponse.status, 302);
        assert.strictEqual(deleteResponse.header.location, '/admin');

        // Check if place was deleted
        const rowAfterDelete = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM places WHERE name = ?', [testPlaceName], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        assert.strictEqual(rowAfterDelete, undefined, 'Place should be deleted from database');
    });

    // Cleanup
    await new Promise((resolve, reject) => {
        db.run('DELETE FROM users WHERE username = ?', [testUsername], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });

    db.close();
});
