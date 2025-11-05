# Plan: Centralize Color Management System

## Problem Statement

Currently, color mappings are defined in multiple locations throughout the codebase, leading to inconsistencies between:
1. The keyboard modifier guide (info box) showing color previews
2. The actual node colors rendered on canvas
3. The mini-nodes displayed in the legend
4. Edge/link colors

The color hex codes are hardcoded in three separate locations:
- `Node.prototype.getBaseColor()` and `Node.prototype.getSelectedColor()` in `src/elements/node.js`
- `getLinkColorHex()` in `src/main/fsm.js`
- Inline styles in the keyboard guide in `www/index.html`

## Proposed Solution

Create a **single source of truth** for the color mapping system by:

### 1. Create Central Color Configuration Object

Add a new configuration object at the top of `src/main/fsm.js` (before any functions):

```javascript
// Color Configuration - Single Source of Truth
// Maps modifier key -> hex color code
var COLOR_CONFIG = {
	'A': '#ffff80',  // Yellow
	'S': '#80ff80',  // Green
	'D': '#8080ff',  // Blue
	'F': '#ff80ff',  // Pink
	'G': '#ffffff',  // White
	'Z': '#000000',  // Black
	'X': '#9ac29a',  // Gray
	'C': '#ff8080',  // Red
	'V': '#ffb380',  // Orange
	'B': '#c080ff'   // Purple
};
```

**Explanation:**
- Keys are the modifier keys (A, S, D, F, G, Z, X, C, V, B)
- Values are the hex color codes used everywhere (nodes, edges, keyboard guide, legend)
- Selection highlighting is handled by the blue aura system, not by color changes
- Color names in comments are just for human readability

### 2. Update Node Color Storage and Methods

Modify `src/elements/node.js`:

**Update the Node constructor to store the modifier key:**
```javascript
function Node(x, y, colorKey) {
	this.x = x;
	this.y = y;
	this.mouseOffsetX = 0;
	this.mouseOffsetY = 0;
	this.text = '';
	this.colorKey = colorKey || 'A'; // Default to 'A' (yellow)
}
```

**Replace both `Node.prototype.getBaseColor()` and `Node.prototype.getSelectedColor()` with a single method:**
```javascript
Node.prototype.getColor = function() {
	// Access global COLOR_CONFIG from fsm.js
	if (typeof COLOR_CONFIG !== 'undefined' && COLOR_CONFIG[this.colorKey]) {
		return COLOR_CONFIG[this.colorKey];
	}
	return '#ffff80'; // Fallback to yellow (A)
};
```

**Remove the old `getBaseColor()` and `getSelectedColor()` methods entirely** - they are no longer needed since selection is shown with the blue aura.

**Note:** The `node.colorKey` property now stores the modifier key (e.g., 'A', 'S', 'D') instead of color names.

### 3. Update Link Color Function

Modify `getLinkColorHex()` in `src/main/fsm.js`:

```javascript
function getLinkColorHex(colorModifier) {
	if (COLOR_CONFIG[colorModifier]) {
		return COLOR_CONFIG[colorModifier];
	}
	return '#9ac29a'; // Default to engineering green (X)
}
```

**Note:** Function parameter renamed from `colorName` to `colorModifier` to reflect that it now receives modifier keys.

### 4. Update Keyboard Guide in HTML

Replace the hardcoded inline styles in `www/index.html` with dynamically generated content:

**Add a new function in the `<script>` section:**
```javascript
function generateKeyboardGuide() {
	var guideLine1 = [
		{ colorKey: 'A', color: COLOR_CONFIG['A'] },
		{ colorKey: 'S', color: COLOR_CONFIG['S'] },
		{ colorKey: 'D', color: COLOR_CONFIG['D'] },
		{ colorKey: 'F', color: COLOR_CONFIG['F'] },
		{ colorKey: 'G', color: COLOR_CONFIG['G'] }
	];
	
	var guideLine2 = [
		{ colorKey: 'Z', color: COLOR_CONFIG['Z'] },
		{ colorKey: 'X', color: COLOR_CONFIG['X'] },
		{ colorKey: 'C', color: COLOR_CONFIG['C'] },
		{ colorKey: 'V', color: COLOR_CONFIG['V'] },
		{ colorKey: 'B', color: COLOR_CONFIG['B'] }
	];
	
	return { line1: guideLine1, line2: guideLine2 };
}
```

**Then update the keyboard guide rendering** to use this function instead of hardcoded values.

### 5. Update `getColorFromModifier()` Function

Simplify the function in `src/main/fsm.js` - it now just returns the modifier key itself:

```javascript
function getColorFromModifier(modifier) {
	// Just return the modifier key - it's already the identifier
	// Return 'A' (yellow) as default if invalid key
	return COLOR_CONFIG[modifier] ? modifier : 'A';
}
```

**Important:** This function now returns the modifier key (e.g., 'A', 'S', 'D') not a color name, since modifier keys are now the identifiers stored in `node.color`.

### 6. Update All References to Color Methods and Properties

Search the codebase for any references to:
- `node.getBaseColor()` - replace with `node.getColor()`
- `node.getSelectedColor()` - replace with `node.getColor()`
- `node.color` - replace with `node.colorKey`
- `link.color` - replace with `link.colorKey`
- Any conditional logic based on selection state for colors - remove it (blue aura handles selection)

### 7. 
Update save/load functions to:
- **Save**: Use `colorKey` property with modifier keys
- **Load**: Read `colorKey` property with modifier keys

### 8. Rebuild Process

After making changes:
1. Run `python3 build_fsm.py` to regenerate `www/built-fsm.js`
2. Test all color-related functionality:
   - Node creation with color modifiers
   - Color changes on selected nodes (same color, just blue aura)
   - Legend mini-nodes
   - Keyboard guide display
   - Link/edge colors

## Benefits

1. **Single Source of Truth**: All colors defined in one place (`COLOR_CONFIG`)
2. **Consistency**: Guaranteed matching between info box, nodes, legend, and edges
3. **Simplicity**: One color per modifier key, no base/selected/display confusion
4. **Maintainability**: Easy to add new colors or adjust existing ones
5. **Reduced Errors**: No possibility of forgetting to update one location
6. **Cleaner Code**: Removes unnecessary color variation logic since blue aura handles selection

## Files to Modify

1. `src/main/fsm.js` - Add `COLOR_CONFIG` object and update color-related functions
2. `src/elements/node.js` - Update constructor and color methods
3. `src/main/save.js` - Update save/load to use `colorKey` property
4. `www/index.html` - Update keyboard guide generation (or wait for rebuild)
5. `src/elements/link.js`, `src/elements/self_link.js`, `src/elements/start_link.js` - Update if they reference color properties
6. Run `build_fsm.py` to rebuild the application

## Example: Before and After

### Before (Old Format with Color Names)
```json
{
  "nodes": [
    {
      "id": 0,
      "x": 613,
      "y": 1466,
      "text": "a",
      "color": "yellow"
    },
    {
      "id": 1,
      "x": 685,
      "y": 1460,
      "text": "s",
      "color": "green"
    },
    {
      "id": 2,
      "x": 770,
      "y": 1455,
      "text": "d",
      "color": "blue"
    }
  ],
  "links": [
    {
      "text": "",
      "arrowType": "arrow",
      "color": "gray",
      "type": "Link",
      "nodeA": 0,
      "nodeB": 1
    }
  ]
}
```

### After (New Format with Modifier Keys)
```json
{
  "nodes": [
    {
      "id": 0,
      "x": 613,
      "y": 1466,
      "text": "a",
      "colorKey": "A"
    },
    {
      "id": 1,
      "x": 685,
      "y": 1460,
      "text": "s",
      "colorKey": "S"
    },
    {
      "id": 2,
      "x": 770,
      "y": 1455,
      "text": "d",
      "colorKey": "D"
    }
  ],
  "links": [
    {
      "text": "",
      "arrowType": "arrow",
      "colorKey": "X",
      "type": "Link",
      "nodeA": 0,
      "nodeB": 1
    }
  ]
}
```

**Key Changes:**
- Property name: `"color"` → `"colorKey"` to clarify it stores a modifier key
- Node colors: `"yellow"` → `"A"`, `"green"` → `"S"`, `"blue"` → `"D"`, etc.
- Link colors: `"gray"` → `"X"`, `"red"` → `"C"`, etc.
- All color identifiers are now single-character modifier keys

## Testing Checklist

- [ ] Keyboard guide colors match actual node colors exactly
- [ ] All 10 color modifiers work correctly (A, S, D, F, G, Z, X, C, V, B)
- [ ] Legend mini-nodes show correct colors
- [ ] Selected nodes show blue aura but keep their original color
- [ ] Link/edge colors match their respective modifiers
- [ ] Save/load preserves colors correctly with new `colorKey` property
- [ ] No console errors after rebuild
- [ ] No visual difference between selected and unselected nodes except for blue aura
- [ ] Node `colorKey` property contains modifier keys ('A', 'S', etc.) not color names
- [ ] Saved JSON files use `colorKey` not `color`
