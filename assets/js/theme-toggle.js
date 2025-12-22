// Simple Dark Mode Detection
// Automatically applies dark mode based on system preferences (like Pagero)

(function() {
    const cl = document.documentElement.classList;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (prefersDark) {
        cl.add('dark');
    } else {
        cl.remove('dark');
    }

    // Listen for system theme changes
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
            if (e.matches) {
                cl.add('dark');
            } else {
                cl.remove('dark');
            }
        });
    }
})();
