# Dynamic Legend Implementation Plan

## Overview
Implement a persistent, dynamic legend box in the top-right corner of the browser canvas that displays all unique node type combinations (color + shape) with editable text descriptions.

## Requirements
- **Location**: Top-right corner of the browser canvas
- **Content**: Vertical list of unique node type combinations (color + shape)
- **Interactive elements**: Each legend entry has:
  - Visual representation of the node (actual color and shape)
  - Editable text box for user descriptions
- **Dynamic behavior**: 
  - New entries appear when new color/shape combinations are created
  - Entries disappear when all nodes of that type are deleted
  - Text boxes start blank and are user-fillable
- **Note**: Persistence functionality excluded for now

## Implementation Tasks

### Phase 1: Analysis & Data Structures
1. **Analyze current codebase structure**
   - Examine fsm.js to understand the main rendering loop, canvas management, and where to integrate the legend system
   - Look at how nodes are stored and tracked in the `nodes` array
   - Understand the existing draw() and drawUsing() functions

2. **Design legend data structures**
   - Create data structures to track unique node type combinations (color + shape) and their associated text descriptions
   - Design efficient lookup and update mechanisms
   - Plan for `legendEntries` object structure

### Phase 2: Core Legend System
3. **Implement legend detection system**
   - Create functions to scan existing nodes and identify unique color/shape combinations
   - Handle dynamic updates when nodes are added/removed
   - Implement `updateLegendEntries()` function

4. **Create legend rendering system**
   - Implement canvas-based rendering for the legend box in top-right corner
   - Draw miniature node representations using existing node drawing methods
   - Position text input areas appropriately
   - Create `drawLegend()` function

### Phase 3: Interactive Elements
5. **Add HTML text input overlays**
   - Create positioned HTML input elements that overlay the canvas for editable text descriptions
   - Handle proper positioning and styling
   - Manage dynamic creation/removal of input elements

6. **Handle legend interactions**
   - Implement mouse event handling for legend area to prevent interference with main canvas interactions
   - Manage focus states for text inputs
   - Ensure legend area doesn't interfere with canvas pan/zoom

### Phase 4: Integration
7. **Integrate legend with main render loop**
   - Add legend rendering to the main draw() function
   - Ensure it updates properly with viewport changes and canvas redraws
   - Handle proper positioning relative to canvas viewport

8. **Add dynamic update triggers**
   - Hook into node creation/deletion events to automatically update legend entries
   - Ensure legend updates when nodes change color/shape
   - Integrate with existing node manipulation workflows

### Phase 5: Polish & Testing
9. **Style and position legend box**
   - Implement proper CSS styling for the legend container, background, borders
   - Ensure responsive positioning in top-right corner
   - Handle different screen sizes and canvas dimensions

10. **Test legend functionality**
    - Comprehensive testing of legend behavior: creating/deleting nodes
    - Test changing node properties and text input functionality
    - Test edge cases (no nodes, many node types, etc.)

## Technical Architecture

### Legend Data Manager
- Track unique color/shape combinations in `legendEntries` object
- Generate unique keys for node type combinations
- Maintain mapping between node types and user descriptions

### Legend Renderer
- Draw legend box in top-right corner using canvas API
- Render miniature node representations using existing node drawing code
- Handle proper positioning and sizing

### Text Input Overlay System
- Create HTML input elements positioned over canvas
- Manage dynamic creation/removal based on legend entries
- Handle styling and focus management

## Integration Points
- **Main Render Loop**: Add `drawLegend()` call to `drawUsing()` function
- **Node Management**: Hook `updateLegendEntries()` into node creation/deletion/modification events
- **HTML Structure**: Add legend container div to `index.html`
- **Event Handling**: Extend mouse event handling to manage legend area interactions

## Example Legend Entry Structure
```javascript
legendEntries = {
  "yellow_dot": {
    color: "yellow",
    shape: "dot", 
    description: "User nodes",
    count: 3
  },
  "red_triangle": {
    color: "red",
    shape: "triangle",
    description: "Combat units", 
    count: 1
  }
}
```

This modular approach maintains compatibility with the existing simplified architecture while adding powerful legend functionality.