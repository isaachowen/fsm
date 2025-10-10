# Plan: Custom Filename for JSON Save

## Overview
Add a text input field above the "Load Sketch (from JSON)" button that allows users to specify a custom filename for JSON downloads. The filename should persist across browser sessions and be used when clicking "Save Sketch (to JSON)".

## Current State Analysis
- The `downloadAsJSON()` function in `/src/main/fsm/src/main/fsm.js` (line 570) currently uses hardcoded filename `'fsm-diagram.json'`
- The UI has action buttons in `#actionbuttonbox` in `/www/index.html`
- No existing filename input or localStorage usage for persistence

## Implementation Plan

### Phase 1: Add UI Elements
- [ ] Add a text input field to `#actionbuttonbox` in `/www/index.html`
  - Position it above the "Load Sketch (from JSON)" button
  - Default placeholder text: "Enter filename (without .json)"
  - Default value: "fsm-diagram" 
  - Add appropriate styling to match existing button aesthetics
  - Give it an ID like `filenameInput` for easy access

### Phase 2: Add Persistence Logic
- [ ] Create JavaScript functions in `/src/main/fsm.js` for filename management:
  - `getCustomFilename()` - retrieves filename from input, falls back to default
  - `saveFilenameToStorage()` - saves current filename to localStorage
  - `loadFilenameFromStorage()` - loads filename from localStorage on page load
  - `initializeFilenameInput()` - sets up event listeners and loads saved filename

### Phase 3: Integrate with Save Functionality
- [ ] Modify `downloadAsJSON()` function in `/src/main/fsm.js`:
  - Replace hardcoded `'fsm-diagram.json'` with dynamic filename
  - Call `getCustomFilename()` to get current filename from input
  - Ensure `.json` extension is always appended
  - Save filename to localStorage when download occurs

### Phase 4: Event Handling and Validation
- [ ] Add input validation for filename:
  - Remove or replace invalid filename characters (e.g., `/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`)
  - Trim whitespace
  - Provide user feedback for invalid characters
- [ ] Add event listeners:
  - Save to localStorage when user changes filename
  - Update filename when user types (debounced)

### Phase 5: Testing and Polish
- [ ] Test filename persistence across browser sessions
- [ ] Test filename validation with various inputs
- [ ] Test integration with save functionality
- [ ] Ensure UI layout remains clean and functional
- [ ] Test with different filename lengths

## Technical Details

### HTML Structure (to be added to `#actionbuttonbox`)
```html
<div style="margin-bottom: 8px;">
    <label for="filenameInput" style="display: block; margin-bottom: 4px; font-size: 11px;">Filename:</label>
    <input type="text" id="filenameInput" placeholder="Enter filename (without .json)" 
           style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 3px; font-size: 11px; box-sizing: border-box;">
</div>
```

### JavaScript Functions (to be added to `/src/main/fsm.js`)
```javascript
// Get the custom filename from input, with fallback
function getCustomFilename() {
    var input = document.getElementById('filenameInput');
    var filename = (input && input.value.trim()) || 'fsm-diagram';
    // Clean filename of invalid characters
    filename = filename.replace(/[\/\\:*?"<>|]/g, '_');
    return filename + '.json';
}

// Save filename to localStorage
function saveFilenameToStorage() {
    var input = document.getElementById('filenameInput');
    if (input && input.value.trim()) {
        localStorage.setItem('fsmFilename', input.value.trim());
    }
}

// Load filename from localStorage
function loadFilenameFromStorage() {
    var savedFilename = localStorage.getItem('fsmFilename');
    var input = document.getElementById('filenameInput');
    if (input && savedFilename) {
        input.value = savedFilename;
    }
}

// Initialize filename input on page load
function initializeFilenameInput() {
    loadFilenameFromStorage();
    var input = document.getElementById('filenameInput');
    if (input) {
        // Save filename when user changes it
        input.addEventListener('input', function() {
            saveFilenameToStorage();
        });
    }
}
```

### Modified downloadAsJSON() function
```javascript
// In downloadAsJSON() function, replace line 570:
// OLD: link.download = 'fsm-diagram.json';
// NEW: link.download = getCustomFilename();
```

## Benefits
1. **User Control**: Users can name their files meaningfully (e.g., "state_machine_v1", "login_flow", "game_logic")
2. **Persistence**: Filename choice persists across browser sessions for convenience
3. **Non-intrusive**: Minimal UI change that fits naturally with existing interface
4. **Backward Compatible**: Default behavior preserved if no custom name is entered

## Acceptance Criteria
- [ ] Text input appears above "Load Sketch (from JSON)" button
- [ ] Input accepts text and shows placeholder when empty
- [ ] Filename persists after page reload
- [ ] Save function uses custom filename when provided
- [ ] Invalid characters are handled gracefully
- [ ] Default filename "fsm-diagram.json" used when input is empty
- [ ] UI remains clean and matches existing style