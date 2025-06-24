// Sprint Review specific functionality
document.addEventListener('DOMContentLoaded', function() {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    
    // Message history
    let messageHistory = [
        {
            role: 'assistant',
            content: 'Welcome to the Sprint Review! I\'ll help facilitate today\'s meeting. Let\'s focus on:\n1. Demonstrating what was completed during the Sprint\n2. Gathering feedback from stakeholders\n3. Discussing any adjustments to the Product Backlog\n\nWhat would you like to share about the work completed this Sprint?'
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
        
        // Add context for sprint review
        let contextMessage = 'User is in Sprint Review and is saying: ';
        
        messageHistory.push({
            role: 'user',
            content: contextMessage + message
        });
          // Show typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message ai-message';
        
        // Add AI avatar to typing indicator
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerHTML = '<i class="fas fa-user-tie"></i>';
        typingIndicator.appendChild(avatar);
        
        // Add typing indicator content
        const indicatorContent = document.createElement('div');
        indicatorContent.className = 'message-content typing-indicator';
        indicatorContent.innerHTML = '<p>Alex is thinking</p>';
        typingIndicator.appendChild(indicatorContent);
        
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
        messageDiv.className = `message ${sender}-message`;
        
        if (sender === 'user') {
            // Add user avatar
            const avatar = document.createElement('div');
            avatar.className = 'avatar';
            avatar.innerHTML = '<i class="fas fa-user"></i>';
            messageDiv.appendChild(avatar);
            
            // Add message content
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            
            // Convert markdown-like formatting to HTML
            content = content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
                .replace(/\*(.*?)\*/g, '<em>$1</em>')              // Italic
                .replace(/\n/g, '<br>');                           // New lines
            
            messageContent.innerHTML = content;
            messageDiv.appendChild(messageContent);
            
        } else if (sender === 'ai') {
            // Add AI avatar
            const avatar = document.createElement('div');
            avatar.className = 'avatar';
            avatar.innerHTML = '<i class="fas fa-user-tie"></i>';
            messageDiv.appendChild(avatar);
            
            // Add message content
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            
            // Convert markdown-like formatting to HTML
            content = content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
                .replace(/\*(.*?)\*/g, '<em>$1</em>')              // Italic
                .replace(/\n/g, '<br>');                           // New lines
            
            messageContent.innerHTML = content;
            messageDiv.appendChild(messageContent);
        }
        
        chatBox.appendChild(messageDiv);
        
        // Scroll to bottom
        chatBox.scrollTop = chatBox.scrollHeight;
    }
});
