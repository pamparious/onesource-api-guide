// Layout and Navigation JavaScript
// Handles sidebar navigation, TOC generation, and mobile menu

(function() {
    'use strict';

    // Generate Table of Contents from page headings
    function generateTOC() {
        // Skip TOC generation on partner-onboarding page (has custom TOC)
        const currentPath = window.location.pathname;
        if (currentPath.includes('partner-onboarding.html')) {
            // Ensure sidebar is visible for partner-onboarding
            const sidebar = document.querySelector('.sidebar-right');
            if (sidebar) sidebar.style.display = 'block';
            return;
        }

        const content = document.querySelector('.main-content-area');
        const tocList = document.querySelector('.toc-list');

        if (!content || !tocList) return;

        const headings = content.querySelectorAll('h2, h3, h4');

        if (headings.length === 0) {
            // Hide TOC if no headings
            const sidebar = document.querySelector('.sidebar-right');
            if (sidebar) sidebar.style.display = 'none';
            return;
        }

        tocList.innerHTML = '';

        headings.forEach((heading, index) => {
            // Create ID for heading if it doesn't exist
            if (!heading.id) {
                heading.id = 'heading-' + index;
            }

            const level = parseInt(heading.tagName.substring(1));
            const li = document.createElement('li');
            li.className = `toc-item level-${level}`;

            const link = document.createElement('a');
            link.href = '#' + heading.id;
            link.className = 'toc-link';
            link.textContent = heading.textContent;

            li.appendChild(link);
            tocList.appendChild(li);
        });

        // Set up intersection observer for active TOC highlighting
        setupTOCObserver();
    }

    // Set up Intersection Observer for TOC active states
    function setupTOCObserver() {
        const headings = document.querySelectorAll('.main-content-area h2, .main-content-area h3, .main-content-area h4');
        const tocLinks = document.querySelectorAll('.toc-link');

        if (headings.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    // Remove active class from all links
                    tocLinks.forEach(link => link.classList.remove('active'));
                    // Add active class to current link
                    const activeLink = document.querySelector(`.toc-link[href="#${id}"]`);
                    if (activeLink) {
                        activeLink.classList.add('active');
                    }
                }
            });
        }, {
            rootMargin: '-100px 0px -66%',
            threshold: 0
        });

        headings.forEach(heading => observer.observe(heading));
    }

    // Handle collapsible navigation sections
    function setupNavigationCollapse() {
        const navSections = document.querySelectorAll('.nav-section-title');

        navSections.forEach(title => {
            title.addEventListener('click', function() {
                const section = this.closest('.nav-section');
                section.classList.toggle('collapsed');
            });
        });
    }

    // Set active nav item based on current page
    function setActiveNavItem() {
        const currentPath = window.location.pathname;
        const navItems = document.querySelectorAll('.nav-item');

        navItems.forEach(item => {
            const href = item.getAttribute('href');
            if (href && currentPath.includes(href.replace('./', ''))) {
                item.classList.add('active');
                // Expand parent section
                const section = item.closest('.nav-section');
                if (section) {
                    section.classList.remove('collapsed');
                }
            }
        });
    }

    // Mobile menu toggle
    function setupMobileMenu() {
        const toggle = document.querySelector('.mobile-menu-toggle');
        const sidebar = document.querySelector('.sidebar-left');
        const overlay = document.querySelector('.sidebar-overlay');

        if (!toggle || !sidebar) return;

        toggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
        });

        if (overlay) {
            overlay.addEventListener('click', function() {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            });
        }
    }

    // Smooth scroll to anchor links
    function setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href === '#') return;

                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });

                    // Update URL without jumping
                    history.pushState(null, null, href);

                    // Close mobile menu if open
                    const sidebar = document.querySelector('.sidebar-left');
                    const overlay = document.querySelector('.sidebar-overlay');
                    if (sidebar) sidebar.classList.remove('active');
                    if (overlay) overlay.classList.remove('active');
                }
            });
        });
    }

    // Check if user is logged in
    function isUserLoggedIn() {
        try {
            const userProfile = localStorage.getItem('tr_user_profile');
            return userProfile !== null;
        } catch (e) {
            console.error('[Layout] Failed to check login state:', e);
            return false;
        }
    }

    // Filter navigation for logged-in users
    function filterNavigationForLoggedInUser() {
        if (!isUserLoggedIn()) return;

        // Pages to hide when logged in
        const hiddenPages = ['getting-started.html', 'einvoicing-integration.html', 'faq.html'];

        const navSections = document.querySelectorAll('.nav-section');
        navSections.forEach(section => {
            const link = section.querySelector('a');
            const href = link?.getAttribute('href');

            if (href && hiddenPages.includes(href)) {
                section.style.display = 'none';
            }
        });

        // Show logout button if it exists
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.style.display = 'flex';
        }
    }

    // Handle logout
    function handleLogout() {
        if (confirm('Are you sure you want to log out?')) {
            try {
                localStorage.removeItem('tr_user_profile');
                console.log('[Layout] User logged out');
                window.location.href = 'signup.html';
            } catch (e) {
                console.error('[Layout] Logout failed:', e);
                alert('Failed to log out. Please try again.');
            }
        }
    }

    // Setup logout button listener
    function setupLogoutButton() {
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', handleLogout);
        }
    }

    // Initialize on DOM ready
    function init() {
        generateTOC();
        setupNavigationCollapse();
        setActiveNavItem();
        setupMobileMenu();
        setupSmoothScroll();
        filterNavigationForLoggedInUser();
        setupLogoutButton();
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
