# Plan for Import JSON Document Feature

## Goal
Add an "Import JSON Graph" button that allows users to select a JSON file matching the schema defined in `plan_download_json.md`. The feature will immediately replace all current nodes and links on the canvas with those defined in the imported JSON file, providing a simple way to load previously exported FSM diagrams.

## Current State Analysis
- The application maintains state in global arrays `nodes[]` and `links[]` in `/src/main/fsm.js`
- JSON export format is defined in `plan_download_json.md` with version 1.0 schema
- Existing functionality uses Node, Link, SelfLink, and StartLink classes from `/src/elements/`
- Canvas clearing is already implemented in `clearCanvas()` function
- LocalStorage save/restore functionality exists in `/src/main/save.js`
- Export buttons are located in `/www/index.html` around line 157

## Implementation Plan

### Step 1: Add File Input to HTML
Modify `/www/index.html` to add a visible file input:
- Add file input element with JSON file filter
- Place on new line under existing export buttons
- Use simple visible input for code simplicity

**HTML Changes:**
```html
<!-- Add after existing export line -->
<p style="margin: 8px 0 0 0;"><strong>Import:</strong> 
    <input type="file" id="jsonFileInput" accept=".json" onchange="importFromJSON(this)">
</p>
```

**Checklist:**
- [x] Open `/www/index.html` file
- [x] Locate the export line (around line 157)
- [x] Add visible file input with JSON filter
- [x] Ensure HTML syntax is correct

### Step 2: Implement JSON Import Function
Create `importFromJSON(fileInput)` function in `/src/main/fsm.js` that:
1. Reads the selected file using FileReader API
2. Parses JSON and validates basic structure
3. Clears current canvas state
4. Reconstructs nodes and links from JSON data
5. Redraws canvas and saves to localStorage

**Function Structure:**
```javascript
function importFromJSON(fileInput) {
	if (!fileInput.files || fileInput.files.length === 0) {
		console.error('No file selected');
		return;
	}
	
	var file = fileInput.files[0];
	var reader = new FileReader();
	
	reader.onload = function(e) {
		try {
			var jsonData = JSON.parse(e.target.result);
			
			// Basic validation
			if (!jsonData.nodes || !jsonData.links) {
				throw new Error('Invalid JSON structure: missing nodes or links array');
			}
			
			// Clear current state
			nodes = [];
			links = [];
			selectedObject = null;
			currentLink = null;
			
			// Reconstruct nodes
			var nodeMap = new Map(); // Maps JSON ID to Node object
			for (var i = 0; i < jsonData.nodes.length; i++) {
				var nodeData = jsonData.nodes[i];
				var node = new Node(nodeData.x, nodeData.y);
				node.text = nodeData.text || '';
				node.isAcceptState = nodeData.isAcceptState || false;
				nodes.push(node);
				nodeMap.set(nodeData.id, node);
			}
			
			// Reconstruct links
			for (var i = 0; i < jsonData.links.length; i++) {
				var linkData = jsonData.links[i];
				var link;
				
				if (linkData.type === 'SelfLink') {
					var targetNode = nodeMap.get(linkData.node);
					if (!targetNode) {
						throw new Error('Invalid node reference in SelfLink: ' + linkData.node);
					}
					link = new SelfLink(targetNode);
					link.anchorAngle = linkData.anchorAngle || 0;
				} else if (linkData.type === 'StartLink') {
					var targetNode = nodeMap.get(linkData.node);
					if (!targetNode) {
						throw new Error('Invalid node reference in StartLink: ' + linkData.node);
					}
					link = new StartLink(targetNode);
					link.deltaX = linkData.deltaX || -50;
					link.deltaY = linkData.deltaY || 0;
				} else if (linkData.type === 'Link') {
					var nodeA = nodeMap.get(linkData.nodeA);
					var nodeB = nodeMap.get(linkData.nodeB);
					if (!nodeA || !nodeB) {
						throw new Error('Invalid node references in Link: ' + linkData.nodeA + ', ' + linkData.nodeB);
					}
					link = new Link(nodeA, nodeB);
					link.parallelPart = linkData.parallelPart || 0.5;
					link.perpendicularPart = linkData.perpendicularPart || 0;
					link.lineAngleAdjust = linkData.lineAngleAdjust || 0;
				} else {
					throw new Error('Unknown link type: ' + linkData.type);
				}
				
				link.text = linkData.text || '';
				links.push(link);
			}
			
			// Redraw and save
			draw();
			saveBackup();
			
			console.log('Successfully imported FSM with ' + nodes.length + ' nodes and ' + links.length + ' links');
			
		} catch (error) {
			console.error('Error importing JSON:', error.message);
		}
	};
	
	reader.onerror = function() {
		console.error('Error reading file');
	};
	
	reader.readAsText(file);
	
	// Clear the file input for repeated imports
	fileInput.value = '';
}
```

**Checklist:**
- [x] Open `/src/main/fsm.js` file
- [x] Add `importFromJSON()` function after existing export functions
- [x] Implement FileReader API for file reading
- [x] Add JSON parsing with try-catch error handling
- [x] Implement node reconstruction with property mapping
- [x] Implement link reconstruction for all three link types
- [x] Add node ID to object reference mapping
- [x] Clear existing state before import
- [x] Trigger redraw and localStorage save after import
- [x] Add console logging for success and errors
- [x] Clear file input after processing

## Implementation Complete

The JSON import functionality has been successfully implemented with the following features:

### Features Implemented:
- **File Input UI**: Added visible file input with JSON filter in the Import section
- **Complete Import Function**: `importFromJSON()` function with full error handling
- **FileReader Integration**: Reads selected JSON files asynchronously
- **JSON Validation**: Validates required fields (nodes, links arrays)
- **State Management**: Clears existing canvas before import
- **Object Reconstruction**: Recreates all node and link types with proper properties
- **Error Handling**: Comprehensive console logging for all error scenarios
- **Post-Import Actions**: Automatic redraw and localStorage backup

### Files Modified:
1. `/www/index.html` - Added file input element
2. `/src/main/fsm.js` - Added `importFromJSON()` function
3. Built via `python3 build_fsm.py`

### Success Criteria Met:
- ✅ File input appears below export buttons in Import section
- ✅ File input accepts only JSON files (.json filter)
- ✅ JSON parsing with error handling implemented
- ✅ Canvas clearing and state reset functionality
- ✅ All node types reconstructed (position, text, accept state)
- ✅ All link types supported (Link, SelfLink, StartLink)
- ✅ Error logging to console implemented
- ✅ File input cleared for repeated imports
- ✅ Automatic redraw and localStorage save

The feature is now ready for use and provides a complete save/load workflow for FSM diagrams when combined with the existing JSON export functionality.