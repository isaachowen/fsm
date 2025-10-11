var greekLetterNames = [ 'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega' ];

function convertLatexShortcuts(text) {
	// html greek characters
	for(var i = 0; i < greekLetterNames.length; i++) {
		var name = greekLetterNames[i];
		text = text.replace(new RegExp('\\\\' + name, 'g'), String.fromCharCode(913 + i + (i > 16)));
		text = text.replace(new RegExp('\\\\' + name.toLowerCase(), 'g'), String.fromCharCode(945 + i + (i > 16)));
	}

	// subscripts
	for(var i = 0; i < 10; i++) {
		text = text.replace(new RegExp('_' + i, 'g'), String.fromCharCode(8320 + i));
	}

	return text;
}

function textToXML(text) {
	text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	var result = '';
	for(var i = 0; i < text.length; i++) {
		var c = text.charCodeAt(i);
		if(c >= 0x20 && c <= 0x7E) {
			result += text[i];
		} else {
			result += '&#' + c + ';';
		}
	}
	return result;
}

function drawArrow(c, x, y, angle) {
	var dx = Math.cos(angle);
	var dy = Math.sin(angle);
	c.beginPath();
	c.moveTo(x, y);
	c.lineTo(x - 8 * dx + 5 * dy, y - 8 * dy - 5 * dx);
	c.lineTo(x - 8 * dx - 5 * dy, y - 8 * dy + 5 * dx);
	c.fill();
}

function canvasHasFocus() {
	return (document.activeElement || document.body) == document.body;
}

function drawText(c, originalText, x, y, angleOrNull, isSelected) {
	text = convertLatexShortcuts(originalText);
	c.font = '20px "Times New Roman", serif';
	
	// Save the current fill style and set text color to black for readability
	var originalFillStyle = c.fillStyle;
	c.fillStyle = '#000000';  // black text for readability
	
	var width = c.measureText(text).width;

	// center the text
	x -= width / 2;

	// position the text intelligently if given an angle
	if(angleOrNull != null) {
		var cos = Math.cos(angleOrNull);
		var sin = Math.sin(angleOrNull);
		var cornerPointX = (width / 2 + 5) * (cos > 0 ? 1 : -1);
		var cornerPointY = (10 + 5) * (sin > 0 ? 1 : -1);
		var slide = sin * Math.pow(Math.abs(sin), 40) * cornerPointX - cos * Math.pow(Math.abs(cos), 10) * cornerPointY;
		x += cornerPointX - sin * slide;
		y += cornerPointY + cos * slide;
	}

	// draw text and caret (round the coordinates so the caret falls on a pixel)
	if('advancedFillText' in c) {
		c.advancedFillText(text, originalText, x + width / 2, y, angleOrNull);
	} else {
		x = Math.round(x);
		y = Math.round(y);
		c.fillText(text, x, y + 6);
		if(isSelected && caretVisible && canvasHasFocus() && document.hasFocus()) {
			x += width;
			c.beginPath();
			c.moveTo(x, y - 10);
			c.lineTo(x, y + 10);
			c.stroke();
		}
	}
	
	// Restore the original fill style
	c.fillStyle = originalFillStyle;
}

var caretTimer;
var caretVisible = true;

function resetCaret() {
	clearInterval(caretTimer);
	caretTimer = setInterval('caretVisible = !caretVisible; draw()', 500);
	caretVisible = true;
}

var canvas;
var nodeRadius = 30;
var nodes = [];
var links = [];

var cursorVisible = true;
var snapToPadding = 6; // pixels
var hitTargetPadding = 6; // pixels
var selectedObject = null; // either a Link or a Node
var currentLink = null; // a Link
var movingObject = false;
var originalClick;

// Viewport state for canvas panning and zooming
var viewport = {
	x: 0,              // Pan offset X (world units)
	y: 0,              // Pan offset Y (world units) 
	scale: 1,          // Zoom level (1 = normal size)
	isPanning: false,  // Currently dragging viewport
	lastMouseX: 0,     // Last mouse position for delta calculation
	lastMouseY: 0,     // Last mouse position for delta calculation
	panStartX: 0,      // Mouse position when pan started
	panStartY: 0       // Mouse position when pan started
};

function drawUsing(c) {
	c.clearRect(0, 0, canvas.width, canvas.height);
	c.save();
	
	// Apply viewport transform
	c.translate(viewport.x, viewport.y);
	c.scale(viewport.scale, viewport.scale);
	c.translate(0.5, 0.5);

	for(var i = 0; i < nodes.length; i++) {
		c.lineWidth = 2;
		if(nodes[i] == selectedObject) {
			c.strokeStyle = '#ff9500';  // warm orange for selected
			c.fillStyle = nodes[i].getSelectedColor();  // Use node's selected color
		} else {
			c.strokeStyle = '#9ac29a';  // darker engineering green accent
			c.fillStyle = nodes[i].getBaseColor();      // Use node's base color
		}
		nodes[i].draw(c);
	}
	for(var i = 0; i < links.length; i++) {
		c.lineWidth = 2;
		if(links[i] == selectedObject) {
			c.fillStyle = c.strokeStyle = '#ff9500';  // warm orange for selected
		} else {
			c.strokeStyle = '#9ac29a';  // darker engineering green accent
			c.fillStyle = '#9ac29a';    // darker engineering green accent for arrows too
		}
		links[i].draw(c);
	}
	if(currentLink != null) {
		c.lineWidth = 2;
		c.strokeStyle = '#9ac29a';  // darker engineering green accent
		c.fillStyle = '#9ac29a';    // darker engineering green accent for arrows too
		currentLink.draw(c);
	}

	c.restore();
}

function draw() {
	drawUsing(canvas.getContext('2d'));
	saveBackup();
}

function selectObject(x, y) {
	for(var i = 0; i < nodes.length; i++) {
		if(nodes[i].containsPoint(x, y)) {
			return nodes[i];
		}
	}
	for(var i = 0; i < links.length; i++) {
		if(links[i].containsPoint(x, y)) {
			return links[i];
		}
	}
	return null;
}

function snapNode(node) {
	for(var i = 0; i < nodes.length; i++) {
		if(nodes[i] == node) continue;

		if(Math.abs(node.x - nodes[i].x) < snapToPadding) {
			node.x = nodes[i].x;
		}

		if(Math.abs(node.y - nodes[i].y) < snapToPadding) {
			node.y = nodes[i].y;
		}
	}
}

window.onload = function() {
	canvas = document.getElementById('canvas');
	restoreBackup();
	draw();

	canvas.onmousedown = function(e) {
		var mouse = crossBrowserRelativeMousePos(e);
		
		// Check for middle-click panning
		if (e.button === 1) { // Middle mouse button
			startPanning(mouse.x, mouse.y);
			return false; // Prevent default middle-click behavior
		}
		
		// Convert to world coordinates for object interaction
		var worldMouse = screenToWorld(mouse.x, mouse.y);
		selectedObject = selectObject(worldMouse.x, worldMouse.y);
		movingObject = false;
		originalClick = worldMouse;

		if(selectedObject != null) {
			if(shift && selectedObject instanceof Node) {
				currentLink = new SelfLink(selectedObject, worldMouse);
			} else {
				movingObject = true;
				deltaMouseX = deltaMouseY = 0;
				if(selectedObject.setMouseStart) {
					selectedObject.setMouseStart(worldMouse.x, worldMouse.y);
				}
			}
			resetCaret();
		} else if(shift) {
			currentLink = new TemporaryLink(worldMouse, worldMouse);
		}

		draw();

		if(canvasHasFocus()) {
			// disable drag-and-drop only if the canvas is already focused
			return false;
		} else {
			// otherwise, let the browser switch the focus away from wherever it was
			resetCaret();
			return true;
		}
	};

	canvas.ondblclick = function(e) {
		var mouse = crossBrowserRelativeMousePos(e);
		// Convert to world coordinates for object interaction
		var worldMouse = screenToWorld(mouse.x, mouse.y);
		selectedObject = selectObject(worldMouse.x, worldMouse.y);

		if(selectedObject == null) {
			// Create new node with specified shape and color
			var shape = getShapeFromModifier(shapeModifier);
			var color = getColorFromModifier(colorModifier);
			selectedObject = new Node(worldMouse.x, worldMouse.y, shape, color);
			nodes.push(selectedObject);
			
			// If we used a modifier, suppress typing briefly to allow key release
			if(shapeModifier != null || colorModifier != null) {
				suppressTypingUntil = Date.now() + 300; // 300ms suppression
			}
			
			resetCaret();
			draw();
		} else if(selectedObject instanceof Node) {
			if(shapeModifier != null) {
				// Change existing node to specific shape
				selectedObject.shape = getShapeFromModifier(shapeModifier);
				// Suppress typing briefly when changing shapes too
				suppressTypingUntil = Date.now() + 300;
			}
			if(colorModifier != null) {
				// Change existing node to specific color
				selectedObject.color = getColorFromModifier(colorModifier);
				// Suppress typing briefly when changing colors too
				suppressTypingUntil = Date.now() + 300;
			}
			if(shapeModifier == null && colorModifier == null) {
				// Cycle through accept state when no modifiers
				cycleNodeAppearance(selectedObject);
			}
			draw();
		}
	};

	canvas.onmousemove = function(e) {
		var mouse = crossBrowserRelativeMousePos(e);
		
		// Handle viewport panning
		if(viewport.isPanning) {
			updatePanning(mouse.x, mouse.y);
			return; // Don't process other mouse actions while panning
		}
		
		// Convert to world coordinates for object interaction
		var worldMouse = screenToWorld(mouse.x, mouse.y);

		if(currentLink != null) {
			var targetNode = selectObject(worldMouse.x, worldMouse.y);
			if(!(targetNode instanceof Node)) {
				targetNode = null;
			}

			if(selectedObject == null) {
				if(targetNode != null) {
					currentLink = new StartLink(targetNode, originalClick);
				} else {
					currentLink = new TemporaryLink(originalClick, worldMouse);
				}
			} else {
				if(targetNode == selectedObject) {
					currentLink = new SelfLink(selectedObject, worldMouse);
				} else if(targetNode != null) {
					currentLink = new Link(selectedObject, targetNode);
				} else {
					currentLink = new TemporaryLink(selectedObject.closestPointOnCircle(worldMouse.x, worldMouse.y), worldMouse);
				}
			}
			draw();
		}

		if(movingObject) {
			selectedObject.setAnchorPoint(worldMouse.x, worldMouse.y);
			if(selectedObject instanceof Node) {
				snapNode(selectedObject);
			}
			draw();
		}
	};

	canvas.onmouseup = function(e) {
		// Handle middle-click panning end
		if (e.button === 1 && viewport.isPanning) { // Middle mouse button
			stopPanning();
			return false;
		}
		
		movingObject = false;

		if(currentLink != null) {
			if(!(currentLink instanceof TemporaryLink)) {
				selectedObject = currentLink;
				links.push(currentLink);
				resetCaret();
			}
			currentLink = null;
			draw();
		}
	};
}

var shift = false;
var shapeModifier = null; // Will store the number key pressed (1, 3, 4, 5, 6)
var colorModifier = null; // Will store the letter key pressed (Q, W, E, R, T)
var suppressTypingUntil = 0; // Timestamp to suppress typing after node creation

document.onkeydown = function(e) {
	var key = crossBrowserKey(e);

	if(key == 16) {
		shift = true;
	} else if(key >= 49 && key <= 54) { // Keys 1, 3, 4, 5, 6 (skip 2 for future use)
		if(key === 50) return; // Skip key 2 for now
		shapeModifier = key - 48; // Convert keycode to number (1, 3, 4, 5, 6)
	} else if(key == 81 || key == 87 || key == 69 || key == 82 || key == 84) { // Q, W, E, R, T keys
		colorModifier = String.fromCharCode(key); // Convert keycode to letter (Q, W, E, R, T)
	} else if(!canvasHasFocus()) {
		// don't read keystrokes when other things have focus
		return true;
	} else if(key == 8) { // backspace key
		if(selectedObject != null && 'text' in selectedObject) {
			selectedObject.text = selectedObject.text.substr(0, selectedObject.text.length - 1);
			resetCaret();
			draw();
		}

		// backspace is a shortcut for the back button, but do NOT want to change pages
		return false;
	} else if(key == 46) { // delete key
		if(selectedObject != null) {
			for(var i = 0; i < nodes.length; i++) {
				if(nodes[i] == selectedObject) {
					nodes.splice(i--, 1);
				}
			}
			for(var i = 0; i < links.length; i++) {
				if(links[i] == selectedObject || links[i].node == selectedObject || links[i].nodeA == selectedObject || links[i].nodeB == selectedObject) {
					links.splice(i--, 1);
				}
			}
			selectedObject = null;
			draw();
		}
	}
};

document.onkeyup = function(e) {
	var key = crossBrowserKey(e);

	if(key == 16) {
		shift = false;
	} else if(key >= 49 && key <= 54 && key !== 50) { // Keys 1, 3, 4, 5, 6 (skip 2)
		shapeModifier = null;
	} else if(key == 81 || key == 87 || key == 69 || key == 82 || key == 84) { // Q, W, E, R, T keys
		colorModifier = null;
	}
};

document.onkeypress = function(e) {
	// don't read keystrokes when other things have focus
	var key = crossBrowserKey(e);
	if(!canvasHasFocus()) {
		// don't read keystrokes when other things have focus
		return true;
	} else if(Date.now() < suppressTypingUntil) {
		// temporarily suppress typing after shape modifier usage
		return false;
	} else if(key >= 0x20 && key <= 0x7E && !e.metaKey && !e.altKey && !e.ctrlKey && selectedObject != null && 'text' in selectedObject) {
		selectedObject.text += String.fromCharCode(key);
		resetCaret();
		draw();

		// don't let keys do their actions (like space scrolls down the page)
		return false;
	} else if(key == 8) {
		// backspace is a shortcut for the back button, but do NOT want to change pages
		return false;
	}
};

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

function getColorFromModifier(modifier) {
	switch(modifier) {
		case 'Q': return 'yellow';  // Q for default yellow
		case 'W': return 'green';   // W for green  
		case 'E': return 'blue';    // E for blue
		case 'R': return 'pink';    // R for pink
		case 'T': return 'white';   // T for white
		default: return 'yellow';   // Default fallback
	}
}

function cycleNodeAppearance(node) {
	// Simply toggle accept state, keep current shape
	node.isAcceptState = !node.isAcceptState;
}

function crossBrowserKey(e) {
	e = e || window.event;
	return e.which || e.keyCode;
}

function crossBrowserElementPos(e) {
	e = e || window.event;
	var obj = e.target || e.srcElement;
	var x = 0, y = 0;
	while(obj.offsetParent) {
		x += obj.offsetLeft;
		y += obj.offsetTop;
		obj = obj.offsetParent;
	}
	return { 'x': x, 'y': y };
}

function crossBrowserMousePos(e) {
	e = e || window.event;
	return {
		'x': e.pageX || e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft,
		'y': e.pageY || e.clientY + document.body.scrollTop + document.documentElement.scrollTop,
	};
}

function crossBrowserRelativeMousePos(e) {
	var element = crossBrowserElementPos(e);
	var mouse = crossBrowserMousePos(e);
	return {
		'x': mouse.x - element.x,
		'y': mouse.y - element.y
	};
}

// Viewport coordinate conversion functions
function screenToWorld(screenX, screenY) {
	return {
		x: (screenX - viewport.x) / viewport.scale,
		y: (screenY - viewport.y) / viewport.scale
	};
}

function worldToScreen(worldX, worldY) {
	return {
		x: worldX * viewport.scale + viewport.x,
		y: worldY * viewport.scale + viewport.y
	};
}

// Viewport utility functions
function resetViewport() {
	viewport.x = 0;
	viewport.y = 0;
	viewport.scale = 1;
	viewport.isPanning = false;
	viewport.lastMouseX = 0;
	viewport.lastMouseY = 0;
	viewport.panStartX = 0;
	viewport.panStartY = 0;
	draw();
}

function updateMouseCoordinates(e) {
	var screenMouse = crossBrowserRelativeMousePos(e);
	var worldMouse = screenToWorld(screenMouse.x, screenMouse.y);
	return {
		screen: screenMouse,
		world: worldMouse
	};
}

// Panning functions
function startPanning(mouseX, mouseY) {
	viewport.isPanning = true;
	viewport.panStartX = viewport.lastMouseX = mouseX;
	viewport.panStartY = viewport.lastMouseY = mouseY;
	canvas.style.cursor = 'grabbing';
}

function updatePanning(mouseX, mouseY) {
	if (!viewport.isPanning) return;
	
	var deltaX = mouseX - viewport.lastMouseX;
	var deltaY = mouseY - viewport.lastMouseY;
	
	viewport.x += deltaX;
	viewport.y += deltaY;
	
	viewport.lastMouseX = mouseX;
	viewport.lastMouseY = mouseY;
	
	draw(); // Redraw with new viewport
}

function stopPanning() {
	viewport.isPanning = false;
	canvas.style.cursor = 'default';
}

function output(text) {
	var element = document.getElementById('output');
	element.style.display = 'block';
	element.value = text;
}

function saveAsPNG() {
	var oldSelectedObject = selectedObject;
	selectedObject = null;
	drawUsing(canvas.getContext('2d'));
	selectedObject = oldSelectedObject;
	var pngData = canvas.toDataURL('image/png');
	
	// Convert data URL to blob
	var byteString = atob(pngData.split(',')[1]);
	var mimeString = pngData.split(',')[0].split(':')[1].split(';')[0];
	var ab = new ArrayBuffer(byteString.length);
	var ia = new Uint8Array(ab);
	for (var i = 0; i < byteString.length; i++) {
		ia[i] = byteString.charCodeAt(i);
	}
	var blob = new Blob([ab], {type: mimeString});
	
	// Create download link
	var url = URL.createObjectURL(blob);
	var link = document.createElement('a');
	link.href = url;
	link.download = 'fsm-diagram.png';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

function saveAsSVG() {
	var exporter = new ExportAsSVG();
	var oldSelectedObject = selectedObject;
	selectedObject = null;
	drawUsing(exporter);
	selectedObject = oldSelectedObject;
	var svgData = exporter.toSVG();
	output(svgData);
	// Chrome isn't ready for this yet, the 'Save As' menu item is disabled
	// document.location.href = 'data:image/svg+xml;base64,' + btoa(svgData);
}

function saveAsLaTeX() {
	var exporter = new ExportAsLaTeX();
	var oldSelectedObject = selectedObject;
	selectedObject = null;
	drawUsing(exporter);
	selectedObject = oldSelectedObject;
	var texData = exporter.toLaTeX();
	output(texData);
}

function downloadAsLaTeX() {
	// Generate LaTeX content using same logic as saveAsLaTeX()
	var exporter = new ExportAsLaTeX();
	var oldSelectedObject = selectedObject;
	selectedObject = null;
	drawUsing(exporter);
	selectedObject = oldSelectedObject;
	var texData = exporter.toLaTeX();
	
	// Create text blob for download
	var blob = new Blob([texData], {type: 'text/plain'});
	var url = URL.createObjectURL(blob);
	
	// Create temporary anchor element for download
	var link = document.createElement('a');
	link.href = url;                           // Blob URL with our LaTeX data
	link.download = 'fsm-diagram.tex';         // Forces download with this filename
	
	// Must add to DOM for browser compatibility
	document.body.appendChild(link);           // Some browsers require this
	
	// Trigger the download programmatically
	link.click();                              // Simulates user clicking the link
	
	// Clean up immediately
	document.body.removeChild(link);           // Remove from DOM
	URL.revokeObjectURL(url);                 // Free memory
}

function downloadAsSVG() {
	// Generate SVG content using same logic as saveAsSVG()
	var exporter = new ExportAsSVG();
	var oldSelectedObject = selectedObject;
	selectedObject = null;
	drawUsing(exporter);
	selectedObject = oldSelectedObject;
	var svgData = exporter.toSVG();
	
	// Create SVG blob for download
	var blob = new Blob([svgData], {type: 'image/svg+xml'});
	var url = URL.createObjectURL(blob);
	
	// Create temporary anchor element for download
	var link = document.createElement('a');
	link.href = url;                           // Blob URL with our SVG data
	link.download = 'fsm-diagram.svg';         // Forces download with this filename
	
	// Must add to DOM for browser compatibility
	document.body.appendChild(link);           // Some browsers require this
	
	// Trigger the download programmatically
	link.click();                              // Simulates user clicking the link
	
	// Clean up immediately
	document.body.removeChild(link);           // Remove from DOM
	URL.revokeObjectURL(url);                 // Free memory
}

// Filename management functions for custom JSON save names with browserStorage persistence

// Get the custom filename from the input field, sanitize it, and add .json extension
function getCustomFilename() {
	var input = document.getElementById('filenameInput');
	var filename = (input && input.value.trim()) || 'network_sketch';
	
	// Replace invalid filesystem characters with underscores for safety
	filename = filename.replace(/[\/\\:*?"<>|]/g, '_');
	
	return filename + '.json';
}

// Save the current filename to browserStorage so it persists across sessions
function saveFilenameToBrowserStorage() {
	var input = document.getElementById('filenameInput');
	if (input && input.value.trim()) {
		localStorage.setItem('fsmFilename', input.value.trim());
	}
}

// Load the saved filename from browserStorage and populate the input field
function loadFilenameFromBrowserStorage() {
	var savedFilename = localStorage.getItem('fsmFilename');
	var input = document.getElementById('filenameInput');
	if (input && savedFilename) {
		input.value = savedFilename;
		updateDocumentTitle(); // Update title when loading saved filename
	}
}

// Update the document title to include the current filename
function updateDocumentTitle() {
	var input = document.getElementById('filenameInput');
	var filename = input && input.value.trim() ? input.value.trim() : 'sketch_name';
	document.title = 'NS - ' + filename;
}

// Initialize the filename input system with persistence and debounced auto-save
function initializeFilenameInput() {
	// Load any previously saved filename
	loadFilenameFromBrowserStorage();
	
	// Set initial title
	updateDocumentTitle();
	
	var input = document.getElementById('filenameInput');
	if (input) {
		// Auto-save filename changes with 500ms debounce to avoid excessive browserStorage writes
		var timeoutId;
		input.addEventListener('input', function() {
			// Update title immediately for responsive feel
			updateDocumentTitle();
			
			clearTimeout(timeoutId);
			timeoutId = setTimeout(function() {
				saveFilenameToBrowserStorage();
			}, 500); // Wait 500ms after user stops typing before saving
		});
	}
}

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
			isAcceptState: node.isAcceptState,
			shape: node.shape || 'circle', // Include shape property
			color: node.color || 'yellow'  // Include color property
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
	link.download = getCustomFilename();
	
	// Save the filename to browserStorage when download occurs
	saveFilenameToBrowserStorage();
	
	// Update document title to reflect the saved filename
	updateDocumentTitle();
	
	// Trigger download
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

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
				var node = new Node(nodeData.x, nodeData.y, nodeData.shape, nodeData.color);
				node.text = nodeData.text || '';
				node.isAcceptState = nodeData.isAcceptState || false;
				// Handle backward compatibility - default to circle if no shape specified
				if (!node.shape) {
					node.shape = 'circle';
				}
				// Handle backward compatibility - default to yellow if no color specified
				if (!node.color) {
					node.color = 'yellow';
				}
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
			
			// Populate filename textbox with uploaded file's name (without .json extension)
			var filename = file.name;
			if (filename.toLowerCase().endsWith('.json')) {
				filename = filename.slice(0, -5); // Remove .json extension
			}
			var input = document.getElementById('filenameInput');
			if (input) {
				input.value = filename;
				updateDocumentTitle(); // Update title when importing file
				saveFilenameToBrowserStorage(); // Save the new filename to browserStorage
			}
			
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

function clearCanvas() {
    // Clear all nodes and links
    nodes.length = 0;  // Clear nodes array
    links.length = 0;  // Clear links array
    
    // Clear any selected objects
    selectedObject = null;
    currentLink = null;
    
    // Reset filename to default
    var input = document.getElementById('filenameInput');
    if (input) {
        input.value = '';
        updateDocumentTitle(); // Update title when clearing filename
        saveFilenameToBrowserStorage(); // Save the reset filename to browserStorage
    }
    
    // Redraw the canvas (will show empty canvas)
    draw();
    
    // Save the cleared state to localStorage
    saveBackup();
}
