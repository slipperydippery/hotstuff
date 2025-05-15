// Default hotkeys
const defaultHotkeys = {
    navigateToSql: 'Alt+KeyW',
    editStatementInline: 'Alt+KeyA',
    navigateDbList: 'Alt+KeyB'  // Opens the database search modal
};

let currentHotkeys = { ...defaultHotkeys };
let originalHotkeys = { ...defaultHotkeys };  // Keep track of original settings to detect changes
let listeningFor = null; // Stores the ID of the input field we are currently listening for
let isListening = false; // Flag to indicate if we're currently listening for a hotkey
let currentModifiers = { alt: false, ctrl: false, shift: false, meta: false }; // Track modifiers
let capturedModifiers = { alt: false, ctrl: false, shift: false, meta: false }; // Track captured modifiers
let currentKey = null; // Track the main key
let settingsChanged = false; // Track if settings changed since last save

// DOM Elements
const navigateToSqlInput = document.getElementById('navigateToSql');
const editStatementInlineInput = document.getElementById('editStatementInline');
const navigateDbListInput = document.getElementById('navigateDbList');  // Input for database search modal hotkey
const saveButton = document.getElementById('save');
const statusDiv = document.getElementById('status');

// Load saved settings
function loadSettings() {
    chrome.storage.sync.get(['hotkeys'], (result) => {
        if (result.hotkeys) {
            currentHotkeys = { ...defaultHotkeys, ...result.hotkeys };
            originalHotkeys = { ...currentHotkeys };  // Store the original settings
        }
        updateUI();
        updateSaveButtonState();
    });
}

// Update UI with current hotkeys
function updateUI() {
    navigateToSqlInput.value = formatHotkeyForDisplay(currentHotkeys.navigateToSql);
    editStatementInlineInput.value = formatHotkeyForDisplay(currentHotkeys.editStatementInline);
    navigateDbListInput.value = formatHotkeyForDisplay(currentHotkeys.navigateDbList);  // Update database search modal hotkey
}

// Check if settings have changed and update save button accordingly
function updateSaveButtonState() {
    // Compare current and original hotkeys
    settingsChanged = JSON.stringify(currentHotkeys) !== JSON.stringify(originalHotkeys);
    
    // Enable/disable save button based on changes
    saveButton.disabled = !settingsChanged;
    
    // Update button appearance based on state
    if (settingsChanged) {
        saveButton.classList.add('active');
    } else {
        saveButton.classList.remove('active');
    }
}

// Save settings
function saveSettings() {
    if (!settingsChanged) return; // Don't save if nothing changed
    
    console.log('phpMyAdmin HotStuff: Saving hotkey settings:', currentHotkeys);
    chrome.storage.sync.set({ hotkeys: currentHotkeys }, () => {
        // Update original settings to match current
        originalHotkeys = { ...currentHotkeys };
        
        // Update save button state
        updateSaveButtonState();
        
        console.log('phpMyAdmin HotStuff: Hotkeys saved successfully');
        
        // Show confirmation
        statusDiv.textContent = 'Settings saved!';
        setTimeout(() => { statusDiv.textContent = ''; }, 2000);
    });
}

// Start listening for a key combination
function startListening(inputElement) {
    // If already listening for another input, clean up first
    if (isListening) {
        cleanupHotkeyCapture();
    }
    
    listeningFor = inputElement.id;
    isListening = true;
    
    // Add 'listening' class for visual feedback
    inputElement.classList.add('listening');
    inputElement.value = 'Press keys...';
    
    // Clear any previous key
    currentKey = null;
    currentModifiers = { alt: false, ctrl: false, shift: false, meta: false };
    capturedModifiers = { alt: false, ctrl: false, shift: false, meta: false };
    
    // Add listeners for keydown, keyup, and blur
    document.addEventListener('keydown', hotkeyCaptureKeydownListener);
    document.addEventListener('keyup', hotkeyCaptureKeyupListener);
    document.addEventListener('click', hotkeyCaptureCancelOnOutsideClick);
    window.addEventListener('blur', cancelHotkeyCapture);
}

// Event listener for keydown during capture
function hotkeyCaptureKeydownListener(event) {
    if (!isListening) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    // Track modifier keys - both for current state and capture history
    if (event.key === 'Alt' || event.key === 'AltGraph') {
        currentModifiers.alt = true;
        capturedModifiers.alt = true;
    } else if (event.key === 'Control') {
        currentModifiers.ctrl = true;
        capturedModifiers.ctrl = true;
    } else if (event.key === 'Shift') {
        currentModifiers.shift = true;
        capturedModifiers.shift = true;
    } else if (event.key === 'Meta') {
        currentModifiers.meta = true;
        capturedModifiers.meta = true;
    } else {
        // If it's not a modifier key, it's our main key
        // Replace the current key if one already exists
        currentKey = event.code;
    }
    
    // Update the input to show current combination
    updateHotkeyPreview();
}

// Event listener for keyup during capture
function hotkeyCaptureKeyupListener(event) {
    if (!isListening) return;
    
    // If we're releasing Alt, Ctrl, Shift, or Meta, update our CURRENT tracking only
    // (We keep the capturedModifiers state to remember which modifiers were used)
    if (event.key === 'Alt' || event.key === 'AltGraph') {
        currentModifiers.alt = false;
    } else if (event.key === 'Control') {
        currentModifiers.ctrl = false;
    } else if (event.key === 'Shift') {
        currentModifiers.shift = false;
    } else if (event.key === 'Meta') {
        currentModifiers.meta = false;
    }
    
    // Check if all keys are released and we have a main key
    if (!currentModifiers.alt && !currentModifiers.ctrl && 
        !currentModifiers.shift && !currentModifiers.meta && currentKey) {
        finalizeHotkeyCapture();
    }
    
    // Update the preview
    updateHotkeyPreview();
}

// Cancel hotkey capture when clicking outside the input
function hotkeyCaptureCancelOnOutsideClick(event) {
    if (!isListening || !listeningFor) return;
    
    // Get the current input element
    const currentInput = document.getElementById(listeningFor);
    
    // If the click is not on the current input, cancel the capture
    if (event.target !== currentInput) {
        // If we have a key, finalize, otherwise just cancel
        if (currentKey && (capturedModifiers.alt || capturedModifiers.ctrl || 
                         capturedModifiers.shift || capturedModifiers.meta)) {
            finalizeHotkeyCapture();
        } else {
            cancelHotkeyCapture();
        }
    }
}

// Update the hotkey preview in the input field
function updateHotkeyPreview() {
    if (!listeningFor) return;
    
    // Build the current hotkey string using CURRENT state for visual feedback
    let parts = [];
    if (currentModifiers.alt) parts.push('Alt');
    if (currentModifiers.ctrl) parts.push('Control');
    if (currentModifiers.shift) parts.push('Shift');
    if (currentModifiers.meta) parts.push('Meta');
    
    if (currentKey) {
        parts.push(currentKey);
    }
    
    // Show the current combination in the input
    const currentInput = document.getElementById(listeningFor);
    if (parts.length > 0) {
        currentInput.value = formatHotkeyForDisplay(parts.join('+'));
    } else {
        currentInput.value = 'Press keys...';
    }
}

// Finalize the hotkey capture
function finalizeHotkeyCapture() {
    if (!listeningFor || !currentKey) return;
    
    // Build the final hotkey string using CAPTURED state
    let parts = [];
    if (capturedModifiers.alt) parts.push('Alt');
    if (capturedModifiers.ctrl) parts.push('Control');
    if (capturedModifiers.shift) parts.push('Shift');
    if (capturedModifiers.meta) parts.push('Meta');
    
    // Only save if we have at least one modifier key
    if (parts.length > 0) {
        parts.push(currentKey);
        
        const hotkeyString = parts.join('+');
        
        // Save the hotkey
        currentHotkeys[listeningFor] = hotkeyString;
        document.getElementById(listeningFor).value = formatHotkeyForDisplay(hotkeyString);
        
        // Check if settings have changed
        updateSaveButtonState();
    } else {
        // If no modifiers were pressed, show an error or revert to previous
        document.getElementById(listeningFor).value = formatHotkeyForDisplay(currentHotkeys[listeningFor]);
        statusDiv.textContent = 'Hotkey must include at least one modifier key (Alt, Ctrl, Shift, Meta)';
        setTimeout(() => { statusDiv.textContent = ''; }, 2000);
    }
    
    // Reset everything
    cleanupHotkeyCapture();
}

// Cancel hotkey capture (e.g., if user tabs away)
function cancelHotkeyCapture() {
    if (!isListening) return;
    
    // Restore the previous value
    if (listeningFor) {
        document.getElementById(listeningFor).value = formatHotkeyForDisplay(currentHotkeys[listeningFor]);
        document.getElementById(listeningFor).classList.remove('listening');
    }
    
    cleanupHotkeyCapture();
}

// Clean up listeners and reset state
function cleanupHotkeyCapture() {
    // Remove listeners
    document.removeEventListener('keydown', hotkeyCaptureKeydownListener);
    document.removeEventListener('keyup', hotkeyCaptureKeyupListener);
    document.removeEventListener('click', hotkeyCaptureCancelOnOutsideClick);
    window.removeEventListener('blur', cancelHotkeyCapture);
    
    // If we have a current input, remove the listening class
    if (listeningFor) {
        document.getElementById(listeningFor).classList.remove('listening');
    }
    
    // Reset flags and state
    isListening = false;
    listeningFor = null;
    currentKey = null;
    currentModifiers = { alt: false, ctrl: false, shift: false, meta: false };
    capturedModifiers = { alt: false, ctrl: false, shift: false, meta: false };
}

// Format hotkey string (e.g., from 'Alt+KeyW' to 'Alt + W')
function formatHotkeyForDisplay(hotkeyString) {
    if (!hotkeyString) return 'Not set';
    return hotkeyString
        .replace(/Key([A-Z])/g, '$1') // Replace "KeyW" with "W"
        .replace(/Digit(\d)/g, '$1')  // Replace "Digit1" with "1" 
        .replace(/\+/g, ' + ');       // Add spaces around "+"
}

// Event Listeners for inputs - clicking the input field now starts the hotkey capture
navigateToSqlInput.addEventListener('click', () => {
    startListening(navigateToSqlInput);
});

editStatementInlineInput.addEventListener('click', () => {
    startListening(editStatementInlineInput);
});

navigateDbListInput.addEventListener('click', () => {  // Listen for clicks to set database search modal hotkey
    startListening(navigateDbListInput);
});

saveButton.addEventListener('click', saveSettings);

// Initial load
document.addEventListener('DOMContentLoaded', loadSettings);
