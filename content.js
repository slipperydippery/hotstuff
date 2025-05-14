if (document.title.includes('phpMyAdmin')) {
    // Inject CSS for focus indication
    const style = document.createElement('style');
    style.textContent = `
        .pma-hotstuff-focused {
            border: 2px solid blue !important; /* !important to help override existing styles */
            box-sizing: border-box;
        }
    `;
    document.head.appendChild(style);

    window.onload = function() {
        setTimeout(function() {
            const searchInput = document.querySelector('.database.selected input.searchClause.form-control');
            if (searchInput) {
                const activeEl = document.activeElement;

                // If an INPUT or TEXTAREA is already focused, and it's not our target searchInput,
                // then respect that focus and do nothing.
                if (activeEl && 
                    (activeEl.tagName.toUpperCase() === 'INPUT' || activeEl.tagName.toUpperCase() === 'TEXTAREA') && 
                    !activeEl.isSameNode(searchInput)) {
                    return; // Don't change focus
                }
                
                // Otherwise, focus the searchInput.
                searchInput.focus();
            } else {
                console.warn('phpMyAdmin HotStuff: Database search input not found on load.');
            }
        }, 1000); // Timeout to allow phpMyAdmin to do its own initial focusing.
    }

    document.addEventListener('keydown', function(event) {
        if (event.code === 'KeyW' && event.altKey) {
            navigateToSql();
        } else if (event.code === 'ArrowDown') {
            const validFocusTargets = Array.from(document.querySelectorAll('li.nav_node_table:not(.hidden) a.hover_show_full, li.fast_filters a.hover_show_full, input.searchClause.form-control'));
            navigateElements(validFocusTargets, event, 'next', true);
        } else if (event.code === 'ArrowUp') {
            const focusedElement = document.activeElement;
            if (focusedElement && (focusedElement.tagName === 'INPUT' || focusedElement.tagName === 'TEXTAREA')) {
                return; // Allow default behavior for input fields and textareas
            }
            const validFocusTargets = Array.from(document.querySelectorAll('li.nav_node_table:not(.hidden) a.hover_show_full, li.fast_filters a.hover_show_full, input.searchClause.form-control'));
            navigateElements(validFocusTargets, event, 'prev');
        } else if (event.code === 'KeyA' && event.altKey) {
            editStatementInline();
        } else if (event.code === 'Tab') {
            event.preventDefault();
            const mainElements = Array.from(document.querySelectorAll('input.searchClause.form-control, .nav-link:not(#pma_navi_settings_container .nav-link):not(.dropdown .nav-link):not(#page_settings_modal .nav-link):not(.dropdown-toggle):not(.dropdown-item):not(.dropdown-menu .nav-link):not(.dropdown-menu .dropdown-item):not(.dropdown-menu .dropdown-toggle):not(.dropdown-menu .dropdown-menu):not(.dropdown-menu .dropdown-divider):not(.dropdown-menu .dropdown-header'));
            if (event.shiftKey) {
                navigateElements(mainElements, event, 'prev');
            } else {
                navigateElements(mainElements, event, 'next');
            }
        }
    });
}

function navigateToSql() {
    const icon = document.querySelector('.ic_b_sql');
    if (icon && icon.parentNode) { // Check if icon and its parentNode exist
        icon.parentNode.click();
    } else {
        console.warn('phpMyAdmin HotStuff: SQL link/button not found.');
    }
}

function editStatementInline() {
    const link = document.querySelector('a.inline_edit_sql');
    if (link) { // Check if link exists
        link.click();
    } else {
        console.warn('phpMyAdmin HotStuff: Inline SQL edit link not found.');
    }
}

function clearBorders(elements) {
    elements.forEach(element => {
        element.classList.remove('pma-hotstuff-focused');
    });
}

function navigateElements(elements, event, direction, onlyIfElementSelected = false) {
    if (elements.length === 0) {
        return;
    }

    const focusedElement = document.activeElement;
    let currentIndex = elements.findIndex(element => element.isSameNode(focusedElement));

    if (currentIndex === -1 && onlyIfElementSelected) {
        return;
    }

    event.preventDefault();
    clearBorders(elements); // Moved clearBorders call after the early return check

    if (currentIndex === -1) {
        currentIndex = direction === 'next' ? 0 : elements.length - 1;
    }

    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= elements.length) {
        nextIndex = 0;
    } else if (nextIndex < 0) {
        nextIndex = elements.length - 1;
    }

    const nextElement = elements[nextIndex];
    if (nextElement) {
        nextElement.focus();
        nextElement.classList.add('pma-hotstuff-focused');
        // nextElement.style.border = "2px solid blue"; // Removed direct style manipulation
    }
}