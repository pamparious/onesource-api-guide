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
        const chatContainer = document.getElementById('chatbot-container');
        if (!chatContainer) {
            console.warn('[Chatbot] Container #chatbot-container not found');
            return;
        }

        // Create overlay
        const chatOverlay = document.createElement('div');
        chatOverlay.id = 'chatOverlay';

        // Create chat button
        const chatButton = document.createElement('button');
        chatButton.id = 'chatButton';
        chatButton.setAttribute('aria-label', 'Open AI Assistant');
        chatButton.innerHTML = '<i class="fas fa-robot"></i>';

        // Create chat panel
        const chatPanel = document.createElement('div');
        chatPanel.id = 'chatPanel';
        chatPanel.innerHTML = `
            <div class="chat-header">
                <div class="chat-header-top">
                    <div class="chat-header-title">
                        <i class="fas fa-robot"></i>
                        <div>
                            <h3>AI Assistant</h3>
                            <div class="chat-header-subtitle">Powered by OpenArena</div>
                        </div>
                    </div>
                    <div class="chat-header-actions">
                        <div class="mode-selector-container">
                            <button class="chat-header-btn mode-selector-btn" id="modeSelectorBtn" aria-label="Select mode" title="Assistant Mode">
                                <i class="fas fa-layer-group"></i>
                                <span class="mode-label">Supervisor</span>
                                <i class="fas fa-chevron-down mode-arrow"></i>
                            </button>
                            <div class="mode-dropdown" id="modeDropdown">
                                <div class="mode-option active" data-mode="supervisor">
                                    <div class="mode-option-header">
                                        <i class="fas fa-layer-group"></i>
                                        <span>Supervisor Mode</span>
                                        <i class="fas fa-check mode-check"></i>
                                    </div>
                                    <div class="mode-option-desc">Automatically coordinates all agents for best results</div>
                                    <span class="mode-badge recommended">Recommended</span>
                                </div>
                                <div class="mode-option" data-mode="manual">
                                    <div class="mode-option-header">
                                        <i class="fas fa-hand-pointer"></i>
                                        <span>Manual Mode</span>
                                        <i class="fas fa-check mode-check"></i>
                                    </div>
                                    <div class="mode-option-desc">Choose a specific agent (API, PUF, or CCR)</div>
                                </div>
                            </div>
                        </div>
                        <button class="chat-header-btn" id="reportModeToggle" aria-label="Toggle report context mode" title="Report Context Mode">
                            <i class="fas fa-file-alt"></i>
                        </button>
                        <button class="chat-header-btn" id="chatConfigBtn" aria-label="Configure API settings" title="API Settings">
                            <i class="fas fa-cog"></i>
                        </button>
                        <button class="chat-header-btn" id="chatCloseBtn" aria-label="Close chat">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="supervisor-activity" id="supervisorActivity">
                    <div class="supervisor-spinner"></div>
                    <span class="supervisor-text">Coordinating agents...</span>
                    <div class="active-agents" id="activeAgents"></div>
                </div>
                <div class="agent-switcher" id="agentSwitcher">
                    <button class="agent-tab active" data-agent="api">
                        <i class="fas fa-code"></i> API
                    </button>
                    <button class="agent-tab" data-agent="puf">
                        <i class="fas fa-file-code"></i> PUF
                    </button>
                    <button class="agent-tab" data-agent="ccr">
                        <i class="fas fa-globe"></i> CCR
                    </button>
                </div>
            </div>

            <div class="chat-messages" id="chatMessages">
                <div class="chat-welcome">
                    <i class="fas fa-robot"></i>
                    <h4>Welcome to the ONESOURCE API Assistant!</h4>
                    <p>I can help you with integration questions, API documentation, and troubleshooting.</p>

                    <div class="welcome-features">
                        <div class="welcome-feature">
                            <i class="fas fa-layer-group"></i>
                            <div>
                                <strong>Supervisor Mode (Default)</strong>
                                <span>AI coordinates API, PUF, and CCR agents for comprehensive answers</span>
                            </div>
                        </div>
                        <div class="welcome-feature">
                            <i class="fas fa-brain"></i>
                            <div>
                                <strong>4 AI Strategies Available</strong>
                                <span>Choose from Rule-Based (fast), AI Routing, AI Synthesis, or Full AI (highest quality)</span>
                            </div>
                        </div>
                        <div class="welcome-feature">
                            <i class="fas fa-file-alt"></i>
                            <div>
                                <strong>Report Context</strong>
                                <span>Generate a partner report and I'll reference it in my answers</span>
                            </div>
                        </div>
                    </div>

                    <div class="chat-suggestions">
                        <div class="chat-suggestion" data-question="How do I authenticate with the API?">
                            <i class="fas fa-key"></i> How do I authenticate with the API?
                        </div>
                        <div class="chat-suggestion" data-question="What are the mandatory fields for Poland?">
                            <i class="fas fa-globe"></i> What are the mandatory fields for Poland?
                        </div>
                        <div class="chat-suggestion" data-question="How do I validate PUF XML?">
                            <i class="fas fa-file-code"></i> How do I validate PUF XML?
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
                    <h3>Configure AI Assistant</h3>
                    <button class="modal-close" id="modalCloseBtn" aria-label="Close modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Configure your AI assistant settings:</p>
                    <div class="modal-success">
                        <i class="fas fa-check-circle"></i>
                        <strong>Ready to use:</strong> Supervisor AI is pre-configured. All AI strategies are available.
                    </div>
                    <div class="modal-warning">
                        <strong>POC Notice:</strong> Settings are stored in your browser session only.
                    </div>
                    <div class="form-group">
                        <label for="apiTokenInput">API Token (ESSO):</label>
                        <input
                            type="password"
                            id="apiTokenInput"
                            placeholder="Enter your TR OpenArena API token"
                            autocomplete="off">
                    </div>

                    <!-- Supervisor Workflow ID is now hardcoded in config, no user input needed -->
                    <div class="form-group" style="display: none;">
                        <label for="supervisorWorkflowInput">
                            Supervisor Workflow ID:
                            <span class="field-optional">(pre-configured)</span>
                        </label>
                        <input
                            type="text"
                            id="supervisorWorkflowInput"
                            value="18c5363b-a00c-4b80-9b3d-4f45f955288a"
                            disabled
                            autocomplete="off">
                        <p class="field-help">
                            <i class="fas fa-check-circle"></i>
                            Supervisor workflow is pre-configured. AI modes ready to use.
                        </p>
                    </div>

                    <div class="form-group">
                        <label for="supervisorStrategySelect">Supervisor Strategy:</label>
                        <select id="supervisorStrategySelect" class="form-select">
                            <option value="rule-based">Rule-Based (Fast) - Keyword routing</option>
                            <option value="ai-routing">AI Routing - Smart query analysis</option>
                            <option value="ai-synthesis">AI Synthesis - Better responses</option>
                            <option value="full-ai">Full AI - Highest quality (slower)</option>
                        </select>
                        <div class="strategy-info" id="strategyInfo">
                            <div class="strategy-detail">
                                <i class="fas fa-clock"></i>
                                <span id="strategyLatency">0ms overhead</span>
                            </div>
                            <div class="strategy-detail">
                                <i class="fas fa-dollar-sign"></i>
                                <span id="strategyCost">$0 extra</span>
                            </div>
                            <div class="strategy-detail">
                                <i class="fas fa-chart-line"></i>
                                <span id="strategyAccuracy">~85% accuracy</span>
                            </div>
                        </div>
                        <p class="strategy-desc" id="strategyDesc">Keyword matching for routing, simple concatenation for synthesis</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-modal btn-modal-secondary" id="modalCancelBtn">Cancel</button>
                    <button class="btn-modal btn-modal-primary" id="modalSaveBtn">Save Settings</button>
                </div>
            </div>
        `;

        // Append elements to chat container
        chatContainer.appendChild(chatOverlay);
        chatContainer.appendChild(chatButton);
        chatContainer.appendChild(chatPanel);
        chatContainer.appendChild(apiKeyModal);

        // Initialize event listeners
        initializeEventListeners();

        console.log('[Chatbot] UI initialized successfully');
    }

    /**
     * Initialize all event listeners
     */
    function initializeEventListeners() {
        const chatButton = document.getElementById('chatButton');
        const headerAIButton = document.getElementById('headerAIButton');
        const chatPanel = document.getElementById('chatPanel');
        const chatOverlay = document.getElementById('chatOverlay');
        const chatCloseBtn = document.getElementById('chatCloseBtn');
        const chatConfigBtn = document.getElementById('chatConfigBtn');
        const apiKeyModal = document.getElementById('apiKeyModal');
        const modalCloseBtn = document.getElementById('modalCloseBtn');
        const modalCancelBtn = document.getElementById('modalCancelBtn');
        const modalSaveBtn = document.getElementById('modalSaveBtn');
        const chatInput = document.getElementById('chatInput');
        const chatSendBtn = document.getElementById('chatSendBtn');
        const reportModeToggle = document.getElementById('reportModeToggle');
        const modeSelectorBtn = document.getElementById('modeSelectorBtn');
        const modeDropdown = document.getElementById('modeDropdown');
        const supervisorStrategySelect = document.getElementById('supervisorStrategySelect');

        // Toggle report mode
        if (reportModeToggle) {
            reportModeToggle.addEventListener('click', toggleReportMode);
        }

        // Supervisor strategy selector
        if (supervisorStrategySelect) {
            // Load saved strategy
            const savedStrategy = sessionStorage.getItem('supervisor_strategy') || 'rule-based';
            supervisorStrategySelect.value = savedStrategy;
            updateStrategyInfo(savedStrategy);

            // Handle strategy change
            supervisorStrategySelect.addEventListener('change', function() {
                const strategy = this.value;
                updateStrategyInfo(strategy);
            });
        }

        // Mode selector dropdown
        if (modeSelectorBtn) {
            modeSelectorBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                modeDropdown.classList.toggle('active');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', function(e) {
                if (!e.target.closest('.mode-selector-container')) {
                    modeDropdown.classList.remove('active');
                }
            });

            // Handle mode selection
            document.querySelectorAll('.mode-option').forEach(option => {
                option.addEventListener('click', function() {
                    const mode = this.getAttribute('data-mode');
                    switchMode(mode);
                    modeDropdown.classList.remove('active');
                });
            });
        }

        // Toggle chat panel (floating button)
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

        // Toggle chat panel (header button)
        if (headerAIButton) {
            headerAIButton.addEventListener('click', function() {
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

        // Close chat on overlay click
        if (chatOverlay) {
            chatOverlay.addEventListener('click', closeChatPanel);
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

        // Handle agent switcher
        document.addEventListener('click', function(e) {
            if (e.target.closest('.agent-tab')) {
                const tab = e.target.closest('.agent-tab');
                const agent = tab.getAttribute('data-agent');
                switchAgent(agent);
            }
        });
    }

    /**
     * Switch mode (supervisor vs manual)
     */
    function switchMode(mode) {
        // Update active mode option
        document.querySelectorAll('.mode-option').forEach(option => {
            option.classList.remove('active');
            if (option.getAttribute('data-mode') === mode) {
                option.classList.add('active');
            }
        });

        // Update mode label in button
        const modeLabel = document.querySelector('.mode-label');
        if (modeLabel) {
            modeLabel.textContent = mode === 'supervisor' ? 'Supervisor' : 'Manual';
        }

        // Store mode preference
        sessionStorage.setItem('assistant_mode', mode);

        // Show/hide agent switcher based on mode
        const agentSwitcher = document.getElementById('agentSwitcher');
        const supervisorActivity = document.getElementById('supervisorActivity');

        if (mode === 'supervisor') {
            // Supervisor mode: hide agent tabs
            if (agentSwitcher) {
                agentSwitcher.style.display = 'none';
            }
            // Update subtitle
            updateSubtitle('Supervisor coordinates all agents');
        } else {
            // Manual mode: show agent tabs
            if (agentSwitcher) {
                agentSwitcher.style.display = 'flex';
            }
            // Update subtitle based on selected agent
            const selectedAgent = sessionStorage.getItem('selected_agent') || 'api';
            const agentNames = {
                'api': 'API Integration Expert',
                'puf': 'PUF Format Specialist',
                'ccr': 'CCR Country Guide'
            };
            updateSubtitle(agentNames[selectedAgent] || 'Powered by OpenArena');
        }

        // Dispatch event to notify controller
        document.dispatchEvent(new CustomEvent('chatbot:modeChanged', {
            detail: { mode }
        }));

        console.log(`[Chatbot] Switched to ${mode} mode`);
    }

    /**
     * Update header subtitle
     */
    function updateSubtitle(text) {
        const subtitle = document.querySelector('.chat-header-subtitle');
        if (subtitle) {
            subtitle.textContent = text;
        }
    }

    /**
     * Switch active agent (for manual mode)
     */
    function switchAgent(agent) {
        // Update active tab
        document.querySelectorAll('.agent-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-agent') === agent) {
                tab.classList.add('active');
            }
        });

        // Store selected agent
        sessionStorage.setItem('selected_agent', agent);

        // Update header subtitle if in manual mode
        const mode = sessionStorage.getItem('assistant_mode') || 'supervisor';
        if (mode === 'manual') {
            const agentNames = {
                'api': 'API Integration Expert',
                'puf': 'PUF Format Specialist',
                'ccr': 'CCR Country Guide'
            };
            updateSubtitle(agentNames[agent] || 'Powered by OpenArena');
        }

        // Dispatch event to notify controller to reinitialize client
        document.dispatchEvent(new CustomEvent('chatbot:agentSwitched', {
            detail: { agent }
        }));

        console.log(`[Chatbot] Switched to ${agent} agent`);
    }

    /**
     * Open chat panel
     */
    function openChatPanel() {
        const chatButton = document.getElementById('chatButton');
        const headerAIButton = document.getElementById('headerAIButton');
        const chatPanel = document.getElementById('chatPanel');
        const chatOverlay = document.getElementById('chatOverlay');

        chatPanel.classList.add('active');
        if (chatButton) chatButton.classList.add('active');
        if (headerAIButton) headerAIButton.classList.add('active');
        if (chatOverlay) chatOverlay.classList.add('active');

        // Change icons
        if (chatButton) {
            const icon = chatButton.querySelector('i');
            if (icon) icon.className = 'fas fa-times';
        }

        // Restore mode preference (default to supervisor)
        const savedMode = sessionStorage.getItem('assistant_mode') || 'supervisor';
        switchMode(savedMode);

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
        const headerAIButton = document.getElementById('headerAIButton');
        const chatPanel = document.getElementById('chatPanel');
        const chatOverlay = document.getElementById('chatOverlay');

        chatPanel.classList.remove('active');
        if (chatButton) chatButton.classList.remove('active');
        if (headerAIButton) headerAIButton.classList.remove('active');
        if (chatOverlay) chatOverlay.classList.remove('active');

        // Change icons back
        if (chatButton) {
            const icon = chatButton.querySelector('i');
            if (icon) icon.className = 'fas fa-robot';
        }

        // Restore body scroll
        document.body.style.overflow = '';
    }

    /**
     * Open API key modal
     */
    function openApiKeyModal() {
        const apiKeyModal = document.getElementById('apiKeyModal');
        const apiTokenInput = document.getElementById('apiTokenInput');
        const supervisorWorkflowInput = document.getElementById('supervisorWorkflowInput');

        // Pre-fill with existing values if any
        const storedToken = sessionStorage.getItem('openarena_token');
        const storedSupervisorWorkflow = sessionStorage.getItem('supervisor_workflow_id');

        if (apiTokenInput && storedToken) {
            apiTokenInput.value = storedToken;
        }

        if (supervisorWorkflowInput && storedSupervisorWorkflow) {
            supervisorWorkflowInput.value = storedSupervisorWorkflow;
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
     * Save API credentials and settings
     */
    function saveApiCredentials() {
        const apiTokenInput = document.getElementById('apiTokenInput');
        const supervisorWorkflowInput = document.getElementById('supervisorWorkflowInput');
        const supervisorStrategySelect = document.getElementById('supervisorStrategySelect');

        const apiToken = apiTokenInput.value.trim();

        if (!apiToken) {
            alert('Please enter your API token.');
            return;
        }

        // Store API token in sessionStorage
        sessionStorage.setItem('openarena_token', apiToken);

        // Store supervisor workflow ID if provided
        if (supervisorWorkflowInput) {
            const supervisorWorkflow = supervisorWorkflowInput.value.trim();
            if (supervisorWorkflow) {
                sessionStorage.setItem('supervisor_workflow_id', supervisorWorkflow);
                console.log('[Chatbot] Supervisor workflow ID set:', supervisorWorkflow);
            }
        }

        // Store supervisor strategy
        if (supervisorStrategySelect) {
            const strategy = supervisorStrategySelect.value;
            sessionStorage.setItem('supervisor_strategy', strategy);
            console.log('[Chatbot] Supervisor strategy set to:', strategy);
        }

        closeApiKeyModal();

        // Show success message
        addSystemMessage('✓ Settings saved successfully!');
    }

    /**
     * Update strategy info display
     */
    function updateStrategyInfo(strategy) {
        const strategyConfig = {
            'rule-based': {
                latency: '0ms overhead',
                cost: '$0 extra',
                accuracy: '~85% accuracy',
                desc: 'Keyword matching for routing, simple concatenation for synthesis. Fastest option.'
            },
            'ai-routing': {
                latency: '+500ms overhead',
                cost: '+$0.001 per query',
                accuracy: '~95% accuracy',
                desc: 'LLM analyzes queries for smart routing decisions. Better agent selection.'
            },
            'ai-synthesis': {
                latency: '+800ms overhead',
                cost: '+$0.0015 per query',
                accuracy: '~90% routing, better responses',
                desc: 'Keyword routing with LLM-synthesized responses. Coherent, well-structured answers.'
            },
            'full-ai': {
                latency: '+1.2s overhead',
                cost: '+$0.0025 per query',
                accuracy: '~98% accuracy',
                desc: 'LLM for both routing and synthesis. Highest quality, smartest coordination.'
            }
        };

        const config = strategyConfig[strategy] || strategyConfig['rule-based'];

        const latencyEl = document.getElementById('strategyLatency');
        const costEl = document.getElementById('strategyCost');
        const accuracyEl = document.getElementById('strategyAccuracy');
        const descEl = document.getElementById('strategyDesc');

        if (latencyEl) latencyEl.textContent = config.latency;
        if (costEl) costEl.textContent = config.cost;
        if (accuracyEl) accuracyEl.textContent = config.accuracy;
        if (descEl) descEl.textContent = config.desc;
    }

    /**
     * Check if API credentials are set
     */
    function hasApiCredentials() {
        return sessionStorage.getItem('openarena_token');
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
    window.addAIMessage = function(message, source = 'ai', metadata = null) {
        hideTyping();
        const chatMessages = document.getElementById('chatMessages');
        const messageEl = createMessageElement('ai', message, source, metadata);
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
    function createMessageElement(type, message, source = 'ai', metadata = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;

        const time = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const icon = type === 'ai' ? 'fa-robot' : 'fa-user';

        // Build metadata badges
        let badgesHtml = '';
        if (metadata) {
            if (metadata.supervisorStrategy) {
                const strategyIcons = {
                    'rule-based': '⚡',
                    'ai-routing': '🤖',
                    'ai-synthesis': '✨',
                    'full-ai': '🧠'
                };
                const icon = strategyIcons[metadata.supervisorStrategy] || '⚡';
                const strategyNames = {
                    'rule-based': 'Rule-Based',
                    'ai-routing': 'AI Routing',
                    'ai-synthesis': 'AI Synthesis',
                    'full-ai': 'Full AI'
                };
                const name = strategyNames[metadata.supervisorStrategy] || metadata.supervisorStrategy;
                badgesHtml += `<span class="message-badge supervisor-badge" title="Supervisor: ${name}">${icon} ${name}</span>`;
            }
            if (metadata.reportContextUsed) {
                badgesHtml += '<span class="message-badge report-badge" title="Using your report context"><i class="fas fa-file-alt"></i> Report</span>';
            }
            if (metadata.strategy) {
                badgesHtml += `<span class="message-badge strategy-badge" title="Execution: ${metadata.strategy}">${metadata.strategy}</span>`;
            }
            if (metadata.agentsUsed && metadata.agentsUsed.length > 0) {
                const agentNames = metadata.agentsUsed.map(a => a.toUpperCase()).join(', ');
                badgesHtml += `<span class="message-badge agents-badge" title="Agents: ${agentNames}">${metadata.agentsUsed.length} agent${metadata.agentsUsed.length > 1 ? 's' : ''}</span>`;
            }
            if (metadata.duration) {
                badgesHtml += `<span class="message-badge time-badge" title="Response time">${metadata.duration}</span>`;
            }
        }

        messageDiv.innerHTML = `
            <div class="chat-message-avatar">
                <i class="fas ${icon}"></i>
            </div>
            <div class="chat-message-content">
                ${badgesHtml ? `<div class="message-badges">${badgesHtml}</div>` : ''}
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

    /**
     * Display timeout message (when retrying with extended timeout)
     */
    window.showTimeoutMessage = function() {
        addSystemMessage('⏳ Response is taking longer than expected. Retrying with extended timeout (up to 3 minutes)...');
    };

    /**
     * Toggle report context mode
     */
    function toggleReportMode() {
        const button = document.getElementById('reportModeToggle');
        const isActive = button.classList.contains('active');

        if (isActive) {
            // Turn OFF
            button.classList.remove('active');
            button.setAttribute('title', 'Report Context Mode: OFF');
        } else {
            // Turn ON
            button.classList.add('active');
            button.setAttribute('title', 'Report Context Mode: ON');
        }

        // Dispatch event to controller
        document.dispatchEvent(new CustomEvent('chatbot:toggleReportMode', {
            detail: { enabled: !isActive }
        }));

        console.log('[Chatbot UI] Report mode:', !isActive ? 'ON' : 'OFF');
    }

    /**
     * Show supervisor activity indicator
     */
    window.showSupervisorActivity = function(agents) {
        const supervisorActivity = document.getElementById('supervisorActivity');
        const activeAgentsDiv = document.getElementById('activeAgents');

        if (!supervisorActivity) return;

        // Build agent badges
        let badgesHtml = '';
        if (agents && agents.length > 0) {
            agents.forEach(agent => {
                const agentNames = {
                    'api': 'API',
                    'puf': 'PUF',
                    'ccr': 'CCR'
                };
                badgesHtml += `<span class="agent-badge ${agent}">${agentNames[agent] || agent.toUpperCase()}</span>`;
            });
        }

        activeAgentsDiv.innerHTML = badgesHtml;
        supervisorActivity.classList.add('active');
    };

    /**
     * Hide supervisor activity indicator
     */
    window.hideSupervisorActivity = function() {
        const supervisorActivity = document.getElementById('supervisorActivity');
        if (supervisorActivity) {
            supervisorActivity.classList.remove('active');
        }
    };

    /**
     * Update supervisor status text
     */
    window.updateSupervisorStatus = function(status) {
        const supervisorText = document.querySelector('.supervisor-text');
        if (supervisorText) {
            supervisorText.textContent = status;
        }
    };

    /**
     * Show report warning
     */
    window.showReportWarning = function(message) {
        addSystemMessage(`⚠️ ${message}`);
    };

    // Initialize chatbot UI when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createChatbotUI);
    } else {
        createChatbotUI();
    }

})();
