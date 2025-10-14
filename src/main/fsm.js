var greekLetterNames = [ 'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega' ];

function convertLatexShortcuts(text) {
	/**
	 * convertLatexShortcuts - Converts LaTeX-style shortcuts to Unicode characters
	 * 
	 * Called by:
	 * - drawText() to process text before rendering on canvas
	 * - Text processing in node and link label rendering
	 * 
	 * Calls:
	 * - String.fromCharCode() to generate Unicode characters
	 * - RegExp() and text.replace() for pattern matching and replacement
	 * - greekLetterNames array for Greek letter mappings
	 * 
	 * Purpose: Transforms LaTeX-style notation into displayable Unicode characters.
	 * Converts Greek letters (\\Alpha -> Α, \\alpha -> α) and subscripts (_0 -> ₀).
	 * Essential for mathematical notation in FSM labels and state names.
	 */
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

function drawArrow(c, x, y, angle) {
	/**
	 * drawArrow - Renders a directional arrow head at specified position and angle
	 * 
	 * Called by:
	 * - Link.prototype.draw() for transition arrows
	 * - StartLink.prototype.draw() for start state arrows
	 * - SelfLink.prototype.draw() for self-loop arrows
	 * - Any element that needs directional indicators
	 * 
	 * Calls:
	 * - Math.cos(), Math.sin() for angle calculations
	 * - c.beginPath(), c.moveTo(), c.lineTo(), c.fill() for drawing triangle
	 * - Canvas 2D API for rendering the arrow shape
	 * 
	 * Purpose: Draws a filled triangular arrow head to indicate direction of state
	 * transitions. Arrow points in the direction specified by angle parameter.
	 * Used universally across all link types for consistent directional indicators.
	 */
	var dx = Math.cos(angle);
	var dy = Math.sin(angle);
	c.beginPath();
	c.moveTo(x, y);
	c.lineTo(x - 8 * dx + 5 * dy, y - 8 * dy - 5 * dx);
	c.lineTo(x - 8 * dx - 5 * dy, y - 8 * dy + 5 * dx);
	c.fill();
}

function canvasHasFocus() {
	/**
	 * canvasHasFocus - Determines if the canvas has keyboard focus for input
	 * 
	 * Called by:
	 * - drawText() to determine if text caret should be visible
	 * - Keyboard event handlers to check if canvas should receive input
	 * - Focus management code throughout the application
	 * 
	 * Calls:
	 * - document.activeElement to check currently focused element
	 * - document.body for fallback comparison
	 * 
	 * Purpose: Critical for text editing functionality - determines when the blinking
	 * text caret should be shown during label editing. Returns true when the canvas
	 * (document.body) has focus, enabling keyboard input for node/link text editing.
	 */
	return (document.activeElement || document.body) == document.body;
}

function drawText(c, originalText, x, y, angleOrNull, isSelected) {
	/**
	 * drawText - Renders text with advanced positioning, angle rotation, and caret display
	 * 
	 * Called by:
	 * - Node.prototype.draw() for node labels
	 * - Link.prototype.draw() for transition labels
	 * - StartLink.prototype.draw() and SelfLink.prototype.draw() for arrow labels
	 * - Any UI element that needs text rendering
	 * 
	 * Calls:
	 * - convertLatexShortcuts() to process LaTeX notation
	 * - c.measureText(), c.fillText() for text rendering
	 * - Math.cos(), Math.sin(), Math.abs(), Math.pow() for angle calculations
	 * - canvasHasFocus(), document.hasFocus() for caret visibility
	 * - caretVisible global variable for blinking caret animation
	 * 
	 * Purpose: Universal text rendering function with intelligent positioning based on
	 * angle. Handles LaTeX shortcuts, centers text, positions relative to angles,
	 * and displays blinking caret for selected elements during text editing.
	 * Essential for all text display in the FSM editor.
	 */
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
	/**
	 * resetCaret - Initializes the blinking text caret animation for text editing
	 * 
	 * Called by:
	 * - Text editing initialization code when starting to edit labels
	 * - Focus change handlers when canvas gains focus
	 * - Any code that needs to restart the caret blinking animation
	 * 
	 * Calls:
	 * - clearInterval() to stop existing caret timer
	 * - setInterval() to create new blinking animation timer
	 * - draw() function indirectly through timer callback
	 * - caretVisible global variable manipulation
	 * 
	 * Purpose: Manages the blinking cursor animation during text editing mode.
	 * Creates a 500ms interval that toggles caret visibility and triggers redraws.
	 * Essential for providing visual feedback during node/link label editing.
	 */
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

// Multi-select and selection box state
var selectionBox = {
	active: false,
	startX: 0,
	startY: 0,
	endX: 0,
	endY: 0
};
var selectedNodes = []; // Array of selected Node objects
var isSelecting = false;

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

function drawSelectionBox(c) {
	/**
	 * drawSelectionBox - Renders the multi-selection rectangle with dashed border
	 * 
	 * Called by:
	 * - drawUsing() during main canvas rendering when selection box is active
	 * - Rendering pipeline to show visual feedback during multi-selection
	 * 
	 * Calls:
	 * - Math.min(), Math.max() for rectangle boundary calculations
	 * - c.save(), c.restore() for canvas state management
	 * - c.setLineDash(), c.fillRect(), c.strokeRect() for drawing
	 * - selectionBox global object for current selection bounds
	 * 
	 * Purpose: Provides visual feedback during multi-selection operations by drawing
	 * a semi-transparent blue rectangle with dashed border. Shows the area being
	 * selected as user drags to select multiple nodes simultaneously.
	 */
	if (!selectionBox.active) return;
	
	// Calculate rectangle bounds
	var left = Math.min(selectionBox.startX, selectionBox.endX);
	var right = Math.max(selectionBox.startX, selectionBox.endX);
	var top = Math.min(selectionBox.startY, selectionBox.endY);
	var bottom = Math.max(selectionBox.startY, selectionBox.endY);
	var width = right - left;
	var height = bottom - top;
	
	// Draw selection rectangle with dashed border and semi-transparent fill
	c.save();
	
	// Set up dashed line style
	c.strokeStyle = '#0066cc';  // Blue border
	c.fillStyle = 'rgba(0, 102, 204, 0.1)';  // Semi-transparent blue fill
	c.lineWidth = 1;
	
	// Draw dashed border (manual dashing for older browser compatibility)
	if (c.setLineDash) {
		c.setLineDash([5, 5]);  // 5px dash, 5px gap
	}
	
	// Draw filled rectangle
	c.fillRect(left, top, width, height);
	
	// Draw border
	c.strokeRect(left, top, width, height);
	
	c.restore();
}

function nodeIntersectsRectangle(node, rect) {
	/**
	 * nodeIntersectsRectangle - Tests if a circular node intersects with a rectangle
	 * 
	 * Called by:
	 * - getNodesInSelectionBox() to determine which nodes are within selection area
	 * - Multi-selection algorithms for hit detection
	 * 
	 * Calls:
	 * - Math.max(), Math.min() for closest point calculations
	 * - nodeRadius global variable for node size
	 * - Rectangle and circle collision detection algorithm
	 * 
	 * Purpose: Core collision detection for multi-selection. Determines if a circular
	 * node overlaps with the rectangular selection area. Uses closest-point algorithm
	 * to find distance from circle center to rectangle, enabling accurate selection
	 * of nodes that are partially within the selection box.
	 */
	// Check if a circular node intersects with a rectangle
	// rect should have properties: left, right, top, bottom
	
	// Find the closest point on the rectangle to the circle center
	var closestX = Math.max(rect.left, Math.min(node.x, rect.right));
	var closestY = Math.max(rect.top, Math.min(node.y, rect.bottom));
	
	// Calculate distance from circle center to closest point
	var distanceX = node.x - closestX;
	var distanceY = node.y - closestY;
	var distanceSquared = distanceX * distanceX + distanceY * distanceY;
	
	// Circle intersects rectangle if distance is less than or equal to radius
	return distanceSquared <= (nodeRadius * nodeRadius);
}

function getNodesInSelectionBox() {
	/**
	 * getNodesInSelectionBox - Returns array of nodes within the current selection rectangle
	 * 
	 * Called by:
	 * - Multi-selection event handlers when completing selection box drag
	 * - Selection management code to determine selected nodes
	 * 
	 * Calls:
	 * - Math.min(), Math.max() for rectangle boundary calculations
	 * - nodeIntersectsRectangle() for collision detection with each node
	 * - selectionBox global object for current selection bounds
	 * - nodes global array for iterating through all nodes
	 * 
	 * Purpose: Core multi-selection functionality that identifies which nodes fall
	 * within the selection rectangle. Returns array of Node objects that intersect
	 * with the selection box, enabling bulk operations on multiple selected nodes.
	 */
	if (!selectionBox.active) return [];
	
	// Calculate rectangle bounds
	var left = Math.min(selectionBox.startX, selectionBox.endX);
	var right = Math.max(selectionBox.startX, selectionBox.endX);
	var top = Math.min(selectionBox.startY, selectionBox.endY);
	var bottom = Math.max(selectionBox.startY, selectionBox.endY);
	
	var rect = {
		left: left,
		right: right,
		top: top,
		bottom: bottom
	};
	
	var intersectingNodes = [];
	for (var i = 0; i < nodes.length; i++) {
		if (nodeIntersectsRectangle(nodes[i], rect)) {
			intersectingNodes.push(nodes[i]);
		}
	}
	
	return intersectingNodes;
}

function moveSelectedNodesGroup(deltaX, deltaY) {
	/**
	 * moveSelectedNodesGroup - Moves all multi-selected nodes by the same offset
	 * 
	 * Called by:
	 * - Mouse drag handlers when moving multiple selected nodes
	 * - Multi-selection movement operations
	 * - Group manipulation functions
	 * 
	 * Calls:
	 * - selectedNodes global array for list of currently selected nodes
	 * - Direct manipulation of Node.x and Node.y properties
	 * 
	 * Purpose: Enables bulk movement of multiple selected nodes simultaneously.
	 * Applies the same deltaX/deltaY offset to all nodes in the selectedNodes array,
	 * maintaining relative positions while moving the entire group as a unit.
	 */
	// Move all nodes in the selectedNodes array by the same delta
	for (var i = 0; i < selectedNodes.length; i++) {
		selectedNodes[i].x += deltaX;
		selectedNodes[i].y += deltaY;
	}
}

function drawUsing(c) {
	/**
	 * drawUsing - Main rendering function that draws all FSM elements to the canvas
	 * 
	 * Called by:
	 * - draw() function for normal canvas rendering
	 * - JSON export functionality for capturing FSM state
	 * - Any context that needs complete FSM visualization
	 * 
	 * Calls:
	 * - c.clearRect(), c.save(), c.restore() for canvas management
	 * - c.translate(), c.scale() for viewport transformation
	 * - Node.draw() for each node in nodes array
	 * - Link.draw() for each link in links array
	 * - drawSelectionBox() for multi-selection visual feedback
	 * - viewport, selectedObject, selectedNodes global variables
	 * 
	 * Purpose: Core rendering engine that draws the complete FSM visualization.
	 * Applies viewport transformations, renders all nodes and links with appropriate
	 * colors for selection states, and overlays selection rectangle. Central function
	 * for all visual output of the FSM editor.
	 */
	c.clearRect(0, 0, canvas.width, canvas.height);
	c.save();
	
	// Apply viewport transform
	c.translate(viewport.x, viewport.y);
	c.scale(viewport.scale, viewport.scale);
	c.translate(0.5, 0.5);

	for(var i = 0; i < nodes.length; i++) {
		c.lineWidth = 2;
		var node = nodes[i];
		var isSelected = (node == selectedObject);
		var isMultiSelected = (selectedNodes.indexOf(node) !== -1);
		
		if(isSelected) {
			c.strokeStyle = '#ff9500';  // warm orange for selected
			c.fillStyle = node.getSelectedColor();  // Use node's selected color
		} else if(isMultiSelected) {
			c.strokeStyle = '#0066cc';  // blue for multi-selected nodes
			c.fillStyle = node.getSelectedColor();  // Use node's selected color
			c.lineWidth = 3;  // Thicker border for multi-selected nodes
		} else {
			c.strokeStyle = '#9ac29a';  // darker engineering green accent
			c.fillStyle = node.getBaseColor();      // Use node's base color
		}
		node.draw(c);
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

	// Draw selection rectangle on top of everything else
	drawSelectionBox(c);

	c.restore();
}

function draw() {
	/**
	 * draw - Main drawing function that renders to the canvas and saves backup
	 * 
	 * Called by:
	 * - Window load handler for initial rendering
	 * - All event handlers that modify FSM state (mouse, keyboard)
	 * - Animation timers (caret blinking)
	 * - Any operation that changes visual state
	 * 
	 * Calls:
	 * - drawUsing() with canvas 2D context for actual rendering
	 * - canvas.getContext('2d') to get drawing context
	 * - saveBackup() to persist current state to localStorage
	 * 
	 * Purpose: Primary entry point for triggering complete FSM redraw and state
	 * persistence. Ensures the canvas always reflects current FSM state and
	 * automatically saves backup for recovery. Called frequently throughout
	 * the application lifecycle.
	 */
	drawUsing(canvas.getContext('2d'));
	saveBackup();
}

function selectObject(x, y) {
	/**
	 * selectObject - Finds the topmost FSM element at given coordinates
	 * 
	 * Called by:
	 * - Mouse click handlers to determine what was clicked
	 * - Hit detection throughout the application
	 * - Selection and interaction systems
	 * 
	 * Calls:
	 * - Node.containsPoint() for each node in nodes array
	 * - Link.containsPoint() for each link in links array
	 * - Prioritizes nodes over links when both overlap
	 * 
	 * Purpose: Core hit detection that determines which FSM element (node or link)
	 * is at a specific coordinate. Returns the first matching object, with nodes
	 * taking priority over links. Essential for all mouse interaction and selection
	 * operations in the FSM editor.
	 */
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
	/**
	 * snapNode - Aligns a node to nearby nodes for clean positioning
	 * 
	 * Called by:
	 * - Mouse release handlers after dragging nodes
	 * - Node positioning code to ensure aligned layouts
	 * - Any operation that benefits from snap-to-grid behavior
	 * 
	 * Calls:
	 * - Math.abs() for distance calculations
	 * - snapToPadding global variable for snap threshold
	 * - nodes global array to check against all other nodes
	 * - Direct manipulation of node.x and node.y properties
	 * 
	 * Purpose: Provides snap-to-grid functionality by aligning nodes with nearby
	 * nodes when they're within the snap threshold. Helps create clean, aligned
	 * FSM layouts by automatically correcting small positioning differences.
	 * Essential for professional-looking diagram organization.
	 */
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
			// Check if clicked node is part of current multi-selection
			var isPartOfMultiSelection = (selectedObject instanceof Node && selectedNodes.indexOf(selectedObject) !== -1);
			
			if(!isPartOfMultiSelection) {
				// Clear group selection when individual object is selected (not part of group)
				selectedNodes = [];
			}
			
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
		} else {
			// No object selected and no shift - start selection rectangle
			isSelecting = true;
			selectionBox.active = true;
			selectionBox.startX = worldMouse.x;
			selectionBox.startY = worldMouse.y;
			selectionBox.endX = worldMouse.x;
			selectionBox.endY = worldMouse.y;
			
			// Clear any existing selection
			selectedNodes = [];
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
			// Clear group selection when creating new node
			selectedNodes = [];
			
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
			// Double-clicking an existing node without modifiers does nothing now
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

		if(isSelecting && selectionBox.active) {
			// Update selection rectangle end coordinates
			selectionBox.endX = worldMouse.x;
			selectionBox.endY = worldMouse.y;
			draw();
		} else if(currentLink != null) {
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
					currentLink = new TemporaryLink(selectedObject.closestPointOnShapeToEdgeArc(worldMouse.x, worldMouse.y), worldMouse);
				}
			}
			draw();
		}

		if(movingObject) {
			// Check if we're moving a node that's part of a multi-selection
			var isGroupMovement = (selectedObject instanceof Node && selectedNodes.length > 0 && selectedNodes.indexOf(selectedObject) !== -1);
			
			if(isGroupMovement) {
				// Calculate movement delta from the selected object's previous position
				var oldX = selectedObject.x;
				var oldY = selectedObject.y;
				
				// Move the primary selected object
				selectedObject.setAnchorPoint(worldMouse.x, worldMouse.y);
				if(selectedObject instanceof Node) {
					snapNode(selectedObject);
				}
				
				// Calculate the actual delta after snapping
				var deltaX = selectedObject.x - oldX;
				var deltaY = selectedObject.y - oldY;
				
				// Move all other selected nodes by the same delta
				for(var i = 0; i < selectedNodes.length; i++) {
					if(selectedNodes[i] !== selectedObject) {
						selectedNodes[i].x += deltaX;
						selectedNodes[i].y += deltaY;
					}
				}
			} else {
				// Normal individual object movement
				selectedObject.setAnchorPoint(worldMouse.x, worldMouse.y);
				if(selectedObject instanceof Node) {
					snapNode(selectedObject);
				}
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

		if(isSelecting && selectionBox.active) {
			// Find nodes within selection rectangle
			selectedNodes = getNodesInSelectionBox();
			
			// Clear selection state
			isSelecting = false;
			selectionBox.active = false;
			
			// If nodes were selected, clear individual selectedObject
			if(selectedNodes.length > 0) {
				selectedObject = null;
			} else {
				// If no nodes selected and this was a very small rectangle (likely a click), clear all selections
				var rectWidth = Math.abs(selectionBox.endX - selectionBox.startX);
				var rectHeight = Math.abs(selectionBox.endY - selectionBox.startY);
				if(rectWidth < 5 && rectHeight < 5) {
					selectedObject = null;
					selectedNodes = [];
				}
			}
			
			draw();
		} else if(currentLink != null) {
			if(!(currentLink instanceof TemporaryLink)) {
				selectedObject = currentLink;
				links.push(currentLink);
				resetCaret();
			}
			currentLink = null;
			draw();
		}
	};
	
	// Drag and drop functionality for JSON files
	var dragCounter = 0; // Track drag enter/leave events to handle nested elements
	
	canvas.ondragenter = function(e) {
		e.preventDefault();
		dragCounter++;
		canvas.classList.add('drag-over');
		var overlay = document.getElementById('drag-overlay');
		if (overlay) {
			overlay.style.display = 'flex';
		}
		return false;
	};
	
	canvas.ondragover = function(e) {
		e.preventDefault();
		return false;
	};
	
	canvas.ondragleave = function(e) {
		e.preventDefault();
		dragCounter--;
		if (dragCounter <= 0) {
			dragCounter = 0;
			canvas.classList.remove('drag-over');
			var overlay = document.getElementById('drag-overlay');
			if (overlay) {
				overlay.style.display = 'none';
			}
		}
		return false;
	};
	
	canvas.ondrop = function(e) {
		e.preventDefault();
		dragCounter = 0;
		canvas.classList.remove('drag-over');
		var overlay = document.getElementById('drag-overlay');
		if (overlay) {
			overlay.style.display = 'none';
		}
		
		var files = e.dataTransfer.files;
		if (!files || files.length === 0) {
			return false;
		}
		
		if (files.length > 1) {
			alert('Please drop only one JSON file at a time.');
			return false;
		}
		
		var file = files[0];
		
		// Validate file type
		if (!file.name.toLowerCase().endsWith('.json')) {
			alert('Please drop a JSON file. Only .json files are supported.');
			return false;
		}
		
		// Process the dropped JSON file
		var reader = new FileReader();
		reader.onload = function(event) {
			try {
				var jsonData = JSON.parse(event.target.result);
				processJSONData(jsonData, file.name);
			} catch (error) {
				console.error('Error importing dropped JSON:', error.message);
				alert('Error importing JSON: ' + error.message);
			}
		};
		
		reader.onerror = function() {
			console.error('Error reading dropped file');
			alert('Error reading dropped file');
		};
		
		reader.readAsText(file);
		return false;
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
		if(selectedNodes.length > 0) {
			// Delete all selected nodes and their associated links
			for(var j = 0; j < selectedNodes.length; j++) {
				var nodeToDelete = selectedNodes[j];
				
				// Remove the node from nodes array
				for(var i = 0; i < nodes.length; i++) {
					if(nodes[i] == nodeToDelete) {
						nodes.splice(i--, 1);
					}
				}
				
				// Remove all links connected to this node
				for(var i = 0; i < links.length; i++) {
					if(links[i].node == nodeToDelete || links[i].nodeA == nodeToDelete || links[i].nodeB == nodeToDelete) {
						links.splice(i--, 1);
					}
				}
			}
			
			// Clear selection
			selectedNodes = [];
			selectedObject = null;
			draw();
		} else if(selectedObject != null) {
			// Original single object deletion logic
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
	/**
	 * getShapeFromModifier - Maps numeric modifier keys to node shape names
	 * 
	 * Called by:
	 * - Keyboard event handlers when number keys are pressed with selected node
	 * - Node creation code to set initial shapes
	 * - Node appearance cycling systems
	 * 
	 * Calls:
	 * - switch statement for modifier-to-shape mapping
	 * - No external function calls
	 * 
	 * Purpose: Translates keyboard input (number keys 1,3,4,5,6) into corresponding
	 * node shape strings. Enables quick shape changes via keyboard shortcuts.
	 * Returns shape names that correspond to Node rendering methods.
	 */
	switch(modifier) {
		case 1: return 'dot';
		case 3: return 'triangle';
		case 4: return 'square';
		case 5: return 'pentagon';
		case 6: return 'hexagon';
		default: return 'dot'; // Default fallback
	}
}

function getColorFromModifier(modifier) {
	/**
	 * getColorFromModifier - Maps letter modifier keys to node color names
	 * 
	 * Called by:
	 * - Keyboard event handlers when letter keys are pressed with selected node
	 * - Node creation code to set initial colors
	 * - Node appearance customization systems
	 * 
	 * Calls:
	 * - switch statement for modifier-to-color mapping
	 * - No external function calls
	 * 
	 * Purpose: Translates keyboard input (letter keys Q,W,E,R,T) into corresponding
	 * node color strings. Enables quick color changes via keyboard shortcuts.
	 * Returns color names that correspond to Node color property values.
	 */
	switch(modifier) {
		case 'Q': return 'yellow';  // Q for default yellow
		case 'W': return 'green';   // W for green  
		case 'E': return 'blue';    // E for blue
		case 'R': return 'pink';    // R for pink
		case 'T': return 'white';   // T for white
		default: return 'yellow';   // Default fallback
	}
}

function crossBrowserKey(e) {
	/**
	 * crossBrowserKey - Gets key code in a cross-browser compatible way
	 * 
	 * Called by:
	 * - All keyboard event handlers throughout the application
	 * - Key detection and processing code
	 * 
	 * Calls:
	 * - e.which and e.keyCode for browser compatibility
	 * - window.event fallback for older browsers
	 * 
	 * Purpose: Provides consistent key code access across different browsers.
	 * Essential for keyboard shortcuts and text input functionality.
	 */
	e = e || window.event;
	return e.which || e.keyCode;
}

function crossBrowserElementPos(e) {
	/**
	 * crossBrowserElementPos - Gets element position in a cross-browser compatible way
	 * 
	 * Called by:
	 * - Mouse event handlers that need element positioning
	 * - Coordinate calculation functions
	 * 
	 * Calls:
	 * - offsetLeft, offsetTop, offsetParent properties for position calculation
	 * - e.target and e.srcElement for browser compatibility
	 * 
	 * Purpose: Calculates absolute position of elements accounting for browser
	 * differences. Essential for accurate mouse coordinate calculations.
	 */
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
	// Filename is now handled by the main saveBackup() system
	// This function triggers a backup to include the filename
	saveBackup();
}

// Load the saved filename from browserStorage and populate the input field
function loadFilenameFromBrowserStorage() {
	// Filename is now handled by the main restoreBackup() system
	// This function just updates the title based on current input value
	updateDocumentTitle();
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
		// Auto-save filename changes immediately to ensure persistence
		input.addEventListener('input', function() {
			// Update title immediately for responsive feel
			updateDocumentTitle();
			
			// Save immediately to ensure filename persists on refresh
			saveFilenameToBrowserStorage();
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
			shape: node.shape || 'dot', // Include shape property
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

// Core JSON processing function that can be used by both file input and drag-and-drop
function processJSONData(jsonData, filename) {
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
		// Handle backward compatibility - default to circle if no shape specified
		if (!node.shape) {
			node.shape = 'dot';
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
	
	// Update filename if provided
	if (filename) {
		// Remove .json extension if present
		if (filename.toLowerCase().endsWith('.json')) {
			filename = filename.slice(0, -5);
		}
		var input = document.getElementById('filenameInput');
		if (input) {
			input.value = filename;
			updateDocumentTitle(); // Update title when importing file
			saveFilenameToBrowserStorage(); // Save the new filename to browserStorage
		}
	}
	
	// Redraw and save
	draw();
	saveBackup();
	
	console.log('Successfully imported FSM with ' + nodes.length + ' nodes and ' + links.length + ' links');
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
			processJSONData(jsonData, file.name);
		} catch (error) {
			console.error('Error importing JSON:', error.message);
			alert('Error importing JSON: ' + error.message);
		}
	};
	
	reader.onerror = function() {
		console.error('Error reading file');
		alert('Error reading file');
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
