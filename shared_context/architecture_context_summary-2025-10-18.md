# Network Sketchpad - Architecture Context Summary
*Current State: October 18, 2025*

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Core Components](#core-components)
4. [Interaction System](#interaction-system)
5. [Implementation Details](#implementation-details)
6. [Technical Infrastructure](#technical-infrastructure)
7. [Development & Extension](#development--extension)
8. [Recent Updates](#recent-updates)

## Project Overview

### Core Concept
Network Sketchpad is a client-side finite state machine (FSM) designer built entirely in vanilla JavaScript and HTML5 Canvas. The application runs completely in the browser without external dependencies, providing an interactive drawing environment for creating state diagrams with nodes and transitions.

### Current Capabilities
- **Node Creation**: 6 geometric shapes (dot, triangle, square, pentagon, hexagon) with 7 color options
- **Edge System**: Shape-aware connections for straight links, curved links, self-loops, and start arrows
- **Multi-Selection**: Box selection and group operations on multiple nodes
- **Interaction Modes**: Four distinct interaction states with keyboard navigation
- **Text Editing**: Direct cursor implementation with full keyboard navigation (arrows, home/end)
- **Persistence**: JSON-based save/load with localStorage backup
- **Viewport**: Canvas panning with middle-mouse drag
- **LaTeX Support**: LaTeX shortcuts and real-time text input on nodes and edges
- **Dynamic UI**: Collapsible guide box with mode-aware content

### Browser Execution Model
```mermaid
sequenceDiagram
    participant Browser
    participant HTML
    participant JavaScript
    participant Canvas
    participant Storage

    Browser->>HTML: Load index.html
    HTML->>JavaScript: Execute built-fsm.js
    JavaScript->>Canvas: Initialize drawing context
    JavaScript->>Storage: Restore previous state
    
    loop User Interaction
        Browser->>JavaScript: Mouse/keyboard events
        JavaScript->>Canvas: Update visual elements
        JavaScript->>Storage: Auto-save state
    end
```

## System Architecture

### High-Level Component Structure
```mermaid
graph TB
    subgraph "Application Layer"
        IM["`**InteractionManager**
        Centralized state management
        • Mode control (4 states)
        • Selection handling
        • Capability checks`"]
        
        FSM["`**Main Controller (fsm.js)**
        Event handling & rendering
        • Canvas management
        • Event processing
        • Draw coordination`"]
        
        UI["`**User Interface**
        Dynamic guide system
        • Mode-aware instructions
        • Version-specific content
        • Collapsible guide box`"]
    end
    
    subgraph "Element System"
        NODE["`**Node Classes**
        Geometric shapes
        • 6 shape types
        • Color variants
        • Text labels with cursor`"]
        
        LINK["`**Link Classes**
        Connection types
        • Straight links
        • Curved links  
        • Self-loops
        • Start arrows`"]
    end
    
    subgraph "Foundation Layer"
        MATH["`**Mathematical Core**
        Geometric calculations
        • Circle operations
        • Polygon geometry
        • Line intersections`"]
        
        PERSIST["`**Persistence System**
        Data management
        • JSON serialization
        • localStorage backup
        • Import/export`"]
        
        TEXT["`**Text System**
        Direct cursor implementation
        • Character-based positioning
        • Keyboard navigation
        • Canvas-native rendering`"]
    end
    
    IM --> FSM
    FSM --> NODE
    FSM --> LINK
    FSM --> UI
    NODE --> MATH
    LINK --> MATH
    NODE --> TEXT
    LINK --> TEXT
    FSM --> PERSIST
    
    style IM fill:#ff9500,color:#fff
    style FSM fill:#51cf66,color:#fff
    style NODE fill:#339af0,color:#fff
    style LINK fill:#f783ac,color:#fff
    style TEXT fill:#845ef7,color:#fff
```

### File Organization
```
src/
├── main/
│   ├── fsm.js          # Main application controller
│   ├── math.js         # Geometric calculations
│   └── save.js         # Persistence system
└── elements/
    ├── node.js         # Node implementation
    ├── link.js         # Straight/curved links
    ├── self_link.js    # Self-loop links
    ├── start_link.js   # Entry point arrows
    └── temporary_link.js # Drag preview
```

## Core Components

### InteractionManager
The central state management system that controls user interaction modes and object selection.

```javascript
window.InteractionManager = {
    // Core state
    _selectedObject: null,
    _mode: 'canvas', // 'canvas', 'selection', 'editing_text', 'multiselect'
    
    // API methods
    getSelected: function() { return this._selectedObject; },
    getMode: function() { return this._mode; },
    setSelected: function(obj) { /* mode transition logic */ },
    
    // Capability checks
    canEditText: function() { /* mode-based permissions */ },
    canChangeNodeAppearance: function() { /* mode-based permissions */ },
    canDrag: function() { /* mode-based permissions */ },
    
    // Mode transitions
    enterCanvasMode: function() { /* transition logic */ },
    enterSelectionMode: function(obj) { /* transition logic */ },
    enterEditingMode: function(obj) { /* cursor initialization */ },
    enterMultiselectMode: function() { /* transition logic */ }
};
```

### Node System
Geometric shapes that serve as FSM states, with shape-aware boundary detection for precise edge connections.

**Supported Shapes:**
- **Dot (Circle)**: Traditional circular nodes
- **Triangle**: Three-sided polygon
- **Square**: Four-sided rectangle
- **Pentagon**: Five-sided regular polygon
- **Hexagon**: Six-sided regular polygon

**Color System:**
- 7 base colors: yellow, green, blue, pink, white, orange, gray
- Selection variants: brighter versions for visual feedback

**Core Methods:**
```javascript
Node.prototype.draw = function(c) {
    // Shape-specific rendering
    switch(this.shape) {
        case 'dot': this.drawCircle(c); break;
        case 'triangle': this.drawTriangle(c); break;
        // ... other shapes
    }
};

Node.prototype.containsPoint = function(x, y) {
    // Shape-specific hit detection
};

Node.prototype.closestPointOnShapeToEdgeArc = function(x, y) {
    // Shape-aware edge connection points
};
```

### Link System
Connection elements that represent FSM transitions, with intelligent routing around node geometries.

**Link Types:**
- **Link**: Straight or curved connections between nodes
- **SelfLink**: Loop connections from a node to itself
- **StartLink**: Entry arrows pointing to initial states
- **TemporaryLink**: Visual feedback during link creation

**Edge Connection Algorithm:**
```javascript
// Links use shape-aware connection points
Link.prototype.getEndPointsAndArcParams = function() {
    var startPoint = this.nodeA.closestPointOnShapeToEdgeArc(/* target */);
    var endPoint = this.nodeB.closestPointOnShapeToEdgeArc(/* source */);
    // Calculate arc parameters for smooth curves
};
```

### Text Editing System
Direct cursor implementation providing precise text editing with full keyboard navigation.

**Core Features:**
- **Character-based positioning**: Cursor tracks position by character index
- **Keyboard navigation**: Arrow keys, Home/End for cursor movement
- **Visual feedback**: Black blinking cursor with resetCaret() calls
- **Canvas-native rendering**: Direct drawing without DOM overlay complications

**Implementation:**
```javascript
// Cursor position tracking
InteractionManager.enterEditingMode: function(obj) {
    this._selectedObject = obj;
    this._mode = 'editing_text';
    
    // Initialize cursor at end of text
    obj.cursorPosition = obj.text ? obj.text.length : 0;
    draw(); // Show cursor immediately
}

// Cursor rendering in drawText()
if (shouldShowCaret && caretVisible && canvasHasFocus()) {
    var cursorX = x; // Start position
    
    // Calculate cursor position from character index
    if (obj.cursorPosition !== undefined) {
        var textBeforeCursor = text.substring(0, obj.cursorPosition);
        cursorX = x + c.measureText(textBeforeCursor).width;
    }
    
    // Draw black cursor line
    c.strokeStyle = '#000000';
    c.beginPath();
    c.moveTo(cursorX, y - 10);
    c.lineTo(cursorX, y + 10);
    c.stroke();
}
```

## Interaction System

### Four-State Mode System
The application operates in one of four distinct interaction modes, each with specific capabilities.

```mermaid
stateDiagram-v2
    [*] --> canvas
    
    canvas --> selection: Click object
    canvas --> multiselect: Drag selection box
    
    selection --> canvas: Escape / Click empty
    selection --> editing_text: Double-click / Enter
    selection --> selection: Shape/color keys
    
    multiselect --> canvas: Escape / Click empty
    multiselect --> multiselect: Shape/color keys
    
    editing_text --> selection: Escape
    editing_text --> editing_text: Arrow keys / Type
    
    note right of canvas
        Pan viewport
        Create nodes
        Clear selections
    end note
    
    note right of selection
        Drag objects
        Modify appearance
        Enter text editing
    end note
    
    note right of multiselect
        Group operations
        Bulk modifications
        Multiple selection
    end note
    
    note right of editing_text
        Text input with cursor
        Arrow key navigation
        Home/End positioning
        Character insertion/deletion
    end note
```

### Keyboard Interface
**Navigation:**
- **Escape**: Step back through modes (editing → selection → canvas)
- **Enter**: Advance to text editing mode (selection → editing)
- **Arrow Keys**: Navigate cursor position in text editing mode
- **Home/End**: Jump to start/end of text
- **Delete**: Remove characters or objects based on mode

**Node Modification:**
- **Shape Keys**: 1, 3, 4, 5, 6 (dot, triangle, square, pentagon, hexagon)
- **Color Keys**: Q, W, E, R, T (yellow, green, blue, pink, white)

**Creation:**
- **Double-click + modifiers**: Create node with specific shape/color
- **Shift + drag**: Create transitions between nodes

### Mouse Interface
**Selection:**
- **Single click**: Select individual objects
- **Drag rectangle**: Multi-select nodes
- **Click empty space**: Clear selections

**Manipulation:**
- **Drag objects**: Move selected items
- **Double-click objects**: Enter text editing mode
- **Middle-mouse drag**: Pan viewport

## Implementation Details

### Event Processing Pipeline
```mermaid
flowchart TD
    A[User Input] --> B[Event Handler]
    B --> C[InteractionManager]
    C --> D{Mode Check}
    
    D --> E[Capability Validation]
    E --> F{Action Permitted?}
    
    F -->|Yes| G[Execute Action]
    F -->|No| H[Block Action]
    
    G --> I[Update Visual State]
    I --> J[Canvas Redraw]
    I --> K[Cursor Reset if needed]
    
    H --> L[Console Log]
    L --> M[No Visual Change]
    
    style C fill:#ff9500,color:#fff
    style E fill:#51cf66,color:#fff
    style G fill:#339af0,color:#fff
```

### Capability System
Actions are permitted based on current interaction mode and context:

```javascript
// Example capability checks
canEditText: function() {
    return this._mode === 'editing_text' && 
           this._selectedObject && 
           'text' in this._selectedObject;
},

canChangeNodeAppearance: function() {
    return (this._mode === 'selection' && this._selectedObject instanceof Node) ||
           (this._mode === 'multiselect' && selectedNodes.length > 0);
}
```

### Compatibility Layer
Legacy code continues to work through property descriptors:

```javascript
Object.defineProperty(this, 'selectedObject', {
    get: function() { return window.InteractionManager.getSelected(); },
    set: function(value) { window.InteractionManager.setSelected(value); }
});

// Legacy patterns still work:
// selectedObject = someNode;
// if (selectedObject) { ... }
```

### Shape-Aware Geometry
Polygon nodes use sophisticated boundary detection for accurate edge connections:

```javascript
Node.prototype.closestPointOnPolygon = function(x, y) {
    // Generate polygon vertices
    var vertices = this.getPolygonVertices();
    
    // Find closest point on polygon perimeter
    return this.closestPointOnPolygonEdges(vertices, x, y);
};

Node.prototype.closestPointOnPolygonEdges = function(vertices, x, y) {
    // Iterate through polygon edges
    // Find closest point on each edge using line segment math
    // Return the globally closest point
};
```

## Technical Infrastructure

### Build System
Python-based concatenation of source files:

```python
def build():
    sources = [
        'src/_license.js',
        'src/main/fsm.js',
        'src/main/math.js', 
        'src/main/save.js',
        'src/elements/node.js',
        'src/elements/link.js',
        'src/elements/self_link.js',
        'src/elements/start_link.js',
        'src/elements/temporary_link.js'
    ]
    
    # Concatenate all source files
    data = '\n'.join(open(file, 'r').read() for file in sources)
    
    # Write to www/built-fsm.js
    with open('./www/built-fsm.js', 'w') as f:
        f.write(data)
```

### Persistence System
**Auto-save**: Continuous backup to localStorage on every change
**Export**: JSON format with complete state serialization
**Import**: File upload with backward compatibility

```javascript
// JSON structure
{
    "version": "1.0",
    "created": "2025-10-18T...",
    "nodes": [
        {
            "id": 0,
            "x": 100, "y": 200,
            "text": "Start",
            "shape": "dot",
            "color": "yellow"
        }
    ],
    "links": [
        {
            "type": "Link",
            "nodeA": 0, "nodeB": 1,
            "text": "transition"
        }
    ]
}
```

### Dynamic User Interface
The guide system adapts content based on the interaction system version and defaults to collapsed state:

```javascript
function populateGuide() {
    var html = '';
    
    if (ui_flow_v2) {
        // Modern interaction instructions with cursor navigation
        html += '<li><b>Select object:</b> single click</li>';
        html += '<li><b>Edit text:</b> double-click selected object OR press Enter</li>';
        html += '<li><b>Navigate cursor:</b> arrow keys, Home/End in text mode</li>';
        html += '<li><b>Exit editing:</b> press Escape (steps back through modes)</li>';
        // ...
    } else {
        // Legacy interaction instructions  
        html += '<li><b>Edit text:</b> click object and start typing</li>';
        // ...
    }
    
    document.getElementById('guide-content').innerHTML = html;
}

// Guide box state management
function initializeControlsState() {
    var isExpanded = localStorage.getItem('guideExpanded');
    // Default to collapsed unless explicitly expanded
    if (isExpanded === 'true') {
        // Show expanded
    } else {
        // Show collapsed (default)
    }
}
```

## Development & Extension

### Current Metrics
- **Built file**: ~2,500 lines of concatenated JavaScript
- **Source files**: 9 modular components
- **Interaction modes**: 4 distinct states with direct cursor support
- **Shape support**: 6 geometric types with full edge connectivity
- **Color system**: 7 colors with selection variants
- **Text editing**: Full keyboard navigation with visual cursor

### Development Workflow
```bash
# Local development
python3 build_fsm.py              # Build application
python3 -m http.server 8000       # Serve locally

# Debug in browser console
InteractionManager.logState()     # View current state
InteractionManager.debugInfo()    # Get structured info
```

### Extension Points

**Adding New Shapes:**
```javascript
// 1. Add shape rendering
Node.prototype.drawNewShape = function(c) {
    // Custom drawing logic
};

// 2. Add hit detection
Node.prototype.pointInNewShape = function(x, y) {
    // Custom geometry check
};

// 3. Add edge connection
Node.prototype.closestPointOnNewShape = function(x, y) {
    // Custom boundary detection
};

// 4. Update shape modifier mapping
function getShapeFromModifier(modifier) {
    // Add new case
}
```

**Adding New Interaction Modes:**
```javascript
// 1. Add mode to InteractionManager
enterNewMode: function(context) {
    this._mode = 'new_mode';
    // Mode-specific setup
},

// 2. Add capability checks
canDoNewAction: function() {
    return this._mode === 'new_mode' && /* conditions */;
},

// 3. Add keyboard/mouse handlers
// 4. Update mode transition logic
```

**Enhancing Text Editing:**
```javascript
// Current cursor implementation supports:
// - Character-based positioning (cursorPosition property)
// - Arrow key navigation with resetCaret() calls
// - Visual feedback with black blinking cursor
// - Canvas-native rendering without DOM overlays

// Extension possibilities:
// - Text selection ranges
// - Copy/paste operations
// - Undo/redo for text changes
// - Multi-line text support
```

### Quality Assurance
**Testing Areas:**
- Mode transitions and capability boundaries
- Shape rendering and edge connections
- Multi-selection operations
- Text editing with cursor navigation
- JSON serialization/deserialization
- Backward compatibility with legacy code
- Keyboard shortcuts and visual feedback
- Guide box state persistence

**Performance Considerations:**
- Canvas redraw optimization (especially with cursor blinking)
- Event handler efficiency
- Large diagram handling (100+ nodes)
- Memory usage with complex selections
- Text rendering performance with cursor calculations

## Recent Updates

### October 18, 2025
**Terminology Improvements:**
- Updated "controls box" → "guide box" throughout codebase for better descriptive clarity
- Changed localStorage key from 'controlsExpanded' → 'guideExpanded'
- Updated all comments and documentation to use "guide box" terminology
- Maintained backward compatibility for HTML IDs and function names

**Text Editing Enhancements:**
- Implemented direct cursor navigation system replacing DOM overlay approach
- Added full keyboard navigation: arrow keys, Home/End positioning
- Cursor position tracking via character index (obj.cursorPosition)
- Black blinking cursor with resetCaret() calls for immediate visibility
- Fixed delete key behavior to respect editing mode boundaries
- Resolved cursor alignment issues through canvas-native rendering

**UI Polish:**
- Guide box now defaults to collapsed state for cleaner initial interface
- Improved cursor visibility with consistent black color and proper blinking
- Enhanced mode transition feedback with immediate cursor display
- Better visual consistency across different text editing scenarios

**Architecture Refinements:**
- Strengthened capability-based interaction system
- Improved mode transition logic with cursor state management
- Enhanced event handling for text editing scenarios
- Better separation of concerns between DOM and canvas rendering

This architecture provides a robust foundation for FSM diagram creation with sophisticated interaction patterns, comprehensive shape support, direct cursor text editing, and extensible design patterns. The recent improvements in terminology, text editing capabilities, and UI polish enhance both developer experience and user interaction quality.