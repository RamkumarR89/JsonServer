// Retrospective specific functionality
document.addEventListener('DOMContentLoaded', function() {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    
    // Message history
    let messageHistory = [
        {
            role: 'assistant',
            content: 'Welcome to the Sprint Retrospective! I\'ll help facilitate this session using a structured approach:\n1. What went well during the Sprint?\n2. What could be improved?\n3. What specific actions can we take to improve?\n\nLet\'s start with what went well during this Sprint. Would anyone like to share?'
        }
    ];
    
    // Current phase tracking
    let currentPhase = 'went-well';
    
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
        
        // Add context for retrospective
        let contextMessage = '';
        if (currentPhase === 'went-well') {
            contextMessage = 'User is in Retrospective discussing what went well: ';
        } else if (currentPhase === 'to-improve') {
            contextMessage = 'User is in Retrospective discussing what could be improved: ';
        } else if (currentPhase === 'action-items') {
            contextMessage = 'User is in Retrospective discussing action items: ';
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
            
            // Check for phase transitions
            if (currentPhase === 'went-well' && 
                (aiResponse.toLowerCase().includes('what could be improved') || 
                 aiResponse.toLowerCase().includes('what didn\'t go well'))) {
                currentPhase = 'to-improve';
            } else if (currentPhase === 'to-improve' && 
                      (aiResponse.toLowerCase().includes('action') || 
                       aiResponse.toLowerCase().includes('specific steps'))) {
                currentPhase = 'action-items';
            } else if (currentPhase === 'action-items' && 
                      aiResponse.toLowerCase().includes('wrap up')) {
                // Reset for next retrospective
                setTimeout(() => {
                    addMessageToChat('ai', 'Thank you everyone for participating in today\'s retrospective. We\'ve identified some good action items to work on for the next Sprint. Is there anything else you\'d like to discuss before we close?');
                    messageHistory.push({
                        role: 'assistant',
                        content: 'Thank you everyone for participating in today\'s retrospective. We\'ve identified some good action items to work on for the next Sprint. Is there anything else you\'d like to discuss before we close?'
                    });
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
