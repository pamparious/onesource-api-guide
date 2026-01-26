/**
 * TR ONESOURCE API Guide - Chatbot Controller
 * Handles message logic, context injection, and OpenArena integration
 */

(function() {
    'use strict';

    let openArenaClient = null;
    let supervisorAgent = null;
    let reportContextManager = null;
    let reportModeActive = false;

    /**
     * Get workflow ID based on selected agent
     */
    function getWorkflowIdForAgent() {
        const selectedAgent = sessionStorage.getItem('selected_agent') || 'api';

        // Workflow IDs for each agent
        const workflowIds = {
            'api': '74f9914d-b8c9-44f0-ad5c-13af2d02144c',
            'puf': 'f5a1f931-82f3-4b50-a051-de3e175e3d5f',  // Format Agent
            'ccr': 'f87b828b-39cb-4a9e-9225-bb9e67ff4860'   // Country CCR Expert
        };

        return workflowIds[selectedAgent] || workflowIds['api'];
    }

    /**
     * Initialize chatbot controller
     */
    function initializeChatbot() {
        // Initialize report context manager
        if (window.ReportContextManager) {
            reportContextManager = new window.ReportContextManager();
            console.log('[Chatbot] Report Context Manager initialized');
        }

        // Listen for send message events from chatbot-ui.js
        document.addEventListener('chatbot:sendMessage', handleSendMessage);

        // Listen for agent switch events to reinitialize client
        document.addEventListener('chatbot:agentSwitched', handleAgentSwitch);

        // Listen for report mode toggle events
        document.addEventListener('chatbot:toggleReportMode', handleToggleReportMode);

        // Listen for mode change events
        document.addEventListener('chatbot:modeChanged', handleModeChange);

        console.log('[Chatbot] Controller initialized');
    }

    /**
     * Handle agent switch event
     */
    function handleAgentSwitch(event) {
        console.log('[Chatbot] Agent switched, reinitializing client');
        // Force client reinitialization on next message
        openArenaClient = null;
    }

    /**
     * Handle send message event
     */
    async function handleSendMessage(event) {
        const { message } = event.detail;

        console.log('[Chatbot] Handling message:', message);

        // Get API credentials
        const apiToken = sessionStorage.getItem('openarena_token');

        if (!apiToken) {
            if (window.showChatError) {
                window.showChatError('API credentials not configured.');
            }
            return;
        }

        // Extract current page context
        const pageContext = extractPageContext();

        // Load report context if toggle is ON
        let reportContext = null;
        if (reportModeActive && reportContextManager) {
            const report = reportContextManager.getLatestReport();
            if (report) {
                reportContext = reportContextManager.extractRelevantSections(message, report);
                console.log('[Chatbot] Report context loaded:', reportContext);
            } else {
                console.log('[Chatbot] Report mode ON but no report found');
            }
        }

        try {
            let response;

            // Check mode preference (default to supervisor)
            const mode = sessionStorage.getItem('assistant_mode') || 'supervisor';

            if (mode === 'supervisor') {
                // Use Supervisor mode
                console.log('[Chatbot] Using Supervisor mode');

                // Initialize supervisor if needed
                if (!supervisorAgent || !window.SupervisorAgent) {
                    console.log('[Chatbot] Initializing Supervisor Agent');
                    supervisorAgent = new window.SupervisorAgent(apiToken);
                }

                // Call supervisor
                response = await supervisorAgent.handleQuery(message, pageContext, reportContext);

                if (response.success && response.content) {
                    // Display AI response with metadata
                    if (window.addAIMessage) {
                        window.addAIMessage(response.content, 'supervisor', response.metadata);
                    }
                } else {
                    // Display error
                    if (window.showChatError) {
                        window.showChatError(response.error_message || 'Unknown error occurred');
                    }
                }

            } else {
                // Use Manual mode (existing single-agent behavior)
                console.log('[Chatbot] Using Manual mode');

                // Get workflow ID based on selected agent
                const workflowId = getWorkflowIdForAgent();

                // Initialize client if needed
                if (!openArenaClient) {
                    openArenaClient = new window.OpenArenaClient(apiToken, workflowId);
                    console.log('[Chatbot] OpenArena client initialized with workflow ID:', workflowId);
                }

                // Build enhanced message with report context if available
                let enhancedMessage = message;
                if (reportContext && reportContext.relevantSections) {
                    enhancedMessage += '\n\n--- User\'s Report Context ---\n';
                    enhancedMessage += `Report ID: ${reportContext.reportId}\n`;
                    enhancedMessage += `Countries: ${reportContext.countries.join(', ')}\n\n`;

                    reportContext.relevantSections.forEach(section => {
                        enhancedMessage += `**${section.title}**\n`;
                        enhancedMessage += section.summary + '\n\n';
                    });

                    enhancedMessage += '--- End Report Context ---\n';
                }

                // Call OpenArena API
                response = await openArenaClient.infer(enhancedMessage, pageContext);

                if (response.success && response.content) {
                    // Display AI response
                    if (window.addAIMessage) {
                        const metadata = {
                            reportContextUsed: !!reportContext,
                            mode: 'manual'
                        };
                        window.addAIMessage(response.content, 'agent', metadata);
                    }
                } else {
                    // Display error
                    if (window.showChatError) {
                        window.showChatError(response.error_message || 'Unknown error occurred');
                    }
                }
            }

        } catch (error) {
            console.error('[Chatbot] Error:', error);
            if (window.showChatError) {
                window.showChatError(error.message);
            }
        }
    }

    /**
     * Extract context from current page
     */
    function extractPageContext() {
        const context = {
            page: document.title,
            url: window.location.pathname,
            pageContent: ''
        };

        // Extract main content text (first 2000 chars)
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            const textContent = extractTextFromElement(mainContent);
            context.pageContent = textContent.substring(0, 2000);
        }

        // Extract current section if available (from hash)
        if (window.location.hash) {
            const sectionId = window.location.hash.substring(1);
            const section = document.getElementById(sectionId);
            if (section) {
                context.currentSection = section.querySelector('h2, h3')?.textContent || sectionId;
            }
        }

        return context;
    }

    /**
     * Extract clean text from element (removing scripts, styles, etc.)
     */
    function extractTextFromElement(element) {
        // Clone element to avoid modifying the original
        const clone = element.cloneNode(true);

        // Remove script and style elements
        const scriptsAndStyles = clone.querySelectorAll('script, style');
        scriptsAndStyles.forEach(el => el.remove());

        // Get text content
        let text = clone.textContent || '';

        // Clean up whitespace
        text = text.replace(/\s+/g, ' ').trim();

        return text;
    }

    /**
     * Handle report mode toggle
     */
    function handleToggleReportMode(event) {
        const { enabled } = event.detail;
        reportModeActive = enabled;
        console.log('[Chatbot] Report mode:', reportModeActive ? 'ON' : 'OFF');

        // Check if report exists
        if (enabled && reportContextManager && !reportContextManager.hasReport()) {
            console.warn('[Chatbot] Report mode enabled but no report available');
            if (window.showReportWarning) {
                window.showReportWarning('No report found. Please generate a partner onboarding report first.');
            }
        }
    }

    /**
     * Handle mode change (supervisor vs manual)
     */
    function handleModeChange(event) {
        const { mode } = event.detail;
        console.log('[Chatbot] Mode changed to:', mode);

        // Reset client when switching modes
        if (mode === 'manual') {
            openArenaClient = null;
        } else {
            supervisorAgent = null;
        }
    }

    /**
     * Test OpenArena connection
     */
    window.testOpenArenaConnection = async function() {
        const apiToken = sessionStorage.getItem('openarena_token');

        if (!apiToken) {
            console.error('[Chatbot] No API credentials found');
            return false;
        }

        const workflowId = getWorkflowIdForAgent();
        const testClient = new window.OpenArenaClient(apiToken, workflowId);
        const isHealthy = await testClient.healthCheck();

        console.log('[Chatbot] Health check result:', isHealthy);
        return isHealthy;
    };

    /**
     * Public API for setting mode (for debugging/testing)
     */
    window.setChatbotMode = function(mode) {
        if (mode !== 'supervisor' && mode !== 'manual') {
            console.error('[Chatbot] Invalid mode:', mode);
            return;
        }
        sessionStorage.setItem('assistant_mode', mode);
        document.dispatchEvent(new CustomEvent('chatbot:modeChanged', {
            detail: { mode }
        }));
        console.log('[Chatbot] Mode set to:', mode);
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeChatbot);
    } else {
        initializeChatbot();
    }

})();
