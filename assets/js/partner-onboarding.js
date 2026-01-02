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

        // Validate all required text/email/number inputs
        const requiredInputs = form.querySelectorAll('input[required]:not([type="radio"]):not([type="checkbox"]), textarea[required]');
        requiredInputs.forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
            }
        });

        // Validate radio groups
        const partnershipType = form.querySelector('input[name="partnershipType"]:checked');
        const firstLineSupport = form.querySelector('input[name="firstLineSupport"]:checked');
        const accountAccess = form.querySelector('input[name="accountAccess"]:checked');
        const serviceModel = form.querySelector('input[name="serviceModel"]:checked');

        if (!partnershipType || !firstLineSupport || !accountAccess || !serviceModel) {
            isValid = false;
        }

        // Validate checkboxes (at least one)
        const systemIntegration = form.querySelectorAll('input[name="systemIntegration"]:checked');
        const invoiceHandling = form.querySelectorAll('input[name="invoiceHandling"]:checked');

        if (systemIntegration.length === 0 || invoiceHandling.length === 0) {
            isValid = false;
        }

        // Validate at least one country
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
        const data = {
            partnerCompanyName: document.getElementById('partnerCompanyName').value.trim(),
            projectManagerName: document.getElementById('projectManagerName').value.trim(),
            projectManagerEmail: document.getElementById('projectManagerEmail').value.trim(),
            technicalLeadName: document.getElementById('technicalLeadName').value.trim(),
            technicalLeadEmail: document.getElementById('technicalLeadEmail').value.trim(),
            partnershipType: form.querySelector('input[name="partnershipType"]:checked')?.value,
            systemIntegration: Array.from(form.querySelectorAll('input[name="systemIntegration"]:checked')).map(cb => cb.value),
            erpDetails: document.querySelector('input[name="erpDetails"]')?.value || '',
            otherSystemDetails: document.querySelector('input[name="otherSystemDetails"]')?.value || '',
            country1: document.getElementById('country1').value.trim(),
            country2: document.getElementById('country2').value.trim(),
            country3: document.getElementById('country3').value.trim(),
            additionalCountries: document.getElementById('additionalCountries').value.trim(),
            invoiceHandling: Array.from(form.querySelectorAll('input[name="invoiceHandling"]:checked')).map(cb => cb.value),
            invoiceVolume: document.getElementById('invoiceVolume').value,
            firstLineSupport: form.querySelector('input[name="firstLineSupport"]:checked')?.value,
            accountAccess: form.querySelector('input[name="accountAccess"]:checked')?.value,
            serviceModel: form.querySelector('input[name="serviceModel"]:checked')?.value
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
        const reportId = generateReportId();
        const timestamp = new Date().toLocaleString();

        // Collect all countries
        const countries = [formData.country1, formData.country2, formData.country3]
            .filter(c => c)
            .concat(formData.additionalCountries ? formData.additionalCountries.split(',').map(c => c.trim()) : [])
            .filter(c => c);

        const html = `
            <div class="report-metadata">
                <h3>Report Information</h3>
                <div class="metadata-grid">
                    <div class="metadata-item">
                        <span class="metadata-label">Report ID</span>
                        <span class="metadata-value">${reportId}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="metadata-label">Generated</span>
                        <span class="metadata-value">${timestamp}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="metadata-label">Partner Company</span>
                        <span class="metadata-value">${formData.partnerCompanyName}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="metadata-label">Partnership Type</span>
                        <span class="metadata-value">${formatValue(formData.partnershipType)}</span>
                    </div>
                </div>
            </div>

            <div class="report-section">
                <h3>Partner Information Summary</h3>

                <h4>Contact Information</h4>
                <p><strong>Project Manager:</strong> ${formData.projectManagerName} (${formData.projectManagerEmail})</p>
                <p><strong>Technical Lead:</strong> ${formData.technicalLeadName} (${formData.technicalLeadEmail})</p>

                <h4>Integration Details</h4>
                <p><strong>Systems to Integrate:</strong></p>
                <ul>
                    ${formData.systemIntegration.map(sys => `<li>${formatValue(sys)}${sys === 'erp' && formData.erpDetails ? ': ' + formData.erpDetails : ''}${sys === 'other' && formData.otherSystemDetails ? ': ' + formData.otherSystemDetails : ''}</li>`).join('')}
                </ul>

                <h4>Countries in Scope</h4>
                <ul>
                    ${countries.map((country, index) => `<li>${country}${index === 0 ? ' (Priority)' : ''}</li>`).join('')}
                </ul>

                <h4>Invoice Handling</h4>
                <p><strong>Type:</strong> ${formData.invoiceHandling.map(h => h.toUpperCase()).join(', ')}</p>
                <p><strong>Estimated Monthly Volume:</strong> ${formData.invoiceVolume} invoices</p>

                <h4>Service Configuration</h4>
                <p><strong>First-Line Support:</strong> ${formatValue(formData.firstLineSupport)}</p>
                <p><strong>Account Management:</strong> ${formatValue(formData.accountAccess)}</p>
                <p><strong>Service Model:</strong> ${formatValue(formData.serviceModel)}</p>
            </div>

            <div class="report-section">
                <h3>Country Compliance Requirements</h3>
                ${formatAgentResponse(response.ccrResponse)}
            </div>

            <div class="report-section">
                <h3>API Implementation Guide</h3>
                ${formatAgentResponse(response.apiResponse)}
            </div>
        `;

        reportContent.innerHTML = html;
    }

    /**
     * Format agent response (markdown-like to HTML)
     */
    function formatAgentResponse(text) {
        if (!text) return '<p>No response available.</p>';

        // Convert markdown-like formatting to HTML
        let html = text
            // Code blocks
            .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
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
