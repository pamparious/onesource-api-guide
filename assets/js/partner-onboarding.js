/**
 * Partner Onboarding - Frontend Logic
 * Handles form validation, localStorage, and report generation
 */

(function() {
    'use strict';

    // State
    let formData = {};
    let autoSaveInterval = null;
    const API_BASE_URL = 'http://localhost:3000';

    // DOM Elements
    const form = document.getElementById('onboardingForm');
    const submitBtn = document.getElementById('submitBtn');
    const clearBtn = document.getElementById('clearBtn');
    const autoSaveIndicator = document.getElementById('autoSaveIndicator');
    const formContainer = document.getElementById('formContainer');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const reportContainer = document.getElementById('reportContainer');
    const reportContent = document.getElementById('reportContent');

    // API Key Modal
    const apiKeyModal = document.getElementById('apiKeyModal');
    const apiTokenInput = document.getElementById('apiTokenInput');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalSaveBtn = document.getElementById('modalSaveBtn');

    // Report Actions
    const printReportBtn = document.getElementById('printReportBtn');
    const downloadReportBtn = document.getElementById('downloadReportBtn');
    const copyReportBtn = document.getElementById('copyReportBtn');
    const newFormBtn = document.getElementById('newFormBtn');

    // Demo Mode
    const demoModeToggle = document.getElementById('demoModeToggle');

    /**
     * Initialize application
     */
    function init() {
        restoreFormData();
        setupConditionalInputs();
        setupValidation();
        setupEventListeners();
        startAutoSave();
        validateForm();

        console.log('[Onboarding] Application initialized');
    }

    /**
     * Setup conditional input displays
     */
    function setupConditionalInputs() {
        // ERP System details
        const erpCheckbox = document.getElementById('systemErp');
        const erpDetails = document.getElementById('erpDetails');

        erpCheckbox.addEventListener('change', function() {
            erpDetails.style.display = this.checked ? 'block' : 'none';
        });

        // Other system details
        const otherCheckbox = document.getElementById('systemOther');
        const otherDetails = document.getElementById('otherSystemDetails');

        otherCheckbox.addEventListener('change', function() {
            otherDetails.style.display = this.checked ? 'block' : 'none';
        });
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Form submission
        form.addEventListener('submit', handleSubmit);

        // Clear form
        clearBtn.addEventListener('click', handleClearForm);

        // Form input changes
        form.addEventListener('input', handleFormChange);
        form.addEventListener('change', handleFormChange);

        // API Key Modal
        modalCloseBtn.addEventListener('click', closeApiKeyModal);
        modalCancelBtn.addEventListener('click', closeApiKeyModal);
        modalSaveBtn.addEventListener('click', saveApiCredentials);

        // Report Actions
        if (printReportBtn) printReportBtn.addEventListener('click', handlePrintReport);
        if (downloadReportBtn) downloadReportBtn.addEventListener('click', handleDownloadReport);
        if (copyReportBtn) copyReportBtn.addEventListener('click', handleCopyReport);
        if (newFormBtn) newFormBtn.addEventListener('click', handleNewForm);

        // Close modal on outside click
        apiKeyModal.addEventListener('click', function(e) {
            if (e.target === apiKeyModal) {
                closeApiKeyModal();
            }
        });
    }

    /**
     * Setup real-time validation
     */
    function setupValidation() {
        // Text inputs
        const textInputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="number"], textarea');
        textInputs.forEach(input => {
            input.addEventListener('blur', function() {
                validateField(this);
            });

            input.addEventListener('input', function() {
                if (this.classList.contains('error')) {
                    validateField(this);
                }
            });
        });

        // Radio buttons and checkboxes
        const radioCheckboxes = form.querySelectorAll('input[type="radio"], input[type="checkbox"]');
        radioCheckboxes.forEach(input => {
            input.addEventListener('change', function() {
                validateField(this);
            });
        });
    }

    /**
     * Validate individual field
     */
    function validateField(field) {
        const errorSpan = field.closest('.form-group').querySelector('.error-message');
        let isValid = true;
        let errorMessage = '';

        // Required field validation
        if (field.hasAttribute('required')) {
            if (field.type === 'checkbox' || field.type === 'radio') {
                const name = field.name;
                const checked = form.querySelectorAll(`input[name="${name}"]:checked`);
                isValid = checked.length > 0;
                errorMessage = `Please select at least one option`;
            } else if (!field.value.trim()) {
                isValid = false;
                errorMessage = 'This field is required';
            }
        }

        // Email validation
        if (field.type === 'email' && field.value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(field.value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address';
            }
        }

        // Number validation
        if (field.type === 'number' && field.value) {
            const num = parseInt(field.value);
            if (isNaN(num) || num < 1) {
                isValid = false;
                errorMessage = 'Please enter a valid number greater than 0';
            }
        }

        // Update UI
        if (isValid) {
            field.classList.remove('error');
            field.classList.add('valid');
            if (errorSpan) errorSpan.textContent = '';
        } else {
            field.classList.remove('valid');
            field.classList.add('error');
            if (errorSpan) errorSpan.textContent = errorMessage;
        }

        return isValid;
    }

    /**
     * Validate entire form
     */
    function validateForm() {
        let isValid = true;

        // Only validate country1 is required
        const country1 = document.getElementById('country1').value.trim();
        if (!country1) {
            isValid = false;
        }

        // Enable/disable submit button
        submitBtn.disabled = !isValid;

        return isValid;
    }

    /**
     * Handle form change
     */
    function handleFormChange() {
        validateForm();
    }

    /**
     * Calculate estimated time based on country count
     */
    function calculateTimeEstimate(countryCount) {
        // Each country needs 2 agents (CCR + PUF), plus 1 API agent for all countries
        const agentCount = (countryCount * 2) + 1;

        // Base timeout per agent: 2 minutes, with potential retry: +4 minutes
        // Conservative estimate: assume 50% retry rate
        const avgTimePerAgent = 2 + (4 * 0.3); // 3.2 minutes average per agent

        const totalMinutes = Math.ceil(agentCount * avgTimePerAgent);

        // Return range (min is base time, max includes all retries)
        const minMinutes = agentCount * 2;
        const maxMinutes = agentCount * 6; // If all agents retry

        return {
            min: minMinutes,
            max: maxMinutes,
            average: totalMinutes
        };
    }

    /**
     * Update loading time estimate based on country count
     */
    function updateLoadingEstimate(data) {
        const countries = [];
        if (data.country1) countries.push(data.country1);
        if (data.country2) countries.push(data.country2);
        if (data.country3) countries.push(data.country3);
        if (data.additionalCountries) {
            const additional = data.additionalCountries.split(',').map(c => c.trim()).filter(c => c);
            countries.push(...additional);
        }

        const countryCount = [...new Set(countries)].length;
        const estimate = calculateTimeEstimate(countryCount);

        const loadingTimeElement = document.getElementById('loadingTimeEstimate');
        if (loadingTimeElement) {
            if (countryCount === 1) {
                loadingTimeElement.textContent = `This may take 3-5 minutes (1 country, ${3} AI agents)...`;
            } else {
                loadingTimeElement.textContent = `This may take ${estimate.min}-${estimate.max} minutes (${countryCount} countries, ${countryCount * 2 + 1} AI agents)...`;
            }
        }
    }

    /**
     * Handle form submission
     */
    async function handleSubmit(e) {
        e.preventDefault();

        // Check API credentials
        if (!hasApiCredentials() && !demoModeToggle.checked) {
            openApiKeyModal();
            return;
        }

        // Validate form
        if (!validateForm()) {
            alert('Please fill in all required fields correctly.');
            return;
        }

        // Collect form data
        const data = collectFormData();

        // Update loading time estimate
        updateLoadingEstimate(data);

        // Show loading spinner
        formContainer.style.display = 'none';
        loadingSpinner.style.display = 'block';
        reportContainer.style.display = 'none';

        try {
            // Submit to backend
            const response = await submitFormData(data);

            // Display report
            displayReport(response, data);

            // Hide loading, show report
            loadingSpinner.style.display = 'none';
            reportContainer.style.display = 'block';

        } catch (error) {
            console.error('[Onboarding] Submission error:', error);
            alert(`Error generating report: ${error.message}`);

            // Show form again
            loadingSpinner.style.display = 'none';
            formContainer.style.display = 'block';
        }
    }

    /**
     * Collect form data
     */
    function collectFormData() {
        const systemIntegration = Array.from(form.querySelectorAll('input[name="systemIntegration"]:checked')).map(cb => cb.value);
        const invoiceHandling = Array.from(form.querySelectorAll('input[name="invoiceHandling"]:checked')).map(cb => cb.value);

        const data = {
            partnerCompanyName: document.getElementById('partnerCompanyName').value.trim() || 'Not specified',
            projectManagerName: document.getElementById('projectManagerName').value.trim() || 'Not specified',
            projectManagerEmail: document.getElementById('projectManagerEmail').value.trim() || 'not.specified@example.com',
            technicalLeadName: document.getElementById('technicalLeadName').value.trim() || 'Not specified',
            technicalLeadEmail: document.getElementById('technicalLeadEmail').value.trim() || 'not.specified@example.com',
            partnershipType: form.querySelector('input[name="partnershipType"]:checked')?.value || 'reseller',
            programmingLanguage: document.getElementById('programmingLanguage').value || 'python',
            systemIntegration: systemIntegration.length > 0 ? systemIntegration : ['custom'],
            erpDetails: document.querySelector('input[name="erpDetails"]')?.value || '',
            otherSystemDetails: document.querySelector('input[name="otherSystemDetails"]')?.value || '',
            country1: document.getElementById('country1').value.trim(),
            country2: document.getElementById('country2').value.trim(),
            country3: document.getElementById('country3').value.trim(),
            additionalCountries: document.getElementById('additionalCountries').value.trim(),
            invoiceHandling: invoiceHandling.length > 0 ? invoiceHandling : ['ar', 'ap'],
            invoiceVolume: document.getElementById('invoiceVolume').value || '1000',
            firstLineSupport: form.querySelector('input[name="firstLineSupport"]:checked')?.value || 'thomson-reuters',
            accountAccess: form.querySelector('input[name="accountAccess"]:checked')?.value || 'customer-direct',
            serviceModel: form.querySelector('input[name="serviceModel"]:checked')?.value || 'managed-service'
        };

        return data;
    }

    /**
     * Submit form data to backend
     */
    async function submitFormData(data) {
        const apiToken = sessionStorage.getItem('openarena_token');
        const demoMode = demoModeToggle.checked;

        const response = await fetch(`${API_BASE_URL}/api/generate-report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                formData: data,
                apiToken: apiToken,
                demoMode: demoMode
            })
        });

        if (!response.ok) {
            const error = await response.json();
            const errorMsg = error.message || error.error || 'Failed to generate report';
            const errorDetails = error.details ? `\n\nDetails: ${error.details}` : '';
            throw new Error(errorMsg + errorDetails);
        }

        return await response.json();
    }

    /**
     * Display report
     */
    function displayReport(response, formData) {
        // Hide form and loading
        document.getElementById('formContainer').style.display = 'none';
        document.getElementById('loadingSpinner').style.display = 'none';

        // Show report container
        const reportContainer = document.getElementById('reportContainer');
        reportContainer.style.display = 'block';

        const reportContent = document.getElementById('reportContent');

        // Build report HTML
        let html = '';

        // Report header with metadata
        html += `
            <div class="report-metadata">
                <div class="metadata-item">
                    <strong>Report ID:</strong> ${response.metadata.reportId || generateReportId()}
                </div>
                <div class="metadata-item">
                    <strong>Generated:</strong> ${new Date(response.metadata.generatedAt).toLocaleString()}
                </div>
                <div class="metadata-item">
                    <strong>Partner:</strong> ${formData.partnerCompanyName}
                </div>
                <div class="metadata-item">
                    <strong>Partnership Type:</strong> ${formatValue(formData.partnershipType)}
                </div>
                <div class="metadata-item">
                    <strong>Countries:</strong> ${response.metadata.countries.join(', ')}
                </div>
                <div class="metadata-item">
                    <strong>Duration:</strong> ${response.metadata.duration}
                </div>
                ${response.metadata.demoMode ? '<div class="metadata-item demo-badge">DEMO MODE</div>' : ''}
            </div>
        `;

        // Validation summary
        if (response.validation) {
            const validation = response.validation;
            html += `
                <div class="validation-summary ${validation.ready ? 'validation-passed' : 'validation-failed'}">
                    <h3>
                        <i class="fas fa-${validation.ready ? 'check-circle' : 'exclamation-triangle'}"></i>
                        Report Validation Summary
                    </h3>
                    <div class="validation-stats">
                        <div class="stat">
                            <span class="stat-value">${validation.passedChecks}/${validation.totalChecks}</span>
                            <span class="stat-label">Checks Passed</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">${validation.completeness}%</span>
                            <span class="stat-label">Completeness</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value ${validation.criticalFailed > 0 ? 'stat-error' : ''}">${validation.criticalFailed}</span>
                            <span class="stat-label">Critical Failures</span>
                        </div>
                    </div>
                    ${validation.criticalFailed > 0 ? `
                        <div class="validation-warning">
                            ⚠️ <strong>Critical sections failed.</strong> Report is incomplete. Please retry or contact support.
                        </div>
                    ` : ''}
                    <details class="validation-details">
                        <summary>View Detailed Validation Results</summary>
                        <ul class="validation-checklist">
                            ${validation.checks.map(check => `
                                <li class="${check.passed ? 'check-passed' : 'check-failed'}">
                                    <i class="fas fa-${check.passed ? 'check-circle' : 'times-circle'}"></i>
                                    ${check.check}
                                    ${check.critical ? ' <span class="badge-critical">CRITICAL</span>' : ''}
                                </li>
                            `).join('')}
                        </ul>
                    </details>
                </div>
            `;
        }

        // Table of contents
        html += '<div class="report-toc"><h3>Table of Contents</h3><ul>';
        response.sections.forEach((section, index) => {
            if (section.success) {
                html += `<li><a href="#section-${section.id}">${index + 1}. ${section.title}</a></li>`;
            } else {
                html += `<li class="toc-error">${index + 1}. ${section.title} <span class="badge-error">FAILED</span></li>`;
            }
        });
        html += '</ul></div>';

        // Render each section
        response.sections.forEach((section, index) => {
            html += `<div class="report-section" id="section-${section.id}">`;
            html += `<h2>${index + 1}. ${section.title}</h2>`;

            if (section.success) {
                // Successfully generated section
                html += formatAgentResponse(section.content);
            } else {
                // Failed section - show error placeholder
                html += `
                    <div class="section-error">
                        <div class="error-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <h3>Section Generation Failed</h3>
                        <p><strong>Error:</strong> ${section.error}</p>
                        <p>This section could not be generated due to an error. Please:</p>
                        <ul>
                            <li>Verify your API credentials are valid</li>
                            <li>Check your network connection</li>
                            <li>Try generating the report again</li>
                            <li>Contact Thomson Reuters support if the issue persists</li>
                        </ul>
                        ${section.country ? `<p><strong>Country affected:</strong> ${section.country}</p>` : ''}
                    </div>
                `;
            }

            html += '</div>';
        });

        // Add error summary at the end if any errors occurred
        if (response.metadata.errors && response.metadata.errors.length > 0) {
            html += `
                <div class="report-errors-summary">
                    <h2><i class="fas fa-exclamation-circle"></i> Errors Summary</h2>
                    <p>The following sections failed to generate:</p>
                    <ul>
                        ${response.metadata.errors.map(error => `<li>${error}</li>`).join('')}
                    </ul>
                    <p><strong>Recommendation:</strong> Please retry report generation or contact support with Report ID: ${response.metadata.reportId || 'N/A'}</p>
                </div>
            `;
        }

        reportContent.innerHTML = html;

        // Generate dynamic right sidebar TOC
        generateReportTOC(response.sections);

        // Scroll to report
        reportContainer.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Generate dynamic TOC in right sidebar for the report
     */
    function generateReportTOC(sections) {
        const reportTocList = document.getElementById('reportTocList');
        if (!reportTocList) return;

        let tocHtml = '';
        sections.forEach((section, index) => {
            if (section.success) {
                tocHtml += `
                    <li>
                        <a href="#section-${section.id}" data-section="${section.id}">
                            ${index + 1}. ${section.title}
                        </a>
                    </li>
                `;
            }
        });

        reportTocList.innerHTML = tocHtml;

        // Add smooth scrolling and active state tracking
        const tocLinks = reportTocList.querySelectorAll('a');
        tocLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });

                    // Update active state
                    tocLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                }
            });
        });

        // Track scroll position to highlight current section
        setupScrollSpy(sections);
    }

    /**
     * Setup scroll spy to highlight current section in TOC
     */
    function setupScrollSpy(sections) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id.replace('section-', '');
                    const tocLinks = document.querySelectorAll('#reportTocList a');
                    tocLinks.forEach(link => {
                        const linkSection = link.getAttribute('data-section');
                        if (linkSection === id) {
                            tocLinks.forEach(l => l.classList.remove('active'));
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, {
            rootMargin: '-100px 0px -66% 0px',
            threshold: 0
        });

        // Observe all report sections
        sections.forEach(section => {
            const element = document.getElementById(`section-${section.id}`);
            if (element) {
                observer.observe(element);
            }
        });
    }

    /**
     * HTML escape function for code blocks
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Parse markdown tables to HTML
     */
    function parseMarkdownTables(text) {
        // Match markdown tables (header | separator | rows)
        const tableRegex = /(\|.+\|\n)(\|[\s:|-]+\|\n)((?:\|.+\|\n?)+)/g;

        return text.replace(tableRegex, (match, header, separator, rows) => {
            // Parse header
            const headerCells = header.trim().split('|').filter(cell => cell.trim()).map(cell => cell.trim());

            // Parse rows
            const rowLines = rows.trim().split('\n').filter(line => line.trim());
            const dataRows = rowLines.map(line => {
                return line.trim().split('|').filter(cell => cell.trim()).map(cell => cell.trim());
            });

            // Build HTML table wrapped in scrollable container - use special marker
            let html = '<<<TABLE_START>>>';
            html += '<div class="table-wrapper">';
            html += '<table class="markdown-table">';

            // Header
            html += '<thead><tr>';
            headerCells.forEach(cell => {
                html += `<th>${cell}</th>`;
            });
            html += '</tr></thead>';

            // Body
            html += '<tbody>';
            dataRows.forEach(row => {
                html += '<tr>';
                row.forEach(cell => {
                    html += `<td>${cell}</td>`;
                });
                html += '</tr>';
            });
            html += '</tbody></table>';
            html += '</div>';
            html += '<<<TABLE_END>>>';

            return html;
        });
    }

    /**
     * Format agent response (markdown-like to HTML)
     */
    function formatAgentResponse(text) {
        if (!text) return '<p>No response available.</p>';

        // First, parse markdown tables (before other formatting)
        let html = parseMarkdownTables(text);

        // Convert markdown-like formatting to HTML
        html = html
            // Code blocks - ESCAPE HTML ENTITIES to prevent XML tags from being interpreted
            .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
                const escaped = escapeHtml(code);
                const langClass = lang ? ` class="language-${lang}"` : '';
                return `<pre><code${langClass}>${escaped}</code></pre>`;
            })
            // Bold
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            // Headers
            .replace(/^### (.+)$/gm, '<h4>$1</h4>')
            .replace(/^## (.+)$/gm, '<h4>$1</h4>')
            .replace(/^# (.+)$/gm, '<h4>$1</h4>')
            // Lists
            .replace(/^\* (.+)$/gm, '<li>$1</li>')
            .replace(/^- (.+)$/gm, '<li>$1</li>')
            .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Line breaks
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');

        // Wrap lists
        html = html.replace(/(<li>.*<\/li>)/gs, function(match) {
            return '<ul>' + match + '</ul>';
        });

        // Clean up extra spacing around tables and code blocks
        html = html
            // First protect tables by replacing markers
            .replace(/<<<TABLE_START>>>/g, '|||TABLE_MARKER_START|||')
            .replace(/<<<TABLE_END>>>/g, '|||TABLE_MARKER_END|||')
            // Remove ALL <br> tags between table markers
            .replace(/\|\|\|TABLE_MARKER_START\|\|\|(<br>\s*)*<div class="table-wrapper">/g, '|||TABLE_MARKER_START|||<div class="table-wrapper">')
            .replace(/<\/div>(<br>\s*)*\|\|\|TABLE_MARKER_END\|\|\|/g, '</div>|||TABLE_MARKER_END|||')
            // Remove multiple consecutive <br> tags (replace with max 2)
            .replace(/(<br>\s*){3,}/g, '<br><br>')
            // Remove empty paragraphs
            .replace(/<p><\/p>/g, '')
            .replace(/<p>\s*<\/p>/g, '')
            .replace(/<p>\s*<br>\s*<\/p>/g, '')
            // Remove paragraphs that only contain table markers
            .replace(/<p>\s*\|\|\|TABLE_MARKER_START\|\|\|/g, '|||TABLE_MARKER_START|||')
            .replace(/\|\|\|TABLE_MARKER_END\|\|\|\s*<\/p>/g, '|||TABLE_MARKER_END|||')
            // Clean around code blocks
            .replace(/(<br>\s*){1,5}<pre>/g, '<pre>')
            .replace(/<\/pre>\s*(<br>\s*){1,5}/g, '</pre>')
            // Remove <br> before headings
            .replace(/(<br>\s*){1,5}<h4>/g, '<h4>')
            // Remove <br> after headings (but keep one if followed by pre)
            .replace(/<\/h4>\s*(<br>\s*){2,}(?!<pre>)/g, '</h4><br>')
            .replace(/<\/h4>\s*(<br>\s*)+<pre>/g, '</h4><pre>')
            // Add class to h4 that precede code blocks for styling
            .replace(/<h4>([^<]+)<\/h4>\s*<pre>/g, '<h4 class="code-example-label">$1</h4><pre>')
            // Finally, restore table markers
            .replace(/\|\|\|TABLE_MARKER_START\|\|\|/g, '')
            .replace(/\|\|\|TABLE_MARKER_END\|\|\|/g, '');


        // Wrap in paragraphs if not already wrapped
        if (!html.startsWith('<')) {
            html = '<p>' + html + '</p>';
        }

        return html;
    }

    /**
     * Format value for display
     */
    function formatValue(value) {
        if (!value) return '';
        return value
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Generate report ID
     */
    function generateReportId() {
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `TRONB-${dateStr}-${randomStr}`;
    }

    /**
     * Handle clear form
     */
    function handleClearForm() {
        if (confirm('Are you sure you want to clear the form? All data will be lost.')) {
            form.reset();
            localStorage.removeItem('partnerOnboardingForm');
            validateForm();

            // Hide conditional inputs
            document.getElementById('erpDetails').style.display = 'none';
            document.getElementById('otherSystemDetails').style.display = 'none';
        }
    }

    /**
     * Handle new form
     */
    function handleNewForm() {
        if (confirm('Start a new form? This will clear the current data.')) {
            reportContainer.style.display = 'none';
            formContainer.style.display = 'block';
            handleClearForm();
        }
    }

    /**
     * Auto-save to localStorage
     */
    function startAutoSave() {
        autoSaveInterval = setInterval(() => {
            saveFormData();
            showAutoSaveIndicator();
        }, 30000); // Every 30 seconds
    }

    /**
     * Save form data to localStorage
     */
    function saveFormData() {
        const data = collectFormData();
        localStorage.setItem('partnerOnboardingForm', JSON.stringify(data));
    }

    /**
     * Restore form data from localStorage
     */
    function restoreFormData() {
        const savedData = localStorage.getItem('partnerOnboardingForm');
        if (!savedData) return;

        try {
            const data = JSON.parse(savedData);

            // Restore text inputs
            if (data.partnerCompanyName) document.getElementById('partnerCompanyName').value = data.partnerCompanyName;
            if (data.projectManagerName) document.getElementById('projectManagerName').value = data.projectManagerName;
            if (data.projectManagerEmail) document.getElementById('projectManagerEmail').value = data.projectManagerEmail;
            if (data.technicalLeadName) document.getElementById('technicalLeadName').value = data.technicalLeadName;
            if (data.technicalLeadEmail) document.getElementById('technicalLeadEmail').value = data.technicalLeadEmail;
            if (data.country1) document.getElementById('country1').value = data.country1;
            if (data.country2) document.getElementById('country2').value = data.country2;
            if (data.country3) document.getElementById('country3').value = data.country3;
            if (data.additionalCountries) document.getElementById('additionalCountries').value = data.additionalCountries;
            if (data.invoiceVolume) document.getElementById('invoiceVolume').value = data.invoiceVolume;

            // Restore radio buttons
            if (data.partnershipType) {
                const radio = form.querySelector(`input[name="partnershipType"][value="${data.partnershipType}"]`);
                if (radio) radio.checked = true;
            }
            if (data.firstLineSupport) {
                const radio = form.querySelector(`input[name="firstLineSupport"][value="${data.firstLineSupport}"]`);
                if (radio) radio.checked = true;
            }
            if (data.accountAccess) {
                const radio = form.querySelector(`input[name="accountAccess"][value="${data.accountAccess}"]`);
                if (radio) radio.checked = true;
            }
            if (data.serviceModel) {
                const radio = form.querySelector(`input[name="serviceModel"][value="${data.serviceModel}"]`);
                if (radio) radio.checked = true;
            }

            // Restore checkboxes
            if (data.systemIntegration) {
                data.systemIntegration.forEach(value => {
                    const checkbox = form.querySelector(`input[name="systemIntegration"][value="${value}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                        // Show conditional inputs
                        if (value === 'erp') document.getElementById('erpDetails').style.display = 'block';
                        if (value === 'other') document.getElementById('otherSystemDetails').style.display = 'block';
                    }
                });
            }
            if (data.invoiceHandling) {
                data.invoiceHandling.forEach(value => {
                    const checkbox = form.querySelector(`input[name="invoiceHandling"][value="${value}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }

            // Restore conditional inputs
            if (data.erpDetails) {
                const input = document.querySelector('input[name="erpDetails"]');
                if (input) input.value = data.erpDetails;
            }
            if (data.otherSystemDetails) {
                const input = document.querySelector('input[name="otherSystemDetails"]');
                if (input) input.value = data.otherSystemDetails;
            }

            console.log('[Onboarding] Form data restored from localStorage');
        } catch (error) {
            console.error('[Onboarding] Error restoring form data:', error);
        }
    }

    /**
     * Show auto-save indicator
     */
    function showAutoSaveIndicator() {
        autoSaveIndicator.classList.add('show');
        setTimeout(() => {
            autoSaveIndicator.classList.remove('show');
        }, 2000);
    }

    /**
     * API Key Modal functions
     */
    function openApiKeyModal() {
        apiKeyModal.classList.add('active');
        const storedToken = sessionStorage.getItem('openarena_token');
        if (storedToken) {
            apiTokenInput.value = storedToken;
        }
        setTimeout(() => apiTokenInput.focus(), 100);
    }

    function closeApiKeyModal() {
        apiKeyModal.classList.remove('active');
    }

    function saveApiCredentials() {
        const apiToken = apiTokenInput.value.trim();

        if (!apiToken) {
            alert('Please enter your API token.');
            return;
        }

        sessionStorage.setItem('openarena_token', apiToken);
        closeApiKeyModal();
        console.log('[Onboarding] API credentials saved');
    }

    function hasApiCredentials() {
        return sessionStorage.getItem('openarena_token');
    }

    /**
     * Report action handlers
     */
    function handlePrintReport() {
        window.print();
    }

    function handleDownloadReport() {
        alert('PDF download functionality requires a PDF library integration. For now, please use the Print function and save as PDF.');
    }

    function handleCopyReport() {
        const text = reportContent.innerText;
        navigator.clipboard.writeText(text).then(() => {
            alert('Report copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('Failed to copy report to clipboard.');
        });
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
