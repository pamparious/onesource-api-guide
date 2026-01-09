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
        async infer(query, context = {}, extendedTimeout = false) {
            const startTime = Date.now();

            try {
                console.log('[OpenArena] Sending request via', this.useProxy ? 'proxy' : 'direct API',
                           extendedTimeout ? '(extended timeout)' : '');

                let responseData;

                if (this.useProxy) {
                    // Use proxy server
                    const payload = {
                        apiToken: this.apiToken,
                        workflowId: this.workflowId,
                        query: query,
                        context: context,
                        extendedTimeout: extendedTimeout
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

                        // Check if this was a timeout error on first attempt
                        if (errorData.isTimeout && !extendedTimeout) {
                            console.log('[OpenArena] Request timed out, retrying with extended timeout...');

                            // Show progress message to user
                            if (window.showTimeoutMessage) {
                                window.showTimeoutMessage();
                            }

                            // Retry with extended timeout
                            return await this.infer(query, context, true);
                        }

                        throw new Error(errorData.message || errorData.error || `Proxy error: ${response.status} ${response.statusText}`);
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
         * Create system prompt based on selected agent
         */
        createSystemPrompt() {
            const selectedAgent = sessionStorage.getItem('selected_agent') || 'api';

            const prompts = {
                'api': `You are an API Integration Expert for TR ONESOURCE E-Invoicing. You specialize in:

**Core Expertise:**
- OAuth 2.0 authentication (client credentials, authorization code flows)
- RESTful API integration patterns and best practices
- E-invoicing API endpoints (GET/POST Documents, Companies, Actions, Status)
- AR (Accounts Receivable) and AP (Accounts Payable) workflows
- Document lifecycle management and status polling strategies
- Error handling and retry logic
- Token management and session handling

**Technical Focus:**
- Provide code examples in Python, JavaScript, Java, or other languages
- Explain API request/response structures with examples
- Guide on pagination, filtering, and query parameters
- Share best practices for production deployments
- Troubleshoot common integration issues

**Response Style:**
- Clear, technical, and actionable
- Include curl/code examples when relevant
- Reference specific endpoints and parameters
- Keep responses concise but thorough`,

                'puf': `You are a PUF (Pagero Universal Format) Specialist for TR ONESOURCE E-Invoicing. You are the expert on:

**Core Expertise:**
- PUF XML structure and schema (based on UBL 2.1)
- Document types: Invoice, CreditNote, ApplicationResponse, DebitNote
- Required and optional fields for different countries
- Country-specific validation rules and compliance requirements
- Format conversion (your system → PUF → country formats)
- Tax calculations, codes, and categorization

**Technical Focus:**
- Help construct valid PUF XML documents
- Explain field mappings from ERP data to PUF
- Troubleshoot validation errors with specific fixes
- Guide on handling complex scenarios (multi-currency, tax exemptions, discounts)
- Provide XML examples for common document types
- Explain PUF extensions and custom fields

**Response Style:**
- Provide XML snippets and complete examples
- Explain validation rules clearly
- Reference PUF specification details
- Focus on practical implementation
- Help debug XML structure issues`,

                'ccr': `You are a CCR (Continuous Transaction Controls) Compliance Guide for TR ONESOURCE E-Invoicing. You specialize in:

**Core Expertise:**
- CTC mandates by country (Italy, France, Spain, Poland, etc.)
- Real-time clearance requirements with tax authorities
- Pre-clearance validation and approval workflows
- Rejection handling and resubmission procedures
- Business acknowledgment processes (accepted/rejected/under query)
- Country-specific compliance rules and deadlines

**Compliance Focus:**
- Explain country-specific e-invoicing regulations
- Guide on mandatory fields for tax authority clearance
- Help understand clearance statuses (Pending, Approved, Rejected)
- Troubleshoot rejection reasons and how to fix them
- Advise on archival and retention requirements
- Clarify legal obligations and penalties

**Response Style:**
- Clear explanations of regulatory requirements
- Country-specific guidance with examples
- Step-by-step compliance procedures
- Reference official regulations when relevant
- Help navigate complex compliance scenarios`
            };

            return prompts[selectedAgent] || prompts['api'];
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
