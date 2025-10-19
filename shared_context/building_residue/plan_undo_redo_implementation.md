# Undo/Redo Implementation Plan
*Network Sketchpad FSM Designer*
*October 18, 2025 - Updated with Expert Implementation Pattern*

## Overview

This document outlines the implementation of undo/redo functionality (Cmd+Z/Cmd+Y) for the Network Sketchpad FSM designer. The implementation uses a **timeline-based history system** with smart coalescing to provide intuitive undo behavior that matches user expectations.

## Design Decisions (Updated)

### Approach: Timeline with Coalescing
- **Core Pattern**: Minimal History API with timeline + cursor + coalescing
- **Rationale**: Industry-proven approach that handles continuous operations elegantly
- **Key Benefits**: 
  - One undo per logical operation (entire drag = 1 undo)
  - Typing bursts coalesce into single undo blocks
  - No noisy micro-events in history
  - Automatic deduplication prevents phantom undos
- **Memory Impact**: ~10-50KB total (10 snapshots × 1-5KB each)

### History Depth: 10 Levels
- **Rationale**: Conservative starting point, easily adjustable
- **User Experience**: Sufficient for typical editing workflows
- **Memory Usage**: Minimal impact on browser performance
- **Future**: Can be increased based on user feedback

### Storage Location: Browser Memory (RAM)
- **Location**: JavaScript heap memory (not localStorage/sessionStorage)
- **Lifetime**: Session-based - cleared on page refresh/close
- **Rationale**: 
  - Immediate access for fast undo/redo operations
  - No storage quota limitations
  - Automatic cleanup when user leaves
  - No persistence needed (undo is for current session only)
- **Memory Management**: Automatic garbage collection when history limit exceeded

## Technical Architecture

### Core Component: CanvasRecentHistoryManager
```
CanvasRecentHistoryManager
├── Core API
│   ├── push(state, options?) - Add state with coalescing support
│   ├── undo() - Move cursor back, return previous state
│   ├── redo() - Move cursor forward, return next state
│   └── current() - Get state at current cursor position
├── Timeline Storage
│   ├── timeline[] - Array of state snapshots (max 10)
│   ├── cursor - Current position in timeline (-1 to timeline.length-1)
│   └── pending - Coalescing tracker {key, idx}
├── Smart Options
│   ├── replaceTop - Update current state instead of adding new
│   └── debounce - Time-based coalescing for continuous operations
└── Utilities
    ├── serializeCurrentState() - Reuse existing JSON export logic
    ├── restoreState() - Reuse existing JSON import logic
    └── stateEqual() - Deep comparison for deduplication
```

### Implementation Strategy: Smart Boundaries
Following expert advice, the system captures state at **sensible boundaries**:

1. **Immediate Actions**: Push state after completion (button clicks, menu actions)
2. **Drag Operations**: Only push once at drag end (not during mousemove)  
3. **Text Editing**: Coalesce typing bursts with debounce (300ms window)
4. **Duplicate Prevention**: Skip identical states automatically
5. **Redo Clearing**: Clear future history when pushing from middle

### Integration Points
```
Existing System → History Integration
├── JSON Export/Import → State serialization/restoration (reuse existing)
├── InteractionManager → Selection state preservation  
├── Event Handlers → Smart boundary detection for push timing
├── Canvas Operations → End-of-operation state capture
└── Keyboard System → Cmd+Z/Cmd+Y shortcut handling + coalesce keys
```

## Implementation Components

### 1. CanvasRecentHistoryManager Module
**File**: `src/main/fsm.js` (integrated)
**Size**: ~200 lines
**Dependencies**: Existing serialization functions

**Core API Methods**:
- `push(state, options)` - Smart state addition with coalescing
- `undo()` - Move back in timeline
- `redo()` - Move forward in timeline
- `current()` - Get current state
- `serializeCurrentState()` - Reuse JSON export logic
- `restoreState()` - Reuse JSON import logic

**Advanced Options**:
- `coalesceKey` - Group related operations  
- `skipIfEqual` - Prevent duplicate states
- `replaceTop` - Update current instead of adding new

### 2. Smart Boundary Detection
**Philosophy**: Record changes at sensible boundaries, not micro-events

**PUSH AFTER Events** (When operation completes):
- **Node Creation**: After double-click completes node creation
- **Node Deletion**: After Delete key removes node(s) 
- **Node Movement**: After drag ends (onmouseup/touchend) - entire drag = 1 undo
- **Link Creation**: After Shift+drag completes new link
- **Link Deletion**: After Delete key removes link
- **Link Movement**: After drag ends (onmouseup/touchend) - entire drag = 1 undo
- **Color Changes**: After keyboard shortcuts change color (immediate)
- **Multi-Select Operations**: After group operations complete
- **Text Editing**: After typing session ends (300ms debounce)

**NEVER PUSH Events** (Continuous/transient operations):
- ❌ **Individual Keystrokes**: Each letter typed (use coalescing instead)
- ❌ **Mouse Movement**: Cursor position changes
- ❌ **Drag Progress**: Intermediate positions during drag (live preview only)
- ❌ **Selection Changes**: Clicking different objects (no state change)
- ❌ **Hover States**: Mouse over effects
- ❌ **Temporary Visuals**: Preview states, highlights
- ❌ **Canvas Redraws**: Rendering operations

**Operation Examples**:
```
Drag Operation:
  mousedown → (no push, start live preview)
  mousemove → (no push, update live preview) 
  mouseup → history.push(finalState) // Entire drag = 1 undo

Text Editing:
  enter text mode → (no push yet)
  type "hello" → (no push, start debounce timer)
  300ms later → history.push(state, {coalesceKey: "typing"})
  type "world" → (coalesces with previous, still 1 undo block)
  
Node Creation:
  double-click → create node → history.push(newState) // Immediate push
```

### 3. Keyboard Shortcuts
**Implementation**: Extend existing `document.onkeydown`
**Shortcuts**:
- `Cmd+Z` / `Ctrl+Z` - Undo
- `Cmd+Y` / `Ctrl+Y` - Redo  
- `Cmd+Shift+Z` - Redo (alternative)

### 4. Coalescing & Deduplication
**Purpose**: Group related operations and prevent phantom undos

**Core Implementation Pattern**:
```javascript
// Canvas Recent History Timeline (adapted from expert advice)
class CanvasRecentHistoryManager {
  constructor(initialState) {
    this.timeline = [];
    this.cursor = -1;
    this.pending = null; // {key: string, idx: number}
    this.push(initialState); // Always start with initial state
  }
  
  current() { 
    return this.timeline[this.cursor]; 
  }
  
  push(nextState, options = {}) {
    const {coalesceKey, replaceTop, skipIfEqual} = options;
    
    // Skip identical states (prevent phantom undos)
    if (skipIfEqual && this.stateEqual(this.current(), nextState)) return;
    
    // Clear future history if not at end (standard undo behavior)
    if (this.cursor < this.timeline.length - 1) {
      this.timeline = this.timeline.slice(0, this.cursor + 1);
      this.pending = null;
    }
    
    // Coalesce with previous entry if keys match
    if (coalesceKey && this.pending?.key === coalesceKey && 
        this.pending.idx === this.cursor) {
      this.timeline[this.cursor] = nextState;
      return;
    }
    
    // Replace current entry instead of adding new
    if (replaceTop && this.cursor >= 0) {
      this.timeline[this.cursor] = nextState;
      return;
    }
    
    // Add new entry to timeline
    this.timeline.push(nextState);
    this.cursor++;
    
    // Track coalescing state
    if (coalesceKey) {
      this.pending = {key: coalesceKey, idx: this.cursor};
    } else {
      this.pending = null;
    }
    
    // Maintain history limit (10 entries)
    if (this.timeline.length > 10) {
      this.timeline.shift();
      this.cursor--;
      if (this.pending) this.pending.idx--;
    }
  }
  
  undo() {
    if (this.cursor > 0) this.cursor--;
    this.pending = null;
    return this.current();
  }
  
  redo() {
    if (this.cursor < this.timeline.length - 1) this.cursor++;
    this.pending = null;
    return this.current();
  }
}

// Text Editing with Debounced Coalescing
var typingTimer;
function onTextChange() {
  const newState = serializeCurrentState();
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    history.push(newState, {
      coalesceKey: "typing",
      skipIfEqual: true
    });
  }, 300); // 300ms debounce window
}

// Drag Operation Pattern  
var dragState = {
  isDragging: false,
  startSnapshot: null,
  
  startDrag() {
    this.isDragging = true;
    this.startSnapshot = history.current(); // Remember start state
    // NO history.push() here - wait for drag end
  },
  
  updateDrag() {
    if (!this.isDragging) return;
    // Update live preview - NO history.push()
    applyLivePreview(/* new positions */);
  },
  
  endDrag() {
    if (!this.isDragging) return;
    this.isDragging = false;
    
    // Push final state - entire drag becomes 1 undo operation
    const finalState = serializeCurrentState();
    history.push(finalState, {skipIfEqual: true});
    
    this.startSnapshot = null;
  }
};
```

## State Snapshot Structure

### Captured Data
```javascript
{
  timestamp: 1697472000000,
  nodes: [
    {
      id: 0,
      x: 100, y: 200,
      text: "State A",
      color: "yellow"
    }
  ],
  links: [
    {
      type: "Link",
      nodeA: 0, nodeB: 1,
      text: "transition",
      parallelPart: 0.5,
      perpendicularPart: 0
    }
  ],
  selections: {
    selectedObjectId: { type: "node", id: 0 },
    selectedNodesIds: [0, 1],
    interactionMode: "selection"
  },
  viewport: {
    x: 0, y: 0, scale: 1
  }
}
```

### What's Preserved
- ✅ All node positions, colors, text
- ✅ All link types and parameters
- ✅ Current selection state
- ✅ Interaction mode
- ✅ Multi-select state
- ✅ Viewport position and zoom
- ✅ Legend state (derived from nodes)

### What's Not Preserved
- ❌ Mouse cursor position
- ❌ Temporary drag states
- ❌ Animation states
- ❌ Browser focus state

## Implementation Steps

### Phase 1: Core Timeline Infrastructure (2-3 hours)
1. **Create CanvasRecentHistoryManager Class**
   - Timeline-based storage with cursor navigation
   - Coalescing support with pending state tracking
   - Automatic deduplication with skipIfEqual
   - Memory management (10-item sliding window)
   - Initial state capture

2. **Add keyboard shortcuts**
   - Extend `document.onkeydown`
   - Cross-platform key detection (Cmd+Z/Ctrl+Z, Cmd+Y/Ctrl+Y)
   - Prevent default browser behavior
   - Clear pending coalescing on manual undo/redo

3. **Basic integration testing**
   - Manual undo/redo verification
   - Timeline cursor behavior validation
   - Initial state and boundary condition testing

### Phase 2: Smart Boundary Implementation (2-3 hours)
1. **Immediate Operations** (push after completion)
   - Node creation (canvas.ondblclick completion)
   - Node/link deletion (document.onkeydown, key 46 completion)
   - Color changes (document.onkeydown immediate push)

2. **Drag Operations** (push only at end)
   - Start: Remember start state, enable live preview
   - During: Update visuals only, no history push
   - End: Push final state with skipIfEqual option

3. **Text Editing** (debounced coalescing)
   - Start typing: Begin 300ms debounce timer
   - Continue typing: Reset timer, coalesce with "typing" key
   - End session: Final coalesced push if text changed

4. **Multi-select operations**
   - Group moves: Same drag pattern as single objects
   - Group deletions: Immediate push after completion
   - Bulk modifications: Immediate push after changes applied

### Phase 3: Optimization & Polish (1-2 hours)
1. **Coalescing refinement**
   - Debounce timing optimization (test 200ms vs 300ms)
   - Coalesce key strategies for different operation types
   - Break coalescing on boundary events (Escape, mode changes)

2. **Debug utilities**
   - Timeline inspection: `history.debug()` 
   - Coalescing state monitoring
   - Memory usage reporting
   - Console logging for development

3. **Edge case handling**
   - Empty timeline protection
   - Cursor boundary enforcement
   - State serialization error handling
   - Rapid operation sequence testing

## Testing Strategy

### Manual Testing Scenarios
1. **Basic Operations**
   - Create node → Undo → Redo (should be 1 undo step)
   - Drag node across canvas → Undo → Redo (entire drag = 1 step)  
   - Delete node → Undo → Redo (immediate operation)
   - Type text "hello world" → Undo (should undo entire typing session)

2. **Coalescing Behavior**
   - Type continuously for 5 seconds → Should create only 1 undo block
   - Drag node → Type text → Drag again → Should be 3 separate undo steps
   - Rapid color changes → Each keystroke should be separate undo
   - Multi-node drag → Entire group move should be 1 undo

3. **Timeline Management**
   - Undo several times → Redo from middle → New operation should clear future
   - Undo at start of history → Should stay at initial state
   - Redo at end of history → Should stay at current state
   - Create 15 operations → Should maintain only last 10 in timeline

4. **Edge Cases**
   - Identical operations → Should not create duplicate timeline entries
   - Rapid operation sequences → Should handle without lag
   - Large diagram (50+ nodes) → Performance should remain smooth

### Automated Validation
```javascript
// Timeline behavior tests
function testTimelineBehavior() {
  const history = new CanvasRecentHistoryManager(getInitialState());
  
  // Test coalescing
  history.push(state1, {coalesceKey: "typing"});
  history.push(state2, {coalesceKey: "typing"}); // Should coalesce
  assert(history.timeline.length === 2); // Initial + 1 coalesced entry
  
  // Test redo clearing
  history.undo(); // Go back
  history.push(state3); // Should clear future
  assert(history.cursor === history.timeline.length - 1);
  
  // Test deduplication
  history.push(state3, {skipIfEqual: true}); // Should skip
  assert(history.timeline.length === 3); // No change
}

// Operation boundary tests
function testDragBehavior() {
  simulateMouseDown(node); // Start drag
  assert(history.timeline.length === initialLength); // No push yet
  
  simulateMouseMove(newPosition); // Continue drag  
  assert(history.timeline.length === initialLength); // Still no push
  
  simulateMouseUp(); // End drag
  assert(history.timeline.length === initialLength + 1); // Now pushed
}

// Text coalescing tests  
function testTextCoalescing() {
  startTyping();
  typeCharacter('h');
  typeCharacter('e'); 
  // Should not push yet (within debounce window)
  assert(history.timeline.length === initialLength);
  
  waitForDebounce(400); // Wait past 300ms
  // Should now have coalesced push
  assert(history.timeline.length === initialLength + 1);
}
```

## Performance Considerations

### Memory Usage
- **Storage Location**: JavaScript heap memory (not persistent storage)
- **Per Snapshot**: 1-5KB (typical FSM with 10-20 nodes)
- **Total Buffer**: 10-50KB (10 snapshots)
- **Browser Impact**: Negligible compared to typical web app memory usage
- **Cleanup**: Automatic garbage collection when snapshots are dropped
- **Monitoring**: Built-in memory usage reporting via `CanvasRecentHistoryManager.getMemoryUsage()`

### CPU Performance
- **State Capture**: ~1ms (JSON serialization of existing objects)
- **State Restore**: ~2-5ms (object reconstruction + canvas redraw)
- **User Perception**: Instantaneous response
- **Timeline Operations**: O(1) for push/undo/redo with cursor navigation
- **Coalescing**: Minimal overhead, prevents redundant operations
- **Deduplication**: Fast state comparison prevents phantom timeline entries

### Smart Operation Management
- **Drag Operations**: No timeline activity during mousemove (live preview only)
- **Text Coalescing**: 300ms debounce window groups typing bursts
- **Immediate Operations**: Color changes push instantly for crisp feedback
- **Boundary Detection**: Smart operation grouping based on user intent
- **Memory Efficiency**: 10-item sliding window with automatic garbage collection

### Scalability Limits
- **Large Diagrams**: 100+ nodes still under 20KB per snapshot
- **Heavy Usage**: 10 levels provide sufficient working history
- **Future Growth**: Easy to increase history depth if needed

## Integration with Existing Systems

### InteractionManager Compatibility
- Preserve selection modes during undo/redo
- Restore correct interaction state
- Maintain capability-based permissions

### Canvas System Integration  
- Trigger full redraw after state restoration
- Update viewport if position changed
- Refresh legend based on restored nodes

### Persistence System Coordination
- Undo/redo works with auto-save
- Export includes current state (not history)
- Import resets undo history

## Success Criteria

### Functional Requirements
- ✅ 10 levels of timeline-based undo/redo history
- ✅ Cmd+Z/Cmd+Y shortcuts work cross-platform  
- ✅ All FSM elements preserved in undo/redo
- ✅ Selection state maintained through operations
- ✅ One logical undo per user operation (entire drag = 1 undo)
- ✅ Typing bursts coalesce into single undo blocks
- ✅ No phantom undos from identical consecutive states

### Quality Requirements
- ✅ Memory usage under 100KB total
- ✅ Undo/redo operations complete under 10ms
- ✅ No visual glitches during state restoration
- ✅ Robust timeline cursor management
- ✅ Proper future history clearing on new operations
- ✅ Compatible with existing interaction patterns

### User Experience Goals
- ✅ Intuitive undo granularity matching user expectations
- ✅ Smooth operation during continuous actions (drag, type)
- ✅ Immediate response to keyboard shortcuts
- ✅ No interruption of live preview during drag operations
- ✅ Reliable state preservation with smart deduplication
- ✅ Professional-grade behavior matching established applications

## Future Enhancements (Out of Scope)

### Possible Improvements
- **Increased History**: 20-50 levels based on user feedback
- **Persistent History**: Survive browser refresh
- **Visual Indicators**: Show undo/redo availability in UI
- **Operation Labels**: "Undo Create Node", "Redo Move"
- **Branching History**: Non-linear undo with operation tree

### Performance Optimizations
- **Delta Compression**: Reduce memory for large diagrams
- **Lazy Serialization**: Defer JSON creation until needed
- **Background Capture**: Non-blocking state snapshots

This implementation provides a solid foundation for undo/redo functionality while maintaining the application's architectural principles and performance characteristics.