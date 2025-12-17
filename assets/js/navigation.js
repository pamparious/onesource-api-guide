/**
 * TR ONESOURCE API Guide - Navigation
 * Mobile menu toggle and smooth scrolling
 */

(function() {
    'use strict';

    // Mobile Menu Toggle
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navMenu = document.getElementById('navMenu');

    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');

            // Toggle icon
            const icon = this.querySelector('i');
            if (icon) {
                if (navMenu.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!mobileMenuToggle.contains(event.target) && !navMenu.contains(event.target)) {
                navMenu.classList.remove('active');
                const icon = mobileMenuToggle.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });

        // Close menu when clicking a nav link
        const navLinks = navMenu.querySelectorAll('a:not(.external-link)');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
                const icon = mobileMenuToggle.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');

            // Skip empty anchors
            if (href === '#' || href === '') {
                return;
            }

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const headerOffset = 80; // Account for fixed header
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Highlight active section in table of contents
    const observerOptions = {
        root: null,
        rootMargin: '-80px 0px -80% 0px',
        threshold: 0
    };

    const observerCallback = (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Remove active class from all TOC links
                document.querySelectorAll('.sidebar-toc a').forEach(link => {
                    link.classList.remove('active');
                });

                // Add active class to corresponding TOC link
                const id = entry.target.getAttribute('id');
                if (id) {
                    const activeLink = document.querySelector(`.sidebar-toc a[href="#${id}"]`);
                    if (activeLink) {
                        activeLink.classList.add('active');
                    }
                }
            }
        });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all sections with IDs
    document.querySelectorAll('section[id], article[id]').forEach(section => {
        observer.observe(section);
    });

    // FAQ Accordion functionality
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            const faqItem = this.closest('.faq-item');
            const wasActive = faqItem.classList.contains('active');

            // Close all FAQ items
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
            });

            // Toggle current item
            if (!wasActive) {
                faqItem.classList.add('active');
            }
        });
    });

    // Code copy functionality
    const codeCopyButtons = document.querySelectorAll('.code-copy-btn');
    codeCopyButtons.forEach(button => {
        button.addEventListener('click', async function() {
            const codeBlock = this.closest('.code-block');
            const code = codeBlock.querySelector('pre code');

            if (code) {
                try {
                    await navigator.clipboard.writeText(code.textContent);

                    // Visual feedback
                    const originalText = this.textContent;
                    this.textContent = 'Copied!';
                    this.style.borderColor = 'var(--color-success)';

                    setTimeout(() => {
                        this.textContent = originalText;
                        this.style.borderColor = '';
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy code:', err);
                    this.textContent = 'Failed';
                    setTimeout(() => {
                        this.textContent = 'Copy';
                    }, 2000);
                }
            }
        });
    });

    // Add "Copy" buttons to code blocks dynamically
    function addCopyButtonsToCodeBlocks() {
        const codeBlocks = document.querySelectorAll('pre:not(.diagram)');

        codeBlocks.forEach(pre => {
            // Skip if already wrapped
            if (pre.parentElement.classList.contains('code-block')) {
                return;
            }

            // Detect language from Prism.js class
            const code = pre.querySelector('code');
            let language = 'text';

            if (code && code.className) {
                const match = code.className.match(/language-(\w+)/);
                if (match) {
                    language = match[1];
                }
            }

            // Wrap in code-block div
            const wrapper = document.createElement('div');
            wrapper.className = 'code-block';
            pre.parentNode.insertBefore(wrapper, pre);
            wrapper.appendChild(pre);

            // Add header with copy button
            const header = document.createElement('div');
            header.className = 'code-header';
            header.innerHTML = `
                <span class="code-lang">${language}</span>
                <button class="code-copy-btn" aria-label="Copy code">Copy</button>
            `;
            wrapper.insertBefore(header, pre);

            // Attach copy functionality
            const copyBtn = header.querySelector('.code-copy-btn');
            copyBtn.addEventListener('click', async function() {
                try {
                    await navigator.clipboard.writeText(code.textContent);
                    this.textContent = 'Copied!';
                    this.style.borderColor = 'var(--color-success)';

                    setTimeout(() => {
                        this.textContent = 'Copy';
                        this.style.borderColor = '';
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy:', err);
                }
            });
        });
    }

    // Run after page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addCopyButtonsToCodeBlocks);
    } else {
        addCopyButtonsToCodeBlocks();
    }

})();
