# Feature Request: Copy/Paste Functionality for Nodes

## Overview
Implement clipboard-based copy/paste functionality (Cmd+C/Cmd+V) for FSM nodes and their connecting edges. Users should be able to copy single nodes or multiple selected nodes, with automatic preservation of internal connections and smart positioning of pasted elements.

## Example: Before and After

### Before Copy/Paste

**Canvas State:**
- Node "abc" (blue) at position (500, 500)
- Node "def" (white) at position (1000, 1000)
- Node "hij" (yellow) at position (750, 250) - unconnected
- Link: "abc" → "def" (directed edge from abc to def)
- Self-loop: "def" → "def" (self-directed edge on def)

```
Canvas:
    [hij]
    (yellow, unconnected)
    750, 250

                [abc] ────────→ [def] ⟲
                (blue)         (white)
                500, 500       1000, 1000
```

**User Action:**
1. User drag-selects nodes "abc" and "def" (multiselect)
2. Presses Cmd+C to copy
3. Presses Cmd+V to paste

### After Copy/Paste

**Canvas State:**
- **Original nodes (unchanged):**
  - Node "abc" (blue) at position (500, 500)
  - Node "def" (white) at position (1000, 1000)
  - Node "hij" (yellow) at position (750, 250) - unconnected
  - Link: "abc" → "def"
  - Self-loop: "def" → "def"

- **New pasted nodes:**
  - Node "abc" (blue) at position (600, 600) - offset by (+100, +100)
  - Node "def" (white) at position (1100, 1100) - offset by (+100, +100)
  - Link: new "abc" → new "def" (internal edge preserved)
  - Self-loop: new "def" → new "def" (self-loop preserved)

```
Canvas:
    [hij]
    (yellow, unconnected)
    750, 250

                [abc] ────────→ [def] ⟲
                (blue)         (white)
                500, 500       1000, 1000
                  
                       [abc] ────────→ [def] ⟲
                       (blue)         (white)
                       600, 600       1100, 1100
                       (newly pasted, selected)
```

**Key Observations:**
- ✅ The two selected nodes were copied with their internal link preserved
- ✅ The self-loop on "def" was duplicated on the new "def"
- ✅ The spatial relationship between "abc" and "def" is preserved (500 pixels apart horizontally and vertically in both original and copy)
- ✅ Both new nodes are offset by exactly (+100, +100) pixels
- ✅ Node "hij" was NOT copied (not part of the selection)
- ✅ The newly pasted nodes become the active multiselection

## Feature Scope

### Single Node Copy/Paste

**Trigger**: 
- Select a node (single-click)
- Press Cmd+C (macOS) to copy
- Press Cmd+V (macOS) to paste

**Behavior**:
- A new node is created as an exact copy of the original (same text, color, and shape properties, but new node id)
- The pasted node is positioned with a consistent offset from the original:
  - X offset: +100 pixels
  - Y offset: +100 pixels
- The pasted node becomes immediately selected after pasting
- No edges are copied when copying a single node (edges require both endpoints)

### Multi-Node Copy/Paste

**Trigger**:
- Drag-select multiple nodes using the multiselect box
- Enter multiselect mode with multiple nodes selected
- Press Cmd+C (macOS) to copy
- Press Cmd+V (macOS) to paste

**Behavior**:
- All selected nodes are copied with their properties (text, color, shape are copied, new node id)
- **Relative positioning is preserved**: The spatial relationships between copied nodes remain identical
- All nodes are offset by a consistent amount:
  - X offset: +100 pixels
  - Y offset: +100 pixels
- **Internal edges are preserved**: Any edges connecting two nodes within the copied set are duplicated
- **External edges are NOT copied**: Edges connecting copied nodes to non-copied nodes are ignored
- After pasting, the newly pasted nodes become the new selection (entering multiselect mode with the pasted nodes)

### Edge Handling Rules

1. **Self-loops**: If a node with a self-loop is copied, the self-loop is duplicated on the pasted node
2. **Internal links**: If nodes A and B are both selected and copied, and there's a link from A→B, the pasted copies A' and B' will have a link A'→B'
3. **External links**: If node A is selected but node C is not, and there's a link A→C, this link is NOT copied to the pasted node A'
4. **Bidirectional links**: If nodes A and B have links in both directions (A→B and B→A), both links are preserved in the copies
5. **Link properties**: Copied links maintain all properties:
   - Text labels
   - Arrow type (arrow vs T-arrow)
   - Color
   - Curvature (parallelPart and perpendicularPart)

### Clipboard State Management

**Copy Operation**:
- Store a clipboard object containing:
  - Array of node data (x, y, text, color, shape)
  - Array of link data (nodeA index, nodeB index, text, arrowType, color, curvature)
  - Bounding box of the copied selection (for calculating offset)
- Clipboard persists across operations (can paste multiple times)
- New copy operation overwrites previous clipboard contents

**Paste Operation**:
- Can paste multiple times from a single copy operation
- Each paste creates new independent instances
- Pasted elements are positioned relative to the original copied selection

## Technical Implementation Details

### Data Structure

```javascript
var clipboard = {
    nodes: [
        { x, y, text, color, shape, ... },
        // ... additional nodes
    ],
    links: [
        { 
            nodeAIndex: 0,  // Index in clipboard.nodes array
            nodeBIndex: 1,  // Index in clipboard.nodes array
            text,
            arrowType,
            color,
            parallelPart,
            perpendicularPart,
            // ... additional link properties
        },
        // ... additional links
    ],
    selfLinks: [
        {
            nodeIndex: 0,  // Index in clipboard.nodes array
            anchorAngle,
            text,
            arrowType,
            color,
            // ... additional self-link properties
        },
        // ... additional self-links
    ],
    startLinks: [
        {
            nodeIndex: 0,  // Index in clipboard.nodes array
            deltaX,
            deltaY,
            text,
            // ... additional start-link properties
        }
        // ... additional start-links
    ]
};
```

### Integration Points

1. **Keyboard Event Handler** (`document.onkeydown`):
   - Add Cmd+C / Ctrl+C detection (key code 67)
   - Add Cmd+V / Ctrl+V detection (key code 86)
   - Check for appropriate selection state before executing

2. **InteractionManager**:
   - Add `canCopy()` method - returns true if in 'selection' mode or 'multiselect' mode
   - Add `canPaste()` method - returns true if clipboard has content

3. **Selection System**:
   - Use existing `InteractionManager.getSelectedObject()` for single node copy
   - Use existing `selectedNodes` array for multi-node copy

4. **Node Creation**:
   - Reuse existing Node constructor: `new Node(x, y, color)`
   - Set properties (text, shape) after creation

5. **Link Creation**:
   - Reuse existing Link constructors:
     - `new Link(nodeA, nodeB)`
     - `new SelfLink(node, mouse)`
     - `new StartLink(node, mouse)`
   - Set properties (text, arrowType, color, curvature) after creation

6. **History Integration** (if undo/redo exists):
   - Paste operation should be recorded as a single undoable action
   - Should capture state after paste completes

## User Experience Requirements

### Visual Feedback
- No special visual feedback needed during copy (standard Cmd+C behavior)
- After paste:
  - Newly pasted nodes should be immediately selected
  - Selection glow should indicate which nodes were just pasted
  - If multiselect, all pasted nodes should show multiselect glow

### Keyboard Shortcuts
- **Copy**: Cmd+C (macOS) / Ctrl+C (Windows/Linux)
- **Paste**: Cmd+V (macOS) / Ctrl+V (Windows/Linux)
- Standard modifier key detection: `e.metaKey` (macOS) or `e.ctrlKey` (Windows/Linux)

### Edge Cases
- **Empty selection**: Copy operation has no effect if nothing is selected
- **Canvas mode**: Copy/paste should not work in canvas mode (no selection)
- **Text editing mode**: Copy/paste should work with text content (standard text editing), not node copying
- **Mixed selection**: Only nodes can be copied; if edges are selected without nodes, copy has no effect
- **Paste without copy**: Paste has no effect if clipboard is empty
- **Viewport boundaries**: Pasted nodes may appear outside viewport; user can pan to find them

## Success Criteria

- ✅ Single node can be copied and pasted with Cmd+C / Cmd+V
- ✅ Pasted single node appears offset by (+100, +100) pixels
- ✅ Multiple nodes can be copied together in multiselect mode
- ✅ Spatial relationships between copied nodes are preserved
- ✅ Internal edges between copied nodes are duplicated
- ✅ External edges to non-copied nodes are NOT included
- ✅ Self-loops are preserved on copied nodes
- ✅ All node properties (text, color, shape) are preserved
- ✅ All link properties (text, arrowType, color, curvature) are preserved
- ✅ Pasted elements become the new selection
- ✅ Can paste multiple times from a single copy operation
- ✅ Works with both Cmd (macOS) and Ctrl (Windows/Linux) modifiers
- ✅ No interference with text editing copy/paste

## Scope Boundaries

### In Scope:
- Copy/paste for nodes in selection and multiselect modes
- Preservation of node properties (text, color, shape)
- Preservation of link properties (text, arrowType, color, curvature)
- Edge duplication for internal connections
- Smart positioning with consistent offset
- Support for self-loops and start links
- Keyboard shortcut integration (Cmd+C/V, Ctrl+C/V)
- Multiple paste operations from single copy

### Out of Scope:
- Cross-document clipboard (copy from one FSM, paste into another)
- System clipboard integration (copying to other applications)
- Clipboard persistence across page reloads
- Clipboard history or multiple clipboard slots
- Paste at mouse cursor position
- Smart placement to avoid overlapping existing nodes
- Visual preview during paste operation
- Copy/paste for canvas background or viewport settings
- Clipboard format versioning or migration
- Undo/redo integration (handled separately if needed)

## Implementation Notes

### Offset Strategy
The consistent 100-pixel offset in both X and Y directions:
- Makes pasted nodes immediately visible and distinguishable from originals
- Prevents complete overlap (which would be confusing)
- Is predictable and easy for users to understand
- Works well with typical node sizes (~40-60 pixel diameter)
- Can be adjusted if user testing suggests different values

### Index Mapping
When copying links, use array indices to reference nodes:
- During copy: Build index mapping from original nodes to clipboard indices
- During paste: Create new index mapping from clipboard indices to new node instances
- This approach is more robust than tracking object references

### Performance Considerations
- For typical FSMs (< 100 nodes), performance should not be an issue
- Clipboard object is lightweight (plain JavaScript objects)
- No deep cloning needed during copy (reconstruct during paste)
- Link validation happens naturally during paste (indices will be valid)
