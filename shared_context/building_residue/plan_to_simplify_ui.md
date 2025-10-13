# Plan to Simplify UI - Focus on Save/Load Workflow

## Overview

Simplify the user interface by focusing on the core workflow: save work as JSON and load work from JSON. Remove clutter from export options that aren't essential to the main use case while keeping the helpful controls information.

## Current State Analysis

### Existing Functionality (from architecture.md and code analysis)
- **JSON Export/Import**: `downloadAsJSON()` and `importFromJSON()` functions already exist in `/src/main/fsm.js`
- **Auto-save**: `saveBackup()` and `restoreBackup()` functions handle localStorage persistence
- **Clear Canvas**: `clearCanvas()` function exists
- **Other Export Functions**: `saveAsPNG()`, `saveAsSVG()`, `downloadAsSVG()`, `saveAsLaTeX()`, `downloadAsLaTeX()` - these will be removed from UI

### Current UI Structure (in `/www/index.html`)
```html
<p><strong>Export:</strong> <a href="javascript:saveAsPNG()">PNG</a> | <a href="javascript:saveAsSVG()">SVG</a> | <a href="javascript:downloadAsSVG()">Download SVG</a> | <a href="javascript:saveAsLaTeX()">LaTeX</a> | <a href="javascript:downloadAsLaTeX()">Download LaTeX</a> | <a href="javascript:downloadAsJSON()">Download JSON</a></p>
<p><strong>Import:</strong> 
    <input type="file" id="jsonFileInput" accept=".json" onchange="importFromJSON(this)">
</p>
<p><strong>Actions:</strong> <a href="javascript:clearCanvas()" style="color: #d32f2f;">Clear Canvas</a></p>
```

## Target Design

### Button Naming Strategy
Based on user workflow clarity:
1. **"Save Work (JSON)"** - Makes it clear this saves your current work
2. **"Load Work"** - Simple and clear, file input will handle the JSON aspect
3. **"Clear Canvas"** - Keep existing clear naming

### UI Element Choice: Buttons vs Links
- **Buttons** are more appropriate for actions (save, load, clear)
- **Links** were used in original design but buttons provide better UX for primary actions
- File input should remain as-is since it's a standard HTML element

## Implementation Plan

### Implementation Checklist
- [ ] **Step 1**: Update HTML Structure in `/www/index.html`
- [ ] **Step 2**: Add CSS Styling for New Buttons
- [ ] **Step 3**: Remove Unused Export Functions (Optional Cleanup)
- [ ] **Step 4**: Test Workflow

### Step 1: Update HTML Structure in `/www/index.html`

Create two separate boxes: action buttons in top-left, controls/help in bottom-left.

**Current structure:**
```html
<div id="guibox">
    <p style="margin: 0 0 8px 0; font-weight: bold;">Controls:</p>
    <ul><!-- Controls list --></ul>
    <p><strong>Export:</strong> <!-- Multiple export links --></p>
    <p><strong>Import:</strong> <!-- File input --></p>
    <p><strong>Actions:</strong> <!-- Clear canvas link --></p>
</div>
<p class="author-credit">Forked from...</p>
```

**New two-box structure:**
```html
<!-- Action buttons box - top left -->
<div id="actionbuttonbox">
    <button onclick="downloadAsJSON()" class="primary-button">Save Doodle (JSON)</button>
    <label for="jsonFileInput" class="primary-button file-button">Load Doodle (from JSON)</label>
    <input type="file" id="jsonFileInput" accept=".json" onchange="importFromJSON(this)" style="display: none;">
    <button onclick="clearCanvas()" class="danger-button">Clear Canvas</button>
</div>

<!-- Controls/help box - bottom left -->
<div id="guibox">
    <p style="margin: 0 0 8px 0; font-weight: bold;">Controls:</p>
    <ul style="margin: 0 0 15px 0; padding-left: 20px; line-height: 16px;">
        <!-- Keep all existing controls list items -->
    </ul>
    <p class="author-credit" style="margin: 15px 0 0 0;">
        Forked from <a href="https://github.com/evanw/fsm">https://github.com/evanw/fsm</a> by <a href="http://madebyevan.com/">Evan Wallace</a>
    </p>
</div>
```

### Step 2: Add CSS Styling for New Boxes and Buttons

Add styles to the existing `<style>` section for the new two-box layout:

```css
/* Action button box - top left */
#actionbuttonbox {
    position: absolute;
    top: 20px;
    left: 20px;
    background: rgba(223, 223, 223, 0.9);
    border-radius: 10px;
    padding: 20px;
    margin: 0;
    text-align: left;
    max-width: 200px;
    font-size: 12px;
    box-shadow: 0 2px 15px rgba(0,0,0,0.15);
    z-index: 10;
    border: 1px solid rgba(0,0,0,0.1);
    display: flex;
    flex-direction: column;
    gap: 8px;
}

/* Controls box - bottom left (modify existing div styles) */
#guibox {
    position: absolute;
    bottom: 20px;
    left: 20px;
    background: rgba(223, 223, 223, 0.9);
    border-radius: 10px;
    padding: 20px;
    margin: 0;
    text-align: left;
    max-width: 450px;
    font-size: 12px;
    box-shadow: 0 2px 15px rgba(0,0,0,0.15);
    z-index: 10;
    border: 1px solid rgba(0,0,0,0.1);
}

.primary-button {
    background: #4a90e2;
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 12px;
    font-family: inherit;
    transition: background-color 0.2s;
}

.primary-button:hover {
    background: #357abd;
}

.danger-button {
    background: #d32f2f;
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 12px;
    font-family: inherit;
    transition: background-color 0.2s;
}

.danger-button:hover {
    background: #b71c1c;
}

.file-button {
    background: #4a90e2;
    color: white;
    display: inline-block;
    text-align: center;
    text-decoration: none;
}

.file-button:hover {
    background: #357abd;
}

/* Update author credit styling since it's now inside guibox */
#guibox .author-credit {
    position: static;
    background: none;
    padding: 0;
    border-radius: 0;
    font-size: 12px;
    margin: 15px 0 0 0;
}
```

### Step 3: Remove Unused Export Functions (Optional Cleanup)

While the functions can remain in the codebase for potential future use, they can be removed from the global scope or commented out to reduce bundle size:

**Functions to keep:**
- `downloadAsJSON()` - Core save functionality
- `importFromJSON()` - Core load functionality  
- `clearCanvas()` - Core clear functionality
- `saveBackup()` / `restoreBackup()` - Auto-save functionality

**Functions that can be removed from UI (but kept in code):**
- `saveAsPNG()` - Not essential for main workflow
- `saveAsSVG()` - Not essential for main workflow
- `downloadAsSVG()` - Not essential for main workflow
- `saveAsLaTeX()` - Not essential for main workflow
- `downloadAsLaTeX()` - Not essential for main workflow

### Step 4: Test Workflow

1. **Save Work**: Click "Save Work (JSON)" button → file downloads with current state
2. **Load Work**: Click "Load Work" → file picker opens → select JSON file → canvas updates
3. **Clear Canvas**: Click "Clear Canvas" → canvas clears after confirmation (if implemented)

## Benefits of This Approach

### User Experience Improvements
- **Clearer workflow**: Three clear actions instead of 8+ mixed options
- **Better visual hierarchy**: Buttons stand out more than text links
- **Reduced cognitive load**: Focus on essential actions only
- **Consistent interaction patterns**: All primary actions use buttons

### Technical Benefits
- **Maintains existing functionality**: No need to rewrite working JSON save/load logic
- **Clean separation**: Export functions remain available for power users via console
- **Future extensibility**: Button-based design easier to extend with icons or tooltips
- **Mobile friendly**: Buttons work better on touch devices

### Accessibility Improvements
- **Better focus management**: Buttons provide clearer tab navigation
- **Semantic correctness**: Buttons for actions, inputs for file selection
- **Screen reader friendly**: Clear button labels describe actions

## Implementation Files to Modify

1. **`/www/index.html`**: Update UI structure and add CSS
2. **No JavaScript changes needed**: All required functions already exist

## Rollback Plan

If the new design doesn't work well:
1. Revert `/www/index.html` to previous version
2. All functionality remains intact since no JavaScript functions are removed

## Future Enhancements

Once basic simplification is complete, consider:
- **Keyboard shortcuts**: Ctrl+S for save, Ctrl+O for load
- **Drag & drop**: Drop JSON files directly onto canvas
- **Recent files**: Show list of recently saved work
- **Export menu**: Collapsible menu for advanced export options (PNG, SVG, LaTeX)
