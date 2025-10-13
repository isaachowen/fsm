# Export System Purge Plan
*Created: October 12, 2025*

## Overview

This document outlines a plan to remove the unused PNG, SVG, and LaTeX export functionality from the FSM codebase while preserving the JSON import/export system that is actively used in the UI.

## Current State Analysis

### What Exists Currently

#### Export Systems to Remove:
1. **PNG Export** (`src/main/fsm.js` lines 771-798)
   - `saveAsPNG()` function
   - Canvas toDataURL() based implementation
   - Automatic blob download functionality

2. **SVG Export** (`src/export_as/svg.js` - 94 lines)
   - Complete `ExportAsSVG` class
   - Canvas2D API mimicry pattern
   - `saveAsSVG()` function in `src/main/fsm.js` (lines 799-810)

3. **LaTeX Export** (`src/export_as/latex.js`)
   - Complete `ExportAsLaTeX` class
   - TikZ/PGF code generation
   - `saveAsLaTeX()` function in `src/main/fsm.js` (lines 811+)

#### Dependencies to Preserve:
1. **LaTeX Text Processing** (`src/main/fsm.js` lines 3-25)
   - `convertLatexShortcuts()` function
   - Used by `drawText()` for rendering Greek letters and mathematical notation
   - **CRITICAL**: This is used for text display, not just export

2. **JSON Export/Import** (Active UI Integration)
   - `downloadAsJSON()` function (lines 941+)
   - `importFromJSON()` function (lines 1030+)
   - UI controls in `index.html` (lines 246-248)
   - Custom filename functionality

## Purge Plan

### Phase 1: Remove Export Classes
**Target Files:**
- `src/export_as/svg.js` - **DELETE ENTIRE FILE**
- `src/export_as/latex.js` - **DELETE ENTIRE FILE**
- `src/export_as/` directory - **DELETE IF EMPTY**

**Impact:**
- Reduces build size by ~200+ lines of code
- Eliminates Canvas2D API mimicry pattern complexity
- Removes unused object instantiation

### Phase 2: Remove Export Functions from Main Controller
**Target File:** `src/main/fsm.js`

**Functions to Remove:**
1. `saveAsPNG()` (lines 771-798)
2. `saveAsSVG()` (lines 799-810) 
3. `saveAsLaTeX()` (lines 811+)

**Dependencies to Check:**
- Ensure no UI buttons call these functions
- Verify no keyboard shortcuts reference them
- Check for any event listeners

### Phase 3: Clean Up Dependencies
**Target File:** `src/main/fsm.js`

**Functions to Preserve:**
- `convertLatexShortcuts()` - **KEEP** (used by text rendering)
- `textToXML()` - **EVALUATE** (may only be used by removed exporters)
- `output()` function - **EVALUATE** (may only be used by SVG/LaTeX)

**Mathematical Utilities to Keep:**
- All functions in `src/main/math.js` - **KEEP** (core geometry)
- `drawText()`, `drawArrow()` - **KEEP** (core rendering)

### Phase 4: Update Build System
**Target File:** `build_fsm.py`

**Changes:**
- Verify build still works after file removal
- Confirm reduced output size in `built-fsm.js`
- No changes needed to build script (auto-discovers source files)

### Phase 5: Verification Steps
1. **UI Functionality:**
   - Verify JSON export/import works correctly
   - Test custom filename functionality
   - Confirm canvas drawing/editing unaffected

2. **Code Quality:**
   - Check for any remaining references to removed classes
   - Verify no broken function calls
   - Test that LaTeX shortcuts still work in text rendering

3. **Build Process:**
   - Confirm successful build after file removal
   - Verify smaller `built-fsm.js` output
   - Test deployment still works

## Risk Assessment

### Low Risk Items:
- **Export class removal**: No UI integration found
- **Export function removal**: No button handlers found
- **File system cleanup**: Standard file operations

### Medium Risk Items:
- **`textToXML()` function**: May be used by core text rendering (needs investigation)
- **`output()` function**: May have other uses beyond removed exporters

### High Risk Items:
- **`convertLatexShortcuts()`**: Definitely used by core text rendering - **MUST PRESERVE**

## Implementation Order

### Step 1: Investigate Dependencies
```bash
# Search for usage of helper functions
grep -r "textToXML\|output(" src/
grep -r "convertLatexShortcuts" src/
```

### Step 2: Remove Export Classes
```bash
rm src/export_as/svg.js
rm src/export_as/latex.js
rmdir src/export_as  # if empty
```

### Step 3: Remove Export Functions
- Delete `saveAsPNG()`, `saveAsSVG()`, `saveAsLaTeX()` from `src/main/fsm.js`
- Remove any helper functions only used by these exports
- Preserve `convertLatexShortcuts()` and any functions used by core rendering

### Step 4: Build and Test
```bash
python3 build_fsm.py
# Test in browser
```

### Step 5: Clean Up Unused Dependencies
- Remove any orphaned utility functions
- Update any comments referencing removed functionality

## Expected Outcomes

### File Reduction:
- Remove ~200+ lines of SVG export code
- Remove ~150+ lines of LaTeX export code  
- Remove ~50+ lines of PNG export code
- Total: ~400+ lines of code removed

### Complexity Reduction:
- Eliminate Canvas2D API abstraction pattern
- Remove multiple export format maintenance burden
- Simplify codebase to single import/export format (JSON)
- Cleaner separation of concerns

### Preserved Functionality:
- JSON import/export with custom filenames ✓
- LaTeX shortcuts in text rendering ✓  
- All core canvas drawing and editing ✓
- All node shapes and colors ✓
- Viewport and multi-selection features ✓

This purge will significantly simplify the codebase while preserving all actively used functionality. The JSON import/export provides a complete data persistence solution without the complexity of multiple visual export formats.