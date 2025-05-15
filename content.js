// Default hotkeys - same as in options.js for consistency
const defaultHotkeys = {
    navigateToSql: 'Alt+KeyW',
    editStatementInline: 'Alt+KeyA',
    navigateDbList: 'Alt+KeyB'  // Opens the database search modal
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
    // Inject CSS for focus indication and modal
    const style = document.createElement('style');
    style.textContent = `
        .pma-hotstuff-focused {
            border: 2px solid blue !important; /* !important to help override existing styles */
            box-sizing: border-box;
        }
        
        .pma-hotstuff-modal-overlay {
            animation: fadeIn 0.2s ease-out;
        }
        
        .pma-hotstuff-modal-content {
            animation: slideIn 0.2s ease-out;
        }
        
        .pma-hotstuff-db-item:hover {
            background-color: #f5f5f5 !important;
        }
        
        .pma-hotstuff-selected {
            background-color: #f0f7ff;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideIn {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        kbd {
            background-color: #f7f7f7;
            border: 1px solid #ccc;
            border-radius: 3px;
            box-shadow: 0 1px 0 rgba(0,0,0,0.2);
            color: #333;
            display: inline-block;
            font-size: 11px;
            line-height: 1;
            padding: 2px 4px;
            margin: 0 2px;
        }
    `;
    document.head.appendChild(style);

    window.onload = function() {
        setTimeout(function() {
            // Check if we're coming from database navigation and need to focus search
            const shouldFocusSearch = sessionStorage.getItem('pmaHotStuffFocusSearch') === 'true';
            if (shouldFocusSearch) {
                // Clear the flag
                sessionStorage.removeItem('pmaHotStuffFocusSearch');
            }
            
            const searchInput = document.querySelector('.database.selected input.searchClause.form-control');
            if (searchInput) {
                const activeEl = document.activeElement;

                // If an INPUT or TEXTAREA is already focused, and it's not our target searchInput,
                // and we're not explicitly wanting to focus the search input,
                // then respect that focus and do nothing.
                if (!shouldFocusSearch && activeEl && 
                    (activeEl.tagName.toUpperCase() === 'INPUT' || activeEl.tagName.toUpperCase() === 'TEXTAREA') && 
                    !activeEl.isSameNode(searchInput)) {
                    return; // Don't change focus
                }
                
                // Otherwise, focus the searchInput.
                searchInput.focus();
                
                // If we came from database navigation, add a brief highlight to show where the focus is
                if (shouldFocusSearch) {
                    searchInput.classList.add('pma-hotstuff-focused');
                    setTimeout(() => {
                        searchInput.classList.remove('pma-hotstuff-focused');
                    }, 1500);
                }
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
            // Open database search modal
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

// New function to handle database list navigation with modal
function focusDatabaseList() {
    // Get all database items from the navigation tree
    const databaseItems = Array.from(document.querySelectorAll('#pma_navigation_tree li.database > a'));
    const databases = databaseItems.map(item => {
        return {
            name: item.textContent.trim(),
            url: item.href
        };
    });
    
    if (databases.length === 0) {
        console.log('phpMyAdmin HotStuff: No database items found in navigation panel');
        return;
    }
    
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'pma-hotstuff-modal-overlay';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'pma-hotstuff-modal-content';
    
    // Create header
    const header = document.createElement('h3');
    header.textContent = 'Select Database';
    header.className = 'pma-hotstuff-modal-header';
    
    // Create search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Type to filter databases...';
    searchInput.className = 'pma-hotstuff-db-search';
    
    // Create database list container
    const dbListContainer = document.createElement('div');
    dbListContainer.className = 'pma-hotstuff-db-list';
    
    // Create database list
    const dbList = document.createElement('ul');
    
    // Populate database list
    const dbItems = [];
    databases.forEach((db, index) => {
        const li = document.createElement('li');
        li.textContent = db.name;
        li.dataset.url = db.url;
        li.dataset.index = index;
        li.className = 'pma-hotstuff-db-item';
        
        // Highlight first item by default
        if (index === 0) {
            li.classList.add('pma-hotstuff-selected');
        }
        
        li.addEventListener('click', () => {
            navigateToDatabase(db.url);
        });
        
        dbList.appendChild(li);
        dbItems.push(li);
    });
    
    // Add instructions text
    const instructions = document.createElement('div');
    instructions.className = 'pma-hotstuff-instructions';
    instructions.innerHTML = 'Use <kbd>↑</kbd>/<kbd>↓</kbd> to navigate, <kbd>Enter</kbd> to select, <kbd>Esc</kbd> to cancel';
    
    // Assemble modal
    dbListContainer.appendChild(dbList);
    modalContent.appendChild(header);
    modalContent.appendChild(searchInput);
    modalContent.appendChild(dbListContainer);
    modalContent.appendChild(instructions);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    // Focus the search input
    searchInput.focus();
    
    let selectedIndex = 0;
    
    // Function to update selection
    const updateSelection = (newIndex) => {
        // Clear previous selection
        dbItems.forEach(item => {
            item.classList.remove('pma-hotstuff-selected');
        });
        
        // Update selected index
        selectedIndex = newIndex;
        
        // Apply new selection
        const selectedItem = dbItems[selectedIndex];
        if (selectedItem) {
            selectedItem.classList.add('pma-hotstuff-selected');
            
            // Ensure selected item is visible in the scroll view
            const container = dbListContainer;
            const itemTop = selectedItem.offsetTop;
            const itemBottom = itemTop + selectedItem.offsetHeight;
            const containerTop = container.scrollTop;
            const containerBottom = containerTop + container.offsetHeight;
            
            if (itemTop < containerTop) {
                container.scrollTop = itemTop;
            } else if (itemBottom > containerBottom) {
                container.scrollTop = itemBottom - container.offsetHeight;
            }
        }
    };
    
    // Function to navigate to selected database and focus search input
    const navigateToDatabase = (url) => {
        // Store that we're navigating to focus search input
        sessionStorage.setItem('pmaHotStuffFocusSearch', 'true');
        window.location.href = url;
    };
    
    // Filter databases based on input
    const filterDatabases = () => {
        const query = searchInput.value.toLowerCase();
        let visibleCount = 0;
        let firstVisibleIndex = -1;
        
        dbItems.forEach((item, index) => {
            const dbName = item.textContent.toLowerCase();
            const matches = dbName.includes(query);
            
            if (matches) {
                item.style.display = '';
                visibleCount++;
                
                if (firstVisibleIndex === -1) {
                    firstVisibleIndex = index;
                }
            } else {
                item.style.display = 'none';
            }
        });
        
        // Update selection to first visible item
        if (visibleCount > 0 && firstVisibleIndex !== -1) {
            updateSelection(firstVisibleIndex);
        }
    };
    
    // Handle keydown events for navigation
    const handleKeydown = (event) => {
        const visibleItems = Array.from(dbItems).filter(item => item.style.display !== 'none');
        const currentVisibleIndex = visibleItems.findIndex(item => item.classList.contains('pma-hotstuff-selected'));
        
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                if (currentVisibleIndex < visibleItems.length - 1) {
                    updateSelection(parseInt(visibleItems[currentVisibleIndex + 1].dataset.index));
                }
                break;
                
            case 'ArrowUp':
                event.preventDefault();
                if (currentVisibleIndex > 0) {
                    updateSelection(parseInt(visibleItems[currentVisibleIndex - 1].dataset.index));
                }
                break;
                
            case 'Enter':
                event.preventDefault();
                const selectedItem = dbItems.find(item => item.classList.contains('pma-hotstuff-selected'));
                if (selectedItem) {
                    navigateToDatabase(selectedItem.dataset.url);
                }
                break;
                
            case 'Escape':
                event.preventDefault();
                closeModal();
                break;
        }
    };
    
    // Close the modal
    const closeModal = () => {
        document.body.removeChild(modalOverlay);
        document.removeEventListener('keydown', handleKeydown);
    };
    
    // Event listeners
    searchInput.addEventListener('input', filterDatabases);
    document.addEventListener('keydown', handleKeydown);
    
    // Close modal when clicking outside
    modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });
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