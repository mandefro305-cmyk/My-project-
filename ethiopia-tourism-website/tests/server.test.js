const assert = require('node:assert');
const test = require('node:test');
const request = require('supertest');
const { app, ai } = require('../server'); // Assuming we exported these

test('Gemini API Error Handling', async (t) => {
    // 1. Mock the `ai.models.generateContent` method to throw an error
    const originalGenerateContent = ai.models.generateContent;
    ai.models.generateContent = async () => {
        throw new Error('Simulated Gemini API Failure');
    };

    try {
        // 2. Make a request to the `/api/chat` endpoint
        const response = await request(app)
            .post('/api/chat')
            .send({ message: 'Hello' });

        // 3. Verify the response is a 200 OK (the server doesn't crash)
        assert.strictEqual(response.status, 200);

        // 4. Verify the fallback message is returned in the response JSON
        assert.strictEqual(
            response.body.response,
            "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again later!"
        );
    } finally {
        // Restore the original method (good practice)
        ai.models.generateContent = originalGenerateContent;
    }
});
