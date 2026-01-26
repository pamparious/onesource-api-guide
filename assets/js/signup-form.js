/**
 * Sign-Up Form - Frontend Logic
 * Handles form submission and localStorage save
 */

(function() {
    'use strict';

    // Default values for empty fields (Recommended setup: Referral + TR support + Managed service)
    const DEFAULTS = {
        partnerCompanyName: 'Partner Company',
        projectManagerName: 'Project Manager',
        projectManagerEmail: 'pm@example.com',
        technicalLeadName: 'Tech Lead',
        technicalLeadEmail: 'tech@example.com',
        partnershipType: 'referral', // Recommended: Referral Partner
        programmingLanguage: 'python',
        systemIntegration: ['custom'],
        erpDetails: '',
        otherSystemDetails: '',
        invoiceHandling: ['ar', 'ap'],
        invoiceVolume: '1000',
        firstLineSupport: 'thomson-reuters', // Recommended: TR provides support
        serviceModel: 'managed-service' // Recommended: Managed service with customer access
    };

    // DOM Elements
    const form = document.getElementById('signupForm');
    const submitBtn = document.getElementById('submitBtn');

    /**
     * Initialize application
     */
    function init() {
        setupConditionalInputs();
        setupPartnershipTypeLogic();
        setupEventListeners();
        console.log('[SignUp] Form initialized');
    }

    /**
     * Setup conditional input displays
     */
    function setupConditionalInputs() {
        // ERP System details
        const erpCheckbox = document.getElementById('systemErp');
        const erpDetails = document.getElementById('erpDetails');

        if (erpCheckbox && erpDetails) {
            erpCheckbox.addEventListener('change', function() {
                erpDetails.style.display = this.checked ? 'block' : 'none';
            });
        }

        // Other system details
        const otherCheckbox = document.getElementById('systemOther');
        const otherDetails = document.getElementById('otherSystemDetails');

        if (otherCheckbox && otherDetails) {
            otherCheckbox.addEventListener('change', function() {
                otherDetails.style.display = this.checked ? 'block' : 'none';
            });
        }
    }

    /**
     * Setup partnership type logic for deterministic fields
     * - Reseller: Partner must handle first-line support (TR option disabled)
     * - Referral: Can choose either TR or Partner for support (both enabled)
     */
    function setupPartnershipTypeLogic() {
        const resellerRadio = document.getElementById('partnershipReseller');
        const referralRadio = document.getElementById('partnershipReferral');
        const supportTR = document.getElementById('supportTR');
        const supportPartner = document.getElementById('supportPartner');
        const supportTRLabel = document.getElementById('supportTRLabel');

        if (!resellerRadio || !referralRadio || !supportTR || !supportPartner || !supportTRLabel) {
            console.warn('[SignUp] Partnership type logic elements not found');
            return;
        }

        // Function to update first-line support options based on partnership type
        function updateSupportOptions() {
            if (resellerRadio.checked) {
                // Reseller: Partner must handle support
                supportTR.disabled = true;
                supportPartner.disabled = false;
                supportPartner.checked = true;
                supportTRLabel.style.opacity = '0.5';
                supportTRLabel.style.cursor = 'not-allowed';
            } else if (referralRadio.checked) {
                // Referral: Can choose either option
                supportTR.disabled = false;
                supportPartner.disabled = false;
                supportTRLabel.style.opacity = '1';
                supportTRLabel.style.cursor = 'pointer';
            } else {
                // Nothing selected yet - enable both options
                supportTR.disabled = false;
                supportPartner.disabled = false;
                supportTRLabel.style.opacity = '1';
                supportTRLabel.style.cursor = 'pointer';
            }
        }

        // Set up event listeners
        resellerRadio.addEventListener('change', updateSupportOptions);
        referralRadio.addEventListener('change', updateSupportOptions);

        // Initialize on page load
        updateSupportOptions();
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        if (form) {
            form.addEventListener('submit', handleSubmit);
        }
    }

    /**
     * Handle form submission
     */
    function handleSubmit(e) {
        e.preventDefault();

        try {
            // Collect form data with defaults
            const formData = collectFormData();

            // Create user profile object
            const userProfile = {
                version: '1.0',
                signupDate: new Date().toISOString(),
                ...formData
            };

            // Save to localStorage
            if (saveUserProfile(userProfile)) {
                console.log('[SignUp] Profile saved successfully');
                // Redirect to index.html
                window.location.href = 'index.html';
            } else {
                console.error('[SignUp] Failed to save profile');
                alert('Unable to save your profile. Please check your browser settings and try again.');
            }
        } catch (error) {
            console.error('[SignUp] Error during sign-up:', error);
            alert('An error occurred during sign-up. Please try again.');
        }
    }

    /**
     * Collect form data with defaults for empty fields
     */
    function collectFormData() {
        const data = {};

        // Text inputs
        data.partnerCompanyName = getInputValue('partnerCompanyName') || DEFAULTS.partnerCompanyName;
        data.projectManagerName = getInputValue('projectManagerName') || DEFAULTS.projectManagerName;
        data.projectManagerEmail = getInputValue('projectManagerEmail') || DEFAULTS.projectManagerEmail;
        data.technicalLeadName = getInputValue('technicalLeadName') || DEFAULTS.technicalLeadName;
        data.technicalLeadEmail = getInputValue('technicalLeadEmail') || DEFAULTS.technicalLeadEmail;

        // Radio buttons
        data.partnershipType = getRadioValue('partnershipType') || DEFAULTS.partnershipType;
        data.firstLineSupport = getRadioValue('firstLineSupport') || DEFAULTS.firstLineSupport;
        data.serviceModel = getRadioValue('serviceModel') || DEFAULTS.serviceModel;

        // Dropdown
        data.programmingLanguage = getSelectValue('programmingLanguage') || DEFAULTS.programmingLanguage;

        // Checkboxes
        data.systemIntegration = getCheckboxValues('systemIntegration');
        if (data.systemIntegration.length === 0) {
            data.systemIntegration = DEFAULTS.systemIntegration;
        }

        data.invoiceHandling = getCheckboxValues('invoiceHandling');
        if (data.invoiceHandling.length === 0) {
            data.invoiceHandling = DEFAULTS.invoiceHandling;
        }

        // Conditional inputs
        data.erpDetails = getInputValue('erpDetails') || '';
        data.otherSystemDetails = getInputValue('otherSystemDetails') || '';

        // Number input
        data.invoiceVolume = getInputValue('invoiceVolume') || DEFAULTS.invoiceVolume;

        return data;
    }

    /**
     * Get input value
     */
    function getInputValue(name) {
        const input = document.querySelector(`input[name="${name}"]`);
        return input ? input.value.trim() : '';
    }

    /**
     * Get select value
     */
    function getSelectValue(name) {
        const select = document.querySelector(`select[name="${name}"]`);
        return select ? select.value : '';
    }

    /**
     * Get radio button value
     */
    function getRadioValue(name) {
        const radio = document.querySelector(`input[name="${name}"]:checked`);
        return radio ? radio.value : '';
    }

    /**
     * Get checkbox values (returns array)
     */
    function getCheckboxValues(name) {
        const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
        return Array.from(checkboxes).map(cb => cb.value);
    }

    /**
     * Save user profile to localStorage
     */
    function saveUserProfile(profile) {
        try {
            localStorage.setItem('tr_user_profile', JSON.stringify(profile));
            return true;
        } catch (e) {
            console.error('[SignUp] localStorage save failed:', e);
            return false;
        }
    }

    /**
     * Get user profile from localStorage
     */
    function getUserProfile() {
        try {
            const data = localStorage.getItem('tr_user_profile');
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('[SignUp] localStorage read failed:', e);
            // Clear corrupted data
            localStorage.removeItem('tr_user_profile');
            return null;
        }
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
