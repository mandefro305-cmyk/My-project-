const test = require('node:test');
const assert = require('node:assert');

test('API chat route tests', async (t) => {
    // 1. Mock GoogleGenAI before requiring server.js
    const mockGenerateContent = async (params) => {
        if (params.contents === "throw_error_please") {
             throw new Error("Simulated API Error");
        }
        return { text: "Hello from Mock AI" };
    };

    class MockGoogleGenAI {
        constructor(opts) {
            this.models = {
                generateContent: mockGenerateContent
            };
        }
    }

    require.cache[require.resolve('@google/genai')] = {
        id: require.resolve('@google/genai'),
        filename: require.resolve('@google/genai'),
        loaded: true,
        exports: { GoogleGenAI: MockGoogleGenAI }
    };

    // 2. Require the server
    const { app, server } = require('../server.js');

    try {
        // Test 1: Happy path
        await t.test('returns expected text when AI succeeds', async () => {
            const res = await fetch(`http://localhost:3000/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: "Hello" })
            });
            const data = await res.json();

            assert.strictEqual(res.status, 200);
            assert.strictEqual(data.response, "Hello from Mock AI");
        });

        // Test 2: Error handling path
        await t.test('returns fallback error string when AI throws', async () => {
            const res = await fetch(`http://localhost:3000/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: "throw_error_please" })
            });
            const data = await res.json();

            assert.strictEqual(res.status, 200);
            assert.strictEqual(data.response, "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again later!");
        });
    } finally {
        // Clean up
        server.close();
    }
});
