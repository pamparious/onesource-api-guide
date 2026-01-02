/**
 * TR ONESOURCE Unified Server
 * Combines AI Chatbot Proxy + Partner Onboarding Backend
 * Run with: node unified-server.js
 */

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = 3000;

// OpenArena Configuration
const OPENARENA_BASE_URL = 'https://aiopenarena.gcs.int.thomsonreuters.com/v1/inference';
const CCR_WORKFLOW_ID = 'f87b828b-39cb-4a9e-9225-bb9e67ff4860'; // Country CCR Expert
const API_WORKFLOW_ID = '74f9914d-b8c9-44f0-ad5c-13af2d02144c'; // API Expert

// Request Configuration
const CHATBOT_TIMEOUT = 30000; // 30 seconds for chatbot
const ONBOARDING_TIMEOUT = 120000; // 120 seconds for onboarding agents
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.')); // Serve static files

console.log(`\n🚀 TR ONESOURCE Unified Server`);
console.log(`================================================`);

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'TR ONESOURCE Unified Server is running',
        services: {
            chatbot: 'Ready',
            onboarding: 'Ready'
        }
    });
});

/**
 * ROUTE 1: AI Chatbot Proxy
 * Used by the AI Assistant chatbot on all pages
 */
app.post('/api/proxy', async (req, res) => {
    try {
        const { apiToken, workflowId, query, context } = req.body;

        if (!apiToken || !workflowId || !query) {
            return res.status(400).json({
                error: 'Missing required fields: apiToken, workflowId, query'
            });
        }

        console.log(`[${new Date().toISOString()}] [Chatbot] Forwarding request to OpenArena...`);

        // Build system prompt
        const systemPrompt = `You are an expert AI assistant for the TR ONESOURCE E-Invoicing API. Your role is to help partners integrate with the API by answering questions about:

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

        // Build user prompt
        let userPrompt = `User Question: ${query}\n\n`;
        if (context?.page) {
            userPrompt += `Current Page: ${context.page}\n\n`;
        }
        if (context?.pageContent) {
            userPrompt += `Relevant Documentation:\n${context.pageContent}\n\n`;
        }
        userPrompt += 'Please provide a helpful, accurate answer to the user\'s question based on the context provided.';

        const combinedQuery = `${systemPrompt}\n\n${userPrompt}`;

        // Call OpenArena with chatbot timeout
        const result = await callOpenArena(workflowId, combinedQuery, systemPrompt, apiToken, CHATBOT_TIMEOUT);

        console.log(`[Chatbot] Success, tokens: ${result.tokens || 0}`);

        res.json({
            success: true,
            content: result.content,
            tokens_used: result.tokens || 0,
            model_used: 'claude-sonnet-4'
        });

    } catch (error) {
        console.error('[Chatbot] Error:', error.message);
        res.status(500).json({
            error: 'Proxy server error',
            message: error.message
        });
    }
});

/**
 * ROUTE 2: Partner Onboarding Report Generation
 * Used by the Partner Onboarding form
 */
app.post('/api/generate-report', async (req, res) => {
    const startTime = Date.now();

    try {
        const { formData, apiToken, demoMode } = req.body;

        // Validate input
        if (!formData) {
            return res.status(400).json({ error: 'Form data is required' });
        }

        if (!demoMode && !apiToken) {
            return res.status(400).json({ error: 'API token is required (or enable demo mode)' });
        }

        console.log(`[${new Date().toISOString()}] [Onboarding] Generating report for: ${formData.partnerCompanyName}`);
        console.log(`[Onboarding] Demo Mode: ${demoMode ? 'ENABLED' : 'DISABLED'}`);

        let ccrResponse, apiResponse;

        if (demoMode) {
            // Use mock data for demo
            console.log('[Onboarding] Using mock data (demo mode)');
            ccrResponse = getMockCCRResponse(formData);
            apiResponse = getMockAPIResponse(formData);
        } else {
            // Call real agents
            console.log('[Onboarding] Calling Open Arena agents...');

            // Step 1: Call CCR Agent
            console.log('[Onboarding] Step 1/2: Calling CCR Agent...');
            ccrResponse = await callCCRAgent(formData, apiToken);
            console.log('[Onboarding] CCR Agent response received');

            // Step 2: Call API Agent with CCR context
            console.log('[Onboarding] Step 2/2: Calling API Agent...');
            apiResponse = await callAPIAgent(formData, ccrResponse, apiToken);
            console.log('[Onboarding] API Agent response received');
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[${new Date().toISOString()}] [Onboarding] Report generated successfully in ${duration}s`);

        // Return combined response
        res.json({
            success: true,
            ccrResponse,
            apiResponse,
            metadata: {
                generatedAt: new Date().toISOString(),
                demoMode: demoMode || false,
                duration: `${duration}s`
            }
        });

    } catch (error) {
        console.error('[Onboarding] Error:', error);
        res.status(500).json({
            error: 'Failed to generate report',
            message: error.message,
            details: error.details || null
        });
    }
});

/**
 * Helper: Call OpenArena API
 */
async function callOpenArena(workflowId, query, systemPrompt, apiToken, timeout = CHATBOT_TIMEOUT, retryCount = 0) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const payload = {
            workflow_id: workflowId,
            query: query,
            is_persistence_allowed: false,
            modelparams: {
                'claude-sonnet-4': {
                    temperature: '0.1',
                    max_tokens: timeout === CHATBOT_TIMEOUT ? '4000' : '8000', // More tokens for onboarding
                    system_prompt: systemPrompt
                }
            }
        };

        const response = await fetch(OPENARENA_BASE_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenArena API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const responseData = await response.json();
        const resultData = responseData.result || {};

        // Extract content
        let content = '';
        if (typeof resultData === 'object') {
            const answerData = resultData.answer || {};
            if (typeof answerData === 'object') {
                content = answerData['claude-sonnet-4'] || Object.values(answerData)[0] || '';
            }
        }

        if (!content) {
            throw new Error('Empty response from OpenArena');
        }

        return {
            content: String(content),
            tokens: responseData.tokens_used || 0
        };

    } catch (error) {
        console.error(`[OpenArena] Attempt ${retryCount + 1}/${MAX_RETRIES} failed:`, error.message);

        // Retry logic
        if (retryCount < MAX_RETRIES - 1) {
            console.log(`[OpenArena] Retrying in ${RETRY_DELAY / 1000}s...`);
            await sleep(RETRY_DELAY);
            return callOpenArena(workflowId, query, systemPrompt, apiToken, timeout, retryCount + 1);
        }

        // Max retries exceeded
        throw {
            message: 'Failed to call OpenArena after multiple attempts',
            details: error.message
        };
    }
}

/**
 * Helper: Call CCR Agent
 */
async function callCCRAgent(formData, apiToken) {
    // Collect all countries
    const countries = [formData.country1, formData.country2, formData.country3]
        .filter(c => c)
        .concat(formData.additionalCountries ? formData.additionalCountries.split(',').map(c => c.trim()) : [])
        .filter(c => c);

    const apArScope = formData.invoiceHandling.map(h => h.toUpperCase()).join(' and ');

    const query = `I am a ${formData.partnershipType} partner integrating with the TR ONESOURCE E-Invoicing API. I need comprehensive country compliance requirements for the following countries:

${countries.map((c, i) => `${i + 1}. ${c}${i === 0 ? ' (PRIORITY)' : ''}`).join('\n')}

**Scope:** ${apArScope} (Accounts Receivable/Payable)
**Estimated Volume:** ${formData.invoiceVolume} invoices per month

Please provide detailed information for EACH country covering:

1. **Compliance Model** - Is e-invoicing mandatory or optional? What is the clearance model?
2. **Required Document Types** - What invoice types are required?
3. **Mandatory Fields & Format Requirements** - What are the mandatory fields and format?
4. **Validation Rules** - What validations are performed? Common rejection reasons?
5. **Deadlines & Timelines** - Invoice submission deadlines and response times?
6. **Key Information for API Integration** - What should the API integration team know?

Please structure your response by country, with clear sections for each requirement area.`;

    const systemPrompt = `You are an expert on country-specific Continuous Transaction Controls (CTC), e-invoicing mandates, and compliance requirements. Provide comprehensive, structured responses organized by country with specific technical details that API integration teams need to know.`;

    const result = await callOpenArena(CCR_WORKFLOW_ID, query, systemPrompt, apiToken, ONBOARDING_TIMEOUT);
    return result.content;
}

/**
 * Helper: Call API Agent
 */
async function callAPIAgent(formData, ccrResponse, apiToken) {
    const systemsList = formData.systemIntegration.map(sys => {
        if (sys === 'erp' && formData.erpDetails) return `ERP: ${formData.erpDetails}`;
        if (sys === 'other' && formData.otherSystemDetails) return `Other: ${formData.otherSystemDetails}`;
        return sys.toUpperCase();
    }).join(', ');

    const apArScope = formData.invoiceHandling.map(h => h.toUpperCase()).join(' and ');

    const query = `I am implementing the TR ONESOURCE E-Invoicing API integration for a ${formData.partnershipType} partner.

**Partner Profile:**
- Company: ${formData.partnerCompanyName}
- Systems to integrate: ${systemsList}
- Service Model: ${formData.serviceModel}
- Invoice handling: ${apArScope}
- Monthly volume: ${formData.invoiceVolume} invoices

**Country Compliance Requirements:**
${ccrResponse}

---

Based on the compliance requirements above, please provide a comprehensive API implementation guide covering:

1. **Authentication Setup** - OAuth 2.0 configuration and token management
2. **Required API Endpoints** - Which endpoints are needed for this scope?
3. **Integration Architecture** - Recommended architecture for the systems
4. **Request/Response Examples** - Sample API requests and responses
5. **Webhook Configuration** - How to set up webhooks for status updates
6. **Error Handling Strategy** - Common errors and retry logic
7. **Best Practices** - Polling, rate limiting, monitoring, testing
8. **Code Samples** - Sample code for authentication and document submission

Please provide specific, actionable guidance tailored to the compliance requirements and the partner's technical environment.`;

    const systemPrompt = `You are an expert on the TR ONESOURCE E-Invoicing API integration. You help partners implement API integrations with detailed technical responses, code examples, and best practices.`;

    const result = await callOpenArena(API_WORKFLOW_ID, query, systemPrompt, apiToken, ONBOARDING_TIMEOUT);
    return result.content;
}

/**
 * Helper: Sleep utility
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock responses for demo mode
 */
function getMockCCRResponse(formData) {
    const countries = [formData.country1, formData.country2, formData.country3].filter(c => c);
    return `# Country Compliance Requirements (DEMO DATA)\n\n## ${countries[0]} (Priority Country)\n\n### Compliance Model\n- **Mandate Status:** E-invoicing is MANDATORY for B2B and B2G transactions\n- **Clearance Model:** Real-time clearance through government platform\n\n### Required Document Types\n- B2B Commercial Invoices (mandatory)\n- Credit Notes and Debit Notes (mandatory)\n\n### Mandatory Fields\n- Seller VAT ID, Buyer VAT ID\n- Invoice number (sequential)\n- Line item details with VAT\n\n### Key Integration Notes\n- TLS 1.2+ required\n- Digital signature required\n- Batch submission not supported`;
}

function getMockAPIResponse(formData) {
    return `# TR ONESOURCE API Implementation Guide (DEMO DATA)\n\n## 1. Authentication Setup\n\n**OAuth 2.0 Client Credentials Flow**\n\n\`\`\`javascript\nconst response = await fetch('https://api.onesource.tr.com/oauth/token', {\n  method: 'POST',\n  body: 'grant_type=client_credentials&client_id=YOUR_ID&client_secret=YOUR_SECRET'\n});\n\`\`\`\n\n## 2. Submit Invoice\n\n\`\`\`javascript\nPOST /v1/documents\n{\n  "documentType": "invoice",\n  "direction": "outbound",\n  "document": { /* PUF format */ }\n}\n\`\`\`\n\n## 3. Best Practices\n- Cache tokens for 50 minutes\n- Use webhooks for status updates\n- Implement exponential backoff for retries`;
}

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📍 AI Chatbot: POST /api/proxy`);
    console.log(`📍 Partner Onboarding: POST /api/generate-report`);
    console.log(`📡 CCR Agent ID: ${CCR_WORKFLOW_ID}`);
    console.log(`📡 API Agent ID: ${API_WORKFLOW_ID}`);
    console.log(`================================================\n`);
});
