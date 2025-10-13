# Node Color Implementation Plan

## Overview
Add pastel post-it note colors to FSM nodes using a key modifier system similar to the existing shape functionality. Users will be able to hold letter keys (Q/W/E/R/T) + double-click to create colored nodes or change existing node colors.

## Current State Analysis
- **Existing Colors**: Yellow post-it color already implemented (`#fff2a8`)
- **Shape System**: Already uses number keys (1,3,4,5,6) + double-click for shapes
- **Node Class**: Has shape property, can be extended to include color property
- **Key System**: Uses `shapeModifier` variable to track held keys

## Proposed Color Palette
**5 Pastel Post-it Colors:**
1. **Yellow** (existing): `#fff2a8` - Default/current color
2. **Green**: `#c8e6c9` - Soft mint green
3. **Blue**: `#bbdefb` - Light sky blue  
4. **Pink**: `#f8bbd9` - Soft rose pink
5. **Purple**: `#e1bee7` - Light lavender
6. **Orange**: `#ffe0b2` - Warm peach

**Key Mappings:**
- **Q** → Green (mint)
- **W** → Blue (sky)
- **E** → Pink (rose)
- **R** → Purple (lavender)  
- **T** → Orange (peach)
- **Default** → Yellow (existing)

## Implementation Phases

### Phase 1: Node Color Property System ✅ COMPLETED
**Goal**: Add color support to Node class and drawing system

**Status**: Successfully implemented with 6 pastel post-it colors

**Changes Completed**:
1. ✅ Added `color` property to Node constructor with default 'yellow'
2. ✅ Created getBaseColor() and getSelectedColor() methods for all 6 colors
3. ✅ Updated Node drawing logic to use dynamic colors instead of hardcoded yellow
4. ✅ Ensured text remains readable on all color backgrounds

**Files Modified**:
- `src/elements/node.js`: Added color property and color methods
- `src/main/fsm.js`: Updated drawing logic to use node color methods

### Phase 2: Color Modifier Key System ✅ COMPLETED
**Goal**: Implement letter key detection parallel to shape modifier system

**Status**: Successfully implemented with Q/W/E/R/T key detection

**Changes Completed**:
1. ✅ Added `colorModifier` global variable to track held letter keys
2. ✅ Extended keydown/keyup handlers to detect Q/W/E/R/T keys
3. ✅ Created `getColorFromModifier()` function mapping keys to colors
4. ✅ Ensured color and shape modifiers work independently

**Files Modified**:
- `src/main/fsm.js`: Key handling and color mapping logic

### Phase 3: Node Creation & Modification Integration ✅ COMPLETED
**Goal**: Apply colors during node creation and modification

**Status**: Successfully implemented with full shape + color combination support

**Changes Completed**:
1. ✅ Updated double-click node creation to apply color from modifier
2. ✅ Updated double-click existing node to change color if modifier held
3. ✅ Added support for simultaneous shape + color modifications
4. ✅ Enhanced cycling to only toggle accept state when no modifiers held

**Files Modified**:
- `src/main/fsm.js`: Double-click handlers and modifier logic

### Phase 4: Export/Import Compatibility
**Goal**: Ensure colors persist in saved/loaded files

**Changes Required**:
1. Include color property in JSON export
2. Handle color property during JSON import
3. Provide backward compatibility for files without color
4. Update LaTeX export to handle colored nodes appropriately

**Files to Modify**:
- `src/main/fsm.js`: Save/load functions

### Phase 5: UI Documentation Update ✅ COMPLETED
**Goal**: Update controls to document color functionality

**Status**: Successfully updated with clear color control documentation

**Changes Completed**:
1. ✅ Added color controls to the UI help box with key mappings
2. ✅ Updated planning documentation to reflect completed status

**Files Modified**:
- `www/index.html`: Added "Node color: hold Q|W|E|R|T + double-click" entry
- `shared_context/plan_node_colors.md`: Updated completion status

## Technical Implementation Details

### Node Color Property
```javascript
function Node(x, y, shape, color) {
    this.x = x;
    this.y = y;
    this.mouseOffsetX = 0;
    this.mouseOffsetY = 0;
    this.isAcceptState = false;
    this.text = '';
    this.shape = shape || 'circle';
    this.color = color || 'yellow'; // Default to existing yellow
}
```

### Color Drawing Logic
```javascript
Node.prototype.getBaseColor = function() {
    switch(this.color) {
        case 'green': return '#c8e6c9';    // Soft mint green
        case 'blue': return '#bbdefb';     // Light sky blue
        case 'pink': return '#f8bbd9';     // Soft rose pink
        case 'purple': return '#e1bee7';   // Light lavender
        case 'orange': return '#ffe0b2';   // Warm peach
        case 'yellow':
        default: return '#fff2a8';         // Yellow post-it (existing)
    }
};

Node.prototype.getSelectedColor = function() {
    switch(this.color) {
        case 'green': return '#a5d6a7';    // Darker green for selection
        case 'blue': return '#90caf9';     // Darker blue for selection
        case 'pink': return '#f48fb1';     // Darker pink for selection
        case 'purple': return '#ce93d8';   // Darker purple for selection
        case 'orange': return '#ffcc80';   // Darker orange for selection
        case 'yellow':
        default: return '#ffcc66';         // Existing yellow selection color
    }
};
```

### Color Modifier System
```javascript
var colorModifier = null; // Will store the letter key pressed (Q/W/E/R/T)

// In keydown handler:
if(key == 81) colorModifier = 'Q';      // Q for green
else if(key == 87) colorModifier = 'W'; // W for blue  
else if(key == 69) colorModifier = 'E'; // E for pink
else if(key == 82) colorModifier = 'R'; // R for purple
else if(key == 84) colorModifier = 'T'; // T for orange

function getColorFromModifier(modifier) {
    switch(modifier) {
        case 'Q': return 'green';
        case 'W': return 'blue';
        case 'E': return 'pink';
        case 'R': return 'purple';
        case 'T': return 'orange';
        default: return 'yellow';
    }
}
```

### Double-Click Integration
```javascript
// In double-click handler:
if(selectedObject == null) {
    var shape = getShapeFromModifier(shapeModifier);
    var color = getColorFromModifier(colorModifier);
    selectedObject = new Node(worldMouse.x, worldMouse.y, shape, color);
    nodes.push(selectedObject);
} else if(selectedObject instanceof Node) {
    if(shapeModifier != null) {
        selectedObject.shape = getShapeFromModifier(shapeModifier);
    }
    if(colorModifier != null) {
        selectedObject.color = getColorFromModifier(colorModifier);
    }
    if(shapeModifier == null && colorModifier == null) {
        // Existing cycling behavior for accept state
        cycleNodeAppearance(selectedObject);
    }
}
```

### Color Cycling Enhancement
```javascript
function cycleNodeAppearance(node) {
    // First toggle accept state
    if (!node.isAcceptState) {
        node.isAcceptState = true;
        return;
    }
    
    // Then cycle through colors
    var colors = ['yellow', 'green', 'blue', 'pink', 'purple', 'orange'];
    var currentIndex = colors.indexOf(node.color);
    var nextIndex = (currentIndex + 1) % colors.length;
    node.color = colors[nextIndex];
    
    // Reset accept state when cycling colors
    node.isAcceptState = false;
}
```

### Export/Import Updates
```javascript
// Export node data
var nodeData = {
    x: node.x,
    y: node.y,
    text: node.text,
    isAcceptState: node.isAcceptState,
    shape: node.shape,
    color: node.color || 'yellow' // Backward compatibility
};

// Import node data  
var node = new Node(nodeData.x, nodeData.y, nodeData.shape, nodeData.color);
```

## User Experience Design

### Key Combinations
- **Hold Q + Double-click**: Create green node / Change to green
- **Hold W + Double-click**: Create blue node / Change to blue  
- **Hold E + Double-click**: Create pink node / Change to pink
- **Hold R + Double-click**: Create purple node / Change to purple
- **Hold T + Double-click**: Create orange node / Change to orange
- **Double-click (no modifier)**: Create yellow node / Cycle appearance

### Multi-Modifier Support
- **Hold 3 + Q + Double-click**: Create green triangle
- **Hold 5 + E + Double-click**: Create pink pentagon
- **Hold any number + any letter**: Combine shape and color

### Visual Feedback
- Cursor changes or brief color preview when modifier held (optional)
- Smooth color transitions when changing existing nodes
- Clear visual distinction between all colors

## Accessibility Considerations

### Color Contrast
- Ensure black text remains readable on all pastel backgrounds
- Test with color vision deficiency simulators
- Consider adding subtle patterns or textures as backup visual cues

### Keyboard Shortcuts
- Choose letters that are memorable (Q=Green, W=Water/Blue, E=rEd/Pink, R=puRple, T=Tangerine/Orange)
- Avoid conflicts with existing browser shortcuts
- Document clearly in UI

## Testing Strategy

### Visual Testing
- Test all color combinations with different shapes
- Verify selected state colors work correctly
- Check text readability on all backgrounds
- Test on different displays and color profiles

### Functional Testing  
- Create nodes with all color combinations
- Change existing node colors
- Test simultaneous shape + color modification
- Verify export/import preserves colors
- Test backward compatibility with old files

### User Testing
- Intuitive color key mapping
- Easy to remember shortcuts
- Effective visual distinction between colors
- Pleasant aesthetic with existing UI

## Future Enhancements

### Advanced Color Features
- Custom color picker for additional colors
- Color themes or palettes
- Node color affects link colors
- Gradient or pattern fills

### Enhanced UI
- Color palette preview in controls
- Visual key mapping guide
- Color legend/key for complex diagrams
- Bulk color changes for multiple nodes

## Success Metrics

1. **Functionality**: All 6 colors work correctly with all shapes
2. **Usability**: Intuitive key mappings that users can remember
3. **Compatibility**: Seamless export/import with color preservation
4. **Performance**: No impact on drawing or interaction speed
5. **Aesthetics**: Pleasant, professional-looking color palette

## Risk Mitigation

### Key Conflict Risks
- **Risk**: Interfering with browser shortcuts
- **Mitigation**: Choose safe letter keys, test across browsers
- **Fallback**: Alternative key mappings if needed

### Visual Accessibility Risks  
- **Risk**: Colors too similar or poor contrast
- **Mitigation**: Test with accessibility tools and diverse users
- **Fallback**: Adjust palette based on testing feedback

### Performance Risks
- **Risk**: Color system slowing down large diagrams
- **Mitigation**: Efficient color lookup and caching
- **Fallback**: Optimize drawing pipeline if needed

## Conclusion

This color system will enhance the FSM editor by adding visual organization capabilities through an intuitive post-it note color scheme. The implementation follows established patterns from the shape system, ensuring consistency and maintainability while providing users with a powerful tool for categorizing and organizing their state machines visually.