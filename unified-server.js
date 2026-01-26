/**
 * TR ONESOURCE Unified Server
 * Combines AI Chatbot Proxy + Partner Onboarding Backend
 * Run with: node unified-server.js
 */

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// ============================================================
// CONFIGURATION LOADING - v2.1
// ============================================================

// Load report template configuration (v2.2)
const reportTemplateConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'config', 'report-template-config-v2.1.json'), 'utf8')
);

console.log(`✅ Loaded report template configuration v${reportTemplateConfig.reportMetadata.version} (${reportTemplateConfig.reportMetadata.generatedBy})`);

// OpenArena Configuration
const OPENARENA_BASE_URL = 'https://aiopenarena.gcs.int.thomsonreuters.com/v1/inference';
const CCR_WORKFLOW_ID = 'f87b828b-39cb-4a9e-9225-bb9e67ff4860'; // Country CCR Expert
const API_WORKFLOW_ID = '74f9914d-b8c9-44f0-ad5c-13af2d02144c'; // API Expert
const PUF_WORKFLOW_ID = 'f5a1f931-82f3-4b50-a051-de3e175e3d5f'; // Format Expert

// Request Configuration
const CHATBOT_TIMEOUT_FAST = 60000; // 60 seconds for first attempt
const CHATBOT_TIMEOUT_SLOW = 180000; // 3 minutes for retry after timeout
const ONBOARDING_TIMEOUT_BASE = 120000; // 120 seconds base timeout per agent
const ONBOARDING_TIMEOUT_EXTENDED = 240000; // 240 seconds (4 minutes) for retry
const MAX_RETRIES = 2; // Reduced to 2 (fast attempt + slow attempt)
const RETRY_DELAY = 2000; // 2 seconds

/**
 * Calculate dynamic timeout based on country count
 * More countries = slightly longer timeout per agent
 */
function calculateAgentTimeout(countryCount, isRetry = false) {
    const baseTimeout = isRetry ? ONBOARDING_TIMEOUT_EXTENDED : ONBOARDING_TIMEOUT_BASE;

    // Add 20 seconds per additional country (beyond first)
    const extraTime = Math.max(0, countryCount - 1) * 20000;

    // Cap at 5 minutes for first attempt, 8 minutes for retry
    const maxTimeout = isRetry ? 480000 : 300000;

    return Math.min(baseTimeout + extraTime, maxTimeout);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.')); // Serve static files

console.log(`\n🚀 TR ONESOURCE Unified Server`);
console.log(`================================================`);

/**
 * Utility: Template interpolation
 */
function interpolateTemplate(template, variables) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        return variables[key] !== undefined ? variables[key] : match;
    });
}

/**
 * Utility: Extract countries from form data
 */
function extractCountries(formData) {
    const countries = [
        formData.country1,
        formData.country2,
        formData.country3
    ].filter(c => c && c.trim());

    if (formData.additionalCountries) {
        const additional = formData.additionalCountries
            .split(',')
            .map(c => c.trim())
            .filter(c => c);
        countries.push(...additional);
    }

    return [...new Set(countries)]; // Remove duplicates
}

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'TR ONESOURCE Unified Server is running',
        version: reportTemplateConfig.reportMetadata.version,
        services: {
            chatbot: 'Ready',
            onboarding: 'Ready'
        }
    });
});

/**
 * Configuration status endpoint (v2.2)
 */
app.get('/api/config/status', (req, res) => {
    res.json({
        version: reportTemplateConfig.reportMetadata.version,
        title: reportTemplateConfig.reportMetadata.title,
        generatedBy: reportTemplateConfig.reportMetadata.generatedBy,
        lastUpdated: reportTemplateConfig.reportMetadata.lastUpdated,
        agents: {
            ccr: {
                name: reportTemplateConfig.agentConfiguration.agents.ccr.name,
                role: reportTemplateConfig.agentConfiguration.agents.ccr.role,
                promptLoaded: true
            },
            format: {
                name: reportTemplateConfig.agentConfiguration.agents.format.name,
                role: reportTemplateConfig.agentConfiguration.agents.format.role,
                promptLoaded: true,
                receivesContext: true
            },
            api: {
                name: reportTemplateConfig.agentConfiguration.agents.api.name,
                role: reportTemplateConfig.agentConfiguration.agents.api.role,
                promptLoaded: true,
                receivesContext: true
            }
        },
        executionStrategy: reportTemplateConfig.agentConfiguration.executionStrategy,
        contextPassing: 'Agents receive context for reference only - no verbatim copying',
        reportSections: reportTemplateConfig.reportSections.length,
        staticSectionsRemoved: ['testing-validation', 'production-deployment', 'support-resources']
    });
});

/**
 * ROUTE 1: AI Chatbot Proxy
 * Used by the AI Assistant chatbot on all pages
 */
app.post('/api/proxy', async (req, res) => {
    try {
        const { apiToken, workflowId, query, context, extendedTimeout } = req.body;

        if (!apiToken || !workflowId || !query) {
            return res.status(400).json({
                error: 'Missing required fields: apiToken, workflowId, query'
            });
        }

        // Use extended timeout if this is a retry, otherwise use fast timeout
        const timeout = extendedTimeout ? CHATBOT_TIMEOUT_SLOW : CHATBOT_TIMEOUT_FAST;
        const timeoutLabel = extendedTimeout ? '3 minutes (extended)' : '60 seconds';

        console.log(`[${new Date().toISOString()}] [Chatbot] Forwarding request to OpenArena (timeout: ${timeoutLabel})...`);

        // Build system prompt
        const systemPrompt = `You are an expert AI assistant for the TR ONESOURCE E-Invoicing API. Your role is to help partners integrate with the API by answering questions about:

- API authentication (OAuth 2.0, client credentials, authorization code flows)
- E-invoicing integration (AR/AP flows, document submission, status polling)
- Document format requirements (PUF, UBL, CII)
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

        // Call OpenArena with selected timeout (no retries at server level)
        const result = await callOpenArena(workflowId, combinedQuery, systemPrompt, apiToken, timeout, 0);

        console.log(`[Chatbot] Success, tokens: ${result.tokens || 0}`);

        res.json({
            success: true,
            content: result.content,
            tokens_used: result.tokens || 0,
            model_used: 'claude-sonnet-4'
        });

    } catch (error) {
        console.error('[Chatbot] Error:', error.message);

        // Check if this was a timeout error
        const isTimeout = error.message.includes('aborted') || error.message.includes('timeout');

        res.status(500).json({
            error: 'Proxy server error',
            message: error.message,
            isTimeout: isTimeout // Let client know if it was a timeout
        });
    }
});

/**
 * Call agent with automatic retry on timeout
 */
async function callAgentWithRetry(workflowId, prompt, agentName, apiToken, countryCount) {
    const firstTimeout = calculateAgentTimeout(countryCount, false);
    const retryTimeout = calculateAgentTimeout(countryCount, true);

    console.log(`[Onboarding] Calling ${agentName} (timeout: ${firstTimeout / 1000}s, retry: ${retryTimeout / 1000}s if needed)`);

    try {
        // First attempt with standard timeout
        const result = await callOpenArena(
            workflowId,
            prompt,
            agentName,
            apiToken,
            firstTimeout,
            0 // No retries at callOpenArena level
        );
        return result;
    } catch (error) {
        const isTimeout = error.message.includes('aborted') || error.message.includes('timeout') || error.message.includes('ETIMEDOUT');

        if (isTimeout) {
            console.log(`[Onboarding] ${agentName} timed out after ${firstTimeout / 1000}s. Retrying with extended timeout (${retryTimeout / 1000}s)...`);

            // Retry with extended timeout
            await sleep(RETRY_DELAY);

            try {
                const result = await callOpenArena(
                    workflowId,
                    prompt,
                    agentName,
                    apiToken,
                    retryTimeout,
                    0
                );
                console.log(`[Onboarding] ${agentName} succeeded on retry!`);
                return result;
            } catch (retryError) {
                console.error(`[Onboarding] ${agentName} failed on retry:`, retryError.message);
                throw new Error(`${agentName} failed after retry: ${retryError.message}`);
            }
        } else {
            // Non-timeout error, don't retry
            throw error;
        }
    }
}

/**
 * ROUTE 2: Partner Onboarding Report Generation
 * Multi-agent orchestration with context-based collaboration (v2.2)
 * - CCR agents generate country compliance requirements
 * - Format agents generate format specifications (receive CCR context)
 * - API agent generates implementation code (receives all context)
 * - Each agent produces only their own content - no duplication
 */
app.post('/api/generate-report', async (req, res) => {
    const startTime = Date.now();
    const { formData, apiToken, demoMode } = req.body;

    // Validation
    if (!formData) {
        return res.status(400).json({ error: 'Missing formData' });
    }
    if (!demoMode && !apiToken) {
        return res.status(400).json({ error: 'Missing apiToken' });
    }

    console.log(`[${new Date().toISOString()}] [Onboarding] Generating report for: ${formData.partnerCompanyName}`);

    try {
        const countries = extractCountries(formData);
        const sections = [];
        const errors = [];

        // 1. Generate Executive Summary (auto-generated)
        sections.push({
            id: 'executive-summary',
            title: 'Executive Summary',
            content: generateExecutiveSummary(formData, countries),
            success: true
        });

        // 2. Generate per-country sections (CCR + Format)
        for (const country of countries) {
            console.log(`[Onboarding] Processing country: ${country}`);

            // 2a. CCR Agent (v2.2)
            try {
                const ccrPrompt = buildCCRPrompt(formData, country);
                const ccrResponse = demoMode
                    ? getMockCCRResponse(formData, country)
                    : await callAgentWithRetry(
                        CCR_WORKFLOW_ID,
                        ccrPrompt,
                        `CCR Agent (${country})`,
                        apiToken,
                        countries.length
                    );

                sections.push({
                    id: `country-compliance-${country.toLowerCase().replace(/\s+/g, '-')}`,
                    title: `Country Compliance Requirements: ${country}`,
                    content: ccrResponse.content || ccrResponse,
                    success: true,
                    country: country
                });
            } catch (error) {
                console.error(`[Onboarding] CCR Agent failed for ${country}:`, error.message);
                sections.push({
                    id: `country-compliance-${country.toLowerCase().replace(/\s+/g, '-')}`,
                    title: `Country Compliance Requirements: ${country}`,
                    content: null,
                    success: false,
                    error: error.message,
                    country: country
                });
                errors.push(`CCR section for ${country}: ${error.message}`);
            }

            // 2b. Format Agent (v2.2 - receives CCR output as reference context)
            try {
                // Get the CCR output from the section just added
                const ccrSection = sections.find(s =>
                    s.id === `country-compliance-${country.toLowerCase().replace(/\s+/g, '-')}` &&
                    s.success
                );
                const ccrOutput = ccrSection ? ccrSection.content : 'No CCR data received.';

                const pufPrompt = buildPUFPrompt(formData, country, ccrOutput);
                const pufResponse = demoMode
                    ? getMockPUFResponse(formData, country)
                    : await callAgentWithRetry(
                        PUF_WORKFLOW_ID,
                        pufPrompt,
                        `Format Agent (${country})`,
                        apiToken,
                        countries.length
                    );

                sections.push({
                    id: `format-details-${country.toLowerCase().replace(/\s+/g, '-')}`,
                    title: `Document Format Details: ${country}`,
                    content: pufResponse.content || pufResponse,
                    success: true,
                    country: country
                });
            } catch (error) {
                console.error(`[Onboarding] Format Agent failed for ${country}:`, error.message);
                sections.push({
                    id: `format-details-${country.toLowerCase().replace(/\s+/g, '-')}`,
                    title: `Document Format Details: ${country}`,
                    content: null,
                    success: false,
                    error: error.message,
                    country: country
                });
                errors.push(`Format section for ${country}: ${error.message}`);
            }
        }

        // 3. Generate unified API Implementation section (v2.2)
        console.log(`[Onboarding] Generating API implementation guide...`);
        try {
            const apiPrompt = buildAPIPrompt(formData, countries, sections);
            const apiResponse = demoMode
                ? getMockAPIResponse(formData)
                : await callAgentWithRetry(
                    API_WORKFLOW_ID,
                    apiPrompt,
                    'API Agent',
                    apiToken,
                    countries.length
                );

            sections.push({
                id: 'api-implementation',
                title: 'API Implementation Guide',
                content: apiResponse.content || apiResponse,
                success: true
            });
        } catch (error) {
            console.error(`[Onboarding] API Agent failed:`, error.message);
            sections.push({
                id: 'api-implementation',
                title: 'API Implementation Guide',
                content: null,
                success: false,
                error: error.message
            });
            errors.push(`API section: ${error.message}`);
        }

        // 4. Static sections removed in v2.1+
        // Focus is on agent-generated, customized content only
        // Removed: Testing & Validation, Production Deployment, Support & Resources

        // 5. Generate validation summary
        const validation = generateValidationSummary(sections, countries, formData);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[Onboarding] Report generated in ${duration}s with ${errors.length} errors`);

        res.json({
            success: errors.length === 0,
            sections: sections,
            validation: validation,
            metadata: {
                generatedAt: new Date().toISOString(),
                duration: `${duration}s`,
                demoMode: demoMode || false,
                countries: countries,
                totalSections: sections.length,
                successfulSections: sections.filter(s => s.success).length,
                failedSections: sections.filter(s => !s.success).length,
                errors: errors,
                reportId: `TRONB-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
            }
        });

    } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.error(`[Onboarding] Report generation failed after ${duration}s:`, error);
        res.status(500).json({
            error: 'Report generation failed',
            message: error.message,
            duration: `${duration}s`
        });
    }
});

/**
 * Helper: Call OpenArena API
 */
async function callOpenArena(workflowId, query, systemPrompt, apiToken, timeout = CHATBOT_TIMEOUT_FAST, retryCount = 0) {
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
                    max_tokens: timeout > CHATBOT_TIMEOUT_SLOW ? '8000' : '4000', // More tokens for long requests
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
 * Prompt Builder: CCR Agent (v2.2)
 */
function buildCCRPrompt(formData, country) {
    // Build prompt from config structure
    const agentConfig = reportTemplateConfig.agentConfiguration.agents.ccr;

    let prompt = `You are the ${agentConfig.name}.

Role: ${agentConfig.role}

Country: ${country}
Partner Company: ${formData.partnerCompanyName}
Partnership Type: ${formData.partnershipType}
Invoice Handling: ${JSON.stringify(formData.invoiceHandling)}
Invoice Volume: ${formData.invoiceVolume}

Please generate a comprehensive Country Compliance Requirements section with the following structure:

${agentConfig.outputStructure.subsections.map((s) => `${s}`).join('\n')}

OUTPUT REQUIREMENTS:
- Format: ${agentConfig.outputStructure.format}
- Use markdown tables with proper formatting (| column | column |)
- Citations: ${agentConfig.outputStructure.citations}
- Include detailed tables for Pre-Integration Checklist, Technical Requirements, Penalties, and Critical Dates
- Use bullet points and numbered lists where appropriate
- Focus ONLY on compliance requirements - format specifications will be covered in a separate section

Use RAG sources: ${JSON.stringify(agentConfig.ragSources)}`;

    return prompt;
}

/**
 * Prompt Builder: Format Agent (v2.2)
 */
function buildPUFPrompt(formData, country, ccrOutput) {
    // Build prompt from config structure
    const agentConfig = reportTemplateConfig.agentConfiguration.agents.format;

    let prompt = `You are the ${agentConfig.name}.

Role: ${agentConfig.role}

Country: ${country}
System Integration: ${JSON.stringify(formData.systemIntegration)}
Invoice Handling: ${JSON.stringify(formData.invoiceHandling)}

Please generate a Document Format Specifications section with the following structure:
${agentConfig.outputStructure.subsections.map((s, i) => `${i + 1}. ${s}`).join('\n')}

OUTPUT REQUIREMENTS:
- Create detailed markdown tables for Format Overview with columns: Standard Base | Namespace | Customization ID | Schema Location
- Create Mandatory Fields table with columns: Field Name | XPath | Requirement Level | Description
- Include complete, valid XML structure examples (minimal but valid)
- Provide Validation Checklist as a table or bulleted list
- Include Common Errors & Solutions table (minimum 10 items) with columns: Error | Cause | Solution
- Citations: ${agentConfig.outputStructure.citations}

CRITICAL: Your output should contain ONLY format specifications (XPath mappings, XML examples, validation rules).
Do NOT copy the CCR compliance requirements below - they are provided as context so you understand what
document types and fields are required, but the compliance section already exists separately in the report.

Use RAG sources: ${JSON.stringify(agentConfig.ragSources)}

### Context from CCR Agent (reference only - to understand requirements):

${ccrOutput}`;

    return prompt;
}

/**
 * Prompt Builder: API Agent (v2.2)
 */
function buildAPIPrompt(formData, countries, sections) {
    // Build prompt from config structure
    const agentConfig = reportTemplateConfig.agentConfiguration.agents.api;

    // Extract CCR and Format outputs for verbatim context
    const ccrOutputs = sections
        .filter(s => s.id.startsWith('country-compliance-') && s.success)
        .map(s => `## ${s.title}\n\n${s.content}`)
        .join('\n\n---\n\n');

    const formatOutputs = sections
        .filter(s => s.id.startsWith('format-details-') && s.success)
        .map(s => `## ${s.title}\n\n${s.content}`)
        .join('\n\n---\n\n');

    let prompt = `You are the ${agentConfig.name}.

Role: ${agentConfig.role}

Partner Company: ${formData.partnerCompanyName}
Programming Language: ${formData.programmingLanguage || 'python'}
System Integration: ${JSON.stringify(formData.systemIntegration)}
Countries: ${JSON.stringify(countries)}
Invoice Handling: ${JSON.stringify(formData.invoiceHandling)}
Invoice Volume: ${formData.invoiceVolume}
Service Model: ${formData.serviceModel}
Account Access: ${formData.accountAccess}

Please generate a comprehensive API Implementation Guide with the following structure:
${agentConfig.outputStructure.subsections.map((s) => `${s.title}`).join('\n')}

CRITICAL OUTPUT REQUIREMENTS:
- Core Pattern: ${agentConfig.outputStructure.corePattern}
- EVERY code section MUST start with a "Requirements Summary" table before any code
- Requirements Summary table format:
  | Requirement | Details |
  |-------------|---------|
  | API Endpoint | [endpoint] |
  | Method | [GET/POST] |
  | Purpose | [what it does] |
  | Key Parameters | [params] |
  | Response Format | [format] |

- Include complete, production-ready code examples in ${formData.programmingLanguage || 'python'}
- Use markdown tables for all requirements, comparisons, and reference information
- Include flow diagrams using mermaid syntax where appropriate
- For AR/AP flows: Include polling strategies based on invoice volume (${formData.invoiceVolume}/month)
- For error handling: Include table with HTTP codes, descriptions, and retry strategies
- Include step-by-step implementation instructions with code for each subsection

CRITICAL: Your output should contain ONLY API implementation code and guidance.
The context below provides country requirements and format specifications - use this to inform
your API code (e.g., which countries to handle, which formats to use), but do NOT copy the
CCR or Format content into your output. Those sections already exist separately in the report.

You may reference requirements in summary tables (e.g., "Per CCR requirements for Poland, clearance is mandatory")
but do not repeat full sections of compliance requirements or format specifications.

Use RAG sources: ${JSON.stringify(agentConfig.ragSources)}

### Context from CCR Agents (reference only - to inform API implementation):

${ccrOutputs}

### Context from Format Agents (reference only - to inform API implementation):

${formatOutputs}`;

    return prompt;
}

/**
 * Static Section Generator: Executive Summary
 */
function generateExecutiveSummary(formData, countries) {
    return `## Executive Summary

### Partner Profile
- **Company**: ${formData.partnerCompanyName}
- **Partnership Type**: ${formData.partnershipType}
- **Service Model**: ${formData.serviceModel}
- **Account Management**: ${formData.accountAccess}

### Project Contacts
- **Project Manager**: ${formData.projectManagerName} (${formData.projectManagerEmail})
- **Technical Lead**: ${formData.technicalLeadName} (${formData.technicalLeadEmail})

### Integration Scope

**Systems Integrating:**
${formData.systemIntegration.map(s => `- ${s.toUpperCase()}`).join('\n')}

**Countries in Scope:**
${countries.map((c, i) => `${i + 1}. ${c}${i === 0 ? ' ⭐ (PRIORITY)' : ''}`).join('\n')}

**Invoice Handling:**
${formData.invoiceHandling.includes('ar') ? '- ✅ **Accounts Receivable (AR)** - Sending invoices to customers' : ''}
${formData.invoiceHandling.includes('ap') ? '- ✅ **Accounts Payable (AP)** - Receiving invoices from suppliers' : ''}

**Estimated Volume:** ${formData.invoiceVolume} invoices/month

### Key Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Country registration delays | High | Start registration process immediately |
| API integration complexity | Medium | Use TR SDK libraries, leverage code samples |
| Format validation errors | Medium | Test with all mandatory fields early |
| Multi-country coordination | ${countries.length > 2 ? 'High' : 'Medium'} | Implement priority country first, then expand |
| Support model clarity | Low | ${formData.firstLineSupport === 'partner' ? 'Partner provides L1 support with TR escalation' : 'TR provides direct support'} |

### Success Criteria

☐ All country registrations completed
☐ OAuth authentication implemented and tested
☐ ${formData.invoiceHandling.includes('ar') ? 'AR flow: Submit → Poll → Clearance working' : ''}
☐ ${formData.invoiceHandling.includes('ap') ? 'AP flow: Poll → Download → Acknowledge working' : ''}
☐ All mandatory fields validated for each country
☐ Error handling tested for common scenarios
☐ Pilot customers successfully processing invoices
☐ Production monitoring in place

---
`;
}

/**
 * Static Section Generator: Testing & Validation
 */
function generateTestingSection(formData, countries) {
    const template = reportTemplateConfig.staticTemplates['testing-validation'];
    const variables = {
        countriesList: countries.join(', '),
        invoiceHandling: formData.invoiceHandling.join(' and ').toUpperCase(),
        invoiceVolume: formData.invoiceVolume,
        estimatedTestVolume: Math.ceil(formData.invoiceVolume * 0.1)
    };
    return interpolateTemplate(template, variables);
}

/**
 * Static Section Generator: Production Deployment
 */
function generateDeploymentSection(formData, countries) {
    const template = reportTemplateConfig.staticTemplates['production-deployment'];
    const variables = {
        countriesList: countries.join(', '),
        firstLineSupport: formData.firstLineSupport
    };
    return interpolateTemplate(template, variables);
}

/**
 * Static Section Generator: Support & Resources
 */
function generateSupportSection(formData, countries) {
    const template = reportTemplateConfig.staticTemplates['support-resources'];
    const variables = {
        projectManagerName: formData.projectManagerName,
        projectManagerEmail: formData.projectManagerEmail,
        technicalLeadName: formData.technicalLeadName,
        technicalLeadEmail: formData.technicalLeadEmail,
        partnershipType: formData.partnershipType,
        serviceModel: formData.serviceModel,
        countriesList: countries.join(', '),
        invoiceHandling: formData.invoiceHandling.join(' and ').toUpperCase(),
        generatedDate: new Date().toISOString(),
        reportId: `TRONB-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    };
    return interpolateTemplate(template, variables);
}

/**
 * Validation Summary Generator
 */
function generateValidationSummary(sections, countries, formData) {
    const checks = [];

    // Check all countries have CCR sections
    countries.forEach(country => {
        const ccrSection = sections.find(s =>
            s.id === `country-compliance-${country.toLowerCase().replace(/\s+/g, '-')}`
        );
        checks.push({
            check: `CCR section for ${country}`,
            passed: ccrSection && ccrSection.success,
            critical: true
        });

        // v2.2: Checks for "format-details-" section
        const formatSection = sections.find(s =>
            s.id === `format-details-${country.toLowerCase().replace(/\s+/g, '-')}`
        );
        checks.push({
            check: `Format Details section for ${country}`,
            passed: formatSection && formatSection.success,
            critical: true
        });
    });

    // Check API section exists
    const apiSection = sections.find(s => s.id === 'api-implementation');
    checks.push({
        check: 'API Implementation Guide',
        passed: apiSection && apiSection.success,
        critical: true
    });

    // Check API section covers AR/AP as needed
    if (formData.invoiceHandling.includes('ar') && apiSection && apiSection.success) {
        checks.push({
            check: 'API section covers AR (outbound)',
            passed: apiSection.content.toLowerCase().includes('accounts receivable') ||
                    apiSection.content.toLowerCase().includes('outbound') ||
                    apiSection.content.toLowerCase().includes('ar ('),
            critical: true
        });
    }

    if (formData.invoiceHandling.includes('ap') && apiSection && apiSection.success) {
        checks.push({
            check: 'API section covers AP (inbound)',
            passed: apiSection.content.toLowerCase().includes('accounts payable') ||
                    apiSection.content.toLowerCase().includes('inbound') ||
                    apiSection.content.toLowerCase().includes('ap ('),
            critical: true
        });
    }

    // v2.2: Static sections removed - no longer checking for testing-validation,
    // production-deployment, or support-resources sections

    const totalChecks = checks.length;
    const passedChecks = checks.filter(c => c.passed).length;
    const criticalFailed = checks.filter(c => !c.passed && c.critical).length;

    return {
        totalChecks,
        passedChecks,
        failedChecks: totalChecks - passedChecks,
        criticalFailed,
        completeness: Math.round((passedChecks / totalChecks) * 100),
        checks: checks,
        ready: criticalFailed === 0
    };
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
function getMockCCRResponse(formData, country) {
    return `## Country Compliance Requirements: ${country}

### Mandate Overview
- **E-invoicing Status**: Mandatory for B2B transactions
- **Scope**: B2B, B2G (B2C voluntary)
- **Implementation Date**: January 1, 2024
- **Model**: Continuous Transaction Controls (CTC) with real-time clearance
- **Penalty Range**: €500 - €50,000 depending on violation severity

### Pre-Integration Checklist
☐ VAT Registration (format: Country-specific VAT ID, example: HR12345678901)
☐ Tax ID obtained (${country} Tax ID, format: varies by country)
☐ Digital Certificate (type: qualified electronic signature, authority: national CA)
☐ Platform Registration with ${country} Tax Authority
☐ Accreditation Test (required for self-hosting option)

[DEMO MODE - Replace with actual ${country} compliance requirements]

### Technical Requirements
- **Communication Protocol**: REST API / Web Services
- **Document Format**: UBL 2.1 / Country-specific XML
- **Digital Signature**: XMLDSig or CAdES
- **Mandatory Fields**:
  * Invoice Number (format: alphanumeric, validation: unique per issuer)
  * Issue Date (format: YYYY-MM-DD, validation: cannot be future date)
  * Supplier Tax ID (format: country-specific, validation: must be registered)
  * Customer Tax ID (format: country-specific, validation: must be registered)
  * Tax Amount (format: decimal with 2 decimals, validation: must match calculation)

${formData.invoiceHandling.includes('ar') ? `### AR (Outbound) Process
1. **Generate Invoice** - Create invoice in your system with all mandatory fields
2. **Submit to TR ONESOURCE** - POST to /documents endpoint
3. **TR forwards to Tax Authority** - Automatic submission for clearance
4. **Poll for Status** - GET /documents/{id}/status
5. **Receive Clearance** - Invoice approved or rejected with reasons
6. **Mark as Fetched** - POST /documents/{id}/fetch to acknowledge
7. **Deliver to Customer** - Send cleared invoice to customer` : ''}

${formData.invoiceHandling.includes('ap') ? `### AP (Inbound) Process
1. **Supplier Submits Invoice** - Supplier sends invoice through their system
2. **Tax Authority Clears** - Invoice goes through clearance
3. **Poll for Received Invoices** - GET /documents?direction=inbound
4. **Download Invoice** - GET /documents/{id}/formats/puf
5. **Import to Your System** - Parse PUF and create AP record
6. **Send Acknowledgment** - POST /documents/{id}/response (accept/reject)` : ''}

### Penalties & Sanctions
- **Minor Violations**: €500 - €2,000 (e.g., late submission within 5 days)
- **Major Violations**: €2,000 - €10,000 (e.g., missing mandatory fields, invalid format)
- **Serious Violations**: €10,000 - €50,000 (e.g., systematic non-compliance, fraud attempt)

### Critical Dates
- **Registration Deadline**: 30 days before go-live
- **Testing Period**: Minimum 2 weeks in test environment
- **Pilot Period**: Recommended 2-4 weeks with limited customers
- **Full Rollout**: After successful pilot

### Resources
- **Tax Authority Portal**: [${country} Tax Authority URL]
- **Classification Codes**: [${country} Classification System URL]
- **Technical Documentation**: [${country} E-invoicing Documentation]

[DEMO MODE - This is sample data for testing purposes]`;
}

function getMockPUFResponse(formData, country) {
    return `## Document Format Requirements: ${country}

### Pagero Universal Format (PUF) Overview
- **Format**: XML-based document format
- **Standard**: Compatible with UBL 2.1
- **Purpose**: Universal format that can be converted to country-specific formats
- **Encoding**: UTF-8

### Country-Specific Field Requirements for ${country}
**Mandatory Fields for ${country}:**
- **Tax ID Type**: ${country}-specific tax identifier
- **Classification Codes**: ${country} product/service classification system
- **Country-specific Extensions**: ${country} required additional fields

[DEMO MODE - Replace with actual ${country} PUF requirements]

### Mandatory Fields Mapping

| PUF Field | ${country} Requirement | Format | Validation | Example |
|-----------|------------------------|--------|------------|---------|
| TaxID | Supplier Tax ID | 11 digits | Must be registered | 12345678901 |
| BuyerTaxID | Customer Tax ID | 11 digits | Must be registered | 98765432109 |
| InvoiceNumber | Invoice identifier | Alphanumeric, max 50 chars | Unique per issuer | INV-2024-001 |
| IssueDate | Invoice date | YYYY-MM-DD | Cannot be future | 2024-01-15 |
| TaxAmount | Total tax | Decimal(2) | Must match calculation | 250.00 |
| TaxableAmount | Subtotal | Decimal(2) | Sum of line items | 1000.00 |
| PayableAmount | Grand total | Decimal(2) | Taxable + Tax | 1250.00 |

### Validation Rules

**Field-level validations:**
- **TaxID**: Must be 11 digits, registered with ${country} tax authority
- **InvoiceNumber**: Alphanumeric, max 50 characters, unique per supplier
- **IssueDate**: Format YYYY-MM-DD, cannot be in the future
- **DueDate**: Must be >= IssueDate

**Document-level validations:**
- Total invoice amount must equal sum of line items + tax
- At least one line item required
- Currency must be valid ISO 4217 code

**Business rules:**
- Tax rate must be valid for ${country}
- Payment terms must be specified if PaymentMeansCode is provided
- Supplier and buyer cannot have the same Tax ID

### XML Structure Example

\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:pagero:ExtensionComponent:1.0">
  <InvoiceHeader>
    <InvoiceNumber>INV-2024-001</InvoiceNumber>
    <IssueDate>2024-01-15</IssueDate>
    <InvoiceTypeCode>380</InvoiceTypeCode>
    <DocumentCurrencyCode>EUR</DocumentCurrencyCode>
  </InvoiceHeader>

  <SupplierParty>
    <PartyName>Demo Supplier Ltd</PartyName>
    <PartyTaxScheme>
      <CompanyID>12345678901</CompanyID>
      <TaxScheme>
        <ID>${country} VAT</ID>
      </TaxScheme>
    </PartyTaxScheme>
  </SupplierParty>

  <CustomerParty>
    <PartyName>Demo Customer Inc</PartyName>
    <PartyTaxScheme>
      <CompanyID>98765432109</CompanyID>
      <TaxScheme>
        <ID>${country} VAT</ID>
      </TaxScheme>
    </PartyTaxScheme>
  </CustomerParty>

  <InvoiceLine>
    <LineID>1</LineID>
    <InvoicedQuantity>10</InvoicedQuantity>
    <LineExtensionAmount>1000.00</LineExtensionAmount>
    <Item>
      <Description>Professional Services</Description>
    </Item>
    <Price>
      <PriceAmount>100.00</PriceAmount>
    </Price>
    <TaxTotal>
      <TaxAmount>250.00</TaxAmount>
      <TaxSubtotal>
        <TaxableAmount>1000.00</TaxableAmount>
        <TaxAmount>250.00</TaxAmount>
        <TaxCategory>
          <Percent>25</Percent>
        </TaxCategory>
      </TaxSubtotal>
    </TaxTotal>
  </InvoiceLine>

  <TaxTotal>
    <TaxAmount>250.00</TaxAmount>
  </TaxTotal>

  <LegalMonetaryTotal>
    <TaxExclusiveAmount>1000.00</TaxExclusiveAmount>
    <TaxInclusiveAmount>1250.00</TaxInclusiveAmount>
    <PayableAmount>1250.00</PayableAmount>
  </LegalMonetaryTotal>
</Invoice>
\`\`\`

### Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid Tax ID format" | Tax ID not 11 digits | Ensure Tax ID is exactly 11 numeric characters |
| "Tax calculation mismatch" | TaxAmount ≠ TaxableAmount × Rate | Verify tax calculations, use 2 decimal precision |
| "Missing mandatory field" | Required field empty | Check all mandatory fields are populated |
| "Invalid date format" | Date not YYYY-MM-DD | Use ISO 8601 date format |
| "Unknown currency code" | Invalid ISO 4217 code | Use valid 3-letter currency code (e.g., EUR, USD) |
| "Duplicate invoice number" | InvoiceNumber already used | Ensure invoice numbers are unique per supplier |
| "Future invoice date" | IssueDate > current date | Use current or past date |
| "Invalid XML structure" | Malformed XML | Validate XML against PUF schema |
| "Missing line items" | No InvoiceLine elements | Include at least one line item |
| "Party identification missing" | No TaxID for supplier/buyer | Provide tax IDs for both parties |

[DEMO MODE - This is sample data for testing purposes]`;
}

function getMockAPIResponse(formData) {
    return `## API Implementation Guide

### 1. Authentication Setup (OAuth 2.0)

**Client Credentials Grant** (system-to-system):

\`\`\`python
import requests

def get_access_token(client_id, client_secret):
    url = "https://api.onesource.tr.com/oauth/token"
    data = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret
    }

    response = requests.post(url, data=data)
    return response.json()['access_token']
\`\`\`

**Token Management**:
- Tokens valid for 3600 seconds (1 hour)
- Cache and reuse tokens
- Refresh before expiration

### 2. Company Management & Multi-Tenancy

Get your companyId:

\`\`\`javascript
GET /v1/companies
Authorization: Bearer {access_token}

Response:
{
  "companies": [
    {"id": "comp123", "name": "Your Company"}
  ]
}
\`\`\`

Use companyId in all subsequent API calls via header:
\`X-Company-ID: comp123\`

${formData.invoiceHandling.includes('ar') ? `### 3. AR (Outbound) Flow

**Step 1: Submit Invoice**

\`\`\`python
def submit_invoice(access_token, company_id, invoice_data):
    url = "https://api.onesource.tr.com/v1/documents"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-Company-ID": company_id,
        "Content-Type": "application/json"
    }

    payload = {
        "documentType": "invoice",
        "direction": "outbound",
        "document": invoice_data  # PUF format
    }

    response = requests.post(url, headers=headers, json=payload)
    return response.json()['documentId']
\`\`\`

**Step 2: Poll for Status**

\`\`\`python
def get_status(access_token, company_id, document_id):
    url = f"https://api.onesource.tr.com/v1/documents/{document_id}/status"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-Company-ID": company_id
    }

    response = requests.get(url, headers=headers)
    return response.json()['status']
\`\`\`

**Status values:**
- \`pending\`: Submitted, awaiting clearance
- \`approved\`: Cleared by tax authority
- \`rejected\`: Validation error
- \`error\`: Technical error

**Step 3: Mark as Fetched**

\`\`\`python
def mark_fetched(access_token, company_id, document_id):
    url = f"https://api.onesource.tr.com/v1/documents/{document_id}/fetch"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-Company-ID": company_id
    }

    response = requests.post(url, headers=headers)
    return response.json()
\`\`\`` : ''}

${formData.invoiceHandling.includes('ap') ? `### 4. AP (Inbound) Flow

**Step 1: Poll for New Invoices**

\`\`\`javascript
async function getInboundInvoices(accessToken, companyId) {
  const response = await fetch(
    'https://api.onesource.tr.com/v1/documents?direction=inbound&status=new',
    {
      headers: {
        'Authorization': \`Bearer \${accessToken}\`,
        'X-Company-ID': companyId
      }
    }
  );

  return await response.json();
}
\`\`\`

**Step 2: Download Invoice (PUF format)**

\`\`\`javascript
async function downloadPUF(accessToken, companyId, documentId) {
  const response = await fetch(
    \`https://api.onesource.tr.com/v1/documents/\${documentId}/formats/puf\`,
    {
      headers: {
        'Authorization': \`Bearer \${accessToken}\`,
        'X-Company-ID': companyId
      }
    }
  );

  return await response.text(); // XML
}
\`\`\`

**Step 3: Send Business Acknowledgment**

\`\`\`javascript
async function sendAcknowledgment(accessToken, companyId, documentId, status) {
  const response = await fetch(
    \`https://api.onesource.tr.com/v1/documents/\${documentId}/response\`,
    {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${accessToken}\`,
        'X-Company-ID': companyId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: status, // 'accepted' or 'rejected'
        reason: 'Optional rejection reason'
      })
    }
  );

  return await response.json();
}
\`\`\`` : ''}

### 5. Error Handling Strategy

**Common Errors:**

| Error Code | Description | Action |
|------------|-------------|--------|
| 404 | Recipient not found | Verify customer Tax ID |
| 422 | Validation error | Check mandatory fields |
| 429 | Rate limit exceeded | Implement backoff |
| 500 | Server error | Retry with exponential backoff |

**Retry Logic:**

\`\`\`python
import time

def submit_with_retry(access_token, company_id, invoice_data, max_retries=3):
    for attempt in range(max_retries):
        try:
            return submit_invoice(access_token, company_id, invoice_data)
        except Exception as e:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # Exponential backoff
                time.sleep(wait_time)
            else:
                raise
\`\`\`

### 6. Best Practices

1. **Token Management**
   - Cache access tokens (valid for 3600 seconds)
   - Refresh tokens before expiration
   - Store tokens securely (encrypted at rest)

2. **Polling Strategy**
   - Start with 5-second intervals
   - Increase to 15 seconds after 1 minute
   - Max polling time: 5 minutes
   - Use exponential backoff on errors

3. **Error Handling**
   - Log all API errors with request ID
   - Implement retry logic with exponential backoff
   - Alert on repeated failures
   - Preserve failed documents for manual review

4. **Multi-Country Considerations**
   - Countries: ${formData.country1}${formData.country2 ? ', ' + formData.country2 : ''}${formData.country3 ? ', ' + formData.country3 : ''}
   - Use correct country code in document metadata
   - Validate country-specific mandatory fields
   - Handle country-specific error codes

5. **Performance Optimization**
   - Batch API calls when possible
   - Implement connection pooling
   - Cache company information
   - Use webhooks instead of polling (when available)

[DEMO MODE - This is sample data for testing purposes]`;
}

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📍 API Endpoints:`);
    console.log(`   - Health Check: GET /health`);
    console.log(`   - Config Status: GET /api/config/status`);
    console.log(`   - AI Chatbot: POST /api/proxy`);
    console.log(`   - Partner Onboarding: POST /api/generate-report`);
    console.log(`📡 Agent Workflow IDs:`);
    console.log(`   - CCR Agent: ${CCR_WORKFLOW_ID}`);
    console.log(`   - Format Agent: ${PUF_WORKFLOW_ID}`);
    console.log(`   - API Agent: ${API_WORKFLOW_ID}`);
    console.log(`📋 Report Structure: ${reportTemplateConfig.reportSections.length} sections`);
    console.log(`🎯 Execution Strategy: ${reportTemplateConfig.agentConfiguration.executionStrategy}`);
    console.log(`📝 Context Passing: Agents receive context for reference only - no duplication`);
    console.log(`================================================\n`);
});
