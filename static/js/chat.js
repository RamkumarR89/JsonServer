// Main chat functionality
document.addEventListener('DOMContentLoaded', function() {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    
    // Message history
    let messageHistory = [
        {
            role: 'assistant',
            content: 'Hi there! I\'m Alex, your Scrum Master. I\'ve been working with Agile teams for about 8 years now. How can I help you with your Scrum practices today?'
        }
    ];
    
    // Name detection for personalization
    let userName = '';
    
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
        
        // Try to extract name if we don't have it yet
        if (!userName) {
            const extractedName = extractName(message);
            if (extractedName) {
                userName = extractedName;
            }
        }
        
        // Add user message to history with detected name if available
        let contextMessage = message;
        if (userName) {
            contextMessage = `${userName} says: ${message}`;
        }
        
        messageHistory.push({
            role: 'user',
            content: contextMessage
        });
        
        // Show typing indicator with random delay
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message ai-message typing-indicator';
        typingIndicator.innerHTML = '<p>Alex is typing...</p>';
        chatBox.appendChild(typingIndicator);
        
        // Scroll to bottom
        chatBox.scrollTop = chatBox.scrollHeight;
        
        // Add random delay to simulate human response time (1-3 seconds)
        const responseDelay = 1000 + Math.random() * 2000;
        
        setTimeout(() => {
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
                
                // Try to extract user name from AI response if we don't have it
                if (!userName) {
                    userName = extractNameFromResponse(aiResponse);
                }
            })
            .catch(error => {
                // Remove typing indicator
                chatBox.removeChild(typingIndicator);
                
                // Show error message
                addMessageToChat('ai', 'Sorry, I seem to be having connection issues. Can we try again?');
                console.error('Error:', error);
            });
        }, responseDelay);
    }
    
    // Function to extract name from user message
    function extractName(message) {
        // Look for introduction patterns
        const introPatterns = [
            /(?:i am|i'm|this is|my name is) ([A-Z][a-z]+)/i,
            /^(?:hi|hello|hey),? (?:i(?:'| a)m|this is) ([A-Z][a-z]+)/i,
            /^([A-Z][a-z]+) here/i
        ];
        
        for (const pattern of introPatterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return null;
    }
    
    // Function to extract name from AI response
    function extractNameFromResponse(response) {
        // Look for greeting patterns like "Hi John" or "Hello Jane"
        const greetingPattern = /(?:hi|hello|hey) ([A-Z][a-z]+)/i;
        const match = response.match(greetingPattern);
        
        if (match && match[1]) {
            // Verify it's likely a name (not a common word)
            const commonWords = ['there', 'team', 'everyone', 'folks', 'all'];
            if (!commonWords.includes(match[1].toLowerCase())) {
                return match[1];
            }
        }
        
        return null;
    }
    
    // Function to add message to chat
    function addMessageToChat(sender, content) {
        const messageDiv = document.createElement('div');
        
        if (sender === 'user') {
            messageDiv.className = 'message user-message';
            
            // Add user's name if available
            if (userName) {
                const nameSpan = document.createElement('div');
                nameSpan.className = 'message-name';
                nameSpan.textContent = userName;
                messageDiv.appendChild(nameSpan);
            }
        } else {
            messageDiv.className = 'message ai-message';
            
            // Add Alex's name
            const nameSpan = document.createElement('div');
            nameSpan.className = 'message-name';
            nameSpan.textContent = 'Alex (Scrum Master)';
            messageDiv.appendChild(nameSpan);
        }
        
        // Convert markdown-like formatting to HTML
        content = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>')              // Italic
            .replace(/\n/g, '<br>');                           // New lines
        
        const contentP = document.createElement('p');
        contentP.innerHTML = content;
        messageDiv.appendChild(contentP);
        
        chatBox.appendChild(messageDiv);
        
        // Scroll to bottom
        chatBox.scrollTop = chatBox.scrollHeight;
    }
});
