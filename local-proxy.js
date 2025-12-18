/**
 * Local Proxy Server for TR OpenArena API
 * Run with: node local-proxy.js
 */

import http from 'http';

const PORT = 3000;

const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Only allow POST to /api/proxy
    if (req.method !== 'POST' || req.url !== '/api/proxy') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
    }

    try {
        // Read request body
        let body = '';
        for await (const chunk of req) {
            body += chunk.toString();
        }

        const { apiToken, workflowId, query, context } = JSON.parse(body);

        if (!apiToken || !workflowId || !query) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: 'Missing required fields: apiToken, workflowId, query'
            }));
            return;
        }

        console.log('[Proxy] Forwarding request to OpenArena...');

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

        // OpenArena API payload
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

        // Call OpenArena API
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
            res.writeHead(response.status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: `OpenArena API error: ${response.status} ${response.statusText}`,
                details: errorText
            }));
            return;
        }

        // Parse and forward response
        const responseData = await response.json();
        const resultData = responseData.result || {};

        // Extract content
        let rawContent = '';
        if (typeof resultData === 'object') {
            const answerData = resultData.answer || {};
            if (typeof answerData === 'object') {
                rawContent = answerData['claude-sonnet-4'] || Object.values(answerData)[0] || '';
            }
        }

        console.log('[Proxy] Success, tokens:', responseData.tokens_used || 0);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            content: String(rawContent),
            tokens_used: responseData.tokens_used || 0,
            model_used: 'claude-sonnet-4'
        }));

    } catch (error) {
        console.error('[Proxy] Error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: 'Proxy server error',
            message: error.message
        }));
    }
});

server.listen(PORT, () => {
    console.log(`\n🚀 Local Proxy Server running at http://localhost:${PORT}`);
    console.log(`📡 Forwarding requests to: https://aiopenarena.gcs.int.thomsonreuters.com`);
    console.log(`\n✅ Ready to accept requests at: http://localhost:${PORT}/api/proxy\n`);
});
