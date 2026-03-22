const test = require('node:test');
const assert = require('node:assert');
const { app, server } = require('../server.js');
const http = require('http');

test('API chat route - missing message edge case', async (t) => {
    // Wait for the server to be listening
    await new Promise(resolve => {
        if (server.listening) resolve();
        else server.on('listening', resolve);
    });

    const port = server.address().port;
    const postData = JSON.stringify({});

    const options = {
        hostname: '127.0.0.1',
        port: port,
        path: '/api/chat',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const responseData = await new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({ statusCode: res.statusCode, data });
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(postData);
        req.end();
    });

    assert.strictEqual(responseData.statusCode, 200, 'Expected 200 OK status code');

    const json = JSON.parse(responseData.data);
    assert.ok(json.response, 'Expected response field in JSON');
    assert.strictEqual(typeof json.response, 'string', 'Expected response to be a string');
});

test('Teardown test server', () => {
    server.close();
});
