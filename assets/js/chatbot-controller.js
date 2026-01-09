/**
 * TR ONESOURCE API Guide - Chatbot Controller
 * Handles message logic, context injection, and OpenArena integration
 */

(function() {
    'use strict';

    let openArenaClient = null;

    /**
     * Get workflow ID based on selected agent
     */
    function getWorkflowIdForAgent() {
        const selectedAgent = sessionStorage.getItem('selected_agent') || 'api';

        // Workflow IDs for each agent
        const workflowIds = {
            'api': '74f9914d-b8c9-44f0-ad5c-13af2d02144c',
            'puf': 'f5a1f931-82f3-4b50-a051-de3e175e3d5f',  // PUF AI Agent
            'ccr': 'f87b828b-39cb-4a9e-9225-bb9e67ff4860'   // Country CCR Expert
        };

        return workflowIds[selectedAgent] || workflowIds['api'];
    }

    /**
     * Initialize chatbot controller
     */
    function initializeChatbot() {
        // Listen for send message events from chatbot-ui.js
        document.addEventListener('chatbot:sendMessage', handleSendMessage);

        // Listen for agent switch events to reinitialize client
        document.addEventListener('chatbot:agentSwitched', handleAgentSwitch);

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

        // Get workflow ID based on selected agent
        const workflowId = getWorkflowIdForAgent();

        // Initialize client if needed
        if (!openArenaClient) {
            openArenaClient = new window.OpenArenaClient(apiToken, workflowId);
            console.log('[Chatbot] OpenArena client initialized with workflow ID:', workflowId);
        }

        // Extract current page context
        const context = extractPageContext();

        console.log('[Chatbot] Context extracted:', context);

        try {
            // Call OpenArena API
            const response = await openArenaClient.infer(message, context);

            if (response.success && response.content) {
                // Display AI response
                if (window.addAIMessage) {
                    window.addAIMessage(response.content);
                }
            } else {
                // Display error
                if (window.showChatError) {
                    window.showChatError(response.error_message || 'Unknown error occurred');
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

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeChatbot);
    } else {
        initializeChatbot();
    }

})();
