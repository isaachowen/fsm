# Canvas Panning Implementation Plan

## Overview
Add viewport panning functionality to the FSM editor to enable navigation of large diagrams using right-click and drag. This will transform the static canvas into a navigable infinite workspace similar to Figma or Draw.io.

## Current Problem
- Canvas is static and constrained to browser window size
- No way to view nodes that extend beyond viewport boundaries
- Difficult to work with large state machines
- Poor user experience on smaller screens

## Solution: Viewport Transform System

### Core Architecture

#### 1. Viewport State Management
```javascript
var viewport = {
    x: 0,              // Pan offset X (world units)
    y: 0,              // Pan offset Y (world units)
    scale: 1,          // Zoom level (future enhancement)
    isPanning: false,  // Currently dragging viewport
    lastMouseX: 0,     // Last mouse position for delta calculation
    lastMouseY: 0,     // Last mouse position for delta calculation
    panStartX: 0,      // Mouse position when pan started
    panStartY: 0       // Mouse position when pan started
};
```

#### 2. Coordinate System Transformation
- **World Coordinates**: Where nodes actually exist (persistent)
- **Screen Coordinates**: What's visible on canvas (viewport-dependent)
- **Transformation**: screen = world * scale + offset

#### 3. Navigation Controls
- **Middle Mouse + Drag**: Primary panning method (implemented)
- **Left Mouse**: Object creation, selection, and manipulation (unchanged)
- **Right Mouse**: Available for future context menus
- **Home Key**: Reset viewport to origin (optional future enhancement)

## Implementation Phases

### Phase 1: Basic Viewport Infrastructure ✅ COMPLETED
**Goal**: Set up coordinate transformation system

**Status**: Successfully implemented with middle mouse button panning

**Changes Completed**:
1. ✅ Added viewport state variables to global scope
2. ✅ Created coordinate conversion functions (screenToWorld, worldToScreen)
3. ✅ Modified `drawUsing()` to apply viewport transform
4. ✅ Added helper functions (resetViewport, updateMouseCoordinates)

**Files to Modify**:
- `src/main/fsm.js`: Core viewport functionality

**Key Functions to Add**:
```javascript
function screenToWorld(screenX, screenY)
function worldToScreen(worldX, worldY)  
function updateMouseCoordinates(e)
function resetViewport()
```

### Phase 2: Middle Mouse Button Pan Controls ✅ COMPLETED
**Goal**: Implement middle mouse button drag panning

**Status**: Successfully implemented with smooth panning and visual feedback

**Changes Completed**:
1. ✅ Added middle mouse button detection (button === 1)
2. ✅ Implemented smooth pan drag logic with delta calculations
3. ✅ Added proper pan state transitions (start/update/stop)
4. ✅ Visual feedback with cursor changes ('grabbing' during pan)

**Event Flow**:
1. Middle mousedown → Start pan mode
2. Mouse move → Update viewport offset with smooth delta tracking
3. Middle mouseup → End pan mode
4. Cursor feedback indicates pan state

### Phase 3: Mouse Event Coordination ✅ COMPLETED
**Goal**: Ensure panning doesn't interfere with existing functionality

**Status**: Successfully implemented - all mouse interactions work correctly with viewport system

**Changes Completed**:
1. ✅ Updated all mouse event handlers to use world coordinates
2. ✅ Fixed double-click node creation coordinate transformation
3. ✅ Maintained existing left-click behavior (selection, dragging, link creation)
4. ✅ Proper isolation between panning and object manipulation

**Critical Considerations Addressed**:
- ✅ Pan events do not trigger node/link selection (early return in mousemove)
- ✅ Existing shift+click functionality preserved (uses world coordinates)
- ✅ Double-click node creation works correctly at cursor position after panning
- ✅ Object dragging remains smooth (uses world coordinates)
- ✅ Link creation and manipulation work accurately with viewport transforms

### Phase 4: Export + Import Compatibility
**Goal**: Ensure exports and imports work correctly with viewport transforms

The viewport system fundamentally changes how coordinates work in the application. When the user pans around, all drawing operations are transformed, but exports must capture the diagram in its "canonical" form - independent of the current viewport position.

**Core Challenge**: 
When the viewport is panned, the visual representation is offset from the actual node coordinates. Exports need to represent the logical diagram structure, not the current view.

**Changes Required**:

#### 1. Temporarily Reset Viewport for Exports
```javascript
function exportSafely(exportFunction) {
    // Save current viewport state
    var savedViewport = {
        x: viewport.x,
        y: viewport.y,
        scale: viewport.scale
    };
    
    // Reset to canonical view
    viewport.x = 0;
    viewport.y = 0;
    viewport.scale = 1;
    
    try {
        // Perform export with reset viewport
        var result = exportFunction();
        return result;
    } finally {
        // Restore viewport state
        viewport.x = savedViewport.x;
        viewport.y = savedViewport.y;
        viewport.scale = savedViewport.scale;
        draw(); // Redraw with restored viewport
    }
}
```

#### 2. Calculate Proper Bounds for SVG Export
Current SVG export may assume fixed canvas dimensions. With panning, we need to:
- Calculate the actual bounding box of all diagram elements
- Determine minimum SVG viewBox to contain all content
- Handle cases where diagram extends beyond original canvas size

```javascript
function calculateDiagramBounds() {
    var bounds = {
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity
    };
    
    // Check all nodes
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        bounds.minX = Math.min(bounds.minX, node.x - nodeRadius);
        bounds.minY = Math.min(bounds.minY, node.y - nodeRadius);
        bounds.maxX = Math.max(bounds.maxX, node.x + nodeRadius);
        bounds.maxY = Math.max(bounds.maxY, node.y + nodeRadius);
    }
    
    // Check all links (for curved paths that extend beyond nodes)
    for (var i = 0; i < links.length; i++) {
        var link = links[i];
        // Calculate link path bounds including curves and arrows
        var linkBounds = calculateLinkBounds(link);
        bounds.minX = Math.min(bounds.minX, linkBounds.minX);
        bounds.minY = Math.min(bounds.minY, linkBounds.minY);
        bounds.maxX = Math.max(bounds.maxX, linkBounds.maxX);
        bounds.maxY = Math.max(bounds.maxY, linkBounds.maxY);
    }
    
    return bounds;
}
```

#### 3. PNG Export Considerations
PNG export captures the canvas as currently rendered. Options:
- **Option A**: Temporarily resize canvas to fit entire diagram
- **Option B**: Export current viewport only (what user sees)
- **Option C**: Export with viewport reset (canonical view)

**Recommended**: Option C for consistency with other exports

```javascript
function exportAsPNG() {
    return exportSafely(function() {
        // Ensure canvas shows complete diagram
        var bounds = calculateDiagramBounds();
        var margin = 20;
        
        // Temporarily adjust canvas if needed
        var originalWidth = canvas.width;
        var originalHeight = canvas.height;
        
        var requiredWidth = bounds.maxX - bounds.minX + 2 * margin;
        var requiredHeight = bounds.maxY - bounds.minY + 2 * margin;
        
        if (requiredWidth > canvas.width || requiredHeight > canvas.height) {
            canvas.width = Math.max(canvas.width, requiredWidth);
            canvas.height = Math.max(canvas.height, requiredHeight);
            
            // Adjust viewport to center diagram
            viewport.x = margin - bounds.minX;
            viewport.y = margin - bounds.minY;
        }
        
        draw();
        var dataURL = canvas.toDataURL('image/png');
        
        // Restore original canvas size
        canvas.width = originalWidth;
        canvas.height = originalHeight;
        
        return dataURL;
    });
}
```

#### 4. Import JSON Compatibility
When importing saved FSM files, ensure imported coordinates work correctly with the viewport system:

```javascript
function importFromJSON(jsonData) {
    // Parse and load diagram as usual
    var data = JSON.parse(jsonData);
    loadDiagram(data);
    
    // Optionally: Auto-fit viewport to show imported content
    if (data.nodes && data.nodes.length > 0) {
        fitViewportToContent();
    }
}

function fitViewportToContent() {
    var bounds = calculateDiagramBounds();
    var margin = 50;
    
    // Calculate scale to fit content in current canvas
    var contentWidth = bounds.maxX - bounds.minX + 2 * margin;
    var contentHeight = bounds.maxY - bounds.minY + 2 * margin;
    
    var scaleX = canvas.width / contentWidth;
    var scaleY = canvas.height / contentHeight;
    viewport.scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%
    
    // Center the content
    viewport.x = (canvas.width - contentWidth * viewport.scale) / 2 - bounds.minX * viewport.scale + margin * viewport.scale;
    viewport.y = (canvas.height - contentHeight * viewport.scale) / 2 - bounds.minY * viewport.scale + margin * viewport.scale;
    
    draw();
}
```

#### 5. LaTeX Export Modifications
LaTeX export coordinates are logical and shouldn't need major changes, but verify:
- Node positions export correctly regardless of viewport
- Link paths maintain accuracy
- Text positioning remains consistent

**Testing Requirements**:
- Export diagrams at various viewport positions
- Verify imported diagrams load in correct positions
- Test with diagrams larger than canvas
- Confirm exports match original diagram structure
- Test round-trip: export → import → export consistency

### Phase 5: Polish & Optimization
**Goal**: Smooth user experience and performance

**Changes Required**:
1. Add visual feedback for panning
2. Implement smooth viewport transitions
3. Add viewport bounds (optional)
4. Performance optimization for large diagrams

## Technical Implementation Details

### Mouse Event Handler Modifications

#### Current Structure
```javascript
canvas.onmousedown = function(e) {
    var mouse = crossBrowserRelativeMousePos(e);
    selectedObject = selectObject(mouse.x, mouse.y);
    // ... existing logic
};
```

#### New Structure
```javascript
canvas.onmousedown = function(e) {
    var screenMouse = crossBrowserRelativeMousePos(e);
    
    // Check for right-click panning
    if (e.button === 2) { // Right mouse button
        startPanning(screenMouse.x, screenMouse.y);
        return false; // Prevent context menu
    }
    
    // Convert to world coordinates for object interaction
    var worldMouse = screenToWorld(screenMouse.x, screenMouse.y);
    selectedObject = selectObject(worldMouse.x, worldMouse.y);
    // ... existing logic with worldMouse
};
```

### Core Transformation Functions

```javascript
function screenToWorld(screenX, screenY) {
    return {
        x: (screenX - viewport.x) / viewport.scale,
        y: (screenY - viewport.y) / viewport.scale
    };
}

function worldToScreen(worldX, worldY) {
    return {
        x: worldX * viewport.scale + viewport.x,
        y: worldY * viewport.scale + viewport.y
    };
}

function applyViewportTransform(context) {
    context.save();
    context.translate(viewport.x, viewport.y);
    context.scale(viewport.scale, viewport.scale);
}

function restoreViewportTransform(context) {
    context.restore();
}
```

### Panning Logic

```javascript
function startPanning(mouseX, mouseY) {
    viewport.isPanning = true;
    viewport.panStartX = viewport.lastMouseX = mouseX;
    viewport.panStartY = viewport.lastMouseY = mouseY;
    canvas.style.cursor = 'grabbing';
}

function updatePanning(mouseX, mouseY) {
    if (!viewport.isPanning) return;
    
    var deltaX = mouseX - viewport.lastMouseX;
    var deltaY = mouseY - viewport.lastMouseY;
    
    viewport.x += deltaX;
    viewport.y += deltaY;
    
    viewport.lastMouseX = mouseX;
    viewport.lastMouseY = mouseY;
    
    draw(); // Redraw with new viewport
}

function stopPanning() {
    viewport.isPanning = false;
    canvas.style.cursor = 'default';
}
```

## Context Menu Prevention

```javascript
canvas.oncontextmenu = function(e) {
    // Prevent context menu if we panned
    var panDistance = Math.sqrt(
        Math.pow(viewport.lastMouseX - viewport.panStartX, 2) +
        Math.pow(viewport.lastMouseY - viewport.panStartY, 2)
    );
    
    if (panDistance > 5) { // 5px threshold
        return false; // Prevent context menu
    }
    
    return true; // Allow context menu for stationary right-clicks
};
```

## Integration Points

### Drawing System
- Modify `drawUsing()` function to apply viewport transform
- Ensure all drawing operations work in world coordinates
- Update text rendering positions

### Object Selection
- Convert all selection logic to use world coordinates
- Update `selectObject()` function
- Maintain hit testing accuracy

### Node/Link Manipulation
- Update node dragging to work with transformed coordinates
- Ensure link creation works correctly
- Maintain snapping functionality

### Export Functions
- Temporarily reset viewport for exports
- Calculate proper content bounds
- Ensure consistent output regardless of viewport position

## User Experience Considerations

### Visual Feedback
- Change cursor to indicate pan mode
- Optional: Add subtle viewport indicator
- Smooth transitions for better feel

### Performance
- Efficient redrawing during pan operations
- Minimize coordinate conversions
- Optimize for large diagrams

### Accessibility
- Maintain keyboard navigation
- Provide alternative navigation methods
- Clear visual indicators for current viewport

## Testing Strategy

### Unit Tests
- Coordinate conversion accuracy
- Viewport state management
- Export functionality preservation

### Integration Tests  
- Mouse event coordination
- Object interaction accuracy
- Cross-browser compatibility

### User Testing
- Intuitive navigation behavior
- Performance with large diagrams
- No regression in existing features

## Future Enhancements

### Zoom Functionality
- Mouse wheel zoom in/out
- Zoom to fit all nodes
- Zoom to selection

### Advanced Navigation
- Minimap overview
- Viewport history (back/forward)
- Bookmarked viewport positions

### Touch Support
- Two-finger pan on touch devices
- Pinch-to-zoom gesture
- Touch-friendly controls

## Risk Mitigation

### Compatibility Risks
- **Risk**: Breaking existing mouse interactions
- **Mitigation**: Thorough testing of all interaction modes
- **Fallback**: Feature flag to disable panning

### Performance Risks
- **Risk**: Sluggish panning on large diagrams
- **Mitigation**: Optimize drawing pipeline, debounce updates
- **Fallback**: Viewport bounds limiting

### User Experience Risks
- **Risk**: Confusing navigation model
- **Mitigation**: Consistent with industry standards (right-click drag)
- **Fallback**: Multiple navigation options

## Success Metrics

1. **Functionality**: All existing features work with panning enabled
2. **Performance**: Smooth panning at 60fps on target devices
3. **Usability**: Users can navigate large diagrams intuitively
4. **Compatibility**: Works across all supported browsers
5. **Exports**: All export formats maintain quality and accuracy

## Conclusion

This implementation will significantly enhance the FSM editor's usability by providing professional-grade navigation capabilities. The phased approach ensures stability while the right-click drag paradigm follows established UX patterns from popular design tools.

The viewport transform system creates a solid foundation for future enhancements like zooming and touch support, making this a valuable long-term investment in the application's user experience.