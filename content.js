let link = null;
let currentLi = null;
let previousLink = null;
let selectedMainElement = null;

if (document.title.includes('phpMyAdmin')) {
    window.onload = function() {
        setTimeout(function() {
            const input = document.querySelector('.database.selected input.searchClause.form-control');
            if (input) {
                input.focus();
            }
        }, 1000);
    }

    document.addEventListener('keydown', function(event) {
        if (event.code === 'KeyW' && event.altKey) {
            navigateToSql();
        } else if (event.code === 'ArrowDown') {
            navigateLinks('next', event);
        } else if (event.code === 'ArrowUp') {
            navigateLinks('prev', event);
        } else if (event.code === 'KeyA' && event.altKey) {
            editStatementInline();
        } else if (event.code === 'Tab') {
            if (event.shiftKey) {
                cycleMainElements('prev', event);
            } else {
                cycleMainElements('next', event);
            }
        }
    });
}


function cycleMainElements(direction, event) {
    const mainElements = Array.from(document.querySelectorAll('input.searchClause.form-control, .nav-link:not(#pma_navi_settings_container .nav-link):not(.dropdown .nav-link):not(#page_settings_modal .nav-link):not(.dropdown-toggle):not(.dropdown-item):not(.dropdown-menu .nav-link):not(.dropdown-menu .dropdown-item):not(.dropdown-menu .dropdown-toggle):not(.dropdown-menu .dropdown-menu):not(.dropdown-menu .dropdown-divider):not(.dropdown-menu .dropdown-header'));
    
    if (mainElements.length === 0) {
        return;
    }

    event.preventDefault();

    let currentIndex = mainElements.indexOf(selectedMainElement);
    if (currentIndex === -1) {
        currentIndex = direction === 'next' ? 0 : mainElements.length - 1;
    }

    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= mainElements.length) {
        nextIndex = 0;
    } else if (nextIndex < 0) {
        nextIndex = mainElements.length - 1;
    }

    const nextElement = mainElements[nextIndex];
    if (nextElement) {
        nextElement.focus();
        nextElement.style.border = "2px solid blue";
    }
    if (selectedMainElement) {
        selectedMainElement.style.border = "";
    }
    selectedMainElement = nextElement;
}

function navigateToSql() {
    const link = document.querySelector('.ic_b_sql').parentNode;
    if (link) {
        link.click();
    }
}

function editStatementInline() {
    const link = document.querySelector('a.inline_edit_sql');
    if (link) {
        link.click();
    }
}

let searchClauseIndex = 0;

function navigateLinks(direction, event) {
    const focusedElement = document.activeElement;
    const validFocusTargets = Array.from(document.querySelectorAll('li.nav_node_table:not(.hidden) a.hover_show_full, li.fast_filters a.hover_show_full, input.searchClause.form-control'));
    
    let currentIndex = validFocusTargets.indexOf(focusedElement);
    if (currentIndex === -1) {
        return;
    }
    event.preventDefault();

    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0) {
        nextIndex = validFocusTargets.length - 1; // Wrap around to the end of the list
    } else if (nextIndex >= validFocusTargets.length) {
        nextIndex = 0; // Wrap around to the start of the list
    }

    const nextElement = validFocusTargets[nextIndex];
    if (nextElement) {
        nextElement.focus();
        nextElement.style.border = "2px solid blue";
    }
    if (focusedElement) {
        focusedElement.style.border = "";
    }
}