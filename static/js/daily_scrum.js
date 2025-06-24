// Daily Scrum specific functionality
document.addEventListener('DOMContentLoaded', function() {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const voiceBtn = document.getElementById('voice-btn');
    const refreshWorkItemsBtn = document.getElementById('refresh-work-items');
    const workItemsTable = document.getElementById('work-items-table');
    const sprintInfoDiv = document.getElementById('sprint-info');
    
    // Message history
    let messageHistory = [
        {
            role: 'assistant',
            content: 'Hey team! Alex here. How\'s everyone doing this morning? Let\'s get our daily standup started. Keep in mind we want to stay focused on three things: What you got done yesterday, what you\'re planning to tackle today, and any roadblocks you\'re facing. Who\'d like to kick us off today?'
        }
    ];
    
    // Team member tracking
    let currentSpeaker = '';
    let teamMembers = [];
    let currentStage = 'greeting'; // greeting, yesterday, today, blockers, next-person
    let lastResponseType = '';
    let sprintDetails = null;
    let workItems = [];
    
    // Load Azure DevOps data on page load
    loadAzureDevOpsData();
    
    // Refresh work items when button clicked
    if (refreshWorkItemsBtn) {
        refreshWorkItemsBtn.addEventListener('click', loadAzureDevOpsData);
    }
    
    // Voice input
    if (voiceBtn) {
        voiceBtn.addEventListener('click', startVoiceInput);
    }
    
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
    
    // Function to load Azure DevOps data
    function loadAzureDevOpsData() {
        // Show loading state
        sprintInfoDiv.innerHTML = '<p>Loading sprint information...</p>';
        workItemsTable.querySelector('tbody').innerHTML = '<tr><td colspan="5" class="text-center">Loading work items...</td></tr>';
        
        // Load sprint details
        fetch('/azure-devops/sprint-details')
            .then(response => response.json())
            .then(data => {
                sprintDetails = data;
                if (data.error) {
                    sprintInfoDiv.innerHTML = `<div class="alert alert-warning">${data.error}</div>`;
                } else {
                    const startDate = new Date(data.start_date).toLocaleDateString();
                    const endDate = new Date(data.finish_date).toLocaleDateString();
                    sprintInfoDiv.innerHTML = `
                        <div class="alert alert-info">
                            <h5>${data.name}</h5>
                            <p><strong>Period:</strong> ${startDate} - ${endDate}</p>
                            <p><strong>Path:</strong> ${data.path}</p>
                        </div>
                    `;
                }
            })
            .catch(error => {
                console.error('Error fetching sprint details:', error);
                sprintInfoDiv.innerHTML = `<div class="alert alert-danger">Error loading sprint information: ${error.message}</div>`;
            });
        
        // Load work items
        fetch('/azure-devops/work-items')
            .then(response => response.json())
            .then(data => {
                workItems = data;
                if (data.error) {
                    workItemsTable.querySelector('tbody').innerHTML = `<tr><td colspan="5" class="text-center text-warning">${data.error}</td></tr>`;
                } else if (data.length === 0) {
                    workItemsTable.querySelector('tbody').innerHTML = '<tr><td colspan="5" class="text-center">No work items found for this sprint</td></tr>';
                } else {
                    const tbody = workItemsTable.querySelector('tbody');
                    tbody.innerHTML = '';
                    
                    data.forEach(item => {
                        const row = document.createElement('tr');
                        
                        // Set row color based on state
                        if (item.state === 'Done') {
                            row.className = 'table-success';
                        } else if (item.state === 'In Progress') {
                            row.className = 'table-info';
                        } else if (item.state === 'New' || item.state === 'To Do') {
                            row.className = 'table-light';
                        }
                        
                        row.innerHTML = `
                            <td><a href="${item.url}" target="_blank">${item.id}</a></td>
                            <td>${item.title}</td>
                            <td><span class="badge bg-secondary">${item.type}</span></td>
                            <td>${item.state}</td>
                            <td>${item.assigned_to}</td>
                        `;
                        tbody.appendChild(row);
                        
                        // Add team member to list if not already present
                        if (item.assigned_to !== 'Unassigned' && !teamMembers.includes(item.assigned_to)) {
                            teamMembers.push(item.assigned_to);
                        }
                    });
                }
            })
            .catch(error => {
                console.error('Error fetching work items:', error);
                workItemsTable.querySelector('tbody').innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error loading work items: ${error.message}</td></tr>`;
            });
    }
    
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
        
        // Analyze message to detect context and potential speaker
        analyzeMessage(message);
        
        // Add context clues to help the AI respond naturally
        let contextMessage = message;
        
        // Add appropriate context based on detected stage
        if (currentStage === 'greeting' && isIntroduction(message)) {
            contextMessage = `Team member introducing themselves: ${message}`;
            currentSpeaker = extractName(message);
            if (currentSpeaker && !teamMembers.includes(currentSpeaker)) {
                teamMembers.push(currentSpeaker);
            }
        } else if (currentStage === 'yesterday' || messageContainsYesterday(message)) {
            contextMessage = `Team member talking about yesterday's work: ${message}`;
            currentStage = 'yesterday';
        } else if (currentStage === 'today' || messageContainsToday(message)) {
            contextMessage = `Team member talking about today's plans: ${message}`;
            currentStage = 'today';
        } else if (currentStage === 'blockers' || messageContainsBlockers(message)) {
            contextMessage = `Team member talking about blockers or impediments: ${message}`;
            currentStage = 'blockers';
        } else if (messageIndicatesFinished(message)) {
            contextMessage = `Team member finished their update: ${message}`;
            currentStage = 'next-person';
        }
        
        messageHistory.push({
            role: 'user',
            content: contextMessage
        });          // Show typing indicator with delay to simulate human typing
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message ai-message';
        
        // Add AI avatar
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerHTML = '<i class="fas fa-user-tie"></i>';
        typingIndicator.appendChild(avatar);
        
        // Add message content
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content typing-indicator';
        messageContent.innerHTML = '<p>Alex is typing</p>';
        typingIndicator.appendChild(messageContent);
        
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
                
                // Update conversation state based on AI response
                updateConversationState(aiResponse);
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
    
    // Function to analyze user message and detect context
    function analyzeMessage(message) {
        const lowerMessage = message.toLowerCase();
        
        // Check for name introduction patterns
        if (isIntroduction(message) && currentStage === 'greeting') {
            const name = extractName(message);
            if (name) {
                currentSpeaker = name;
                if (!teamMembers.includes(name)) {
                    teamMembers.push(name);
                }
            }
        }
        
        // Detect conversation stage from message content
        if (messageContainsYesterday(lowerMessage)) {
            currentStage = 'yesterday';
        } else if (messageContainsToday(lowerMessage) && currentStage === 'yesterday') {
            currentStage = 'today';
        } else if (messageContainsBlockers(lowerMessage) && (currentStage === 'today' || currentStage === 'yesterday')) {
            currentStage = 'blockers';
        } else if (messageIndicatesFinished(lowerMessage) && 
                 (currentStage === 'blockers' || currentStage === 'today')) {
            currentStage = 'next-person';
        }
    }
    
    // Function to update conversation state based on AI response
    function updateConversationState(response) {
        const lowerResponse = response.toLowerCase();
        
        // Check if AI is asking about yesterday's work
        if (lowerResponse.includes("yesterday") && 
            (lowerResponse.includes("what did you") || lowerResponse.includes("what have you"))) {
            currentStage = 'yesterday';
            lastResponseType = 'asked-yesterday';
        }
        // Check if AI is asking about today's plans
        else if (lowerResponse.includes("today") && 
                (lowerResponse.includes("what") || lowerResponse.includes("plan"))) {
            currentStage = 'today';
            lastResponseType = 'asked-today';
        }
        // Check if AI is asking about blockers
        else if ((lowerResponse.includes("blocker") || lowerResponse.includes("impediment") || 
                 lowerResponse.includes("obstacle") || lowerResponse.includes("challenge")) &&
                lowerResponse.includes("?")) {
            currentStage = 'blockers';
            lastResponseType = 'asked-blockers';
        }
        // Check if AI is moving to next person
        else if ((lowerResponse.includes("who") && lowerResponse.includes("next")) ||
                lowerResponse.includes("would anyone else") ||
                (lowerResponse.includes("thanks") && lowerResponse.includes("update"))) {
            currentStage = 'greeting';
            lastResponseType = 'next-person';
            currentSpeaker = '';
        }
        // Check if AI is wrapping up the meeting
        else if (lowerResponse.includes("wrap") && lowerResponse.includes("up")) {
            currentStage = 'ending';
            lastResponseType = 'ending';
        }
    }
    
    // Helper functions to detect message context
    function isIntroduction(message) {
        const lowerMsg = message.toLowerCase();
        return (lowerMsg.includes("i am") || lowerMsg.includes("i'm") || 
                lowerMsg.includes("this is") || lowerMsg.includes("my name is") ||
                lowerMsg.startsWith("hi") || lowerMsg.startsWith("hello") ||
                lowerMsg.startsWith("hey"));
    }
    
    function extractName(message) {
        // Simple name extraction from common introduction patterns
        const patterns = [
            /(?:i am|i'm|this is|my name is) ([A-Z][a-z]+)/i,
            /^(?:hi|hello|hey),? (?:i(?:'| a)m|this is) ([A-Z][a-z]+)/i,
            /^([A-Z][a-z]+) here/i
        ];
        
        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return '';
    }
    
    function messageContainsYesterday(message) {
        return message.includes("yesterday") || 
               message.includes("completed") || 
               message.includes("worked on") ||
               message.includes("finished") ||
               message.includes("last day");
    }
    
    function messageContainsToday(message) {
        return message.includes("today") || 
               message.includes("going to") || 
               message.includes("plan") ||
               message.includes("will be");
    }
    
    function messageContainsBlockers(message) {
        return message.includes("blocker") || 
               message.includes("impediment") || 
               message.includes("issue") ||
               message.includes("problem") ||
               message.includes("stuck") ||
               message.includes("need help") ||
               message.includes("challenge");
    }
    
    function messageIndicatesFinished(message) {
        return message.includes("that's all") || 
               message.includes("that is all") || 
               message.includes("that's it") ||
               message.includes("i'm done") ||
               message.includes("finished") ||
               message.length < 10;
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
    
    // Function for voice input
    function startVoiceInput() {
        // Update button to show recording status
        voiceBtn.classList.add('btn-danger');
        voiceBtn.classList.remove('btn-outline-secondary');
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i> Recording...';
        
        // Call the backend speech-to-text endpoint
        fetch('/listen')
            .then(response => response.json())
            .then(data => {
                // Reset button
                voiceBtn.classList.remove('btn-danger');
                voiceBtn.classList.add('btn-outline-secondary');
                voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                
                if (data.success) {
                    // Add the recognized text to the input field
                    userInput.value = data.text;
                    userInput.focus();
                    
                    // If text was recognized, send the message
                    if (data.text && data.text.trim() !== '') {
                        sendMessage();
                    }
                } else {
                    console.error('Speech recognition error:', data.message);
                    alert('Voice recognition failed. Please try again or type your message.');
                }
            })
            .catch(error => {
                console.error('Error with voice recognition:', error);
                voiceBtn.classList.remove('btn-danger');
                voiceBtn.classList.add('btn-outline-secondary');
                voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                alert('Voice recognition error. Please try again or type your message.');
            });
    }
});
