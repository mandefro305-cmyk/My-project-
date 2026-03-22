function toggleChat() {
    const chatWidget = document.getElementById('ai-chat-widget');
    const toggleIcon = document.getElementById('chat-toggle-icon');

    if (chatWidget.classList.contains('ai-chat-collapsed')) {
        chatWidget.classList.remove('ai-chat-collapsed');
        chatWidget.classList.add('ai-chat-expanded');
        toggleIcon.textContent = '▼';
    } else {
        chatWidget.classList.remove('ai-chat-expanded');
        chatWidget.classList.add('ai-chat-collapsed');
        toggleIcon.textContent = '▲';
    }
}

function handleKeyPress(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
}

async function sendMessage() {
    const inputField = document.getElementById('ai-chat-input');
    const message = inputField.value.trim();
    if (!message) return;

    inputField.value = '';
    appendMessage(message, 'user');

    // Show typing indicator
    const typingId = 'typing-' + Date.now();
    appendMessage('...', 'bot', typingId);

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        });
        const data = await response.json();

        // Remove typing indicator and add real response
        document.getElementById(typingId).remove();
        appendMessage(data.response, 'bot');
    } catch (err) {
        document.getElementById(typingId).remove();
        appendMessage("Sorry, I'm having trouble connecting right now.", 'bot');
    }
}

function appendMessage(text, sender, id = null) {
    const chatBody = document.getElementById('ai-chat-body');
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('chat-message', sender + '-message');
    if (id) msgDiv.id = id;
    msgDiv.textContent = text;
    chatBody.appendChild(msgDiv);

    // Auto scroll to bottom
    chatBody.scrollTop = chatBody.scrollHeight;
}
