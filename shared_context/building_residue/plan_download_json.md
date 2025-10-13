# Plan for Download JSON Document Feature

## Goal
Add a "Download JSON" button that creates and downloads a `.json` file containing all FSM diagram data (nodes, links, positions, text, states) in a structured format that could be used to recreate the graph in the future. This export will capture the complete state of the FSM diagram in a machine-readable format.

## Current State Analysis
- The application maintains state in global arrays `nodes[]` and `links[]` in `/src/main/fsm.js`
- Node objects contain: `x`, `y`, `text`, `isAcceptState`, and other properties
- Link objects contain: `nodeA`, `nodeB`, `text`, `parallelPart`, `perpendicularPart`, and type-specific properties
- SelfLink objects contain: `node`, `text`, `anchorAngle` 
- StartLink objects contain: `node`, `text`, `deltaX`, `deltaY`
- Existing save/restore functionality in `/src/main/save.js` already serializes to localStorage
- PNG and SVG export buttons already implement file download functionality using blob creation
- LaTeX download feature serves as a template for the download mechanism

## Implementation Plan

### Step 1: Create JSON Export Function
Create a new function `downloadAsJSON()` in `/src/main/fsm.js` that:
1. Serializes all nodes and links into a structured JSON format
2. Creates a text blob from the JSON content  
3. Triggers download using the same pattern as other export functions

**JSON Structure Design:**
```json
{
  "version": "1.0",
  "created": "2025-09-20T12:00:00.000Z",
  "canvas": {
    "width": 800,
    "height": 600
  },
  "nodes": [
    {
      "id": 0,
      "x": 200,
      "y": 150,
      "text": "q0",
      "isAcceptState": false
    },
    {
      "id": 1, 
      "x": 400,
      "y": 150,
      "text": "q1",
      "isAcceptState": true
    }
  ],
  "links": [
    {
      "type": "Link",
      "nodeA": 0,
      "nodeB": 1,
      "text": "a",
      "parallelPart": 0.5,
      "perpendicularPart": 0,
      "lineAngleAdjust": 0
    },
    {
      "type": "SelfLink",
      "node": 1,
      "text": "b",
      "anchorAngle": 0
    },
    {
      "type": "StartLink", 
      "node": 0,
      "text": "",
      "deltaX": -50,
      "deltaY": 0
    }
  ]
}
```

**Checklist:**
- [ ] Open `/src/main/fsm.js` file
- [ ] Add the new `downloadAsJSON()` function after existing export functions
- [ ] Implement node serialization with unique IDs
- [ ] Implement link serialization with node references by ID
- [ ] Handle different link types (Link, SelfLink, StartLink)
- [ ] Add metadata (version, timestamp, canvas dimensions)
- [ ] Create blob with `application/json` MIME type
- [ ] Use filename `fsm-diagram.json` for the download
- [ ] Test function compiles without errors

### Step 2: Add Download Button to UI
Modify `/www/index.html` to add JSON export option:
- Add to the export line: `<a href="javascript:downloadAsJSON()">Download JSON</a>`

**Checklist:**
- [ ] Open `/www/index.html` file
- [ ] Locate the export line (around line 157)
- [ ] Add the JSON download link with proper spacing
- [ ] Verify HTML syntax is correct
- [ ] Ensure formatting is consistent with other export buttons

### Step 3: Implementation Details

#### New Function Structure (add to `/src/main/fsm.js`):
```javascript
function downloadAsJSON() {
	// Create node ID mapping for link references
	var nodeIdMap = new Map();
	var jsonNodes = [];
	
	// Serialize nodes with unique IDs
	for (var i = 0; i < nodes.length; i++) {
		var node = nodes[i];
		var nodeId = i;
		nodeIdMap.set(node, nodeId);
		
		jsonNodes.push({
			id: nodeId,
			x: node.x,
			y: node.y, 
			text: node.text,
			isAcceptState: node.isAcceptState
		});
	}
	
	// Serialize links with node ID references
	var jsonLinks = [];
	for (var i = 0; i < links.length; i++) {
		var link = links[i];
		var linkData = {
			text: link.text
		};
		
		// Handle different link types
		if (link instanceof SelfLink) {
			linkData.type = 'SelfLink';
			linkData.node = nodeIdMap.get(link.node);
			linkData.anchorAngle = link.anchorAngle;
		} else if (link instanceof StartLink) {
			linkData.type = 'StartLink';
			linkData.node = nodeIdMap.get(link.node);
			linkData.deltaX = link.deltaX;
			linkData.deltaY = link.deltaY;
		} else if (link instanceof Link) {
			linkData.type = 'Link';
			linkData.nodeA = nodeIdMap.get(link.nodeA);
			linkData.nodeB = nodeIdMap.get(link.nodeB);
			linkData.parallelPart = link.parallelPart;
			linkData.perpendicularPart = link.perpendicularPart;
			linkData.lineAngleAdjust = link.lineAngleAdjust || 0;
		}
		
		jsonLinks.push(linkData);
	}
	
	// Create complete JSON structure
	var jsonData = {
		version: '1.0',
		created: new Date().toISOString(),
		canvas: {
			width: canvas.width,
			height: canvas.height
		},
		nodes: jsonNodes,
		links: jsonLinks
	};
	
	// Convert to JSON string with formatting
	var jsonString = JSON.stringify(jsonData, null, 2);
	
	// Create JSON blob for download
	var blob = new Blob([jsonString], {type: 'application/json'});
	var url = URL.createObjectURL(blob);
	
	// Create temporary anchor element for download
	var link = document.createElement('a');
	link.href = url;
	link.download = 'fsm-diagram.json';
	
	// Trigger download
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
```

### Step 4: Build and Test
1. Run build system: `python3 build_fsm.py`
2. Test JSON download functionality:
   - Create FSM diagram with various elements
   - Click "Download JSON" button
   - Verify file downloads correctly
   - Validate JSON structure and content

**Checklist:**
- [ ] Run `python3 build_fsm.py` to rebuild
- [ ] Start local server: `cd www && python3 -m http.server 8000`
- [ ] Open browser to `http://localhost:8000`
- [ ] Create test FSM with nodes, regular links, self-links, and start link
- [ ] Test "Download JSON" button
- [ ] Verify `.json` file downloads with correct filename
- [ ] Open downloaded file and verify JSON structure
- [ ] Validate JSON syntax using online validator or `python -m json.tool`
- [ ] Check that all node properties are captured correctly
- [ ] Check that all link types are serialized properly
- [ ] Verify node ID references in links are correct
- [ ] Test with accept states (double circles)
- [ ] Test with text labels on nodes and links
- [ ] Test edge cases: empty diagram, single node, complex layouts

## Key Technical Notes
- **Node ID Mapping**: Use array indices as unique node IDs for link references
- **Link Type Detection**: Use `instanceof` checks to determine link types and serialize appropriate properties
- **JSON Structure**: Design for future import functionality with clear type identification
- **Metadata**: Include version and timestamp for format evolution
- **MIME Type**: Use `application/json` for proper JSON file handling
- **File Extension**: Use `.json` for standard JSON file association
- **Formatting**: Use `JSON.stringify()` with 2-space indentation for readability
- **Canvas Dimensions**: Include canvas size for potential recreation context

## Data Mapping Strategy

### Node Properties to Capture:
- **Position**: `x`, `y` coordinates for exact placement
- **Text**: `text` label displayed on the node
- **State Type**: `isAcceptState` boolean for accept/reject state distinction
- **Unique ID**: Generated array index for link references

### Link Properties by Type:

#### Regular Links (Link):
- **Connection**: `nodeA`, `nodeB` IDs for source and target nodes
- **Label**: `text` for transition label
- **Geometry**: `parallelPart`, `perpendicularPart` for curve shape
- **Adjustment**: `lineAngleAdjust` for fine-tuning

#### Self Links (SelfLink):
- **Target**: `node` ID for the looping node
- **Label**: `text` for transition label  
- **Position**: `anchorAngle` for loop placement

#### Start Links (StartLink):
- **Target**: `node` ID for the initial state
- **Label**: `text` (usually empty)
- **Offset**: `deltaX`, `deltaY` for arrow positioning

## Files to Modify
1. `/src/main/fsm.js` - Add `downloadAsJSON()` function
2. `/www/index.html` - Add JSON download button
3. Run `/build_fsm.py` to rebuild concatenated file

**Checklist:**
- [ ] Modify `/src/main/fsm.js`
- [ ] Modify `/www/index.html`
- [ ] Run build script
- [ ] Test functionality

## Success Criteria
- "Download JSON" button appears in the UI alongside other export options
- Clicking the button successfully downloads a `.json` file named `fsm-diagram.json`
- Downloaded JSON contains complete FSM state data
- JSON structure is well-formed and validates correctly
- All node positions, text, and accept states are preserved
- All link types and their properties are correctly serialized
- Node references in links use consistent ID system
- File can be opened and read in text editors and JSON viewers
- JSON structure is designed for future import functionality

**Final Verification Checklist:**
- [ ] JSON download button appears in UI
- [ ] Download produces correct `.json` file with proper filename
- [ ] JSON syntax is valid (test with JSON validator)
- [ ] All nodes serialized with complete properties
- [ ] All link types handled correctly (Link, SelfLink, StartLink)
- [ ] Node ID references in links are accurate
- [ ] Metadata includes version and timestamp
- [ ] Canvas dimensions are captured
- [ ] Accept states (double circles) are preserved
- [ ] Text labels on nodes and links are captured
- [ ] Empty diagrams handle gracefully
- [ ] Complex diagrams serialize completely
- [ ] No JavaScript errors in browser console
- [ ] MIME type is correct (`application/json`)
- [ ] Downloaded file opens correctly in text editors
- [ ] JSON structure is human-readable with proper formatting

## Future Considerations
While this plan focuses only on export functionality, the JSON structure is designed to support future import capabilities:
- **Version Field**: Allows for format evolution and compatibility checking
- **Unique IDs**: Enable reliable node reference reconstruction
- **Complete State**: All properties needed for full FSM recreation
- **Type Information**: Explicit link type identification for proper instantiation
- **Metadata**: Context information for validation and debugging

## Differences from Other Export Formats
- **SVG/PNG**: Visual representation vs. data structure
- **LaTeX**: Academic formatting vs. machine-readable data
- **Purpose**: Data preservation and future import vs. presentation
- **Content**: Complete state information vs. visual rendering
- **Use Cases**: Backup, version control, data exchange vs. documentation, publication

## Implementation Priority
This feature should be implemented after other export features are stable, as it establishes the foundation for future import/restore functionality and provides users with a way to backup their work in a portable format.