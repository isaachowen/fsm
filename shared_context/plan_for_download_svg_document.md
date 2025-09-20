# Plan for Download SVG Document Feature

## Goal
Add a "Download SVG" button that creates and downloads a `.svg` file containing the same SVG content currently displayed in the popup textarea. This should be in addition to the existing "SVG" button, preserving the current behavior of showing the SVG code in a popup window.

## Current State Analysis
- The existing "SVG" export button calls `saveAsSVG()` function
- `saveAsSVG()` generates SVG code using `ExportAsSVG` class and displays it in a textarea popup via `output()` function
- PNG export already implements file download functionality using blob creation and anchor element triggers
- LaTeX export now has a working download implementation that can serve as a template
- The SVG content is generated in `ExportAsSVG.toSVG()` method in `/src/export_as/svg.js`
- There's a commented-out download attempt in the current code, but it uses data URLs instead of proper blob download

## Implementation Plan

### Step 1: Create New Download Function
Create a new function `downloadAsSVG()` in `/src/main/fsm.js` that:
1. Generates SVG content using the same logic as `saveAsSVG()`
2. Creates a text blob from the SVG content
3. Triggers download using the same pattern as `saveAsPNG()` and `downloadAsLaTeX()`

**Checklist:**
- [ ] Open `/src/main/fsm.js` file
- [ ] Locate the `saveAsSVG()` function (around line 410)
- [ ] Add the new `downloadAsSVG()` function after `saveAsSVG()`
- [ ] Copy SVG generation logic from `saveAsSVG()`
- [ ] Replace `output(svgData)` with blob creation and download logic
- [ ] Use filename `fsm-diagram.svg` for the download
- [ ] Use proper MIME type `image/svg+xml` for SVG files
- [ ] Test function compiles without errors

### Step 2: Add Download Button to UI
Modify `/www/index.html` to add a second SVG option:
- Change the export line from: `<a href="javascript:saveAsSVG()">SVG</a>`
- To: `<a href="javascript:saveAsSVG()">SVG</a> | <a href="javascript:downloadAsSVG()">Download SVG</a>`

**Checklist:**
- [ ] Open `/www/index.html` file
- [ ] Locate the export line (around line 157)
- [ ] Update the SVG link to include both options
- [ ] Verify HTML syntax is correct
- [ ] Ensure proper spacing and formatting consistent with LaTeX buttons

### Step 3: Implementation Details

#### New Function Structure (add to `/src/main/fsm.js`):
```javascript
function downloadAsSVG() {
	// Generate SVG content using same logic as saveAsSVG()
	var exporter = new ExportAsSVG();
	var oldSelectedObject = selectedObject;
	selectedObject = null;
	drawUsing(exporter);
	selectedObject = oldSelectedObject;
	var svgData = exporter.toSVG();
	
	// Create SVG blob for download
	var blob = new Blob([svgData], {type: 'image/svg+xml'});
	var url = URL.createObjectURL(blob);
	
	// Create temporary anchor element for download
	var link = document.createElement('a');
	link.href = url;                           // Blob URL with our SVG data
	link.download = 'fsm-diagram.svg';         // Forces download with this filename
	
	// Must add to DOM for browser compatibility
	document.body.appendChild(link);           // Some browsers require this
	
	// Trigger the download programmatically
	link.click();                              // Simulates user clicking the link
	
	// Clean up immediately
	document.body.removeChild(link);           // Remove from DOM
	URL.revokeObjectURL(url);                 // Free memory
}
```

### Step 4: Build and Test
1. Run build system: `python3 build_fsm.py`
2. Test both buttons:
   - Original "SVG" button should still show popup
   - New "Download SVG" button should download `.svg` file
3. Verify downloaded file contains identical content to popup
4. Test that downloaded SVG file opens correctly in browsers and vector graphics programs

**Checklist:**
- [ ] Run `python3 build_fsm.py` to rebuild the concatenated file
- [ ] Start local server from www directory: `cd www && python3 -m http.server 8000`
- [ ] Open browser to `http://localhost:8000`
- [ ] Create a simple FSM diagram (add a few nodes and links)
- [ ] Test original "SVG" button - verify popup appears with SVG code
- [ ] Test new "Download SVG" button - verify file downloads
- [ ] Open downloaded `.svg` file in browser and verify it displays correctly
- [ ] Open downloaded `.svg` file in text editor and compare content with popup
- [ ] Verify both buttons work independently
- [ ] Test that downloaded SVG opens in vector graphics programs (Inkscape, Adobe Illustrator, etc.)
- [ ] Test in different browsers if possible

## Key Technical Notes
- Reuse existing `ExportAsSVG` class and generation logic
- Follow the established download pattern from `saveAsPNG()` and `downloadAsLaTeX()`
- Use `.svg` file extension for proper SVG file association
- Use `image/svg+xml` MIME type (more specific than `text/plain` used for LaTeX)
- Maintain backward compatibility with existing SVG export functionality
- No changes needed to the SVG generation code itself
- SVG files are text-based like LaTeX but use a different MIME type for proper browser handling

## Files to Modify
1. `/src/main/fsm.js` - Add `downloadAsSVG()` function
2. `/www/index.html` - Add new download button link
3. Run `/build_fsm.py` to rebuild concatenated file

**Checklist:**
- [ ] Modify `/src/main/fsm.js`
- [ ] Modify `/www/index.html`
- [ ] Run build script
- [ ] Test functionality

## Success Criteria
- Existing "SVG" button continues to work exactly as before
- New "Download SVG" button successfully downloads a `.svg` file
- Downloaded file content matches the popup display exactly
- File downloads with appropriate filename `fsm-diagram.svg`
- Downloaded SVG file displays correctly when opened in browsers
- Downloaded SVG file can be opened and edited in vector graphics programs

**Final Verification Checklist:**
- [ ] Original SVG functionality unchanged
- [ ] New download button appears in UI
- [ ] Download produces correct `.svg` file
- [ ] File content matches popup exactly
- [ ] Downloaded SVG displays correctly in browser
- [ ] Downloaded SVG opens in vector graphics programs
- [ ] No JavaScript errors in browser console
- [ ] Feature works across different browsers
- [ ] File downloads with correct name `fsm-diagram.svg`
- [ ] MIME type is correct (`image/svg+xml`)

## Differences from LaTeX Implementation
- **MIME Type**: Uses `image/svg+xml` instead of `text/plain`
- **File Extension**: `.svg` instead of `.tex`
- **Use Case**: Vector graphics file that can be opened in browsers and graphics programs
- **Content Type**: XML-based graphics format vs. LaTeX markup
- **Testing**: Requires verification that SVG renders correctly, not just text content

## Implementation Priority
This feature should be implemented after the LaTeX download feature is completed and tested, as it follows the exact same pattern with only minor differences in MIME type and file extension.