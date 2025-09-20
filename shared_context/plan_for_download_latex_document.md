# Plan for Download LaTeX Document Feature

## Goal
Add a "Download LaTeX" button that creates and downloads a `.tex` file containing the same LaTeX content currently displayed in the popup textarea. This should be in addition to the existing "LaTeX" button, preserving the current behavior of showing the LaTeX code in a popup window.

## Current State Analysis
- The existing "LaTeX" export button calls `saveAsLaTeX()` function
- `saveAsLaTeX()` generates LaTeX code using `ExportAsLaTeX` class and displays it in a textarea popup via `output()` function
- PNG export already implements file download functionality using blob creation and anchor element triggers
- The LaTeX content is generated in `ExportAsLaTeX.toLaTeX()` method in `/src/export_as/latex.js`

## Implementation Plan

### Step 1: Create New Download Function
Create a new function `downloadAsLaTeX()` in `/src/main/fsm.js` that:
1. Generates LaTeX content using the same logic as `saveAsLaTeX()`
2. Creates a text blob from the LaTeX content
3. Triggers download using the same pattern as `saveAsPNG()`

**Checklist:**
- [x] Open `/src/main/fsm.js` file
- [x] Locate the `saveAsLaTeX()` function (around line 422)
- [x] Add the new `downloadAsLaTeX()` function after `saveAsLaTeX()`
- [x] Copy LaTeX generation logic from `saveAsLaTeX()`
- [x] Replace `output(texData)` with blob creation and download logic
- [x] Use filename `fsm-diagram.tex` for the download
- [x] Test function compiles without errors

### Step 2: Add Download Button to UI
Modify `/www/index.html` to add a second LaTeX option:
- Change the export line from: `<a href="javascript:saveAsLaTeX()">LaTeX</a>`
- To: `<a href="javascript:saveAsLaTeX()">LaTeX</a> | <a href="javascript:downloadAsLaTeX()">Download LaTeX</a>`

**Checklist:**
- [x] Open `/www/index.html` file
- [x] Locate the export line (around line 157)
- [x] Update the LaTeX link to include both options
- [x] Verify HTML syntax is correct
- [x] Ensure proper spacing and formatting

### Step 3: Implementation Details

#### New Function Structure (add to `/src/main/fsm.js`):
```javascript
function downloadAsLaTeX() {
	var exporter = new ExportAsLaTeX();
	var oldSelectedObject = selectedObject;
	selectedObject = null;
	drawUsing(exporter);
	selectedObject = oldSelectedObject;
	var texData = exporter.toLaTeX();
	
	// Create text blob and download
	var blob = new Blob([texData], {type: 'text/plain'});
	var url = URL.createObjectURL(blob);
	var link = document.createElement('a');
	link.href = url;
	link.download = 'fsm-diagram.tex';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
```

### Step 4: Build and Test
1. Run build system: `python3 build_fsm.py`
2. Test both buttons:
   - Original "LaTeX" button should still show popup
   - New "Download LaTeX" button should download `.tex` file
3. Verify downloaded file contains identical content to popup

**Checklist:**
- [x] Run `python3 build_fsm.py` to rebuild the concatenated file
- [x] Start local server: `python3 -m http.server 8000`
- [x] Open browser to `http://localhost:8000`
- [x] Create a simple FSM diagram (add a few nodes and links)
- [x] Test original "LaTeX" button - verify popup appears with LaTeX code
- [x] Test new "Download LaTeX" button - verify file downloads
- [x] Open downloaded `.tex` file and compare content with popup
- [x] Verify both buttons work independently
- [x] Test in different browsers if possible

## Key Technical Notes
- Reuse existing `ExportAsLaTeX` class and generation logic
- Follow the established download pattern from `saveAsPNG()`
- Use `.tex` file extension for proper LaTeX file association
- Maintain backward compatibility with existing LaTeX export functionality
- No changes needed to the LaTeX generation code itself

## Files to Modify
1. `/src/main/fsm.js` - Add `downloadAsLaTeX()` function
2. `/www/index.html` - Add new download button link
3. Run `/build_fsm.py` to rebuild concatenated file

**Checklist:**
- [x] Modify `/src/main/fsm.js`
- [x] Modify `/www/index.html`
- [x] Run build script
- [x] Test functionality

## Success Criteria
- Existing "LaTeX" button continues to work exactly as before
- New "Download LaTeX" button successfully downloads a `.tex` file
- Downloaded file content matches the popup display exactly
- File downloads with appropriate filename `fsm-diagram.tex`

**Final Verification Checklist:**
- [x] Original LaTeX functionality unchanged
- [x] New download button appears in UI
- [x] Download produces correct `.tex` file
- [x] File content matches popup exactly
- [x] No JavaScript errors in browser console
- [x] Feature works across different browsers
- [x] File downloads with correct name `fsm-diagram.tex`