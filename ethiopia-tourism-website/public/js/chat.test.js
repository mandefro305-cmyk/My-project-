const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const vm = require('vm');

const chatJsCode = fs.readFileSync(path.join(__dirname, 'chat.js'), 'utf8');

test('chat.js', async (t) => {
    let dom;
    let window;
    let document;
    let originalFetch;

    // Helper to setup the DOM environment
    function setupDOM(html = '') {
        const defaultHtml = `
            <!DOCTYPE html>
            <html>
            <body>
                <div id="ai-chat-widget" class="ai-chat-collapsed"></div>
                <div id="chat-toggle-icon">▲</div>
                <input id="ai-chat-input" value="" />
                <div id="ai-chat-body"></div>
            </body>
            </html>
        `;
        dom = new JSDOM(html || defaultHtml);
        window = dom.window;
        document = window.document;

        // Mock fetch
        window.fetch = async () => ({
            json: async () => ({ response: 'Mock bot response' })
        });

        // Run chat.js in the context of the mock window
        vm.runInNewContext(chatJsCode, window);
    }

    await t.test('toggleChat toggles classes and icon', () => {
        setupDOM();
        const chatWidget = document.getElementById('ai-chat-widget');
        const toggleIcon = document.getElementById('chat-toggle-icon');

        // Initial state: collapsed
        assert.ok(chatWidget.classList.contains('ai-chat-collapsed'));
        assert.strictEqual(toggleIcon.textContent, '▲');

        // Toggle to expanded
        window.toggleChat();
        assert.ok(!chatWidget.classList.contains('ai-chat-collapsed'));
        assert.ok(chatWidget.classList.contains('ai-chat-expanded'));
        assert.strictEqual(toggleIcon.textContent, '▼');

        // Toggle back to collapsed
        window.toggleChat();
        assert.ok(chatWidget.classList.contains('ai-chat-collapsed'));
        assert.ok(!chatWidget.classList.contains('ai-chat-expanded'));
        assert.strictEqual(toggleIcon.textContent, '▲');
    });

    await t.test('handleKeyPress calls sendMessage on Enter', () => {
        setupDOM();
        let sendMessageCalled = false;

        // Mock sendMessage temporarily
        const originalSendMessage = window.sendMessage;
        window.sendMessage = () => { sendMessageCalled = true; };

        // Test with non-Enter key
        window.handleKeyPress({ key: 'A' });
        assert.strictEqual(sendMessageCalled, false);

        // Test with Enter key
        window.handleKeyPress({ key: 'Enter' });
        assert.strictEqual(sendMessageCalled, true);

        // Restore
        window.sendMessage = originalSendMessage;
    });

    await t.test('sendMessage does nothing if input is empty', async () => {
        setupDOM();
        const inputField = document.getElementById('ai-chat-input');
        inputField.value = '   '; // Only spaces

        let appendMessageCalled = false;
        const originalAppendMessage = window.appendMessage;
        window.appendMessage = () => { appendMessageCalled = true; };

        await window.sendMessage();

        assert.strictEqual(appendMessageCalled, false);

        window.appendMessage = originalAppendMessage;
    });

    await t.test('sendMessage success flow', async () => {
        setupDOM();
        const inputField = document.getElementById('ai-chat-input');
        const chatBody = document.getElementById('ai-chat-body');

        inputField.value = 'Hello bot';

        let fetchCalledWith = null;
        window.fetch = async (url, options) => {
            fetchCalledWith = { url, options };
            return {
                json: async () => ({ response: 'Hello user' })
            };
        };

        // Date.now() is used in typingId, let's just observe the DOM
        await window.sendMessage();

        assert.strictEqual(inputField.value, '');
        assert.strictEqual(fetchCalledWith.url, '/api/chat');
        assert.strictEqual(fetchCalledWith.options.method, 'POST');
        assert.strictEqual(JSON.parse(fetchCalledWith.options.body).message, 'Hello bot');

        // Verify elements appended
        const messages = chatBody.querySelectorAll('.chat-message');
        assert.strictEqual(messages.length, 2); // 1 user message, 1 bot response (typing indicator removed)

        assert.ok(messages[0].classList.contains('user-message'));
        assert.strictEqual(messages[0].textContent, 'Hello bot');

        assert.ok(messages[1].classList.contains('bot-message'));
        assert.strictEqual(messages[1].textContent, 'Hello user');
    });

    await t.test('sendMessage error flow', async () => {
        setupDOM();
        const inputField = document.getElementById('ai-chat-input');
        const chatBody = document.getElementById('ai-chat-body');

        inputField.value = 'Hello bot';

        window.fetch = async () => {
            throw new Error('Network failure');
        };

        await window.sendMessage();

        const messages = chatBody.querySelectorAll('.chat-message');
        assert.strictEqual(messages.length, 2);

        assert.ok(messages[1].classList.contains('bot-message'));
        assert.strictEqual(messages[1].textContent, "Sorry, I'm having trouble connecting right now.");
    });

    await t.test('appendMessage creates and appends element correctly', () => {
        setupDOM();
        const chatBody = document.getElementById('ai-chat-body');

        window.appendMessage('Test message', 'system', 'msg-123');

        const msgDiv = chatBody.firstElementChild;
        assert.ok(msgDiv);
        assert.strictEqual(msgDiv.id, 'msg-123');
        assert.ok(msgDiv.classList.contains('chat-message'));
        assert.ok(msgDiv.classList.contains('system-message'));
        assert.strictEqual(msgDiv.textContent, 'Test message');

        // JSDOM might not perfectly emulate scrollHeight/scrollTop, but we check if it sets it
        assert.strictEqual(chatBody.scrollTop, chatBody.scrollHeight);
    });
});
