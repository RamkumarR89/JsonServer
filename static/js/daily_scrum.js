// Daily Scrum specific functionality
document.addEventListener('DOMContentLoaded', function() {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    
    // Message history
    let messageHistory = [
        {
            role: 'assistant',
            content: 'Welcome to the Daily Scrum! I\'ll help facilitate today\'s meeting. Let\'s go through the three questions:\n1. What did you accomplish yesterday?\n2. What do you plan to work on today?\n3. Are there any impediments in your way?'
        }
    ];
    
    // Current question tracking
    let currentQuestion = 1;
    
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
        
        // Add user message to history with specific context
        let contextMessage = '';
        if (currentQuestion === 1) {
            contextMessage = 'User is answering about what they accomplished yesterday: ';
        } else if (currentQuestion === 2) {
            contextMessage = 'User is answering about what they plan to work on today: ';
        } else if (currentQuestion === 3) {
            contextMessage = 'User is answering about impediments: ';
        }
        
        messageHistory.push({
            role: 'user',
            content: contextMessage + message
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
            
            // Move to next question if appropriate
            if (currentQuestion < 3 && aiResponse.toLowerCase().includes('what do you plan')) {
                currentQuestion = 2;
            } else if (currentQuestion < 3 && aiResponse.toLowerCase().includes('any impediments')) {
                currentQuestion = 3;
            } else if (currentQuestion === 3 && aiResponse.toLowerCase().includes('thank')) {
                // Reset for next team member
                setTimeout(() => {
                    addMessageToChat('ai', 'Would anyone else like to share their update?');
                    messageHistory.push({
                        role: 'assistant',
                        content: 'Would anyone else like to share their update?'
                    });
                    currentQuestion = 1;
                }, 1000);
            }
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
