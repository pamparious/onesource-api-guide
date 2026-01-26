/**
 * TR ONESOURCE API Guide - Report Context Manager
 * Manages localStorage save/retrieve for partner onboarding reports
 */

(function() {
    'use strict';

    /**
     * Report Context Manager
     * Handles saving, retrieving, and filtering report data for chatbot context
     */
    class ReportContextManager {
        constructor() {
            this.STORAGE_KEY = 'partner_reports'; // Array of reports
            this.OLD_STORAGE_KEY = 'latest_report'; // Legacy single report key
            this.MAX_STORAGE_SIZE = 500 * 1024; // 500KB limit per report
            this.SUMMARY_WORD_LIMIT = 200;
            this.MAX_REPORTS = 50; // Maximum number of reports to store

            // Migrate old single report to new array format
            this.migrateOldReport();
        }

        /**
         * Migrate old single report format to new array format (one-time migration)
         */
        migrateOldReport() {
            try {
                const oldReport = localStorage.getItem(this.OLD_STORAGE_KEY);
                if (!oldReport) return; // No old report to migrate

                const existingReports = this.getAllReports();
                if (existingReports.length > 0) {
                    // Already have reports in new format, skip migration
                    console.log('[ReportContext] Skipping migration - new reports already exist');
                    return;
                }

                // Parse old report
                const report = JSON.parse(oldReport);

                // Save to new format
                const reports = [report];
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reports));

                console.log('[ReportContext] ✅ Migrated old report to new array format');

                // Optionally remove old report (commented out to keep as backup)
                // localStorage.removeItem(this.OLD_STORAGE_KEY);

            } catch (error) {
                console.error('[ReportContext] Failed to migrate old report:', error);
            }
        }

        /**
         * Save report to localStorage (adds to array of reports)
         * @param {Object} reportData - The complete report data
         * @returns {boolean} Success status
         */
        saveReport(reportData) {
            try {
                // Generate report ID if not present
                if (!reportData.reportId) {
                    reportData.reportId = this.generateReportId();
                }

                // Add timestamp if not present
                if (!reportData.generatedAt) {
                    reportData.generatedAt = new Date().toISOString();
                }

                // Process sections to add summaries
                if (reportData.sections) {
                    reportData.sections = reportData.sections.map(section => {
                        if (section.content && !section.summary) {
                            section.summary = this.generateSummary(section.content);
                        }
                        return section;
                    });
                }

                // Get existing reports
                let reports = this.getAllReports() || [];

                // Check if report with same ID already exists (update scenario)
                const existingIndex = reports.findIndex(r => r.reportId === reportData.reportId);

                // Prepare report data
                let reportToSave = reportData;

                // Check individual report size and trim if needed
                const reportJson = JSON.stringify(reportData);
                if (reportJson.length > this.MAX_STORAGE_SIZE) {
                    console.warn('[ReportContext] Report size exceeds limit, trimming content');
                    reportToSave = {
                        ...reportData,
                        sections: reportData.sections.map(s => ({
                            ...s,
                            content: undefined // Remove full content, keep only summary
                        }))
                    };
                }

                // Update existing or add new
                if (existingIndex !== -1) {
                    reports[existingIndex] = reportToSave;
                } else {
                    reports.unshift(reportToSave); // Add to beginning (most recent first)
                }

                // Limit number of reports
                if (reports.length > this.MAX_REPORTS) {
                    reports = reports.slice(0, this.MAX_REPORTS);
                    console.log(`[ReportContext] Trimmed to ${this.MAX_REPORTS} most recent reports`);
                }

                // Save to localStorage
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reports));
                console.log('[ReportContext] Report saved successfully:', reportData.reportId);
                return true;

            } catch (error) {
                if (error.name === 'QuotaExceededError') {
                    console.error('[ReportContext] Storage quota exceeded');
                    // Try to save minimal version
                    try {
                        const minimalData = {
                            reportId: reportData.reportId,
                            generatedAt: reportData.generatedAt,
                            formData: reportData.formData,
                            sections: reportData.sections?.map(s => ({
                                id: s.id,
                                title: s.title,
                                summary: s.summary,
                                country: s.country
                            }))
                        };

                        // Get existing reports and update/add minimal version
                        let reports = this.getAllReports() || [];
                        const existingIndex = reports.findIndex(r => r.reportId === minimalData.reportId);

                        if (existingIndex !== -1) {
                            reports[existingIndex] = minimalData;
                        } else {
                            reports.unshift(minimalData);
                        }

                        if (reports.length > this.MAX_REPORTS) {
                            reports = reports.slice(0, this.MAX_REPORTS);
                        }

                        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reports));
                        console.log('[ReportContext] Saved minimal report version');
                        return true;
                    } catch (e) {
                        console.error('[ReportContext] Failed to save minimal version:', e);
                        return false;
                    }
                } else {
                    console.error('[ReportContext] Error saving report:', error);
                    return false;
                }
            }
        }

        /**
         * Get all reports from localStorage
         * @returns {Array} Array of reports (most recent first)
         */
        getAllReports() {
            try {
                const data = localStorage.getItem(this.STORAGE_KEY);
                if (!data) {
                    console.log('[ReportContext] No reports found in storage');
                    return [];
                }

                const reports = JSON.parse(data);
                console.log(`[ReportContext] Retrieved ${reports.length} reports`);
                return reports;

            } catch (error) {
                console.error('[ReportContext] Error retrieving reports:', error);
                return [];
            }
        }

        /**
         * Get latest report from localStorage
         * @returns {Object|null} Report data or null
         */
        getLatestReport() {
            try {
                const reports = this.getAllReports();
                if (!reports || reports.length === 0) {
                    console.log('[ReportContext] No reports found in storage');
                    return null;
                }

                const report = reports[0]; // First item is most recent
                console.log('[ReportContext] Latest report retrieved:', report.reportId);
                return report;

            } catch (error) {
                console.error('[ReportContext] Error retrieving latest report:', error);
                return null;
            }
        }

        /**
         * Get specific report by ID
         * @param {string} reportId - The report ID to retrieve
         * @returns {Object|null} Report data or null
         */
        getReportById(reportId) {
            try {
                const reports = this.getAllReports();
                const report = reports.find(r => r.reportId === reportId);

                if (!report) {
                    console.log('[ReportContext] Report not found:', reportId);
                    return null;
                }

                console.log('[ReportContext] Report retrieved:', reportId);
                return report;

            } catch (error) {
                console.error('[ReportContext] Error retrieving report:', error);
                return null;
            }
        }

        /**
         * Delete specific report by ID
         * @param {string} reportId - The report ID to delete
         * @returns {boolean} Success status
         */
        deleteReport(reportId) {
            try {
                let reports = this.getAllReports();
                const originalLength = reports.length;

                reports = reports.filter(r => r.reportId !== reportId);

                if (reports.length === originalLength) {
                    console.warn('[ReportContext] Report not found for deletion:', reportId);
                    return false;
                }

                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reports));
                console.log('[ReportContext] Report deleted:', reportId);
                return true;

            } catch (error) {
                console.error('[ReportContext] Error deleting report:', error);
                return false;
            }
        }

        /**
         * Clear all saved reports
         */
        clearReport() {
            try {
                localStorage.removeItem(this.STORAGE_KEY);
                console.log('[ReportContext] All reports cleared from storage');
                return true;
            } catch (error) {
                console.error('[ReportContext] Error clearing reports:', error);
                return false;
            }
        }

        /**
         * Clear all reports (alias)
         */
        clearAllReports() {
            return this.clearReport();
        }

        /**
         * Check if any reports exist
         * @returns {boolean}
         */
        hasReport() {
            const reports = this.getAllReports();
            return reports.length > 0;
        }

        /**
         * Get number of saved reports
         * @returns {number}
         */
        getReportCount() {
            const reports = this.getAllReports();
            return reports.length;
        }

        /**
         * Extract relevant sections based on query
         * @param {string} query - User query
         * @param {Object} report - Full report data
         * @returns {Object} Filtered context with relevant sections
         */
        extractRelevantSections(query, report) {
            if (!report || !report.sections) {
                return null;
            }

            // Extract countries mentioned in query
            const queryLower = query.toLowerCase();
            const mentionedCountries = this.extractCountriesFromQuery(queryLower, report);

            // Extract topic (compliance, format, api, etc.)
            const topic = this.extractTopicFromQuery(queryLower);

            // Filter sections
            const relevantSections = report.sections.filter(section => {
                // If specific countries mentioned, only include those
                if (mentionedCountries.length > 0) {
                    if (section.country && !mentionedCountries.includes(section.country.toLowerCase())) {
                        return false;
                    }
                }

                // Filter by topic if identified
                if (topic) {
                    const sectionTitleLower = (section.title || '').toLowerCase();
                    const sectionIdLower = (section.id || '').toLowerCase();

                    if (topic === 'compliance' && !(sectionTitleLower.includes('compliance') || sectionIdLower.includes('compliance') || sectionIdLower.includes('ccr'))) {
                        return false;
                    }
                    if (topic === 'format' && !(sectionTitleLower.includes('format') || sectionTitleLower.includes('document') || sectionIdLower.includes('puf'))) {
                        return false;
                    }
                    if (topic === 'api' && !(sectionTitleLower.includes('api') || sectionTitleLower.includes('implementation'))) {
                        return false;
                    }
                }

                return section.success; // Only include successfully generated sections
            });

            return {
                reportId: report.reportId,
                generatedAt: report.generatedAt,
                countries: report.formData?.countries || this.extractCountriesFromReport(report),
                relevantSections: relevantSections.map(section => ({
                    id: section.id,
                    title: section.title,
                    summary: section.summary || this.generateSummary(section.content),
                    country: section.country,
                    // Include full content only for small sections
                    content: section.content?.length < 2000 ? section.content : undefined
                }))
            };
        }

        /**
         * Extract countries mentioned in query
         * @param {string} queryLower - Lowercase query
         * @param {Object} report - Report data
         * @returns {Array} List of country names
         */
        extractCountriesFromQuery(queryLower, report) {
            const countries = [];

            // Get all countries from report
            const reportCountries = this.extractCountriesFromReport(report);

            // Check if any are mentioned in query
            reportCountries.forEach(country => {
                if (queryLower.includes(country.toLowerCase())) {
                    countries.push(country.toLowerCase());
                }
            });

            return countries;
        }

        /**
         * Extract all countries from report
         * @param {Object} report - Report data
         * @returns {Array} List of country names
         */
        extractCountriesFromReport(report) {
            const countries = [];

            if (report.formData) {
                if (report.formData.country1) countries.push(report.formData.country1);
                if (report.formData.country2) countries.push(report.formData.country2);
                if (report.formData.country3) countries.push(report.formData.country3);
                if (report.formData.additionalCountries) {
                    const additional = report.formData.additionalCountries.split(',').map(c => c.trim()).filter(c => c);
                    countries.push(...additional);
                }
            }

            return [...new Set(countries)]; // Remove duplicates
        }

        /**
         * Extract topic from query
         * @param {string} queryLower - Lowercase query
         * @returns {string|null} Topic identifier
         */
        extractTopicFromQuery(queryLower) {
            const topicKeywords = {
                compliance: ['compliance', 'mandate', 'regulation', 'requirement', 'penalty', 'tax', 'clearance'],
                format: ['format', 'xml', 'schema', 'field', 'validation', 'puf', 'document'],
                api: ['api', 'endpoint', 'implementation', 'code', 'submit', 'authenticate', 'oauth']
            };

            for (const [topic, keywords] of Object.entries(topicKeywords)) {
                if (keywords.some(keyword => queryLower.includes(keyword))) {
                    return topic;
                }
            }

            return null;
        }

        /**
         * Generate summary from content (first N words)
         * @param {string} content - Full content
         * @returns {string} Summary
         */
        generateSummary(content) {
            if (!content) return '';

            // Remove markdown formatting
            let text = content
                .replace(/```[\s\S]*?```/g, '') // Remove code blocks
                .replace(/[#*`]/g, '') // Remove markdown symbols
                .replace(/\n+/g, ' '); // Replace newlines with spaces

            // Extract first N words
            const words = text.split(/\s+/).filter(w => w.length > 0);
            const summary = words.slice(0, this.SUMMARY_WORD_LIMIT).join(' ');

            return summary + (words.length > this.SUMMARY_WORD_LIMIT ? '...' : '');
        }

        /**
         * Generate unique report ID
         * @returns {string} Report ID
         */
        generateReportId() {
            const date = new Date();
            const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
            const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
            return `TRONB-${dateStr}-${randomStr}`;
        }

        /**
         * Get report metadata (without full content)
         * @param {string} reportId - Optional report ID, defaults to latest report
         * @returns {Object|null} Report metadata
         */
        getReportMetadata(reportId = null) {
            const report = reportId ? this.getReportById(reportId) : this.getLatestReport();
            if (!report) return null;

            return {
                reportId: report.reportId,
                generatedAt: report.generatedAt,
                countries: this.extractCountriesFromReport(report),
                sectionCount: report.sections?.length || 0,
                formData: {
                    partnerCompanyName: report.formData?.partnerCompanyName,
                    programmingLanguage: report.formData?.programmingLanguage
                }
            };
        }

        /**
         * Get metadata for all reports
         * @returns {Array} Array of report metadata
         */
        getAllReportsMetadata() {
            const reports = this.getAllReports();
            return reports.map(report => ({
                reportId: report.reportId,
                generatedAt: report.generatedAt,
                countries: this.extractCountriesFromReport(report),
                sectionCount: report.sections?.length || 0,
                partnerCompanyName: report.formData?.partnerCompanyName,
                programmingLanguage: report.formData?.programmingLanguage
            }));
        }
    }

    // Expose to global scope
    window.ReportContextManager = ReportContextManager;

    console.log('[ReportContext] Report Context Manager loaded');

})();
