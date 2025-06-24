// Main chat functionality
document.addEventListener('DOMContentLoaded', function() {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    
    // Message history
    let messageHistory = [
        {
            role: 'assistant',
            content: 'Hello! I\'m your AI Scrum Master assistant. How can I help you with your Agile and Scrum practices today?'
        }
    ];
    
    // Send message when button is clicked
    sendBtn.addEventListener('click', function() {
        sendMessage();
    });
    
    // Send message when Enter key is pressed
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Function to send message
    function sendMessage() {
        const message = userInput.value.trim();
        
        if (message === '') {
            return;
        }
        
        // Add user message to chat
        addMessageToChat('user', message);
        
        // Clear input field
        userInput.value = '';
        
        // Add user message to history
        messageHistory.push({
            role: 'user',
            content: message
        });
        
        // Show typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message ai-message typing-indicator';
        typingIndicator.innerHTML = '<p>Thinking...</p>';
        chatBox.appendChild(typingIndicator);
        
        // Scroll to bottom
        chatBox.scrollTop = chatBox.scrollHeight;
        
        // Send request to API
        fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: messageHistory
            }),
        })
        .then(response => response.json())
        .then(data => {
            // Remove typing indicator
            chatBox.removeChild(typingIndicator);
            
            // Get response from API
            const aiResponse = data.message.content;
            
            // Add AI response to chat
            addMessageToChat('ai', aiResponse);
            
            // Add AI response to history
            messageHistory.push({
                role: 'assistant',
                content: aiResponse
            });
        })
        .catch(error => {
            // Remove typing indicator
            chatBox.removeChild(typingIndicator);
            
            // Show error message
            addMessageToChat('ai', 'Sorry, there was an error communicating with the AI service. Please try again later.');
            console.error('Error:', error);
        });
    }
    
    // Function to add message to chat
    function addMessageToChat(sender, content) {
        const messageDiv = document.createElement('div');
        
        if (sender === 'user') {
            messageDiv.className = 'message user-message';
        } else {
            messageDiv.className = 'message ai-message';
        }
        
        // Convert markdown-like formatting to HTML
        content = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>')              // Italic
            .replace(/\n/g, '<br>');                           // New lines
        
        messageDiv.innerHTML = `<p>${content}</p>`;
        chatBox.appendChild(messageDiv);
        
        // Scroll to bottom
        chatBox.scrollTop = chatBox.scrollHeight;
    }
});
