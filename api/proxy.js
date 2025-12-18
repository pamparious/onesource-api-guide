/**
 * Vercel Serverless Function - TR OpenArena Proxy
 *
 * This proxy forwards chatbot requests from GitHub Pages to TR OpenArena API
 * to bypass CORS restrictions.
 *
 * Deploy Instructions:
 * 1. Install Vercel CLI: npm install -g vercel
 * 2. Run: vercel (from project root)
 * 3. Configure environment variables in Vercel dashboard
 */

export default async function handler(req, res) {
    // Enable CORS for your GitHub Pages domain
    const allowedOrigins = [
        'http://localhost:8000',
        'http://127.0.0.1:8000',
        'https://pamparious.github.io'
    ];

    const origin = req.headers.origin;

    // Debug logging
    console.log('[Proxy] Request from origin:', origin);
    console.log('[Proxy] Method:', req.method);

    // Set CORS headers - temporarily allow all origins for testing
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    // Handle preflight
    if (req.method === 'OPTIONS') {
        console.log('[Proxy] Handling OPTIONS preflight');
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('[Proxy] Request body:', JSON.stringify(req.body));

        const { apiToken, workflowId, query, context } = req.body || {};

        if (!apiToken || !workflowId || !query) {
            console.log('[Proxy] Missing fields - apiToken:', !!apiToken, 'workflowId:', !!workflowId, 'query:', !!query);
            return res.status(400).json({
                error: 'Missing required fields: apiToken, workflowId, query',
                received: { hasToken: !!apiToken, hasWorkflowId: !!workflowId, hasQuery: !!query }
            });
        }

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

        // Build user prompt with context
        let userPrompt = `User Question: ${query}\n\n`;
        if (context?.page) {
            userPrompt += `Current Page: ${context.page}\n\n`;
        }
        if (context?.pageContent) {
            userPrompt += `Relevant Documentation:\n${context.pageContent}\n\n`;
        }
        userPrompt += 'Please provide a helpful, accurate answer to the user\'s question based on the context provided.';

        const combinedQuery = `${systemPrompt}\n\n${userPrompt}`;

        // Build OpenArena API payload
        const payload = {
            workflow_id: workflowId,
            query: combinedQuery,
            is_persistence_allowed: false,
            modelparams: {
                'claude-sonnet-4': {
                    temperature: '0.1',
                    max_tokens: '4000',
                    system_prompt: systemPrompt
                }
            }
        };

        console.log('[Proxy] Forwarding request to OpenArena...');

        // Forward request to TR OpenArena
        const response = await fetch('https://aiopenarena.gcs.int.thomsonreuters.com/v1/inference', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Proxy] OpenArena error:', response.status, errorText);
            return res.status(response.status).json({
                error: `OpenArena API error: ${response.status} ${response.statusText}`,
                details: errorText
            });
        }

        // Parse and forward response
        const responseData = await response.json();
        const resultData = responseData.result || {};

        // Extract content from OpenArena response structure
        let rawContent = '';
        if (typeof resultData === 'object') {
            const answerData = resultData.answer || {};
            if (typeof answerData === 'object') {
                rawContent = answerData['claude-sonnet-4'] || Object.values(answerData)[0] || '';
            }
        }

        console.log('[Proxy] Success, tokens:', responseData.tokens_used || 0);

        return res.status(200).json({
            success: true,
            content: String(rawContent),
            tokens_used: responseData.tokens_used || 0,
            model_used: 'claude-sonnet-4'
        });

    } catch (error) {
        console.error('[Proxy] Error:', error);
        console.error('[Proxy] Error stack:', error.stack);
        return res.status(500).json({
            error: 'Proxy server error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
