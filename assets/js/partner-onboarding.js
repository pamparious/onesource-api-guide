/**
 * Partner Onboarding - Frontend Logic
 * Handles form validation, localStorage, and report generation
 */

(function() {
    'use strict';

    // State
    let formData = {};
    let autoSaveInterval = null;
    let isLoggedIn = false;
    let userProfile = null;
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

    // Past Reports Modal
    const viewPastReportsBtn = document.getElementById('viewPastReportsBtn');
    const pastReportsModal = document.getElementById('pastReportsModal');
    const pastReportsModalClose = document.getElementById('pastReportsModalClose');
    const pastReportsModalCloseBtn = document.getElementById('pastReportsModalCloseBtn');
    const pastReportsList = document.getElementById('pastReportsList');
    const pastReportsEmpty = document.getElementById('pastReportsEmpty');
    const clearAllReportsBtn = document.getElementById('clearAllReportsBtn');

    // Demo Mode
    const demoModeToggle = document.getElementById('demoModeToggle');

    // Report Context Manager
    let reportContextManager = null;

    /**
     * Check if user is logged in and load profile
     */
    function checkLoginState() {
        try {
            const profileData = localStorage.getItem('tr_user_profile');
            if (profileData) {
                userProfile = JSON.parse(profileData);
                isLoggedIn = true;
                console.log('[Onboarding] User is logged in, rendering simplified form');
                renderSimplifiedForm();
            } else {
                isLoggedIn = false;
                console.log('[Onboarding] User not logged in, showing full form');
            }
        } catch (e) {
            console.error('[Onboarding] Failed to check login state:', e);
            isLoggedIn = false;
        }
    }

    /**
     * Render simplified form for logged-in users
     */
    function renderSimplifiedForm() {
        // Show profile summary
        const profileSummary = document.getElementById('profileSummary');
        if (profileSummary) {
            profileSummary.style.display = 'block';
            populateProfileSummary();
        }

        // Hide sections 1-3, 5-8 (show only countries section)
        const sectionsToHide = document.querySelectorAll('.form-section');
        sectionsToHide.forEach((section, index) => {
            // Keep only section 4 (countries) - it's the 4th section (index 3)
            // Section indices: 0=Partner Info, 1=Partnership Type, 2=System Integration, 3=Countries, 4=AP/AR, etc.
            const isCountriesSection = section.id === 'countriesFullSection' || section.id === 'countriesSimplifiedSection';
            if (!isCountriesSection) {
                section.style.display = 'none';
            }
        });

        // Hide full countries section, show simplified
        const countriesFullSection = document.getElementById('countriesFullSection');
        const countriesSimplifiedSection = document.getElementById('countriesSimplifiedSection');
        if (countriesFullSection) countriesFullSection.style.display = 'none';
        if (countriesSimplifiedSection) countriesSimplifiedSection.style.display = 'block';

        // Update submit button text
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Generate Report';
            submitBtn.disabled = false; // Enable by default for simplified form
        }
    }

    /**
     * Populate profile summary with user data
     */
    function populateProfileSummary() {
        if (!userProfile) return;

        const detailsContent = document.getElementById('profileDetailsContent');
        if (!detailsContent) return;

        const partnershipTypeLabel = userProfile.partnershipType === 'reseller' ? 'Reseller Partner' : 'Referral Partner';
        const supportLabel = userProfile.firstLineSupport === 'partner' ? 'Partner' : 'Thomson Reuters';
        const accessLabel = userProfile.accountAccess === 'partner-managed' ? 'Partner Managed' : 'Customer Direct';
        const serviceLabel = userProfile.serviceModel === 'self-service' ? 'Self-Service' : 'Managed Service';

        detailsContent.innerHTML = `
            <div class="profile-detail-grid">
                <div class="profile-detail-item">
                    <strong>Company:</strong> ${userProfile.partnerCompanyName || 'Not specified'}
                </div>
                <div class="profile-detail-item">
                    <strong>Partnership:</strong> ${partnershipTypeLabel}
                </div>
                <div class="profile-detail-item">
                    <strong>Project Manager:</strong> ${userProfile.projectManagerName || 'Not specified'}
                </div>
                <div class="profile-detail-item">
                    <strong>PM Email:</strong> ${userProfile.projectManagerEmail || 'Not specified'}
                </div>
                <div class="profile-detail-item">
                    <strong>Tech Lead:</strong> ${userProfile.technicalLeadName || 'Not specified'}
                </div>
                <div class="profile-detail-item">
                    <strong>Tech Email:</strong> ${userProfile.technicalLeadEmail || 'Not specified'}
                </div>
                <div class="profile-detail-item">
                    <strong>Programming Language:</strong> ${userProfile.programmingLanguage || 'Python'}
                </div>
                <div class="profile-detail-item">
                    <strong>Systems:</strong> ${Array.isArray(userProfile.systemIntegration) ? userProfile.systemIntegration.join(', ') : userProfile.systemIntegration}
                </div>
                <div class="profile-detail-item">
                    <strong>Invoice Handling:</strong> ${Array.isArray(userProfile.invoiceHandling) ? userProfile.invoiceHandling.join(', ') : userProfile.invoiceHandling}
                </div>
                <div class="profile-detail-item">
                    <strong>Invoice Volume:</strong> ${userProfile.invoiceVolume || 'Not specified'}
                </div>
                <div class="profile-detail-item">
                    <strong>First-Line Support:</strong> ${supportLabel}
                </div>
                <div class="profile-detail-item">
                    <strong>Account Access:</strong> ${accessLabel}
                </div>
                <div class="profile-detail-item">
                    <strong>Service Model:</strong> ${serviceLabel}
                </div>
            </div>
        `;
    }

    /**
     * Initialize application
     */
    function init() {
        checkLoginState(); // Check login state first

        if (!isLoggedIn) {
            restoreFormData();
            startAutoSave();
        }

        // Initialize Report Context Manager
        if (window.ReportContextManager) {
            reportContextManager = new window.ReportContextManager();
            console.log('[Onboarding] Report Context Manager initialized');
        }

        setupConditionalInputs();
        setupValidation();
        setupEventListeners();
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

        // Past Reports Modal
        if (viewPastReportsBtn) viewPastReportsBtn.addEventListener('click', openPastReportsModal);
        if (pastReportsModalClose) pastReportsModalClose.addEventListener('click', closePastReportsModal);
        if (pastReportsModalCloseBtn) pastReportsModalCloseBtn.addEventListener('click', closePastReportsModal);
        if (clearAllReportsBtn) clearAllReportsBtn.addEventListener('click', handleClearAllReports);

        // Close modal on outside click
        apiKeyModal.addEventListener('click', function(e) {
            if (e.target === apiKeyModal) {
                closeApiKeyModal();
            }
        });

        // Close past reports modal on outside click
        if (pastReportsModal) {
            pastReportsModal.addEventListener('click', function(e) {
                if (e.target === pastReportsModal) {
                    closePastReportsModal();
                }
            });
        }
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

        if (isLoggedIn) {
            // For logged-in users, only validate simplified countries input
            const countriesSimplified = document.getElementById('countriesSimplified');
            if (countriesSimplified) {
                const value = countriesSimplified.value.trim();
                isValid = value.length > 0;
            }
        } else {
            // For logged-out users, only validate country1 is required
            const country1 = document.getElementById('country1');
            if (country1) {
                isValid = country1.value.trim().length > 0;
            }
        }

        // Enable/disable submit button
        if (submitBtn) {
            submitBtn.disabled = !isValid;
        }

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

            // Switch from form TOC to report TOC
            toggleTOC('report');

        } catch (error) {
            console.error('[Onboarding] Submission error:', error);
            alert(`Error generating report: ${error.message}`);

            // Show form again
            loadingSpinner.style.display = 'none';
            formContainer.style.display = 'block';

            // Switch back to form TOC
            toggleTOC('form');
        }
    }

    /**
     * Collect form data
     */
    function collectFormData() {
        let data = {};

        // If logged in, use profile data and only collect countries
        if (isLoggedIn && userProfile) {
            // Use all data from profile
            data = {
                partnerCompanyName: userProfile.partnerCompanyName || 'Not specified',
                projectManagerName: userProfile.projectManagerName || 'Not specified',
                projectManagerEmail: userProfile.projectManagerEmail || 'not.specified@example.com',
                technicalLeadName: userProfile.technicalLeadName || 'Not specified',
                technicalLeadEmail: userProfile.technicalLeadEmail || 'not.specified@example.com',
                partnershipType: userProfile.partnershipType || 'reseller',
                programmingLanguage: userProfile.programmingLanguage || 'python',
                systemIntegration: userProfile.systemIntegration || ['custom'],
                erpDetails: userProfile.erpDetails || '',
                otherSystemDetails: userProfile.otherSystemDetails || '',
                invoiceHandling: userProfile.invoiceHandling || ['ar', 'ap'],
                invoiceVolume: userProfile.invoiceVolume || '1000',
                firstLineSupport: userProfile.firstLineSupport || 'thomson-reuters',
                accountAccess: userProfile.accountAccess || 'customer-direct',
                serviceModel: userProfile.serviceModel || 'managed-service'
            };

            // Get countries from simplified input
            const countriesInput = document.getElementById('countriesSimplified');
            if (countriesInput) {
                const countriesText = countriesInput.value.trim();
                const countriesList = countriesText.split(',').map(c => c.trim()).filter(c => c);

                // Map to country1, country2, country3, additionalCountries format
                data.country1 = countriesList[0] || '';
                data.country2 = countriesList[1] || '';
                data.country3 = countriesList[2] || '';
                data.additionalCountries = countriesList.slice(3).join(', ');
            }
        } else {
            // Not logged in - collect all data from form
            const systemIntegration = Array.from(form.querySelectorAll('input[name="systemIntegration"]:checked')).map(cb => cb.value);
            const invoiceHandling = Array.from(form.querySelectorAll('input[name="invoiceHandling"]:checked')).map(cb => cb.value);

            data = {
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
        }

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

        // Save report to localStorage using ReportContextManager
        if (window.ReportContextManager) {
            const reportManager = new window.ReportContextManager();
            const reportData = {
                reportId: response.metadata.reportId || reportManager.generateReportId(),
                generatedAt: response.metadata.generatedAt || new Date().toISOString(),
                formData: formData,
                sections: response.sections,
                validation: response.validation,
                metadata: response.metadata
            };

            const saved = reportManager.saveReport(reportData);
            if (saved) {
                console.log('[Onboarding] ✅ Report saved to localStorage');
                showSaveNotification('Report saved! You can now chat about it.');
            } else {
                console.error('[Onboarding] ❌ Failed to save report to localStorage');
            }
        }

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

        // Add "Chat about this report" button
        addChatAboutReportButton();

        // Scroll to report
        reportContainer.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Toggle between form TOC and report TOC
     */
    function toggleTOC(mode) {
        const formTocContainer = document.querySelector('.toc-container.form-toc');
        const reportTocContainer = document.querySelector('.toc-container.report-toc');

        if (mode === 'report') {
            if (formTocContainer) formTocContainer.style.display = 'none';
            if (reportTocContainer) reportTocContainer.style.display = 'block';
        } else {
            if (formTocContainer) formTocContainer.style.display = 'block';
            if (reportTocContainer) reportTocContainer.style.display = 'none';
        }
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

            // Switch back to form TOC
            toggleTOC('form');
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
     * Add "Chat about this report" button
     */
    function addChatAboutReportButton() {
        // Check if button already exists
        if (document.getElementById('chatAboutReportBtn')) {
            return;
        }

        // Find report actions container
        const reportActions = document.querySelector('.report-actions');
        if (!reportActions) {
            console.warn('[Onboarding] Report actions container not found');
            return;
        }

        // Create button
        const button = document.createElement('button');
        button.id = 'chatAboutReportBtn';
        button.className = 'btn-action chat-report-btn';
        button.innerHTML = '<i class="fas fa-comments"></i> Chat about this report';
        button.title = 'Open AI assistant with report context';

        // Add click handler
        button.addEventListener('click', function() {
            // Open chatbot
            if (window.openChatbot) {
                window.openChatbot();
            } else {
                // Manually open chat panel
                const chatPanel = document.getElementById('chatPanel');
                const chatButton = document.getElementById('chatButton');
                const chatOverlay = document.getElementById('chatOverlay');

                if (chatPanel) {
                    chatPanel.classList.add('active');
                    if (chatButton) chatButton.classList.add('active');
                    if (chatOverlay) chatOverlay.classList.add('active');
                }
            }

            // Enable report mode
            const reportModeToggle = document.getElementById('reportModeToggle');
            if (reportModeToggle && !reportModeToggle.classList.contains('active')) {
                reportModeToggle.click(); // Trigger toggle
            }

            // Focus chat input
            setTimeout(() => {
                const chatInput = document.getElementById('chatInput');
                if (chatInput) chatInput.focus();
            }, 300);

            console.log('[Onboarding] Opening chatbot with report context');
        });

        // Insert before the first button (or append if no buttons)
        const firstButton = reportActions.querySelector('button');
        if (firstButton) {
            reportActions.insertBefore(button, firstButton);
        } else {
            reportActions.appendChild(button);
        }
    }

    /**
     * Show save notification
     */
    function showSaveNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'save-notification';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Hide and remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
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

    /**
     * Past Reports functionality
     */
    function openPastReportsModal() {
        if (!reportContextManager) {
            console.error('[Onboarding] Report Context Manager not initialized');
            return;
        }

        loadPastReports();
        pastReportsModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    function closePastReportsModal() {
        pastReportsModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    function loadPastReports() {
        const reports = reportContextManager.getAllReportsMetadata();

        if (reports.length === 0) {
            pastReportsList.style.display = 'none';
            pastReportsEmpty.style.display = 'block';
            return;
        }

        pastReportsList.style.display = 'block';
        pastReportsEmpty.style.display = 'none';

        // Render reports
        pastReportsList.innerHTML = reports.map(report => {
            const date = new Date(report.generatedAt);
            const formattedDate = date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const countries = report.countries && report.countries.length > 0
                ? report.countries.map(c => `<span class="country-badge">${c}</span>`).join('')
                : '<span class="country-badge">N/A</span>';

            return `
                <div class="past-report-item" data-report-id="${report.reportId}">
                    <div class="report-item-header">
                        <div class="report-item-title">
                            <h4>
                                <i class="fas fa-file-alt"></i>
                                ${report.partnerCompanyName || 'Unnamed Report'}
                            </h4>
                            <div class="report-item-id">${report.reportId}</div>
                        </div>
                        <div class="report-item-actions">
                            <button class="report-action-btn view-report-btn" data-report-id="${report.reportId}" title="View Report">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="report-action-btn delete-btn" data-report-id="${report.reportId}" title="Delete Report">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="report-item-details">
                        <div class="report-detail">
                            <span class="report-detail-label">Generated</span>
                            <span class="report-detail-value">${formattedDate}</span>
                        </div>
                        <div class="report-detail">
                            <span class="report-detail-label">Countries</span>
                            <div class="report-countries">${countries}</div>
                        </div>
                        <div class="report-detail">
                            <span class="report-detail-label">Language</span>
                            <span class="report-detail-value">${report.programmingLanguage || 'N/A'}</span>
                        </div>
                        <div class="report-detail">
                            <span class="report-detail-label">Sections</span>
                            <span class="report-detail-value">${report.sectionCount}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners to view and delete buttons
        pastReportsList.querySelectorAll('.view-report-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const reportId = this.getAttribute('data-report-id');
                handleViewReport(reportId);
            });
        });

        pastReportsList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const reportId = this.getAttribute('data-report-id');
                handleDeleteReport(reportId);
            });
        });
    }

    function handleViewReport(reportId) {
        if (!reportContextManager) return;

        const report = reportContextManager.getReportById(reportId);
        if (!report) {
            alert('Report not found');
            return;
        }

        // Close modal
        closePastReportsModal();

        // Hide form, show report
        formContainer.style.display = 'none';
        reportContainer.style.display = 'block';

        // Prepare report data in the format displayReport expects
        const response = {
            sections: report.sections,
            validation: report.validation,
            metadata: report.metadata || {
                reportId: report.reportId,
                generatedAt: report.generatedAt,
                countries: reportContextManager.extractCountriesFromReport(report),
                duration: 'N/A',
                demoMode: false
            }
        };

        // Display the report with formData
        displayReport(response, report.formData);

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function handleDeleteReport(reportId) {
        if (!reportContextManager) return;

        const confirmed = confirm('Are you sure you want to delete this report?');
        if (!confirmed) return;

        const success = reportContextManager.deleteReport(reportId);
        if (success) {
            showSaveNotification('Report deleted successfully');
            loadPastReports(); // Refresh the list
        } else {
            alert('Failed to delete report');
        }
    }

    function handleClearAllReports() {
        if (!reportContextManager) return;

        const confirmed = confirm('Are you sure you want to delete ALL reports? This action cannot be undone.');
        if (!confirmed) return;

        const success = reportContextManager.clearAllReports();
        if (success) {
            showSaveNotification('All reports cleared');
            loadPastReports(); // Refresh the list
        } else {
            alert('Failed to clear reports');
        }
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
