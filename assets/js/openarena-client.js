/**
 * TR ONESOURCE API Guide - OpenArena Client
 * TR OpenArena API integration based on OPEN_ARENA_SETUP_GUIDE.md
 */

(function() {
    'use strict';

    /**
     * TR OpenArena Client Class
     */
    class OpenArenaClient {
        constructor(apiToken, workflowId, useProxy = true) {
            this.apiToken = apiToken;
            this.workflowId = workflowId;
            this.useProxy = useProxy;

            // Proxy URL - Use local proxy for development
            this.proxyURL = 'http://localhost:3000/api/proxy';

            // Direct API URL (will cause CORS errors from browser)
            this.baseURL = 'https://aiopenarena.gcs.int.thomsonreuters.com';
            this.defaultModel = 'claude-sonnet-4';
        }

        /**
         * Execute LLM inference using OpenArena workflow API
         */
        async infer(query, context = {}) {
            const startTime = Date.now();

            try {
                console.log('[OpenArena] Sending request via', this.useProxy ? 'proxy' : 'direct API');

                let responseData;

                if (this.useProxy) {
                    // Use proxy server
                    const payload = {
                        apiToken: this.apiToken,
                        workflowId: this.workflowId,
                        query: query,
                        context: context
                    };

                    const response = await fetch(this.proxyURL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error || `Proxy error: ${response.status} ${response.statusText}`);
                    }

                    responseData = await response.json();

                } else {
                    // Direct API call (will likely fail with CORS)
                    const systemPrompt = this.createSystemPrompt();
                    const userPrompt = this.createUserPrompt(query, context);
                    const combinedQuery = `${systemPrompt}\n\n${userPrompt}`;

                    const payload = {
                        workflow_id: this.workflowId,
                        query: combinedQuery,
                        is_persistence_allowed: false,
                        modelparams: {
                            [this.defaultModel]: {
                                temperature: '0.1',
                                max_tokens: '4000',
                                system_prompt: systemPrompt
                            }
                        }
                    };

                    const response = await fetch(`${this.baseURL}/v1/inference`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${this.apiToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    // Parse response
                    responseData = await response.json();

                    const resultData = responseData.result || {};

                    // Extract content from Open Arena response structure
                    let rawContent = '';
                    if (typeof resultData === 'object') {
                        const answerData = resultData.answer || {};
                        if (typeof answerData === 'object') {
                            // Try to find model response
                            rawContent = answerData[this.defaultModel] || '';
                            if (!rawContent) {
                                // Fallback to first available value
                                rawContent = Object.values(answerData)[0] || '';
                            }
                        }
                    }

                    if (typeof rawContent !== 'string') {
                        rawContent = String(rawContent);
                    }

                    // Add extracted content to responseData for consistency
                    responseData.content = rawContent;
                }

                // Handle response (works for both proxy and direct API)
                const content = responseData.content || '';
                const tokensUsed = responseData.tokens_used || 0;
                const inferenceTime = (Date.now() - startTime) / 1000;

                console.log(`[OpenArena] Success - ${tokensUsed} tokens, ${inferenceTime.toFixed(2)}s`);

                return {
                    success: true,
                    content: content,
                    tokens_used: tokensUsed,
                    inference_time: inferenceTime,
                    model_used: responseData.model_used || this.defaultModel
                };

            } catch (error) {
                const inferenceTime = (Date.now() - startTime) / 1000;

                console.error('[OpenArena] Error:', error);
                console.error('[OpenArena] Error type:', error.constructor.name);
                console.error('[OpenArena] API URL:', `${this.baseURL}/v1/inference`);

                // Provide detailed error message
                let errorMessage = error.message;
                if (error.message === 'Failed to fetch') {
                    errorMessage = 'Network error: This is likely a CORS issue. TR OpenArena API needs to allow requests from your domain, or you need to use a backend proxy.';
                }

                return {
                    success: false,
                    content: '',
                    error_message: errorMessage,
                    inference_time: inferenceTime,
                    model_used: this.defaultModel
                };
            }
        }

        /**
         * Create system prompt
         */
        createSystemPrompt() {
            return `You are an expert AI assistant for the TR ONESOURCE E-Invoicing API. Your role is to help partners integrate with the API by answering questions about:

- API authentication (OAuth 2.0, client credentials, authorization code flows)
- E-invoicing integration (AR/AP flows, document submission, status polling)
- PUF (Pagero Universal Format) document structure
- Error handling (recipient not found, validation errors, clearance rejection)
- Best practices for polling, token management, and error recovery
- Technical implementation details (endpoints, parameters, response formats)

Guidelines:
- Provide clear, accurate, technical answers
- Include code examples when relevant
- Reference specific API endpoints and parameters when applicable
- If you don't know something, admit it rather than guessing
- Keep responses concise but comprehensive
- Use markdown formatting for better readability`;
        }

        /**
         * Create user prompt with context
         */
        createUserPrompt(query, context) {
            let prompt = `User Question: ${query}\n\n`;

            // Add page context if available
            if (context.page) {
                prompt += `Current Page: ${context.page}\n\n`;
            }

            // Add relevant content from page if available
            if (context.pageContent && context.pageContent.length > 0) {
                prompt += `Relevant Documentation:\n${context.pageContent}\n\n`;
            }

            prompt += 'Please provide a helpful, accurate answer to the user\'s question based on the context provided.';

            return prompt;
        }

        /**
         * Health check (test connectivity)
         */
        async healthCheck() {
            try {
                const response = await fetch(`${this.baseURL}/v2/workflow?show_all=true`, {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`
                    }
                });
                return response.ok;
            } catch (error) {
                console.error('[OpenArena] Health check failed:', error);
                return false;
            }
        }
    }

    // Export to global scope
    window.OpenArenaClient = OpenArenaClient;

})();
