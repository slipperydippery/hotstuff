// Default hotkeys - same as in options.js for consistency
const defaultHotkeys = {
    navigateToSql: 'Alt+KeyW',
    editStatementInline: 'Alt+KeyA',
    navigateDbList: 'Alt+KeyB'  // Changed from Alt+KeyD to Alt+KeyB to avoid conflict with Chrome's address bar shortcut
};

let activeHotkeys = { ...defaultHotkeys }; // Will be replaced with saved settings if they exist

// Helper function to match keydown event against hotkey string
function matchesHotkey(event, hotkeyString) {
    // Split the hotkey string into modifiers and key
    const parts = hotkeyString.split('+');
    const key = parts.pop(); // Last part is always the key
    const modifiers = new Set(parts);
    
    // For debugging, log on potential match attempts for our custom keys
    if (event.altKey && (event.code === 'KeyW' || event.code === 'KeyA' || event.code === 'KeyB')) {
        console.log('phpMyAdmin HotStuff: Hotkey attempt', {
            pressed: `Alt+${event.code}`,
            checking: hotkeyString,
            event: {
                code: event.code,
                altKey: event.altKey,
                ctrlKey: event.ctrlKey,
                shiftKey: event.shiftKey,
                metaKey: event.metaKey
            }
        });
    }
    
    // Check if the key matches
    if (event.code !== key) {
        return false;
    }
    
    // Check if modifiers match
    const hasAlt = modifiers.has('Alt');
    const hasCtrl = modifiers.has('Control');
    const hasShift = modifiers.has('Shift');
    const hasMeta = modifiers.has('Meta');
    
    const matches = (hasAlt === event.altKey) && 
           (hasCtrl === event.ctrlKey) && 
           (hasShift === event.shiftKey) && 
           (hasMeta === event.metaKey);
           
    if (matches) {
        console.log('phpMyAdmin HotStuff: Hotkey match found for', hotkeyString);
    }
    
    return matches;
}

// Load settings and initialize when phpMyAdmin is detected
if (document.title.includes('phpMyAdmin')) {
    // Load hotkey settings first
    chrome.storage.sync.get(['hotkeys'], function(result) {
        // Debug: Log loaded hotkey settings
        console.log('phpMyAdmin HotStuff: Loading hotkey settings', result.hotkeys);
        
        // If settings exist, override defaults
        if (result.hotkeys) {
            activeHotkeys = { ...defaultHotkeys, ...result.hotkeys };
            // Debug: Log active hotkeys after merging
            console.log('phpMyAdmin HotStuff: Active hotkeys set to:', activeHotkeys);
        } else {
            console.log('phpMyAdmin HotStuff: No saved hotkeys found, using defaults:', activeHotkeys);
        }
        
        // Now initialize everything else
        initializeExtension();
    });
}

function initializeExtension() {
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
                // Not finding the search input is a normal condition in many phpMyAdmin pages
                console.log('phpMyAdmin HotStuff: Database search input not available on this page');
            }
        }, 1000); // Timeout to allow phpMyAdmin to do its own initial focusing.
    }

    document.addEventListener('keydown', function(event) {
        // Use the configured hotkeys from storage
        if (matchesHotkey(event, activeHotkeys.navigateToSql)) {
            navigateToSql();
        } else if (matchesHotkey(event, activeHotkeys.editStatementInline)) {
            editStatementInline();
        } else if (matchesHotkey(event, activeHotkeys.navigateDbList)) {
            // New functionality to navigate database list
            focusDatabaseList();
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

// New function to handle database list navigation
function focusDatabaseList() {
    // Try to find and focus the first database in the list
    const databaseItems = Array.from(document.querySelectorAll('#pma_navigation_tree li.database a.expander'));
    
    // If no databases found, look for database entries without expander (single-item DBs)
    const allDatabaseItems = databaseItems.length > 0 ? 
                           databaseItems : 
                           Array.from(document.querySelectorAll('#pma_navigation_tree li.database > a'));
    
    if (allDatabaseItems.length > 0) {
        // Focus the first database item
        const firstDatabase = allDatabaseItems[0];
        firstDatabase.focus();
        firstDatabase.classList.add('pma-hotstuff-focused');
        
        // Show a brief hint message
        const hint = document.createElement('div');
        hint.textContent = 'Use arrow keys to navigate, Enter to select';
        hint.style.position = 'absolute';
        hint.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        hint.style.color = 'white';
        hint.style.padding = '8px';
        hint.style.borderRadius = '4px';
        hint.style.zIndex = '9999';
        hint.style.fontSize = '12px';
        
        // Position near the focused element
        const rect = firstDatabase.getBoundingClientRect();
        hint.style.top = (rect.bottom + 5) + 'px';
        hint.style.left = rect.left + 'px';
        
        document.body.appendChild(hint);
        
        // Remove hint after 3 seconds
        setTimeout(() => {
            if (hint.parentNode) {
                hint.parentNode.removeChild(hint);
            }
        }, 3000);
    } else {
        console.log('phpMyAdmin HotStuff: No database items found in navigation panel');
    }
}

function navigateToSql() {
    const icon = document.querySelector('.ic_b_sql');
    if (icon && icon.parentNode) { // Check if icon and its parentNode exist
        icon.parentNode.click();
    } else {
        // Not finding the SQL link is expected in some pages
        console.log('phpMyAdmin HotStuff: SQL link/button not available on this page');
    }
}

function editStatementInline() {
    const link = document.querySelector('a.inline_edit_sql');
    if (link) { // Check if link exists
        link.click();
    } else {
        // Not finding the inline edit link is expected in some pages
        console.log('phpMyAdmin HotStuff: Inline SQL edit link not available on this page');
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