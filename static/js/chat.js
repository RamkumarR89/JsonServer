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
    
    // Voice settings
    let voiceEnabled = false;
    let isListening = false;
    
    // Create voice control buttons
    const voiceControlsDiv = document.createElement('div');
    voiceControlsDiv.className = 'voice-controls mb-3';
    voiceControlsDiv.innerHTML = `
        <button id="toggle-voice" class="btn btn-outline-secondary">
            <i class="fas fa-microphone-slash"></i> Enable Voice
        </button>
        <button id="start-listening" class="btn btn-outline-primary" disabled>
            <i class="fas fa-microphone"></i> Start Listening
        </button>
    `;
    
    // Insert voice controls before the chat box
    chatBox.parentNode.insertBefore(voiceControlsDiv, chatBox);
    
    // Get voice control buttons
    const toggleVoiceBtn = document.getElementById('toggle-voice');
    const startListeningBtn = document.getElementById('start-listening');
    
    // Toggle voice controls
    toggleVoiceBtn.addEventListener('click', function() {
        voiceEnabled = !voiceEnabled;
        if (voiceEnabled) {
            toggleVoiceBtn.innerHTML = '<i class="fas fa-microphone"></i> Disable Voice';
            toggleVoiceBtn.classList.replace('btn-outline-secondary', 'btn-secondary');
            startListeningBtn.disabled = false;
        } else {
            toggleVoiceBtn.innerHTML = '<i class="fas fa-microphone-slash"></i> Enable Voice';
            toggleVoiceBtn.classList.replace('btn-secondary', 'btn-outline-secondary');
            startListeningBtn.disabled = true;
            isListening = false;
        }
    });
    
    // Start listening for voice input
    startListeningBtn.addEventListener('click', function() {
        if (!isListening && voiceEnabled) {
            isListening = true;
            startListeningBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Listening...';
            startListeningBtn.classList.replace('btn-outline-primary', 'btn-primary');
            
            // Call the listen endpoint
            fetch('/listen')
                .then(response => response.json())
                .then(data => {
                    isListening = false;
                    startListeningBtn.innerHTML = '<i class="fas fa-microphone"></i> Start Listening';
                    startListeningBtn.classList.replace('btn-primary', 'btn-outline-primary');
                    
                    if (data.success && data.text) {
                        // Fill the input field with the recognized text
                        userInput.value = data.text;
                        // Send the message
                        sendMessage(true);
                    } else {
                        // Show error message
                        addMessageToChat('system', 'Sorry, I couldn\'t understand what you said. Please try again.');
                    }
                })
                .catch(error => {
                    isListening = false;
                    startListeningBtn.innerHTML = '<i class="fas fa-microphone"></i> Start Listening';
                    startListeningBtn.classList.replace('btn-primary', 'btn-outline-primary');
                    addMessageToChat('system', 'There was an error with speech recognition. Please try again.');
                    console.error('Error:', error);
                });
        }
    });
    
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
    function sendMessage(fromVoice = false) {
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
                method: 'POST',                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: messageHistory,
                    use_voice: voiceEnabled && !fromVoice  // Use voice for AI response if enabled and not from voice input
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
