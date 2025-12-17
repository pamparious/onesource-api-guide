/**
 * TR ONESOURCE API Guide - Chatbot UI
 * Creates chat widget DOM elements and handles UI interactions
 */

(function() {
    'use strict';

    /**
     * Creates the complete chatbot UI structure
     */
    function createChatbotUI() {
        const chatWidget = document.getElementById('chatWidget');
        if (!chatWidget) return;

        // Create chat button
        const chatButton = document.createElement('button');
        chatButton.id = 'chatButton';
        chatButton.setAttribute('aria-label', 'Open chat assistant');
        chatButton.innerHTML = '<i class="fas fa-comments"></i>';

        // Create chat panel
        const chatPanel = document.createElement('div');
        chatPanel.id = 'chatPanel';
        chatPanel.innerHTML = `
            <div class="chat-header">
                <div class="chat-header-title">
                    <i class="fas fa-robot"></i>
                    <div>
                        <h3>API Assistant</h3>
                        <div class="chat-header-subtitle">Ask me anything!</div>
                    </div>
                </div>
                <div class="chat-header-actions">
                    <button class="chat-header-btn" id="chatConfigBtn" aria-label="Configure API settings" title="API Settings">
                        <i class="fas fa-cog"></i>
                    </button>
                    <button class="chat-header-btn" id="chatCloseBtn" aria-label="Close chat">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>

            <div class="chat-messages" id="chatMessages">
                <div class="chat-welcome">
                    <i class="fas fa-robot"></i>
                    <h4>Welcome to the ONESOURCE API Assistant!</h4>
                    <p>I can help you with integration questions, API documentation, and troubleshooting.</p>
                    <div class="chat-suggestions">
                        <div class="chat-suggestion" data-question="How do I authenticate with the API?">
                            <i class="fas fa-key"></i> How do I authenticate with the API?
                        </div>
                        <div class="chat-suggestion" data-question="What is PUF format?">
                            <i class="fas fa-file-code"></i> What is PUF format?
                        </div>
                        <div class="chat-suggestion" data-question="How do I handle recipient not found errors?">
                            <i class="fas fa-exclamation-triangle"></i> How do I handle errors?
                        </div>
                    </div>
                </div>
            </div>

            <div class="chat-typing" id="chatTyping">
                <div class="chat-typing-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="chat-typing-dots">
                    <div class="chat-typing-dot"></div>
                    <div class="chat-typing-dot"></div>
                    <div class="chat-typing-dot"></div>
                </div>
            </div>

            <div class="chat-input-container">
                <div class="chat-input-wrapper">
                    <textarea
                        id="chatInput"
                        placeholder="Ask a question..."
                        rows="1"
                        aria-label="Chat input"></textarea>
                    <button id="chatSendBtn" aria-label="Send message">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;

        // Create API key modal
        const apiKeyModal = document.createElement('div');
        apiKeyModal.id = 'apiKeyModal';
        apiKeyModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Configure API Settings</h3>
                    <button class="modal-close" id="modalCloseBtn" aria-label="Close modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>To use the AI assistant, please enter your TR OpenArena credentials:</p>
                    <div class="modal-warning">
                        <strong>POC Notice:</strong> This is a proof-of-concept implementation. Your credentials are stored in your browser session only and will be cleared when you close the browser.
                    </div>
                    <div class="form-group">
                        <label for="apiTokenInput">API Token (ESSO):</label>
                        <input
                            type="password"
                            id="apiTokenInput"
                            placeholder="Enter your TR OpenArena API token"
                            autocomplete="off">
                    </div>
                    <div class="form-group">
                        <label for="workflowIdInput">Workflow ID:</label>
                        <input
                            type="text"
                            id="workflowIdInput"
                            placeholder="Enter your workflow ID"
                            autocomplete="off">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-modal btn-modal-secondary" id="modalCancelBtn">Cancel</button>
                    <button class="btn-modal btn-modal-primary" id="modalSaveBtn">Save & Connect</button>
                </div>
            </div>
        `;

        // Append elements to chat widget
        chatWidget.appendChild(chatButton);
        chatWidget.appendChild(chatPanel);
        chatWidget.appendChild(apiKeyModal);

        // Initialize event listeners
        initializeEventListeners();
    }

    /**
     * Initialize all event listeners
     */
    function initializeEventListeners() {
        const chatButton = document.getElementById('chatButton');
        const chatPanel = document.getElementById('chatPanel');
        const chatCloseBtn = document.getElementById('chatCloseBtn');
        const chatConfigBtn = document.getElementById('chatConfigBtn');
        const apiKeyModal = document.getElementById('apiKeyModal');
        const modalCloseBtn = document.getElementById('modalCloseBtn');
        const modalCancelBtn = document.getElementById('modalCancelBtn');
        const modalSaveBtn = document.getElementById('modalSaveBtn');
        const chatInput = document.getElementById('chatInput');
        const chatSendBtn = document.getElementById('chatSendBtn');

        // Toggle chat panel
        if (chatButton) {
            chatButton.addEventListener('click', function() {
                const isActive = chatPanel.classList.contains('active');

                if (isActive) {
                    closeChatPanel();
                } else {
                    openChatPanel();
                }
            });
        }

        // Close chat panel
        if (chatCloseBtn) {
            chatCloseBtn.addEventListener('click', closeChatPanel);
        }

        // Open API key modal
        if (chatConfigBtn) {
            chatConfigBtn.addEventListener('click', openApiKeyModal);
        }

        // Close modal
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', closeApiKeyModal);
        }

        if (modalCancelBtn) {
            modalCancelBtn.addEventListener('click', closeApiKeyModal);
        }

        // Save API credentials
        if (modalSaveBtn) {
            modalSaveBtn.addEventListener('click', saveApiCredentials);
        }

        // Close modal on outside click
        if (apiKeyModal) {
            apiKeyModal.addEventListener('click', function(e) {
                if (e.target === apiKeyModal) {
                    closeApiKeyModal();
                }
            });
        }

        // Send message on button click
        if (chatSendBtn) {
            chatSendBtn.addEventListener('click', handleSendMessage);
        }

        // Send message on Enter (Shift+Enter for new line)
        if (chatInput) {
            chatInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                }
            });

            // Auto-resize textarea
            chatInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = Math.min(this.scrollHeight, 100) + 'px';
            });
        }

        // Handle suggestion clicks
        document.addEventListener('click', function(e) {
            if (e.target.closest('.chat-suggestion')) {
                const suggestion = e.target.closest('.chat-suggestion');
                const question = suggestion.getAttribute('data-question');
                if (question) {
                    sendMessage(question);
                }
            }
        });
    }

    /**
     * Open chat panel
     */
    function openChatPanel() {
        const chatButton = document.getElementById('chatButton');
        const chatPanel = document.getElementById('chatPanel');

        chatPanel.classList.add('active');
        chatButton.classList.add('active');

        // Change icon
        const icon = chatButton.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-times';
        }

        // Check if API credentials are set, if not show modal
        if (!hasApiCredentials() && !hasMessages()) {
            setTimeout(() => {
                openApiKeyModal();
            }, 500);
        }

        // Focus input
        setTimeout(() => {
            const chatInput = document.getElementById('chatInput');
            if (chatInput) chatInput.focus();
        }, 300);
    }

    /**
     * Close chat panel
     */
    function closeChatPanel() {
        const chatButton = document.getElementById('chatButton');
        const chatPanel = document.getElementById('chatPanel');

        chatPanel.classList.remove('active');
        chatButton.classList.remove('active');

        // Change icon back
        const icon = chatButton.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-comments';
        }
    }

    /**
     * Open API key modal
     */
    function openApiKeyModal() {
        const apiKeyModal = document.getElementById('apiKeyModal');
        const apiTokenInput = document.getElementById('apiTokenInput');
        const workflowIdInput = document.getElementById('workflowIdInput');

        // Pre-fill with existing values if any
        const storedToken = sessionStorage.getItem('openarena_token');
        const storedWorkflowId = sessionStorage.getItem('openarena_workflow_id');

        if (apiTokenInput && storedToken) {
            apiTokenInput.value = storedToken;
        }
        if (workflowIdInput && storedWorkflowId) {
            workflowIdInput.value = storedWorkflowId;
        }

        apiKeyModal.classList.add('active');

        // Focus first input
        setTimeout(() => {
            if (apiTokenInput) apiTokenInput.focus();
        }, 100);
    }

    /**
     * Close API key modal
     */
    function closeApiKeyModal() {
        const apiKeyModal = document.getElementById('apiKeyModal');
        apiKeyModal.classList.remove('active');
    }

    /**
     * Save API credentials
     */
    function saveApiCredentials() {
        const apiTokenInput = document.getElementById('apiTokenInput');
        const workflowIdInput = document.getElementById('workflowIdInput');

        const apiToken = apiTokenInput.value.trim();
        const workflowId = workflowIdInput.value.trim();

        if (!apiToken || !workflowId) {
            alert('Please enter both API token and workflow ID.');
            return;
        }

        // Store in sessionStorage
        sessionStorage.setItem('openarena_token', apiToken);
        sessionStorage.setItem('openarena_workflow_id', workflowId);

        closeApiKeyModal();

        // Show success message
        addSystemMessage('✓ API credentials configured successfully!');
    }

    /**
     * Check if API credentials are set
     */
    function hasApiCredentials() {
        return sessionStorage.getItem('openarena_token') &&
               sessionStorage.getItem('openarena_workflow_id');
    }

    /**
     * Check if there are any messages
     */
    function hasMessages() {
        const chatMessages = document.getElementById('chatMessages');
        return chatMessages && chatMessages.querySelectorAll('.chat-message').length > 0;
    }

    /**
     * Handle send message
     */
    function handleSendMessage() {
        const chatInput = document.getElementById('chatInput');
        const message = chatInput.value.trim();

        if (!message) return;

        // Clear input
        chatInput.value = '';
        chatInput.style.height = 'auto';

        // Send message
        sendMessage(message);
    }

    /**
     * Send message to chatbot
     */
    function sendMessage(message) {
        // Check if credentials are set
        if (!hasApiCredentials()) {
            openApiKeyModal();
            return;
        }

        // Remove welcome message if present
        const chatMessages = document.getElementById('chatMessages');
        const welcomeMsg = chatMessages.querySelector('.chat-welcome');
        if (welcomeMsg) {
            welcomeMsg.remove();
        }

        // Add user message
        addUserMessage(message);

        // Show typing indicator
        showTyping();

        // Trigger message send event (handled by chatbot-controller.js)
        const event = new CustomEvent('chatbot:sendMessage', {
            detail: { message }
        });
        document.dispatchEvent(event);
    }

    /**
     * Add user message to chat
     */
    function addUserMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        const messageEl = createMessageElement('user', message);
        chatMessages.appendChild(messageEl);
        scrollToBottom();
    }

    /**
     * Add AI message to chat
     */
    window.addAIMessage = function(message) {
        hideTyping();
        const chatMessages = document.getElementById('chatMessages');
        const messageEl = createMessageElement('ai', message);
        chatMessages.appendChild(messageEl);
        scrollToBottom();
    };

    /**
     * Add system message
     */
    function addSystemMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        const systemEl = document.createElement('div');
        systemEl.style.cssText = 'text-align: center; font-size: 12px; color: var(--color-gray); margin: 8px 0;';
        systemEl.textContent = message;
        chatMessages.appendChild(systemEl);
        scrollToBottom();
    }

    /**
     * Create message element
     */
    function createMessageElement(type, message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;

        const time = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const icon = type === 'ai' ? 'fa-robot' : 'fa-user';

        messageDiv.innerHTML = `
            <div class="chat-message-avatar">
                <i class="fas ${icon}"></i>
            </div>
            <div class="chat-message-content">
                <div class="chat-message-text">${formatMessage(message)}</div>
                <div class="chat-message-time">${time}</div>
            </div>
        `;

        return messageDiv;
    }

    /**
     * Format message (basic markdown-like formatting)
     */
    function formatMessage(message) {
        // Escape HTML
        let formatted = message
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Format inline code
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Format bold
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Convert newlines to <br>
        formatted = formatted.replace(/\n/g, '<br>');

        return formatted;
    }

    /**
     * Show typing indicator
     */
    function showTyping() {
        const chatTyping = document.getElementById('chatTyping');
        if (chatTyping) {
            chatTyping.classList.add('active');
            scrollToBottom();
        }
    }

    /**
     * Hide typing indicator
     */
    function hideTyping() {
        const chatTyping = document.getElementById('chatTyping');
        if (chatTyping) {
            chatTyping.classList.remove('active');
        }
    }

    /**
     * Scroll to bottom of messages
     */
    function scrollToBottom() {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            setTimeout(() => {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 100);
        }
    }

    /**
     * Display error message
     */
    window.showChatError = function(errorMessage) {
        hideTyping();
        addAIMessage(`I apologize, but I encountered an error: ${errorMessage}\n\nPlease check your API credentials or try again later.`);
    };

    // Initialize chatbot UI when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createChatbotUI);
    } else {
        createChatbotUI();
    }

})();
