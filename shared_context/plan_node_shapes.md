# Plan: Node Shape Implementation with Keyboard Modifiers

## Overview

This plan implements approach #2 from the user's request: using keyboard modifiers while double-clicking to create different node shapes, and the same modifiers on existing nodes to cycle through shapes.

### Target Behavior
- **Default double-click**: Creates a circle node (current behavior)
- **Hold 1 + double-click**: Creates a circle node (explicit)
- **Hold 3 + double-click**: Creates a triangle node
- **Hold 4 + double-click**: Creates a square node  
- **Hold 5 + double-click**: Creates a pentagon node
- **Hold 6 + double-click**: Creates a hexagon node
- **Double-click existing node**: Cycles through accept state and shapes
- **Hold modifier + double-click existing node**: Changes to specific shape

## Implementation Plan

### Phase 1: Extend Node Class with Shape Support

#### 1.1 Add Shape Property to Node Constructor
**File**: `src/elements/node.js`

Modify the Node constructor to include a shape property:
```javascript
function Node(x, y, shape) {
    this.x = x;
    this.y = y;
    this.mouseOffsetX = 0;
    this.mouseOffsetY = 0;
    this.isAcceptState = false;
    this.text = '';
    this.shape = shape || 'circle'; // Default to circle for backward compatibility
}
```

**Shape Types**: `'circle'`, `'triangle'`, `'square'`, `'pentagon'`, `'hexagon'`

**Note**: Double-clicking without any modifier keys defaults to creating a circle node, maintaining the current behavior. Holding 1 + double-click also creates a circle node for explicit selection consistency.

#### 1.2 Update Node Drawing Method
**File**: `src/elements/node.js`

Replace the current `Node.prototype.draw` method with shape-aware rendering:
```javascript
Node.prototype.draw = function(c) {
    // Set fill and stroke for the shape
    c.beginPath();
    
    switch(this.shape) {
        case 'circle':
            this.drawCircle(c);
            break;
        case 'triangle': 
            this.drawTriangle(c);
            break;
        case 'square':
            this.drawSquare(c);
            break;
        case 'pentagon':
            this.drawPentagon(c);
            break;
        case 'hexagon':
            this.drawHexagon(c);
            break;
        default:
            this.drawCircle(c); // Fallback
    }
    
    c.fill();
    c.stroke();

    // Draw the text
    drawText(c, this.text, this.x, this.y, null, selectedObject == this);

    // Draw accept state indicator (double border)
    if(this.isAcceptState) {
        this.drawAcceptState(c);
    }
};
```

#### 1.3 Add Shape Drawing Helper Methods
**File**: `src/elements/node.js`

Add individual drawing methods for each shape:
```javascript
Node.prototype.drawCircle = function(c) {
    c.arc(this.x, this.y, nodeRadius, 0, 2 * Math.PI, false);
};

Node.prototype.drawTriangle = function(c) {
    var r = nodeRadius;
    var x = this.x, y = this.y;
    c.moveTo(x, y - r);
    c.lineTo(x - r * Math.cos(Math.PI/6), y + r * Math.sin(Math.PI/6));
    c.lineTo(x + r * Math.cos(Math.PI/6), y + r * Math.sin(Math.PI/6));
    c.closePath();
};

Node.prototype.drawSquare = function(c) {
    var r = nodeRadius * 0.85; // Slightly smaller to maintain visual balance
    c.rect(this.x - r, this.y - r, 2 * r, 2 * r);
};

Node.prototype.drawPentagon = function(c) {
    this.drawRegularPolygon(c, 5);
};

Node.prototype.drawHexagon = function(c) {
    this.drawRegularPolygon(c, 6);
};

Node.prototype.drawRegularPolygon = function(c, sides) {
    var r = nodeRadius;
    var x = this.x, y = this.y;
    var angle = -Math.PI / 2; // Start from top
    
    c.moveTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
    for(var i = 1; i < sides; i++) {
        angle += 2 * Math.PI / sides;
        c.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
    }
    c.closePath();
};

Node.prototype.drawAcceptState = function(c) {
    c.beginPath();
    var innerRadius = nodeRadius - 6;
    switch(this.shape) {
        case 'circle':
            c.arc(this.x, this.y, innerRadius, 0, 2 * Math.PI, false);
            break;
        case 'triangle':
            // Scale down triangle
            var r = innerRadius;
            var x = this.x, y = this.y;
            c.moveTo(x, y - r);
            c.lineTo(x - r * Math.cos(Math.PI/6), y + r * Math.sin(Math.PI/6));
            c.lineTo(x + r * Math.cos(Math.PI/6), y + r * Math.sin(Math.PI/6));
            c.closePath();
            break;
        case 'square':
            var r = innerRadius * 0.85;
            c.rect(this.x - r, this.y - r, 2 * r, 2 * r);
            break;
        case 'pentagon':
            this.drawAcceptStatePolygon(c, 5, innerRadius);
            break;
        case 'hexagon':
            this.drawAcceptStatePolygon(c, 6, innerRadius);
            break;
    }
    c.stroke();
};

Node.prototype.drawAcceptStatePolygon = function(c, sides, radius) {
    var r = radius;
    var x = this.x, y = this.y;
    var angle = -Math.PI / 2;
    
    c.moveTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
    for(var i = 1; i < sides; i++) {
        angle += 2 * Math.PI / sides;
        c.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
    }
    c.closePath();
};
```

#### 1.4 Update Hit Detection for Non-Circular Shapes
**File**: `src/elements/node.js`

Replace `containsPoint` method to handle different shapes:
```javascript
Node.prototype.containsPoint = function(x, y) {
    switch(this.shape) {
        case 'circle':
            return (x - this.x)*(x - this.x) + (y - this.y)*(y - this.y) < nodeRadius*nodeRadius;
        case 'triangle':
            return this.pointInTriangle(x, y);
        case 'square':
            var r = nodeRadius * 0.85;
            return Math.abs(x - this.x) < r && Math.abs(y - this.y) < r;
        case 'pentagon':
            return this.pointInPolygon(x, y, 5);
        case 'hexagon':
            return this.pointInPolygon(x, y, 6);
        default:
            return (x - this.x)*(x - this.x) + (y - this.y)*(y - this.y) < nodeRadius*nodeRadius;
    }
};

Node.prototype.pointInTriangle = function(px, py) {
    var r = nodeRadius;
    var x = this.x, y = this.y;
    
    // Triangle vertices
    var x1 = x, y1 = y - r;
    var x2 = x - r * Math.cos(Math.PI/6), y2 = y + r * Math.sin(Math.PI/6);
    var x3 = x + r * Math.cos(Math.PI/6), y3 = y + r * Math.sin(Math.PI/6);
    
    // Barycentric coordinates method
    var denom = (y2 - y3)*(x1 - x3) + (x3 - x2)*(y1 - y3);
    var a = ((y2 - y3)*(px - x3) + (x3 - x2)*(py - y3)) / denom;
    var b = ((y3 - y1)*(px - x3) + (x1 - x3)*(py - y3)) / denom;
    var c = 1 - a - b;
    
    return a >= 0 && b >= 0 && c >= 0;
};

Node.prototype.pointInPolygon = function(px, py, sides) {
    var r = nodeRadius;
    var x = this.x, y = this.y;
    var vertices = [];
    var angle = -Math.PI / 2;
    
    // Generate vertices
    for(var i = 0; i < sides; i++) {
        vertices.push({
            x: x + r * Math.cos(angle),
            y: y + r * Math.sin(angle)
        });
        angle += 2 * Math.PI / sides;
    }
    
    // Ray casting algorithm
    var inside = false;
    for(var i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        var vi = vertices[i], vj = vertices[j];
        if(((vi.y > py) != (vj.y > py)) && 
           (px < (vj.x - vi.x) * (py - vi.y) / (vj.y - vi.y) + vi.x)) {
            inside = !inside;
        }
    }
    return inside;
};
```

#### 1.5 Update Link Connection Points
**File**: `src/elements/node.js`

Update `closestPointOnCircle` to work with different shapes:
```javascript
Node.prototype.closestPointOnCircle = function(x, y) {
    if(this.shape === 'circle') {
        // Original circular logic
        var dx = x - this.x;
        var dy = y - this.y;
        var scale = Math.sqrt(dx * dx + dy * dy);
        return {
            'x': this.x + dx * nodeRadius / scale,
            'y': this.y + dy * nodeRadius / scale,
        };
    } else {
        // For polygons, find closest edge point
        return this.closestPointOnShape(x, y);
    }
};

Node.prototype.closestPointOnShape = function(x, y) {
    switch(this.shape) {
        case 'triangle':
            return this.closestPointOnTriangle(x, y);
        case 'square':
            return this.closestPointOnSquare(x, y);
        case 'pentagon':
            return this.closestPointOnPolygon(x, y, 5);
        case 'hexagon':
            return this.closestPointOnPolygon(x, y, 6);
        default:
            // Fallback to circle
            var dx = x - this.x;
            var dy = y - this.y;
            var scale = Math.sqrt(dx * dx + dy * dy);
            return {
                'x': this.x + dx * nodeRadius / scale,
                'y': this.y + dy * nodeRadius / scale,
            };
    }
};

// Implementation details for closestPointOnTriangle, closestPointOnSquare, 
// and closestPointOnPolygon methods would follow similar patterns
```

### Phase 2: Keyboard Modifier Detection

#### 2.1 Add Shape Modifier Variables
**File**: `src/main/fsm.js`

Add global variables to track shape modifier keys:
```javascript
var shift = false;
var shapeModifier = null; // Will store the number key pressed (3, 4, 5, 6)
```

#### 2.2 Update Keydown Handler
**File**: `src/main/fsm.js`

Extend the existing `document.onkeydown` function:
```javascript
document.onkeydown = function(e) {
    var key = crossBrowserKey(e);

    if(key == 16) {
        shift = true;
    } else if(key >= 49 && key <= 54) { // Keys 1, 3, 4, 5, 6 (skip 2 for future use)
        if(key === 50) return; // Skip key 2 for now
        shapeModifier = key - 48; // Convert keycode to number (1, 3, 4, 5, 6)
    } else if(!canvasHasFocus()) {
        // don't read keystrokes when other things have focus
        return true;
    } else if(key == 8) { // backspace key
        // ... existing backspace logic
    } else if(key == 46) { // delete key
        // ... existing delete logic
    }
};
```

#### 2.3 Update Keyup Handler
**File**: `src/main/fsm.js`

Extend the existing `document.onkeyup` function:
```javascript
document.onkeyup = function(e) {
    var key = crossBrowserKey(e);

    if(key == 16) {
        shift = false;
    } else if(key >= 49 && key <= 54 && key !== 50) { // Keys 1, 3, 4, 5, 6 (skip 2)
        shapeModifier = null;
    }
};
```

### Phase 3: Update Node Creation Logic

#### 3.1 Modify Double-Click Handler
**File**: `src/main/fsm.js`

Update the `canvas.ondblclick` function to use shape modifiers:
```javascript
canvas.ondblclick = function(e) {
    var mouse = crossBrowserRelativeMousePos(e);
    selectedObject = selectObject(mouse.x, mouse.y);

    if(selectedObject == null) {
        // Create new node with specified shape
        var shape = getShapeFromModifier(shapeModifier);
        selectedObject = new Node(mouse.x, mouse.y, shape);
        nodes.push(selectedObject);
        resetCaret();
        draw();
    } else if(selectedObject instanceof Node) {
        if(shapeModifier != null) {
            // Change existing node to specific shape
            selectedObject.shape = getShapeFromModifier(shapeModifier);
        } else {
            // Cycle through accept state and shapes
            cycleNodeAppearance(selectedObject);
        }
        draw();
    }
};
```

#### 3.2 Add Helper Functions
**File**: `src/main/fsm.js`

Add utility functions for shape management:
```javascript
function getShapeFromModifier(modifier) {
    switch(modifier) {
        case 1: return 'circle';
        case 3: return 'triangle';
        case 4: return 'square';
        case 5: return 'pentagon';
        case 6: return 'hexagon';
        default: return 'circle'; // Default fallback
    }
}

function cycleNodeAppearance(node) {
    if(!node.isAcceptState && node.shape === 'circle') {
        // First click: make accept state
        node.isAcceptState = true;
    } else if(node.isAcceptState && node.shape === 'circle') {
        // Second click: triangle, still accept state
        node.shape = 'triangle';
    } else if(node.isAcceptState && node.shape === 'triangle') {
        // Third click: square, still accept state
        node.shape = 'square';
    } else if(node.isAcceptState && node.shape === 'square') {
        // Fourth click: pentagon, still accept state
        node.shape = 'pentagon';
    } else if(node.isAcceptState && node.shape === 'pentagon') {
        // Fifth click: hexagon, still accept state
        node.shape = 'hexagon';
    } else if(node.isAcceptState && node.shape === 'hexagon') {
        // Sixth click: back to circle, not accept state
        node.isAcceptState = false;
        node.shape = 'circle';
    } else {
        // Fallback: reset to circle, not accept state
        node.isAcceptState = false;
        node.shape = 'circle';
    }
}
```

### Phase 4: Update Serialization/Persistence

#### 4.1 Update JSON Save/Load
**File**: `src/main/save.js` and related functions

Ensure the `shape` property is included in serialization:
```javascript
// In saveBackup() function, ensure node.shape is serialized
// In restoreBackup() function, ensure node.shape is restored
// In downloadAsJSON() function, include shape in export
// In importFromJSON() function, handle shape property with fallback
```

#### 4.2 Update Export Functions
**Files**: `src/export_as/svg.js`, `src/export_as/latex.js`

Modify export functions to handle different shapes:
- SVG export: Use appropriate SVG elements (polygon, rect, circle)
- LaTeX export: Use appropriate TikZ commands for different shapes

### Phase 5: User Interface Updates

#### 5.1 Update Controls Documentation
**File**: `www/index.html`

Update the controls list to include shape information:
```html
<li><b>Add state:</b> double-click</li>
<li><b>Add circle:</b> hold 1 + double-click</li>
<li><b>Add triangle:</b> hold 3 + double-click</li>
<li><b>Add square:</b> hold 4 + double-click</li>
<li><b>Add pentagon:</b> hold 5 + double-click</li>
<li><b>Add hexagon:</b> hold 6 + double-click</li>
<li><b>Change shape:</b> hold number + double-click node</li>
<li><b>Cycle appearance:</b> double-click node</li>
```

#### 5.2 Add Visual Feedback (Optional Enhancement)
Consider adding a status indicator showing current shape mode when modifier keys are held.

## Implementation Checklist

### Phase 1: Node Class Updates
- [ ] 1.1. Add shape property to Node constructor
- [ ] 1.2. Replace Node.prototype.draw with shape-aware version
- [ ] 1.3. Implement individual shape drawing methods
- [ ] 1.4. Update containsPoint for different shapes
- [ ] 1.5. Update closestPointOnCircle for link connections

### Phase 2: Keyboard Detection
- [ ] 2.1. Add shapeModifier global variable
- [ ] 2.2. Extend keydown handler for number keys 1, 3-6 (skip 2)
- [ ] 2.3. Extend keyup handler for number keys 1, 3-6 (skip 2)

### Phase 3: Node Creation Logic
- [ ] 3.1. Update canvas.ondblclick handler
- [ ] 3.2. Add getShapeFromModifier helper function
- [ ] 3.3. Add cycleNodeAppearance helper function

### Phase 4: Persistence
- [ ] 4.1. Update saveBackup/restoreBackup functions
- [ ] 4.2. Update JSON import/export functions
- [ ] 4.3. Update SVG export for shapes
- [ ] 4.4. Update LaTeX export for shapes

### Phase 5: UI Updates
- [ ] 5.1. Update controls documentation in index.html
- [ ] 5.2. Test all functionality
- [ ] 5.3. Update build process if needed

## Testing Strategy

### Basic Shape Creation
1. Test creating each shape type with appropriate modifier keys (1, 3, 4, 5, 6)
2. Test that double-click without modifiers defaults to circle
3. Test that Hold 1 + double-click creates circle (explicit)
4. Verify hit detection works for all shapes
5. Test link connections to different shapes

### Shape Cycling
1. Test double-click cycling through accept state and shapes
2. Test modifier + double-click for direct shape changes
3. Verify behavior consistency

### Integration Testing
1. Test save/load with different shapes
2. Test export functionality (JSON, SVG, LaTeX)
3. Test with existing saved files (backward compatibility)

### Edge Cases
1. Multiple rapid double-clicks
2. Modifier keys held during other operations
3. Shape changes on nodes with existing links

## Future Enhancements

1. **More shapes**: Add ellipse, diamond, star shapes
2. **Shape palette UI**: Visual shape selection toolbar
3. **Shape-specific styling**: Different colors/styles per shape
4. **Custom shape sizes**: Ability to resize individual shapes
5. **Shape grouping**: Templates with predefined shape combinations

## Backward Compatibility

- Default node creation (no modifier) remains unchanged
- Existing saved files will load with all nodes as circles
- Export formats will gracefully handle missing shape properties
- All existing keyboard shortcuts continue to work

## Performance Considerations

- Shape drawing uses efficient Canvas2D path operations
- Hit detection algorithms are optimized for real-time interaction
- Polygon point-in-polygon tests use standard ray-casting algorithm
- Link connection calculations cached where appropriate