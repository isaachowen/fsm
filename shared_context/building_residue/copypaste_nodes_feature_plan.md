# Implementation Plan: Copy/Paste Functionality for Nodes

## Overview
This document outlines the technical implementation plan for the copy/paste functionality described in [copypaste_nodes_feature_requirements.md](./copypaste_nodes_feature_requirements.md). The feature enables users to copy and paste FSM nodes with Cmd+C/Cmd+V (or Ctrl+C/Ctrl+V on Windows/Linux), preserving internal connections and positioning pasted elements with a consistent offset.

## Reference Documents
- **Feature Requirements**: [copypaste_nodes_feature_requirements.md](./copypaste_nodes_feature_requirements.md)
- **Key Example**: See "Example: Before and After" section in requirements doc for visual reference

## Architecture Analysis

### Current System Components

**Selection System:**
- **`InteractionManager.getSelected()`**: Tracks single object selection (nodes, links, self-links, start-links)
- **`selectedNodes` array**: Tracks multiple node selection in multiselect mode
- **Selection modes**: `'canvas'`, `'selection'`, `'editing_text'`, `'multiselect'`

**Node and Link Arrays:**
- **`nodes` array**: Global array of all Node instances
- **`links` array**: Global array of all Link instances (between two different nodes)
- **SelfLink instances**: Referenced through links array, attached to single nodes
- **StartLink instances**: Referenced through links array, entry point indicators

**Key Data Structures:**
- **Node**: `{ x, y, text, color, shape, ... }`
- **Link**: `{ nodeA, nodeB, text, arrowType, color, parallelPart, perpendicularPart, ... }`
- **SelfLink**: `{ node, anchorAngle, text, arrowType, color, ... }`
- **StartLink**: `{ node, deltaX, deltaY, text, ... }`

## Implementation Strategy

### Phase 1: Clipboard Data Structure and Copy Operation

#### 1.1 Create Clipboard Module
**File**: `src/main/fsm.js` (add after `selectedNodes` declaration around line 821)

```javascript
// =============================================================================
// CLIPBOARD SYSTEM - Copy/Paste for Nodes
// =============================================================================

var clipboard = {
    nodes: [],      // Array of node data: { x, y, text, color, shape, ... }
    links: [],      // Array of link data: { nodeAIndex, nodeBIndex, text, arrowType, color, ... }
    selfLinks: [],  // Array of self-link data: { nodeIndex, anchorAngle, text, arrowType, color, ... }
    startLinks: [], // Array of start-link data: { nodeIndex, deltaX, deltaY, text, ... }
    isEmpty: function() {
        return this.nodes.length === 0;
    },
    clear: function() {
        this.nodes = [];
        this.links = [];
        this.selfLinks = [];
        this.startLinks = [];
    }
};

/**
 * copyNodesToClipboard - Copies selected nodes and their internal connections to clipboard
 * 
 * @param {Array} nodesToCopy - Array of Node instances to copy
 * 
 * Called by:
 * - document.onkeydown when Cmd+C / Ctrl+C is pressed
 * 
 * Purpose: Serializes selected nodes and their connecting edges to clipboard object.
 * Only copies edges where both endpoints are in the selection (internal edges).
 */
function copyNodesToClipboard(nodesToCopy) {
    // Clear previous clipboard contents
    clipboard.clear();
    
    // Validate input
    if (!nodesToCopy || nodesToCopy.length === 0) {
        console.log('No nodes to copy');
        return;
    }
    
    console.log('📋 Copying', nodesToCopy.length, 'node(s) to clipboard');
    
    // Step 1: Copy node data and build index mapping
    var nodeIndexMap = new Map(); // Maps original Node instance -> clipboard index
    
    for (var i = 0; i < nodesToCopy.length; i++) {
        var node = nodesToCopy[i];
        nodeIndexMap.set(node, i);
        
        // Copy node properties
        clipboard.nodes.push({
            x: node.x,
            y: node.y,
            text: node.text,
            color: node.color,
            shape: node.shape || 'circle' // Default shape if not set
        });
    }
    
    // Step 2: Copy links (only internal ones where both nodes are in selection)
    for (var i = 0; i < links.length; i++) {
        var link = links[i];
        
        // Check if it's a regular Link between two nodes
        if (link.nodeA && link.nodeB) {
            var nodeAIndex = nodeIndexMap.get(link.nodeA);
            var nodeBIndex = nodeIndexMap.get(link.nodeB);
            
            // Only copy if both nodes are in the selection (internal edge)
            if (nodeAIndex !== undefined && nodeBIndex !== undefined) {
                clipboard.links.push({
                    nodeAIndex: nodeAIndex,
                    nodeBIndex: nodeBIndex,
                    text: link.text,
                    arrowType: link.arrowType || 'arrow',
                    color: link.color || 'gray',
                    parallelPart: link.parallelPart,
                    perpendicularPart: link.perpendicularPart,
                    lineAngleAdjust: link.lineAngleAdjust || 0
                });
            }
        }
        // Check if it's a SelfLink
        else if (link.node && link.anchorAngle !== undefined) {
            var nodeIndex = nodeIndexMap.get(link.node);
            
            if (nodeIndex !== undefined) {
                clipboard.selfLinks.push({
                    nodeIndex: nodeIndex,
                    anchorAngle: link.anchorAngle,
                    text: link.text,
                    arrowType: link.arrowType || 'arrow',
                    color: link.color || 'gray'
                });
            }
        }
        // Check if it's a StartLink
        else if (link.node && link.deltaX !== undefined && link.deltaY !== undefined) {
            var nodeIndex = nodeIndexMap.get(link.node);
            
            if (nodeIndex !== undefined) {
                clipboard.startLinks.push({
                    nodeIndex: nodeIndex,
                    deltaX: link.deltaX,
                    deltaY: link.deltaY,
                    text: link.text
                });
            }
        }
    }
    
    console.log('📋 Clipboard contents:', {
        nodes: clipboard.nodes.length,
        links: clipboard.links.length,
        selfLinks: clipboard.selfLinks.length,
        startLinks: clipboard.startLinks.length
    });
}
```

#### 1.2 Add InteractionManager Methods
**File**: `src/main/fsm.js` (add to `InteractionManager` object around line 600)

```javascript
InteractionManager = {
    // ... existing properties ...
    
    // Add these new methods:
    
    canCopy: function() {
        // Can copy in 'selection' mode with a Node, or in 'multiselect' mode with nodes
        return (this._mode === 'selection' && this._selectedObject instanceof Node) ||
               (this._mode === 'multiselect' && selectedNodes.length > 0);
    },
    
    canPaste: function() {
        // Can paste if clipboard has content and not in text editing mode
        return !clipboard.isEmpty() && this._mode !== 'editing_text';
    }
};
```

### Phase 2: Paste Operation and Node Creation

#### 2.1 Implement Paste Function
**File**: `src/main/fsm.js` (add after `copyNodesToClipboard`)

```javascript
/**
 * pasteNodesFromClipboard - Creates new nodes from clipboard data with offset
 * 
 * Called by:
 * - document.onkeydown when Cmd+V / Ctrl+V is pressed
 * 
 * Purpose: Reconstructs nodes and their internal connections from clipboard.
 * Applies consistent (+100, +100) offset to all pasted nodes.
 * Sets newly pasted nodes as the active selection.
 */
function pasteNodesFromClipboard() {
    // Validate clipboard has content
    if (clipboard.isEmpty()) {
        console.log('Clipboard is empty, nothing to paste');
        return;
    }
    
    console.log('📋 Pasting', clipboard.nodes.length, 'node(s) from clipboard');
    
    var PASTE_OFFSET_X = 100;
    var PASTE_OFFSET_Y = 100;
    
    // Step 1: Create new nodes with offset
    var newNodes = [];
    var clipboardIndexToNewNode = new Map(); // Maps clipboard index -> new Node instance
    
    for (var i = 0; i < clipboard.nodes.length; i++) {
        var nodeData = clipboard.nodes[i];
        
        // Create new node with offset position
        var newNode = new Node(
            nodeData.x + PASTE_OFFSET_X,
            nodeData.y + PASTE_OFFSET_Y,
            nodeData.color
        );
        
        // Copy properties
        newNode.text = nodeData.text;
        newNode.shape = nodeData.shape;
        
        // Add to global nodes array
        nodes.push(newNode);
        newNodes.push(newNode);
        clipboardIndexToNewNode.set(i, newNode);
    }
    
    // Step 2: Recreate links between new nodes
    for (var i = 0; i < clipboard.links.length; i++) {
        var linkData = clipboard.links[i];
        var nodeA = clipboardIndexToNewNode.get(linkData.nodeAIndex);
        var nodeB = clipboardIndexToNewNode.get(linkData.nodeBIndex);
        
        if (nodeA && nodeB) {
            var newLink = new Link(nodeA, nodeB);
            newLink.text = linkData.text;
            newLink.arrowType = linkData.arrowType;
            newLink.color = linkData.color;
            newLink.parallelPart = linkData.parallelPart;
            newLink.perpendicularPart = linkData.perpendicularPart;
            newLink.lineAngleAdjust = linkData.lineAngleAdjust;
            
            links.push(newLink);
        }
    }
    
    // Step 3: Recreate self-links on new nodes
    for (var i = 0; i < clipboard.selfLinks.length; i++) {
        var selfLinkData = clipboard.selfLinks[i];
        var node = clipboardIndexToNewNode.get(selfLinkData.nodeIndex);
        
        if (node) {
            var newSelfLink = new SelfLink(node);
            newSelfLink.anchorAngle = selfLinkData.anchorAngle;
            newSelfLink.text = selfLinkData.text;
            newSelfLink.arrowType = selfLinkData.arrowType;
            newSelfLink.color = selfLinkData.color;
            
            links.push(newSelfLink);
        }
    }
    
    // Step 4: Recreate start-links on new nodes
    for (var i = 0; i < clipboard.startLinks.length; i++) {
        var startLinkData = clipboard.startLinks[i];
        var node = clipboardIndexToNewNode.get(startLinkData.nodeIndex);
        
        if (node) {
            var newStartLink = new StartLink(node);
            newStartLink.deltaX = startLinkData.deltaX;
            newStartLink.deltaY = startLinkData.deltaY;
            newStartLink.text = startLinkData.text;
            
            links.push(newStartLink);
        }
    }
    
    // Step 5: Update selection to newly pasted nodes
    if (newNodes.length === 1) {
        // Single node: enter selection mode with that node
        InteractionManager.enterSelectionMode(newNodes[0]);
    } else if (newNodes.length > 1) {
        // Multiple nodes: enter multiselect mode
        selectedNodes = newNodes.slice(); // Copy array
        InteractionManager.enterMultiselectMode();
    }
    
    // Step 6: Record history if undo/redo is available
    if (typeof canvasHistory !== 'undefined' && canvasHistory) {
        canvasHistory.push(canvasHistory.serializeCurrentState(), {
            coalesceKey: null // Don't coalesce paste operations
        });
    }
    
    // Redraw canvas to show new nodes
    draw();
    
    console.log('✅ Paste complete:', newNodes.length, 'node(s) created');
}
```

### Phase 3: Keyboard Event Integration

#### 3.1 Add Copy/Paste Shortcuts to document.onkeydown
**File**: `src/main/fsm.js` (modify existing `document.onkeydown` function around line 2291)

**Location**: Add this code block BEFORE the undo/redo handling (before line 2295)

```javascript
document.onkeydown = function(e) {
    var key = crossBrowserKey(e);
    
    // ====================================================================
    // COPY/PASTE SHORTCUTS
    // ====================================================================
    
    // Cmd+C / Ctrl+C - Copy
    if ((e.metaKey || e.ctrlKey) && key == 67) {
        if (InteractionManager.canCopy()) {
            e.preventDefault(); // Prevent default browser copy behavior
            
            // Get nodes to copy based on current mode
            var nodesToCopy = [];
            
            if (InteractionManager.getMode() === 'selection' && 
                InteractionManager.getSelected() instanceof Node) {
                // Single node selection
                nodesToCopy = [InteractionManager.getSelected()];
            } else if (InteractionManager.getMode() === 'multiselect' && 
                       selectedNodes.length > 0) {
                // Multiple node selection
                nodesToCopy = selectedNodes.slice(); // Make a copy of the array
            }
            
            if (nodesToCopy.length > 0) {
                copyNodesToClipboard(nodesToCopy);
            }
        }
        // If canCopy() is false, let browser handle default copy (e.g., for text editing)
    }
    
    // Cmd+V / Ctrl+V - Paste
    if ((e.metaKey || e.ctrlKey) && key == 86) {
        if (InteractionManager.canPaste()) {
            e.preventDefault(); // Prevent default browser paste behavior
            pasteNodesFromClipboard();
        }
        // If canPaste() is false, let browser handle default paste (e.g., for text editing)
    }
    
    // ====================================================================
    // EXISTING UNDO/REDO CODE CONTINUES BELOW
    // ====================================================================
    
    // Existing undo/redo code (key == 90 for Cmd+Z, key == 89 for Cmd+Y)
    if (canvasHistory && (e.metaKey || e.ctrlKey)) {
        // ... existing undo/redo implementation ...
    }
    
    // ... rest of existing keyboard handling ...
};
```

### Phase 4: Testing and Validation

#### 4.1 Test Cases

**Test 1: Single Node Copy/Paste**
- Create a node "abc" (blue) at (500, 500)
- Select the node
- Press Cmd+C
- Press Cmd+V
- Expected: New node "abc" (blue) at (600, 600), selected

**Test 2: Multi-Node Copy/Paste with Internal Link**
- Create node "abc" (blue) at (500, 500)
- Create node "def" (white) at (1000, 1000)
- Create link from "abc" → "def"
- Drag-select both nodes
- Press Cmd+C
- Press Cmd+V
- Expected:
  - Two new nodes at (600, 600) and (1100, 1100)
  - New link between the new nodes
  - New nodes are multiselected

**Test 3: Self-Loop Preservation**
- Create node "def" (white) at (1000, 1000)
- Add self-loop to "def"
- Select "def"
- Press Cmd+C, then Cmd+V
- Expected: New node at (1100, 1100) with self-loop

**Test 4: External Edge Exclusion**
- Create nodes "abc", "def", "hij"
- Link "abc" → "def" and "def" → "hij"
- Select only "abc" and "def"
- Copy and paste
- Expected: Only link between new "abc" and new "def" is copied, not link to "hij"

**Test 5: Multiple Paste Operations**
- Create and select node "abc"
- Press Cmd+C once
- Press Cmd+V three times
- Expected: Three new copies at (600,600), (700,700), (800,800)

**Test 6: Text Editing Mode Exclusion**
- Double-click node to enter text editing
- Press Cmd+C
- Expected: Text content is copied (browser default), not the node

**Test 7: Empty Clipboard**
- Refresh page (clear clipboard)
- Select a node
- Press Cmd+V
- Expected: Nothing happens (clipboard is empty)

#### 4.2 Edge Cases to Verify

1. **Copy with no selection**: Should do nothing
2. **Copy non-node objects** (links, start-links): Should do nothing (only nodes can be copied)
3. **Paste while editing text**: Should paste text, not nodes
4. **Cross-platform modifiers**: Test both Cmd (macOS) and Ctrl (Windows/Linux)
5. **Canvas mode paste**: Should work (paste at offset from original positions)
6. **Viewport boundaries**: Pasted nodes may go off-screen, verify canvas can pan to them

## Implementation Checklist

### Phase 1: Data Structures and Copy
- [ ] Add `clipboard` object with `nodes`, `links`, `selfLinks`, `startLinks` arrays
- [ ] Implement `copyNodesToClipboard(nodesToCopy)` function
- [ ] Build node index mapping during copy
- [ ] Filter and copy internal links only
- [ ] Add `canCopy()` and `canPaste()` to `InteractionManager`

### Phase 2: Paste Operation
- [ ] Implement `pasteNodesFromClipboard()` function
- [ ] Create new Node instances with (+100, +100) offset
- [ ] Reconstruct Link instances between new nodes
- [ ] Reconstruct SelfLink instances on new nodes
- [ ] Reconstruct StartLink instances on new nodes
- [ ] Update selection state after paste (single or multiselect)
- [ ] Integrate with history system (if available)

### Phase 3: Keyboard Integration
- [ ] Add Cmd+C / Ctrl+C handler (key code 67)
- [ ] Add Cmd+V / Ctrl+V handler (key code 86)
- [ ] Prevent default browser behavior when appropriate
- [ ] Allow default behavior during text editing
- [ ] Test modifier key detection (metaKey vs ctrlKey)

### Phase 4: Testing
- [ ] Test single node copy/paste
- [ ] Test multi-node copy/paste
- [ ] Test internal edge preservation
- [ ] Test external edge exclusion
- [ ] Test self-loop preservation
- [ ] Test start-link preservation
- [ ] Test multiple paste operations
- [ ] Test text editing mode non-interference
- [ ] Test empty clipboard behavior
- [ ] Cross-platform testing (macOS, Windows, Linux)

## Success Criteria

Implementation is complete when:
1. ✅ All test cases pass
2. ✅ All edge cases handled gracefully
3. ✅ No interference with text editing copy/paste
4. ✅ Works on both macOS (Cmd) and Windows/Linux (Ctrl)
5. ✅ Code follows existing codebase style and patterns
6. ✅ Console logging provides useful debugging information
7. ✅ Feature integrates cleanly with existing selection system
8. ✅ Undo/redo integration (if history system exists)

## Future Enhancements (Out of Scope)

- Smart positioning to avoid overlaps
- Paste at cursor position
- Visual paste preview
- Clipboard persistence across page reloads
- System clipboard integration (copy to other apps)
- Cross-document copy/paste
- Clipboard format versioning

## Notes and Considerations

1. **Browser-based clipboard**: Using JavaScript object, not system clipboard API
2. **Offset strategy**: Fixed (+100, +100) pixel offset, simple and predictable
3. **Index mapping**: Critical for maintaining link relationships during paste
4. **Text editing**: Must not interfere with normal text copy/paste operations
5. **History integration**: Optional, depends on whether undo/redo system exists
6. **Performance**: Should be fast for typical FSMs (< 100 nodes)
7. **Memory**: Clipboard object is lightweight, minimal memory impact
