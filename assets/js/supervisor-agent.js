/**
 * TR ONESOURCE API Guide - Supervisor Agent
 * Coordinates multiple specialized agents and synthesizes responses
 */

(function() {
    'use strict';

    /**
     * Supervisor Agent
     * Orchestrates API, Format, and CCR agents based on query analysis
     */
    class SupervisorAgent {
        constructor(apiToken) {
            this.apiToken = apiToken;
            this.config = null;
            this.clients = {}; // Cache OpenArena clients for each agent
            this.loadConfig();
        }

        /**
         * Load supervisor configuration
         */
        async loadConfig() {
            try {
                const response = await fetch('/config/supervisor-config.json');
                this.config = await response.json();
                console.log('[Supervisor] Configuration loaded successfully');
            } catch (error) {
                console.error('[Supervisor] Failed to load config, using fallback:', error);
                this.config = this.getFallbackConfig();
            }
        }

        /**
         * Fallback configuration if file load fails
         */
        getFallbackConfig() {
            return {
                workflowIds: {
                    api: '74f9914d-b8c9-44f0-ad5c-13af2d02144c',
                    puf: 'f5a1f931-82f3-4b50-a051-de3e175e3d5f',
                    ccr: 'f87b828b-39cb-4a9e-9225-bb9e67ff4860'
                },
                agentNames: {
                    api: 'API Integration Expert',
                    puf: 'Format Specialist',
                    ccr: 'Country Compliance Expert'
                },
                performanceSettings: {
                    parallelThreshold: 2,
                    maxAgentsPerQuery: 3,
                    agentTimeout: 60000,
                    quickRoutingEnabled: true,
                    synthesisEnabled: false
                },
                routingRules: {
                    singleAgentKeywords: {
                        api: ['oauth', 'authenticate', 'endpoint', 'request', 'response', 'error code', 'webhook', 'polling', 'sdk'],
                        puf: ['format', 'xml', 'schema', 'field', 'validation', 'ubl', 'cii', 'document structure', 'puf'],
                        ccr: ['country', 'compliance', 'mandate', 'regulation', 'penalty', 'tax authority', 'clearance', 'certificate']
                    },
                    multiAgentTriggers: [
                        'submit invoice',
                        'complete guide',
                        'step by step',
                        'how do i implement',
                        'integration for',
                        'mandatory fields for'
                    ]
                }
            };
        }

        /**
         * Main entry point - handle user query
         * @param {string} query - User query
         * @param {Object} pageContext - Current page context
         * @param {Object} reportContext - Report context (if available)
         * @returns {Object} Response with content and metadata
         */
        async handleQuery(query, pageContext, reportContext = null) {
            const startTime = Date.now();

            console.log('[Supervisor] Handling query:', query);
            console.log('[Supervisor] Report context available:', !!reportContext);

            // Wait for config if not loaded
            if (!this.config) {
                await this.loadConfig();
            }

            // Load supervisor strategy preference from sessionStorage
            const savedStrategy = sessionStorage.getItem('supervisor_strategy');
            if (savedStrategy && this.config.supervisorStrategies?.[savedStrategy]) {
                this.config.performanceSettings.supervisorStrategy = savedStrategy;
                console.log('[Supervisor] Using strategy from settings:', savedStrategy);
            }

            try {
                // Step 1: Analyze query and determine strategy
                const strategy = await this.analyzeQuery(query, pageContext, reportContext);
                console.log('[Supervisor] Strategy:', strategy);

                // Update UI with supervisor activity
                if (window.showSupervisorActivity) {
                    window.showSupervisorActivity(strategy.agents);
                }

                // Step 2: Execute agents based on strategy
                let agentResults;
                if (strategy.strategy === 'single') {
                    agentResults = await this.executeSingleAgent(strategy.agents[0], query, pageContext, reportContext);
                } else if (strategy.strategy === 'parallel') {
                    agentResults = await this.executeParallel(strategy.agents, query, pageContext, reportContext);
                } else if (strategy.strategy === 'sequential') {
                    agentResults = await this.executeSequential(strategy.agents, query, pageContext, reportContext);
                } else {
                    // Default to parallel
                    agentResults = await this.executeParallel(strategy.agents, query, pageContext, reportContext);
                }

                console.log('[Supervisor] Agent results:', agentResults);

                // Step 3: Synthesize responses (if multiple agents or synthesis enabled)
                let finalContent;
                if (strategy.agents.length > 1 && this.config.performanceSettings.synthesisEnabled) {
                    finalContent = await this.synthesizeResponses(query, agentResults, reportContext);
                } else {
                    // For single agent or synthesis disabled, use direct response or concatenation
                    finalContent = this.concatenateResponses(agentResults);
                }

                // Hide supervisor activity indicator
                if (window.hideSupervisorActivity) {
                    window.hideSupervisorActivity();
                }

                const duration = Date.now() - startTime;

                // Get supervisor strategy for metadata
                const supervisorStrategy = this.config.performanceSettings.supervisorStrategy || 'rule-based';

                return {
                    success: true,
                    content: finalContent,
                    metadata: {
                        strategy: strategy.strategy,
                        agentsUsed: strategy.agents,
                        agentCount: strategy.agents.length,
                        duration: `${(duration / 1000).toFixed(2)}s`,
                        reportContextUsed: !!reportContext,
                        complexity: strategy.complexity,
                        supervisorStrategy: supervisorStrategy
                    }
                };

            } catch (error) {
                console.error('[Supervisor] Error handling query:', error);

                // Hide supervisor activity indicator
                if (window.hideSupervisorActivity) {
                    window.hideSupervisorActivity();
                }

                return {
                    success: false,
                    content: `I apologize, but I encountered an error: ${error.message}\n\nPlease try again or rephrase your question.`,
                    error_message: error.message,
                    metadata: {
                        strategy: 'error',
                        agentsUsed: [],
                        duration: '0s',
                        reportContextUsed: !!reportContext
                    }
                };
            }
        }

        /**
         * Analyze query and determine strategy
         * @param {string} query - User query
         * @param {Object} pageContext - Page context
         * @param {Object} reportContext - Report context
         * @returns {Object} Strategy object
         */
        async analyzeQuery(query, pageContext, reportContext) {
            // Check supervisor strategy from config
            const supervisorStrategy = this.config.performanceSettings.supervisorStrategy || 'rule-based';
            const strategyConfig = this.config.supervisorStrategies?.[supervisorStrategy];

            // Use AI analysis if enabled
            if (strategyConfig?.useAIAnalysis || this.config.performanceSettings.llmAnalysisEnabled) {
                console.log('[Supervisor] Using AI-based query analysis');
                try {
                    const aiStrategy = await this.analyzeQueryWithAI(query, pageContext, reportContext);
                    if (aiStrategy) {
                        console.log('[Supervisor] AI analysis result:', aiStrategy);
                        return aiStrategy;
                    }
                } catch (error) {
                    console.error('[Supervisor] AI analysis failed, falling back to rules:', error);
                }
            }

            // Use quick routing (keyword-based)
            if (this.config.performanceSettings.quickRoutingEnabled) {
                const quickRoute = this.quickRouteCheck(query);
                if (quickRoute) {
                    console.log('[Supervisor] Quick route matched:', quickRoute);
                    return quickRoute;
                }
            }

            // Default fallback strategy
            console.log('[Supervisor] Using default strategy (parallel with all agents)');
            return {
                strategy: 'parallel',
                agents: ['ccr', 'puf', 'api'],
                complexity: 'moderate',
                reasoning: 'Default strategy for comprehensive coverage'
            };
        }

        /**
         * Analyze query using AI (LLM-based analysis)
         * @param {string} query - User query
         * @param {Object} pageContext - Page context
         * @param {Object} reportContext - Report context
         * @returns {Object} Strategy object from AI
         */
        async analyzeQueryWithAI(query, pageContext, reportContext) {
            if (!this.config.supervisorPrompts?.analysis) {
                console.error('[Supervisor] AI analysis prompt not configured');
                return null;
            }

            // Create a client for supervisor analysis using dedicated supervisor workflow
            const supervisorClient = this.getSupervisorClient();

            // Build analysis prompt
            let analysisPrompt = this.config.supervisorPrompts.analysis;

            // Replace placeholders
            analysisPrompt = analysisPrompt.replace('{query}', query);

            // Add page context
            const pageContextStr = pageContext ?
                `Page: ${pageContext.page || 'Unknown'}\nURL: ${pageContext.url || 'Unknown'}` :
                'No page context';
            analysisPrompt = analysisPrompt.replace('{pageContext}', pageContextStr);

            // Add report context
            const reportContextStr = reportContext ?
                `Report available for: ${reportContext.countries?.join(', ') || 'Unknown'}\nSections: ${reportContext.relevantSections?.length || 0}` :
                'No report context available';
            analysisPrompt = analysisPrompt.replace('{reportContext}', reportContextStr);

            console.log('[Supervisor] Calling AI for query analysis...');

            try {
                const response = await supervisorClient.infer(analysisPrompt, pageContext);

                if (!response.success || !response.content) {
                    console.error('[Supervisor] AI analysis failed:', response.error_message);
                    return null;
                }

                // Parse JSON response
                const content = response.content.trim();

                // Extract JSON from code blocks if present
                let jsonStr = content;
                const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
                if (jsonMatch) {
                    jsonStr = jsonMatch[1];
                } else {
                    // Try to find JSON object in response
                    const objectMatch = content.match(/\{[\s\S]*\}/);
                    if (objectMatch) {
                        jsonStr = objectMatch[0];
                    }
                }

                const strategy = JSON.parse(jsonStr);

                // Validate strategy object
                if (!strategy.strategy || !strategy.agents || !Array.isArray(strategy.agents)) {
                    console.error('[Supervisor] Invalid AI strategy response:', strategy);
                    return null;
                }

                return strategy;

            } catch (error) {
                console.error('[Supervisor] Error in AI analysis:', error);
                return null;
            }
        }

        /**
         * Quick keyword-based routing (fast path)
         * @param {string} query - User query
         * @returns {Object|null} Strategy or null if no match
         */
        quickRouteCheck(query) {
            const queryLower = query.toLowerCase();
            const rules = this.config.routingRules;

            // Check for multi-agent triggers first
            const multiAgentMatch = rules.multiAgentTriggers.some(trigger =>
                queryLower.includes(trigger.toLowerCase())
            );

            if (multiAgentMatch) {
                // Complex query - use parallel execution with multiple agents
                return {
                    strategy: 'parallel',
                    agents: ['ccr', 'puf', 'api'],
                    complexity: 'complex',
                    reasoning: 'Multi-domain query requiring comprehensive coverage'
                };
            }

            // Check for single agent keywords
            const agentScores = {};
            for (const [agent, keywords] of Object.entries(rules.singleAgentKeywords)) {
                const matches = keywords.filter(keyword =>
                    queryLower.includes(keyword.toLowerCase())
                ).length;
                agentScores[agent] = matches;
            }

            // Sort agents by score
            const sortedAgents = Object.entries(agentScores)
                .sort((a, b) => b[1] - a[1])
                .filter(([_, score]) => score > 0);

            if (sortedAgents.length === 0) {
                // No clear match - return null to use default strategy
                return null;
            }

            if (sortedAgents.length === 1 || sortedAgents[0][1] > sortedAgents[1][1] * 2) {
                // Clear single agent winner
                return {
                    strategy: 'single',
                    agents: [sortedAgents[0][0]],
                    complexity: 'simple',
                    reasoning: `Query clearly targets ${sortedAgents[0][0]} domain`
                };
            }

            // Multiple agents matched - use parallel
            const topAgents = sortedAgents
                .slice(0, Math.min(3, sortedAgents.length))
                .map(([agent]) => agent);

            return {
                strategy: 'parallel',
                agents: topAgents,
                complexity: 'moderate',
                reasoning: 'Query spans multiple domains, executing in parallel'
            };
        }

        /**
         * Execute single agent
         * @param {string} agentKey - Agent key (api, puf, ccr)
         * @param {string} query - User query
         * @param {Object} pageContext - Page context
         * @param {Object} reportContext - Report context
         * @returns {Object} Agent result
         */
        async executeSingleAgent(agentKey, query, pageContext, reportContext) {
            console.log(`[Supervisor] Executing single agent: ${agentKey}`);

            const client = this.getOrCreateClient(agentKey);
            const prompt = this.buildAgentPrompt(agentKey, query, pageContext, reportContext);

            try {
                const response = await client.infer(prompt, pageContext);

                return {
                    [agentKey]: {
                        success: response.success,
                        content: response.content || '',
                        error: response.error_message
                    }
                };
            } catch (error) {
                console.error(`[Supervisor] Agent ${agentKey} failed:`, error);
                return {
                    [agentKey]: {
                        success: false,
                        content: '',
                        error: error.message
                    }
                };
            }
        }

        /**
         * Execute multiple agents in parallel
         * @param {Array} agents - Agent keys
         * @param {string} query - User query
         * @param {Object} pageContext - Page context
         * @param {Object} reportContext - Report context
         * @returns {Object} Combined results
         */
        async executeParallel(agents, query, pageContext, reportContext) {
            console.log(`[Supervisor] Executing ${agents.length} agents in parallel:`, agents);

            const promises = agents.map(agentKey => {
                const client = this.getOrCreateClient(agentKey);
                const prompt = this.buildAgentPrompt(agentKey, query, pageContext, reportContext);

                return client.infer(prompt, pageContext)
                    .then(response => ({
                        agentKey,
                        success: response.success,
                        content: response.content || '',
                        error: response.error_message
                    }))
                    .catch(error => ({
                        agentKey,
                        success: false,
                        content: '',
                        error: error.message
                    }));
            });

            const results = await Promise.all(promises);

            // Convert array to object keyed by agent
            const resultsObj = {};
            results.forEach(result => {
                resultsObj[result.agentKey] = {
                    success: result.success,
                    content: result.content,
                    error: result.error
                };
            });

            return resultsObj;
        }

        /**
         * Execute agents sequentially (each gets context from previous)
         * @param {Array} agents - Agent keys
         * @param {string} query - User query
         * @param {Object} pageContext - Page context
         * @param {Object} reportContext - Report context
         * @returns {Object} Combined results
         */
        async executeSequential(agents, query, pageContext, reportContext) {
            console.log(`[Supervisor] Executing ${agents.length} agents sequentially:`, agents);

            const results = {};
            let accumulatedContext = { ...pageContext };

            for (const agentKey of agents) {
                const client = this.getOrCreateClient(agentKey);
                const prompt = this.buildAgentPrompt(agentKey, query, accumulatedContext, reportContext, results);

                try {
                    const response = await client.infer(prompt, accumulatedContext);

                    results[agentKey] = {
                        success: response.success,
                        content: response.content || '',
                        error: response.error_message
                    };

                    // Add this agent's response to context for next agent
                    if (response.success) {
                        accumulatedContext[`${agentKey}_response`] = response.content;
                    }

                } catch (error) {
                    console.error(`[Supervisor] Agent ${agentKey} failed:`, error);
                    results[agentKey] = {
                        success: false,
                        content: '',
                        error: error.message
                    };
                }
            }

            return results;
        }

        /**
         * Build agent prompt with context
         * @param {string} agentKey - Agent key
         * @param {string} query - User query
         * @param {Object} pageContext - Page context
         * @param {Object} reportContext - Report context
         * @param {Object} previousResults - Results from previous agents (for sequential)
         * @returns {string} Enhanced prompt
         */
        buildAgentPrompt(agentKey, query, pageContext, reportContext, previousResults = null) {
            let prompt = query;

            // Add report context if available
            if (reportContext && reportContext.relevantSections && reportContext.relevantSections.length > 0) {
                prompt += '\n\n--- User\'s Report Context ---\n';
                prompt += `Report ID: ${reportContext.reportId}\n`;
                prompt += `Countries: ${reportContext.countries.join(', ')}\n\n`;

                reportContext.relevantSections.forEach(section => {
                    prompt += `**${section.title}**\n`;
                    prompt += section.summary + '\n\n';
                });

                prompt += '--- End Report Context ---\n\n';
                prompt += 'Please reference the above report context from the user when answering, if relevant.';
            }

            // Add previous agent results for sequential execution
            if (previousResults) {
                for (const [prevAgent, result] of Object.entries(previousResults)) {
                    if (result.success && result.content) {
                        prompt += `\n\n--- ${this.getAgentName(prevAgent)} Response ---\n`;
                        prompt += result.content.substring(0, 1000); // Limit context size
                        prompt += '\n--- End Previous Agent Response ---\n';
                    }
                }
            }

            return prompt;
        }

        /**
         * Synthesize multiple agent responses into unified answer
         * @param {string} query - Original query
         * @param {Object} agentResults - Results from all agents
         * @param {Object} reportContext - Report context
         * @returns {string} Synthesized response
         */
        async synthesizeResponses(query, agentResults, reportContext) {
            console.log('[Supervisor] Synthesizing responses from multiple agents');

            // Check supervisor strategy from config
            const supervisorStrategy = this.config.performanceSettings.supervisorStrategy || 'rule-based';
            const strategyConfig = this.config.supervisorStrategies?.[supervisorStrategy];

            // Use AI synthesis if enabled
            if (strategyConfig?.useAISynthesis || this.config.performanceSettings.llmSynthesisEnabled) {
                console.log('[Supervisor] Using AI-based response synthesis');
                try {
                    const synthesized = await this.synthesizeWithAI(query, agentResults, reportContext);
                    if (synthesized) {
                        return synthesized;
                    }
                } catch (error) {
                    console.error('[Supervisor] AI synthesis failed, falling back to concatenation:', error);
                }
            }

            // Fallback to simple concatenation
            return this.concatenateResponses(agentResults);
        }

        /**
         * Synthesize responses using AI (LLM-based synthesis)
         * @param {string} query - Original query
         * @param {Object} agentResults - Results from all agents
         * @param {Object} reportContext - Report context
         * @returns {string} Synthesized response
         */
        async synthesizeWithAI(query, agentResults, reportContext) {
            if (!this.config.supervisorPrompts?.synthesis) {
                console.error('[Supervisor] AI synthesis prompt not configured');
                return null;
            }

            // Create a client for supervisor synthesis using dedicated supervisor workflow
            const supervisorClient = this.getSupervisorClient();

            // Build synthesis prompt
            let synthesisPrompt = this.config.supervisorPrompts.synthesis;

            // Replace query placeholder
            synthesisPrompt = synthesisPrompt.replace('{query}', query);

            // Build agent responses section
            let agentResponsesStr = '';
            for (const [agentKey, result] of Object.entries(agentResults)) {
                if (result.success && result.content) {
                    const agentName = this.getAgentName(agentKey);
                    agentResponsesStr += `\n### ${agentName} Response:\n\n${result.content}\n\n---\n`;
                }
            }
            synthesisPrompt = synthesisPrompt.replace('{agentResponses}', agentResponsesStr);

            // Add report context
            let reportContextStr = 'No report context available';
            if (reportContext && reportContext.relevantSections) {
                reportContextStr = `Report ID: ${reportContext.reportId}\n`;
                reportContextStr += `Countries: ${reportContext.countries?.join(', ')}\n\n`;
                reportContext.relevantSections.forEach(section => {
                    reportContextStr += `**${section.title}:**\n${section.summary}\n\n`;
                });
            }
            synthesisPrompt = synthesisPrompt.replace('{reportContext}', reportContextStr);

            console.log('[Supervisor] Calling AI for response synthesis...');

            try {
                const response = await supervisorClient.infer(synthesisPrompt, {});

                if (!response.success || !response.content) {
                    console.error('[Supervisor] AI synthesis failed:', response.error_message);
                    return null;
                }

                return response.content;

            } catch (error) {
                console.error('[Supervisor] Error in AI synthesis:', error);
                return null;
            }
        }

        /**
         * Concatenate agent responses (fallback synthesis)
         * @param {Object} agentResults - Results from all agents
         * @returns {string} Concatenated response
         */
        concatenateResponses(agentResults) {
            let combined = '';

            // Order: CCR → PUF → API (logical flow)
            const orderedAgents = ['ccr', 'puf', 'api'];

            for (const agentKey of orderedAgents) {
                if (agentResults[agentKey] && agentResults[agentKey].success) {
                    if (combined) {
                        combined += '\n\n---\n\n';
                    }
                    combined += `**${this.getAgentName(agentKey)}:**\n\n`;
                    combined += agentResults[agentKey].content;
                }
            }

            // If no successful responses, return error
            if (!combined) {
                return 'I apologize, but I was unable to generate a response. Please try again or rephrase your question.';
            }

            return combined;
        }

        /**
         * Get or create OpenArena client for agent
         * @param {string} agentKey - Agent key
         * @returns {OpenArenaClient} Client instance
         */
        getOrCreateClient(agentKey) {
            if (!this.clients[agentKey]) {
                const workflowId = this.getWorkflowId(agentKey);
                this.clients[agentKey] = new window.OpenArenaClient(this.apiToken, workflowId);
                console.log(`[Supervisor] Created client for ${agentKey} with workflow ${workflowId}`);
            }
            return this.clients[agentKey];
        }

        /**
         * Get or create supervisor client (for AI analysis and synthesis)
         * @returns {OpenArenaClient} Supervisor client instance
         */
        getSupervisorClient() {
            if (!this.clients['supervisor']) {
                // First check sessionStorage for user-configured workflow
                let supervisorWorkflowId = sessionStorage.getItem('supervisor_workflow_id');

                // Fallback to config
                if (!supervisorWorkflowId) {
                    supervisorWorkflowId = this.config.workflowIds?.supervisor;
                }

                if (!supervisorWorkflowId) {
                    console.warn('[Supervisor] No supervisor workflow ID configured, falling back to API workflow');
                    console.warn('[Supervisor] For best results, configure a general-purpose Claude workflow in settings');
                    return this.getOrCreateClient('api');
                }

                this.clients['supervisor'] = new window.OpenArenaClient(this.apiToken, supervisorWorkflowId);
                console.log(`[Supervisor] Created supervisor client with workflow ${supervisorWorkflowId}`);
            }
            return this.clients['supervisor'];
        }

        /**
         * Get workflow ID for agent
         * @param {string} agentKey - Agent key
         * @returns {string} Workflow ID
         */
        getWorkflowId(agentKey) {
            return this.config.workflowIds[agentKey] || this.config.workflowIds.api;
        }

        /**
         * Get agent display name
         * @param {string} agentKey - Agent key
         * @returns {string} Agent name
         */
        getAgentName(agentKey) {
            return this.config.agentNames[agentKey] || agentKey.toUpperCase();
        }
    }

    // Expose to global scope
    window.SupervisorAgent = SupervisorAgent;

    console.log('[Supervisor] Supervisor Agent loaded');

})();
