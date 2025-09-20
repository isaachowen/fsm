# Plan: Clear Canvas Button Implementation

## Overview
This document outlines the implementation plan for adding a "Clear Canvas" button to the Network Doodler that will remove all nodes and edges from the canvas.

## Current Architecture Analysis

Based on the architecture.md and code examination, the FSM designer follows this structure:

### Key Components:
- **Global State Arrays**: `nodes[]` and `links[]` arrays in `src/main/fsm.js` store all FSM elements
- **UI Layer**: `www/index.html` contains the interface with export controls in a floating div
- **Export Pattern**: Existing export functions (`saveAsPNG()`, `saveAsSVG()`, `saveAsLaTeX()`) provide the pattern for global functions callable from HTML

### Current Export Controls Location:
The export controls are located in `www/index.html` at approximately line 161:
```html
<p style="margin: 0;"><strong>Export:</strong> 
  <a href="javascript:saveAsPNG()">PNG</a> | 
  <a href="javascript:saveAsSVG()">SVG</a> | 
  <a href="javascript:downloadAsSVG()">Download SVG</a> | 
  <a href="javascript:saveAsLaTeX()">LaTeX</a> | 
  <a href="javascript:downloadAsLaTeX()">Download LaTeX</a>
</p>
```

## Implementation Plan

### 1. Create Clear Canvas Function
**File**: `src/main/fsm.js`
**Location**: After the existing export functions (around line 440)

```javascript
function clearCanvas() {
    // Clear all nodes and links
    nodes.length = 0;  // Clear nodes array
    links.length = 0;  // Clear links array
    
    // Clear any selected objects
    selectedObject = null;
    currentLink = null;
    
    // Redraw the canvas (will show empty canvas)
    draw();
    
    // Save the cleared state to localStorage
    saveBackup();
}
```

**Key Design Decisions**:
- Use `array.length = 0` to clear arrays (preserves array reference)
- Reset `selectedObject` and `currentLink` to prevent dangling references
- Call `draw()` to immediately update the visual display
- Call `saveBackup()` to persist the cleared state (follows existing pattern)

#### Implementation Checklist - Step 1:
- [ ] 1.1. Open `src/main/fsm.js` file
- [ ] 1.2. Locate the export functions section (around line 440, after `saveAsLaTeX()`)
- [ ] 1.3. Add the `clearCanvas()` function code exactly as specified above
- [ ] 1.4. Verify function syntax and formatting matches existing code style
- [ ] 1.5. Save the file
- [ ] 1.6. Run `python3 build_fsm.py` to rebuild the project
- [ ] 1.7. Check for any build errors in terminal output

### 2. Add UI Button
**File**: `www/index.html`
**Location**: Modify the controls div (around line 161)

**Option A: Add to Export Section**
```html
<p style="margin: 0;"><strong>Export:</strong> 
  <a href="javascript:saveAsPNG()">PNG</a> | 
  <a href="javascript:saveAsSVG()">SVG</a> | 
  <a href="javascript:downloadAsSVG()">Download SVG</a> | 
  <a href="javascript:saveAsLaTeX()">LaTeX</a> | 
  <a href="javascript:downloadAsLaTeX()">Download LaTeX</a>
</p>
<p style="margin: 8px 0 0 0;"><strong>Actions:</strong> 
  <a href="javascript:clearCanvas()" style="color: #d32f2f;">Clear Canvas</a>
</p>
```

**Recommended**: Option A - separate "Actions" section to distinguish destructive actions from export functions.

#### Implementation Checklist - Step 2:
- [ ] 2.1. Open `www/index.html` file
- [ ] 2.2. Locate the export controls section (search for "Export:" around line 161)
- [ ] 2.3. Find the closing `</p>` tag of the export paragraph
- [ ] 2.4. Add the new "Actions" paragraph immediately after the export paragraph
- [ ] 2.5. Verify the HTML syntax is correct (matching tags, proper quotes)
- [ ] 2.6. Check that the red color `#d32f2f` is applied to the Clear Canvas link
- [ ] 2.7. Save the file
- [ ] 2.8. Refresh the browser to see the new button appear

### 3. Visual Design Considerations
- **Color**: Use red color (`#d32f2f`) to indicate destructive action
- **Placement**: Keep consistent with existing UI patterns
- **Spacing**: Follow existing margin/padding patterns

#### Implementation Checklist - Step 3:
- [ ] 3.1. Verify the Clear Canvas button appears in red color
- [ ] 3.2. Check that spacing matches existing UI elements (8px top margin)
- [ ] 3.3. Ensure the button is properly aligned with other controls
- [ ] 3.4. Test button hover effects work consistently with other links
- [ ] 3.5. Verify the button is visible and accessible on different screen sizes

### 4. User Experience Enhancements (Optional)
**Confirmation Dialog** (Future Enhancement):
```javascript
function clearCanvas() {
    if (nodes.length > 0 || links.length > 0) {
        if (!confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
            return;
        }
    }
    
    // ... rest of clear function
}
```

## Data Flow Impact

### Before Clear:
```
nodes[] = [Node1, Node2, Node3, ...]
links[] = [Link1, Link2, SelfLink1, StartLink1, ...]
selectedObject = Node1 (example)
```

### After Clear:
```
nodes[] = []
links[] = []
selectedObject = null
currentLink = null
Canvas displays empty background
localStorage updated with empty state
```

## Testing Considerations

### Manual Test Cases:
1. **Empty Canvas**: Clear button should work on empty canvas without errors
2. **Populated Canvas**: Clear button should remove all nodes and links
3. **Selected Objects**: Clear should handle cases where objects are selected
4. **Persistence**: Cleared state should persist after page reload
5. **Visual Feedback**: Canvas should immediately show empty state

### Edge Cases:
- Clicking clear while in middle of creating a link (`currentLink != null`)
- Clearing during drag operations (`movingObject = true`)
- Multiple rapid clicks on clear button

#### Implementation Checklist - Testing:
- [ ] T.1. Test clicking Clear Canvas on empty canvas (should work without errors)
- [ ] T.2. Create several nodes and links, then test Clear Canvas functionality
- [ ] T.3. Select a node, then click Clear Canvas (verify no errors)
- [ ] T.4. Select a link, then click Clear Canvas (verify no errors)
- [ ] T.5. Start creating a link (shift+drag), then click Clear Canvas mid-drag
- [ ] T.6. Clear canvas, refresh page, verify canvas remains empty
- [ ] T.7. Click Clear Canvas multiple times rapidly (verify no errors)
- [ ] T.8. Create nodes, clear canvas, create new nodes (verify functionality works)
- [ ] T.9. Test undo functionality still works after clearing (if applicable)
- [ ] T.10. Verify export functions still work after clearing canvas

## Integration Points

### Files Modified:
1. **`src/main/fsm.js`**: Add `clearCanvas()` function
2. **`www/index.html`**: Add UI button/link
3. **`build_fsm.py`**: No changes needed (auto-includes new function)

### Dependencies:
- Function depends on existing global variables: `nodes`, `links`, `selectedObject`, `currentLink`
- Function depends on existing functions: `draw()`, `saveBackup()`
- UI depends on existing CSS styling patterns

## Implementation Priority

### Phase 1: Core Functionality
1. Add `clearCanvas()` function to `src/main/fsm.js`
2. Add UI button to `www/index.html`
3. Test basic functionality

#### Implementation Checklist - Phase 1:
- [ ] P1.1. Complete Step 1 checklist (Add clearCanvas function)
- [ ] P1.2. Complete Step 2 checklist (Add UI button)
- [ ] P1.3. Complete Step 3 checklist (Visual design verification)
- [ ] P1.4. Complete Testing checklist (T.1 through T.10)
- [ ] P1.5. Start local development server (`python3 -m http.server 8000`)
- [ ] P1.6. Open browser to `http://localhost:8000`
- [ ] P1.7. Perform end-to-end testing of Clear Canvas functionality
- [ ] P1.8. Document any issues found during testing
- [ ] P1.9. Fix any bugs discovered
- [ ] P1.10. Commit changes to git repository

### Phase 2: Polish (Optional)
1. Add confirmation dialog for non-empty canvas
2. Add keyboard shortcut (e.g., Ctrl+Shift+C)
3. Add animation/transition effects

#### Implementation Checklist - Phase 2 (Optional):
- [ ] P2.1. Implement confirmation dialog when canvas has content
- [ ] P2.2. Add keyboard shortcut handling for Ctrl+Shift+C
- [ ] P2.3. Test keyboard shortcut across different browsers
- [ ] P2.4. Add fade-out animation for clearing (optional)
- [ ] P2.5. Update help text to include keyboard shortcut
- [ ] P2.6. Test all enhancements thoroughly
- [ ] P2.7. Update documentation if keyboard shortcut is added

## Risk Assessment

### Low Risk:
- Simple implementation following existing patterns
- No complex dependencies
- Easy to test and verify
- Minimal impact on existing functionality

### Mitigation:
- Function is self-contained and doesn't modify existing code
- Uses established patterns from export functions
- Preserves existing data persistence mechanisms

## Conclusion

This implementation follows the established architecture patterns and provides a clean, intuitive way for users to start fresh with their FSM design. The clear canvas functionality fits naturally into the existing UI and maintains consistency with the application's design principles.

## Implementation Summary Checklist

### Quick Start (Minimum Viable Feature):
- [ ] Complete Step 1: Add clearCanvas() function
- [ ] Complete Step 2: Add UI button  
- [ ] Complete Step 3: Verify visual design
- [ ] Complete basic testing (T.1, T.2, T.6)
- [ ] Build and deploy

### Full Implementation:
- [ ] Complete all Phase 1 checklist items (P1.1 - P1.10)
- [ ] Optionally complete Phase 2 checklist items (P2.1 - P2.7)

### Final Verification:
- [ ] All functionality works as expected
- [ ] No regressions in existing features
- [ ] Code follows project conventions
- [ ] Changes committed to version control
- [ ] Documentation updated if necessary

**Estimated Time**: 30-60 minutes for Phase 1, additional 30-60 minutes for Phase 2 enhancements.