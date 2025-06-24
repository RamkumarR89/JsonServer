// Sprint Planning specific functionality
document.addEventListener('DOMContentLoaded', function() {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    
    // Message history
    let messageHistory = [
        {
            role: 'assistant',
            content: 'Good morning team! Alex here. I\'ve got us set up for our sprint planning session today. I\'ve already taken a look at the backlog, and we\'ve got some interesting items lined up. Before we dive into selecting stories, I think we should start by defining what we want to achieve this sprint - our Sprint Goal. So, what are your thoughts on what we should focus on for this upcoming sprint?'
        }
    ];
    
    // Track sprint planning phase
    let planningPhase = 'goal-setting'; // goal-setting, backlog-selection, planning
    let sprintGoal = '';
    let selectedItems = [];
    
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
        
        // Add context for sprint planning
        let contextMessage = '';
        
        if (planningPhase === 'goal-setting') {
            contextMessage = 'Team member discussing sprint goal ideas: ';
            // If message seems like a goal, capture it
            if (message.length > 15 && !message.endsWith('?')) {
                sprintGoal = message;
            }
        } else if (planningPhase === 'backlog-selection') {
            contextMessage = 'Team member discussing backlog items to select: ';
            // Try to extract potential backlog items from message
            const items = extractPotentialBacklogItems(message);
            if (items.length > 0) {
                selectedItems = selectedItems.concat(items);
            }
        } else if (planningPhase === 'planning') {
            contextMessage = 'Team member discussing implementation plans: ';
        }
        
        messageHistory.push({
            role: 'user',
            content: contextMessage + message
        });
        
        // Show typing indicator with random delay to simulate human typing
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message ai-message typing-indicator';
        typingIndicator.innerHTML = '<p>Alex is typing...</p>';
        chatBox.appendChild(typingIndicator);
        
        // Scroll to bottom
        chatBox.scrollTop = chatBox.scrollHeight;
        
        // Add random delay to simulate human response time (1-4 seconds)
        const responseDelay = 1000 + Math.random() * 3000;
        
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
                
                // Update planning phase based on response
                updatePlanningPhase(aiResponse);
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
    
    // Function to update the planning phase based on AI response
    function updatePlanningPhase(response) {
        const lowerResponse = response.toLowerCase();
        
        // Transition from goal-setting to backlog-selection
        if (planningPhase === 'goal-setting' && 
            (lowerResponse.includes("backlog") || 
             lowerResponse.includes("select") || 
             lowerResponse.includes("stories") || 
             lowerResponse.includes("items"))) {
            planningPhase = 'backlog-selection';
        }
        
        // Transition from backlog-selection to planning
        else if (planningPhase === 'backlog-selection' && 
                (lowerResponse.includes("how will you") || 
                 lowerResponse.includes("implementation") || 
                 lowerResponse.includes("approach") || 
                 lowerResponse.includes("plan for"))) {
            planningPhase = 'planning';
        }
        
        // Wrap up the planning session
        else if (planningPhase === 'planning' && 
                (lowerResponse.includes("wrap") || 
                 lowerResponse.includes("conclude") || 
                 lowerResponse.includes("finished") || 
                 lowerResponse.includes("great plan"))) {
            // Reset for next session
            setTimeout(() => {
                addMessageToChat('ai', `Great work today, team! We've set our sprint goal: "${sprintGoal}", selected our backlog items, and created a solid plan. I'll send out the notes from our session. Good luck with the sprint!`);
                
                messageHistory.push({
                    role: 'assistant',
                    content: `Great work today, team! We've set our sprint goal: "${sprintGoal}", selected our backlog items, and created a solid plan. I'll send out the notes from our session. Good luck with the sprint!`
                });
            }, 3000);
        }
    }
    
    // Function to extract potential backlog items from a message
    function extractPotentialBacklogItems(message) {
        const items = [];
        
        // Look for patterns like:
        // - item
        // * item
        // 1. item
        // "item"
        const patterns = [
            /[-*]\s*([^-*\n]+)/g,
            /\d+\.\s*([^\n]+)/g,
            /"([^"]+)"/g,
            /'([^']+)'/g
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(message)) !== null) {
                if (match[1] && match[1].trim().length > 5) {
                    items.push(match[1].trim());
                }
            }
        });
        
        return items;
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
