# Feature Request: Node Editing Modes

## Overview
Implement a three-state interaction system for node editing that separates canvas focus, node selection/appearance editing, and text editing into distinct modes with clear transitions.

## Feature Flag
This feature should be implemented behind a boolean feature flag called `ui_flow_v2`. When the flag is:
- `true`: The new three-state interaction system is active
- `false`: The existing interaction behavior is preserved

This allows for safe testing and gradual rollout of the new interaction model.

## Feature Scope

### Three Interaction Modes

1. **Canvas Focus Mode (Default State)**
   - No nodes or edges are selected
   - This is the baseline state when nothing is selected

2. **Node/Edge Selection Mode (Appearance Editing)**
   - Triggered by single-clicking a node or edge
   - User can drag and move nodes/edges as currently implemented
   - User can modify node appearance (shape and color) using keyboard shortcuts
   - Text editing is NOT available in this mode
   - Node remains visually selected/highlighted

3. **Text Editing Mode**
   - Triggered by double-clicking a node or edge
   - User can edit the text content of the selected element
   - All other interactions are disabled while in text editing mode

### State Transitions

#### From Canvas Focus Mode:
- Single-click node/edge → Node/Edge Selection Mode
- Double-click node/edge → Text Editing Mode (skip selection mode)

#### From Node/Edge Selection Mode:
- Click canvas → Canvas Focus Mode
- Hit Escape → Canvas Focus Mode
- Single-click different node/edge → Node/Edge Selection Mode (for new element)
- Double-click same node/edge → Text Editing Mode

#### From Text Editing Mode:
- Hit Escape → Node/Edge Selection Mode (return to selection of same element)
- Click canvas → Canvas Focus Mode
- Single-click different node/edge → Node/Edge Selection Mode (for new element)

### User Experience Requirements

- Clear visual feedback for each mode (highlighting, cursor changes, etc.)
- Keyboard shortcuts for shape/color changes only work in Selection Mode
- Text editing interface only appears in Text Editing Mode
- Drag functionality preserved in Selection Mode
- Smooth transitions between modes without jarring UI changes

## Scope Boundaries

### In Scope:
- Implementation of `ui_flow_v2` feature flag
- Three distinct interaction modes as described
- State transitions between modes
- Visual feedback for current mode
- Keyboard shortcuts for appearance editing in Selection Mode
- Text editing interface in Text Editing Mode
- Preservation of existing drag functionality
- Fallback to existing behavior when feature flag is disabled

### Out of Scope:
- Changes to existing drawing/creation of new nodes
- Modifications to link/edge creation workflow
- Changes to canvas panning or zooming
- Bulk selection or multi-node operations
- Undo/redo functionality changes
- Save/load format modifications
- Performance optimizations unrelated to mode switching

## Success Criteria

- Feature flag `ui_flow_v2` can be toggled without breaking existing functionality
- When flag is disabled, all existing behavior remains unchanged
- When flag is enabled:
  - User can clearly distinguish between the three modes
  - Mode transitions work as specified in the state diagram
  - Existing functionality (drag, keyboard shortcuts, text editing) is preserved but properly scoped to appropriate modes
  - No accidental text editing when user intends to move nodes
  - No accidental node movement when user intends to edit text