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
	
	// Show text normally - we want to see real-time updates while editing
	
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
		// Only show caret when in editing_text mode (ui_flow_v2) or legacy editing mode
		var shouldShowCaret = false;
		if (ui_flow_v2) {
			shouldShowCaret = (InteractionManager.getMode() === 'editing_text' && isSelected);
		} else {
			shouldShowCaret = (InteractionManager.canEditText() && isSelected);
		}
		
		if(shouldShowCaret && caretVisible && canvasHasFocus() && document.hasFocus()) {
			var cursorX = x; // Start at beginning of text
			
			// Calculate cursor position based on cursorPosition property
			if (isSelected && InteractionManager.getSelected() && 
			    InteractionManager.getSelected().cursorPosition !== undefined) {
				// Direct cursor implementation: position cursor at specific character index
				var selected = InteractionManager.getSelected();
				var cursorPos = Math.max(0, Math.min(selected.cursorPosition, selected.text.length));
				var textBeforeCursor = convertLatexShortcuts(selected.text.substring(0, cursorPos));
				cursorX += c.measureText(textBeforeCursor).width;
			} else {
				// Legacy behavior: cursor at end of text
				cursorX += width;
			}
			
			// Set cursor color to black
			var originalStrokeStyle = c.strokeStyle;
			c.strokeStyle = '#000000';
			
			c.beginPath();
			c.moveTo(cursorX, y - 10);
			c.lineTo(cursorX, y + 10);
			c.stroke();
			
			// Restore original stroke style
			c.strokeStyle = originalStrokeStyle;
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
	 * Purpose: Manages the blinking caret animation during text editing mode.
	 * Creates a 500ms interval that toggles caret visibility and triggers redraws.
	 * Essential for providing visual feedback during node/link label editing.
	 */
	clearInterval(caretTimer);
	caretTimer = setInterval('caretVisible = !caretVisible; draw()', 500);
	caretVisible = true;
}

function createTextEditingOverlay(editingObject) {
	/**
	 * createTextEditingOverlay - Creates a DOM input element positioned over canvas text
	 * 
	 * Called by:
	 * - InteractionManager.enterEditingMode() when starting text editing
	 * - Text editing initialization in double-click handlers
	 * 
	 * Calls:
	 * - getTextScreenPosition() to get screen coordinates for overlay
	 * - document.createElement() to create input element
	 * - Various DOM styling and event handler functions
	 * - worldToScreen() for coordinate conversion
	 * 
	 * Purpose: Creates an invisible HTML input element positioned exactly over the 
	 * canvas text being edited. This leverages native browser text editing capabilities
	 * including cursor navigation, text selection, copy/paste, and mobile support.
	 */
	
	// Calculate screen position for the text being edited
	var screenPos = getTextScreenPosition(editingObject);
	
	// Create input element
	var input = document.createElement('input');
	input.type = 'text';
	input.value = editingObject.text || '';
	input.id = 'fsm-text-overlay';
	
	// Make input extremely wide to eliminate any caret boundary issues
	var inputWidth = 10000; // Extremely wide - 10,000 pixels
	
	// Style the input to be completely invisible but capture input
	input.style.position = 'absolute';
	input.style.left = (screenPos.x - inputWidth / 2) + 'px'; // Center the massive input over the text
	input.style.top = screenPos.y + 'px';
	input.style.width = inputWidth + 'px'; // Massive width - caret will never hit boundary
	input.style.height = '30px';
	input.style.fontSize = '20px';
	input.style.fontFamily = '"Times New Roman", serif';
	input.style.textAlign = 'center';
	input.style.background = 'transparent'; // Completely transparent
	input.style.border = 'none'; // No border
	input.style.outline = 'none';
	input.style.color = 'transparent'; // Hide the input text itself
	input.style.caretColor = 'black'; // Show black caret for visibility
	input.style.zIndex = '1000';
	
	// Add to document and focus
	document.body.appendChild(input);
	input.focus();
	input.select(); // Select all text for easy replacement
	
	// Store reference globally for cleanup
	window.activeTextOverlay = {
		element: input,
		editingObject: editingObject,
		originalText: editingObject.text || ''
	};
	
	// Set up event handlers
	setupTextOverlayEvents(input, editingObject);
	
	return input;
}

function getTextAnchor(textObject) {
	/**
	 * getTextAnchor - Calculates the world coordinates of the text anchor point
	 * 
	 * The text anchor is the center point around which text is rendered.
	 * This matches exactly where drawText() will center the text.
	 */
	
	// Create a temporary canvas context to simulate drawText positioning
	var tempCanvas = document.createElement('canvas');
	var c = tempCanvas.getContext('2d');
	c.font = '20px "Times New Roman", serif';
	
	var text = convertLatexShortcuts(textObject.text || '');
	var width = c.measureText(text).width;
	
	var x, y, angleOrNull = null;
	
	if (textObject.constructor.name === 'Node' || textObject instanceof Node) {
		// For nodes: drawText(c, this.text, this.x, this.y, null, selected)
		x = textObject.x;
		y = textObject.y;
		angleOrNull = null;
	} else if (textObject.constructor.name === 'StartLink' || 
	           (textObject.getEndPoints && !textObject.getEndPointsAndArcParams)) {
		// For StartLink: drawText(c, this.text, stuff.startX, stuff.startY, textAngle, selected)
		var stuff = textObject.getEndPoints();
		x = stuff.startX;
		y = stuff.startY;
		angleOrNull = Math.atan2(stuff.startY - stuff.endY, stuff.startX - stuff.endX);
	} else if (textObject.constructor.name === 'SelfLink' || textObject.anchorAngle !== undefined) {
		// For SelfLink: drawText(c, this.text, textX, textY, this.anchorAngle, selected)
		var stuff = textObject.getEndPointsAndArcParams();
		x = stuff.circleX + stuff.circleRadius * Math.cos(textObject.anchorAngle);
		y = stuff.circleY + stuff.circleRadius * Math.sin(textObject.anchorAngle);
		angleOrNull = textObject.anchorAngle;
	} else if (textObject.getEndPointsAndArcParams) {
		// For regular Link: drawText(c, this.text, textX, textY, textAngle, selected)
		var stuff = textObject.getEndPointsAndArcParams();
		if (stuff.hasCircle) {
			var startAngle = stuff.startAngle;
			var endAngle = stuff.endAngle;
			if(endAngle < startAngle) {
				endAngle += Math.PI * 2;
			}
			var textAngle = (startAngle + endAngle) / 2 + stuff.isReversed * Math.PI;
			x = stuff.circleX + stuff.circleRadius * Math.cos(textAngle);
			y = stuff.circleY + stuff.circleRadius * Math.sin(textAngle);
			angleOrNull = textAngle;
		} else {
			x = (stuff.startX + stuff.endX) / 2;
			y = (stuff.startY + stuff.endY) / 2;
			angleOrNull = Math.atan2(stuff.endX - stuff.startX, stuff.startY - stuff.endY) + (textObject.lineAngleAdjust || 0);
		}
	} else {
		// Fallback
		x = textObject.x || 0;
		y = textObject.y || 0;
		angleOrNull = null;
	}
	
	// Now apply the exact same positioning logic as drawText()
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
	
	// Add baseline offset
	y += 6;
	
	// Return the center of where the text will actually be drawn
	return { x: x + width / 2, y: y };
}

function getTextScreenPosition(textObject) {
	/**
	 * getTextScreenPosition - Calculates screen coordinates for text overlay positioning
	 * 
	 * Uses the text anchor approach: find the center point of where text will be rendered,
	 * convert to screen coordinates, and center the input around that anchor.
	 */
	
	// Get the text anchor in world coordinates
	var anchor = getTextAnchor(textObject);
	
	// Convert anchor to screen coordinates
	var screenAnchor = worldToScreen(anchor.x, anchor.y);
	
	// Calculate text width for sizing
	var canvas2d = canvas.getContext('2d');
	canvas2d.font = '20px "Times New Roman", serif';
	var textWidth = canvas2d.measureText(convertLatexShortcuts(textObject.text || '')).width;
	
	return {
		x: screenAnchor.x, // This is the center point for input positioning
		y: screenAnchor.y - 15, // Center vertically (30px height / 2)
		width: textWidth
	};
}

function cleanupTextOverlay() {
	/**
	 * cleanupTextOverlay - Removes active text overlay and cleans up state
	 * 
	 * Called by:
	 * - Mode transition functions when leaving editing mode
	 * - Text editing completion/cancellation handlers
	 * - Error handling and cleanup code
	 * 
	 * Calls:
	 * - document.body.removeChild() to remove DOM element
	 * - Event listener cleanup functions
	 * 
	 * Purpose: Ensures proper cleanup of DOM overlay elements and prevents
	 * memory leaks. Removes event listeners and DOM elements created during
	 * text editing sessions.
	 */
	
	if (window.activeTextOverlay) {
		var overlay = window.activeTextOverlay;
		
		// Remove DOM element
		if (overlay.element && overlay.element.parentNode) {
			overlay.element.parentNode.removeChild(overlay.element);
		}
		
		// Clear editing flag on object
		if (overlay.editingObject) {
			overlay.editingObject._isBeingEdited = false;
		}
		
		// Clear global reference
		window.activeTextOverlay = null;
	}
}

function setupTextOverlayEvents(input, editingObject) {
	/**
	 * setupTextOverlayEvents - Configures event handlers for text overlay input
	 * 
	 * Called by:
	 * - createTextEditingOverlay() during overlay initialization
	 * 
	 * Calls:
	 * - Event listener setup functions
	 * - cleanupTextOverlay() on completion
	 * - InteractionManager mode transitions
	 * 
	 * Purpose: Handles text editing completion, cancellation, and cleanup.
	 * Manages the flow from overlay editing back to canvas display.
	 */
	
	// Handle text completion (Enter key or blur)
	function completeEditing() {
		if (window.activeTextOverlay && window.activeTextOverlay.element === input) {
			// Update the object's text
			editingObject.text = input.value;
			editingObject._isBeingEdited = false;
			
			// Clean up overlay
			cleanupTextOverlay();
			
			// Return to selection mode
			InteractionManager.enterSelectionMode(editingObject);
		}
	}
	
	// Handle cancellation (Escape key)
	function cancelEditing() {
		if (window.activeTextOverlay && window.activeTextOverlay.element === input) {
			// Restore original text
			editingObject.text = window.activeTextOverlay.originalText;
			editingObject._isBeingEdited = false;
			
			// Clean up overlay
			cleanupTextOverlay();
			
			// Return to selection mode
			InteractionManager.enterSelectionMode(editingObject);
		}
	}
	
	// Set up event listeners
	input.addEventListener('blur', completeEditing);
	input.addEventListener('keydown', function(e) {
		var key = e.keyCode || e.which;
		
		if (key === 13) { // Enter key
			e.preventDefault();
			completeEditing();
		} else if (key === 27) { // Escape key
			e.preventDefault();
			cancelEditing();
		}
		
		// Stop event propagation to prevent canvas keyboard handlers
		e.stopPropagation();
	});
	
	// Real-time text updates as user types
	input.addEventListener('input', function() {
		if (window.activeTextOverlay && window.activeTextOverlay.element === input) {
			// Update the object's text in real-time
			editingObject.text = input.value;
			draw(); // Redraw canvas to show updated text
		}
	});
	
	// Handle clicks outside the input
	function handleClickOutside(e) {
		if (e.target !== input && window.activeTextOverlay) {
			completeEditing();
			document.removeEventListener('click', handleClickOutside);
		}
	}
	
	// Delay adding click listener to avoid immediate triggering
	setTimeout(function() {
		document.addEventListener('click', handleClickOutside);
	}, 100);
}

var canvas;
var nodeRadius = 30;
var nodes = [];
var links = [];

var snapToPadding = 6; // pixels
var hitTargetPadding = 6; // pixels

// =============================================================================
// INTERACTION MANAGER - SINGLE SOURCE OF TRUTH
// =============================================================================

// Feature flag for new UI flow
var ui_flow_v2 = true; // Set to true to enable new three-state interaction modes

// Update guide content when ui_flow_v2 is defined
if (typeof populateGuide === 'function') {
	populateGuide();
}

// Make InteractionManager globally accessible for debugging
window.InteractionManager = {
    // Internal state
    _selectedObject: null,
    _mode: 'canvas', // Modes: 'canvas', 'selection', 'editing_text', 'multiselect'
    
    // Core selection API (replaces global selectedObject)
    getSelected: function() {
        return this._selectedObject;
    },
    
    getMode: function() {
        return this._mode;
    },
    
    setSelected: function(obj) {
        console.log('🎯 Selection changed:', obj);
        
        if (ui_flow_v2) {
            // New behavior: automatic mode transitions
            if (obj === null) {
                this.enterCanvasMode();
            } else {
                this.enterSelectionMode(obj);
            }
        } else {
            // Current behavior: direct assignment
            this._selectedObject = obj;
        }
    },
    
    // Capability checks (ready for mode logic)
    canEditText: function() {
        if (ui_flow_v2) {
            // New behavior: can only edit text in 'editing_text' mode
            return this._mode === 'editing_text' && this._selectedObject && 'text' in this._selectedObject;
        } else {
            // Current behavior: any selected object with text can be edited
            return this._selectedObject != null && 'text' in this._selectedObject;
        }
    },
    
    canChangeNodeAppearance: function() {
        if (ui_flow_v2) {
            // New behavior: can change appearance in 'selection' mode (single node) or 'multiselect' mode (multiple nodes)
            return (this._mode === 'selection' && this._selectedObject instanceof Node) ||
                   (this._mode === 'multiselect' && selectedNodes.length > 0);
        } else {
            // Current behavior: any selected Node can change appearance
            return this._selectedObject instanceof Node;
        }
    },
    
    canDrag: function() {
        if (ui_flow_v2) {
            // New behavior: can drag in 'selection' mode (single object) or 'multiselect' mode (multiple nodes)
            return (this._mode === 'selection' && this._selectedObject) ||
                   (this._mode === 'multiselect' && selectedNodes.length > 0);
        } else {
            // Current behavior: any selected object can be dragged
            return this._selectedObject != null;
        }
    },
    
    // Utility methods
    isObjectSelected: function(obj) {
        var result = this._selectedObject === obj;
        console.log('InteractionManager.isObjectSelected() called with:', obj, 'result:', result);
        return result;
    },
    
    clearSelection: function() {
        console.log('InteractionManager.clearSelection() called');
        this._selectedObject = null;
        if (ui_flow_v2) {
            this._mode = 'canvas';
            console.log('📊 _mode changed to:', this._mode);
        }
    },
    
    // Mode transition methods (for ui_flow_v2)
    enterCanvasMode: function() {
        if (ui_flow_v2) {
            console.log('🎯 Entering canvas mode');
            
            // Clean up any active text overlay
            cleanupTextOverlay();
            
            this._selectedObject = null;
            this._mode = 'canvas';
            draw();
        }
    },
    
    enterSelectionMode: function(obj) {
        if (ui_flow_v2 && obj) {
            console.log('🎯 Entering selection mode for:', obj);
            
            // Clean up cursor state
            if (obj.cursorPosition !== undefined) {
                delete obj.cursorPosition;
            }
            
            this._selectedObject = obj;
            this._mode = 'selection';
            draw();
        }
    },
    
    enterEditingMode: function(obj) {
        if (ui_flow_v2 && obj && 'text' in obj) {
            console.log('🖊️  Entering editing_text mode for:', obj);
            this._selectedObject = obj;
            this._mode = 'editing_text';
            
            // Initialize cursor position at end of text for direct cursor implementation
            obj.cursorPosition = obj.text ? obj.text.length : 0;
            
            draw(); // Redraw to show cursor
        }
    },
    
    enterMultiselectMode: function() {
        if (ui_flow_v2 && selectedNodes.length > 0) {
            console.log('🎯 Entering multiselect mode with', selectedNodes.length, 'nodes');
            this._mode = 'multiselect';
            console.log('📊 _mode changed to:', this._mode);
            this._selectedObject = null; // Clear individual selection in multiselect mode
            // Stop text caret when entering multiselect mode
            clearInterval(caretTimer);
        }
    },
    
    // Debug helpers
    debugInfo: function() {
        return {
            selected: this._selectedObject,
            mode: this._mode,
            multiSelectCount: selectedNodes.length,
            canEditText: this.canEditText(),
            canDrag: this.canDrag(),
            canChangeNodeAppearance: this.canChangeNodeAppearance()
        };
    },
    
    // Console helper for manual testing
    logState: function() {
        console.log('=== InteractionManager State ===');
        console.log('Selected object:', this._selectedObject);
        console.log('Mode:', this._mode);
        console.log('Multi-selected nodes:', selectedNodes.length);
        console.log('Can edit text:', this.canEditText());
        console.log('Can drag:', this.canDrag());
        console.log('Can change appearance:', this.canChangeNodeAppearance());
        console.log('==============================');
        return 'State logged to console'; // Return a confirmation message
    },
    
    // Simple test method to verify InteractionManager is working
    test: function() {
        console.log('InteractionManager.test() called - the object is working!');
        return 'InteractionManager is functional';
    }
};

// Transparent compatibility layer - makes existing code work unchanged
// Define on both the global object and window to ensure all access patterns work
Object.defineProperty(this, 'selectedObject', {
    get: function() { 
        return window.InteractionManager.getSelected(); 
    },
    set: function(value) { 
        window.InteractionManager.setSelected(value); 
    },
    configurable: true // Allows redefinition if needed during development
});

// Also define on window for explicit window.selectedObject access
Object.defineProperty(window, 'selectedObject', {
    get: function() { 
        return window.InteractionManager.getSelected(); 
    },
    set: function(value) { 
        window.InteractionManager.setSelected(value); 
    },
    configurable: true // Allows redefinition if needed during development
});

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

// Legend system for tracking unique node type combinations
var legendEntries = {}; // Key-value pairs of "color_shape" -> entry data
var legendContainer = null; // HTML container element for legend
var legendInputs = {}; // Map of entry keys to input elements

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

function generateLegendKey(color, shape) {
	/**
	 * generateLegendKey - Creates a unique string identifier for a color+shape combination
	 * 
	 * Called by:
	 * - updateLegendEntries() to create consistent keys for legend tracking
	 * - Legend management functions for data structure operations
	 * 
	 * Calls:
	 * - String concatenation with underscore separator
	 * 
	 * Purpose: Provides consistent key generation for legend entry identification.
	 * Format: "color_shape" (e.g., "yellow_dot", "red_triangle")
	 */
	return color + '_' + shape;
}

function updateLegendEntries() {
	/**
	 * updateLegendEntries - Scans all nodes and updates the legend data structure
	 * 
	 * Called by:
	 * - Node creation/deletion/modification events
	 * - Initial setup and any operation that changes node composition
	 * 
	 * Calls:
	 * - generateLegendKey() to create consistent identifiers
	 * - Node color and shape properties for categorization
	 * 
	 * Purpose: Maintains accurate legend state by scanning all existing nodes
	 * and tracking unique color+shape combinations with their counts.
	 * Removes entries when no nodes of that type exist.
	 */
	var newEntries = {};
	
	// Scan all existing nodes
	for (var i = 0; i < nodes.length; i++) {
		var node = nodes[i];
		var key = generateLegendKey(node.color, node.shape);
		
		if (!newEntries[key]) {
			newEntries[key] = {
				color: node.color,
				shape: node.shape,
				description: '',
				count: 0,
				inputElement: null
			};
			
			// Preserve existing description if it exists
			if (legendEntries[key] && legendEntries[key].description) {
				newEntries[key].description = legendEntries[key].description;
			}
		}
		
		newEntries[key].count++;
	}
	
	// Clean up old input elements for entries that no longer exist
	for (var key in legendEntries) {
		if (!newEntries[key] && legendEntries[key].inputElement) {
			legendEntries[key].inputElement.remove();
		}
	}
	
	legendEntries = newEntries;
	updateLegendHTML();
}

function updateLegendHTML() {
	/**
	 * updateLegendHTML - Creates/updates HTML input elements for legend entries
	 * 
	 * Called by:
	 * - updateLegendEntries() after legend data structure is updated
	 * - Legend rendering and management functions
	 * 
	 * Calls:
	 * - DOM manipulation functions to create/update input elements
	 * - createElement, appendChild for HTML element management
	 * 
	 * Purpose: Synchronizes the HTML input elements with the current legend
	 * data structure, creating new inputs and removing obsolete ones.
	 */
	if (!legendContainer) {
		createLegendContainer();
	}
	
	// Clear existing inputs and create collapsible structure
	legendContainer.innerHTML = '<p id="legend-header" onclick="toggleLegend()" style="margin: 0; font-weight: bold; cursor: pointer; user-select: none; display: flex; align-items: center; justify-content: space-between; font-size: 14px;"><span>Legend</span><span id="legend-toggle" style="font-size: 12px; font-weight: normal;">▼</span></p><div id="legend-content" style="transition: all 0.3s ease-in-out; margin-top: 10px;"></div>';
	
	// Create entries in consistent order (sort by key for predictability)
	var sortedKeys = Object.keys(legendEntries).sort();
	
	for (var i = 0; i < sortedKeys.length; i++) {
		var key = sortedKeys[i];
		var entry = legendEntries[key];
		
		// Create row container
		var row = document.createElement('div');
		row.style.display = 'flex';
		row.style.alignItems = 'center';
		row.style.marginBottom = '8px';
		row.style.gap = '8px';
		
		// Create mini canvas for node visualization
		var miniCanvas = document.createElement('canvas');
		miniCanvas.width = 30;
		miniCanvas.height = 30;
		miniCanvas.style.border = '1px solid #ccc';
		miniCanvas.style.borderRadius = '4px';
		miniCanvas.style.flexShrink = '0';
		miniCanvas.style.position = 'relative'; // Ensure canvas stays in document flow
		miniCanvas.style.display = 'block'; // Explicit block display
		
		// Draw mini node
		drawMiniNode(miniCanvas, entry.color, entry.shape);
		
		// Create text input
		var input = document.createElement('input');
		input.type = 'text';
		input.value = entry.description;
		input.placeholder = 'Describe this node type...';
		input.style.flex = '1';
		input.style.padding = '4px 6px';
		input.style.border = '1px solid #ccc';
		input.style.borderRadius = '3px';
		input.style.fontSize = '12px';
		input.style.fontFamily = 'inherit';
		
		// Store reference and setup event handler
		entry.inputElement = input;
		// CRITICAL: Use IIFE to capture the correct 'key' value for this specific input element
		// Without this, the event handler closure would capture 'key' by reference, meaning ALL
		// input handlers would reference the LAST key from the loop (usually the last legend entry).
		// This would cause all input changes to update the same legend entry instead of their
		// respective entries. The IIFE creates a new scope with the correct entryKey value.
		(function(entryKey) {
			input.addEventListener('input', function() {
				legendEntries[entryKey].description = this.value;
			});
		})(key);
		
		row.appendChild(miniCanvas);
		row.appendChild(input);
		
		var legendContent = legendContainer.querySelector('#legend-content');
		legendContent.appendChild(row);
	}
	
	// Initialize legend collapsed/expanded state
	initializeLegendState();
}

function createLegendContainer() {
	/**
	 * createLegendContainer - Creates the main HTML container for the legend
	 * 
	 * Called by:
	 * - updateLegendHTML() when legend container doesn't exist
	 * - Initial setup functions
	 * 
	 * Calls:
	 * - DOM manipulation functions for element creation and styling
	 * 
	 * Purpose: Sets up the positioned HTML container that will hold all
	 * legend entries and input elements in the top-right corner.
	 */
	legendContainer = document.createElement('div');
	legendContainer.id = 'legendbox';
	legendContainer.style.position = 'absolute';
	legendContainer.style.top = '20px';
	legendContainer.style.right = '20px';
	legendContainer.style.background = 'rgba(223, 223, 223, 0.9)';
	legendContainer.style.borderRadius = '10px';
	legendContainer.style.padding = '15px';
	legendContainer.style.minWidth = '200px';
	legendContainer.style.maxWidth = '300px';
	legendContainer.style.fontSize = '12px';
	legendContainer.style.fontFamily = "'Lucida Grande', 'Segoe UI', sans-serif";
	legendContainer.style.boxShadow = '0 2px 15px rgba(0,0,0,0.15)';
	legendContainer.style.border = '1px solid rgba(0,0,0,0.1)';
	legendContainer.style.zIndex = '10';
	legendContainer.style.display = 'none'; // Hidden initially
	
	document.body.appendChild(legendContainer);
}

function drawMiniNode(miniCanvas, color, shape) {
	/**
	 * drawMiniNode - Draws a miniature representation of a node in the legend
	 * 
	 * Called by:
	 * - updateLegendHTML() to create visual samples for each legend entry
	 * 
	 * Calls:
	 * - Canvas 2D API functions for drawing
	 * - Node color methods for consistent coloring
	 * 
	 * Purpose: Renders a small version of each unique node type for visual
	 * reference in the legend, using the same drawing logic as full nodes.
	 */
	var c = miniCanvas.getContext('2d');
	var centerX = 15;
	var centerY = 15;
	var miniRadius = 12;
	
	c.clearRect(0, 0, miniCanvas.width, miniCanvas.height);
	
	// Create temporary node for color methods
	var tempNode = { color: color, shape: shape };
	tempNode.getBaseColor = Node.prototype.getBaseColor;
	
	c.fillStyle = tempNode.getBaseColor();
	c.strokeStyle = '#9ac29a';
	c.lineWidth = 1.5;
	
	c.beginPath();
	
	switch(shape) {
		case 'dot':
			c.arc(centerX, centerY, miniRadius, 0, 2 * Math.PI, false);
			break;
		case 'triangle':
			c.moveTo(centerX, centerY - miniRadius);
			c.lineTo(centerX - miniRadius * Math.cos(Math.PI/6), centerY + miniRadius * Math.sin(Math.PI/6));
			c.lineTo(centerX + miniRadius * Math.cos(Math.PI/6), centerY + miniRadius * Math.sin(Math.PI/6));
			c.closePath();
			break;
		case 'square':
			var r = miniRadius * 0.85;
			c.rect(centerX - r, centerY - r, 2 * r, 2 * r);
			break;
		case 'pentagon':
			drawMiniPolygon(c, centerX, centerY, miniRadius, 5);
			break;
		case 'hexagon':
			drawMiniPolygon(c, centerX, centerY, miniRadius, 6);
			break;
		default:
			c.arc(centerX, centerY, miniRadius, 0, 2 * Math.PI, false);
	}
	
	c.fill();
	c.stroke();
}

function drawMiniPolygon(c, centerX, centerY, radius, sides) {
	/**
	 * drawMiniPolygon - Helper function to draw regular polygons in legend
	 * 
	 * Called by:
	 * - drawMiniNode() for pentagon and hexagon shapes
	 * 
	 * Calls:
	 * - Math.cos(), Math.sin() for vertex calculations
	 * - Canvas path drawing functions
	 * 
	 * Purpose: Renders regular polygons with specified number of sides
	 * for consistent mini-node representation in the legend.
	 */
	var angle = -Math.PI / 2; // Start from top
	var angleStep = 2 * Math.PI / sides;
	
	c.moveTo(
		centerX + radius * Math.cos(angle),
		centerY + radius * Math.sin(angle)
	);
	
	for (var i = 1; i < sides; i++) {
		angle += angleStep;
		c.lineTo(
			centerX + radius * Math.cos(angle),
			centerY + radius * Math.sin(angle)
		);
	}
	
	c.closePath();
}

function showLegendIfNeeded() {
	/**
	 * showLegendIfNeeded - Shows or hides the legend based on whether any entries exist
	 * 
	 * Called by:
	 * - updateLegendEntries() after legend state changes
	 * - Main rendering functions to manage legend visibility
	 * 
	 * Calls:
	 * - DOM style manipulation for show/hide behavior
	 * 
	 * Purpose: Automatically manages legend visibility - shows when there are
	 * legend entries to display, hides when no unique node types exist.
	 */
	if (!legendContainer) return;
	
	var hasEntries = Object.keys(legendEntries).length > 0;
	legendContainer.style.display = hasEntries ? 'block' : 'none';
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

function updateLegend() {
	/**
	 * updateLegend - Updates legend only when node composition changes
	 * 
	 * Called by:
	 * - Node creation/modification/deletion events
	 * - Initial setup after restore
	 * 
	 * Purpose: Targeted legend updates only when actually needed,
	 * not on every draw call (which includes caret blinking, etc.)
	 */
	updateLegendEntries();
	showLegendIfNeeded();
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
	console.log("window.onload is running!");
	canvas = document.getElementById('canvas');
	console.log("canvas element:", canvas);
	restoreBackup();
	updateLegend(); // Update legend after restore
	draw();

	// Canvas resize handling - moved from index.html
	function resizeCanvas() {
		if (canvas) {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			draw(); // Safe to call since we're in window.onload
		}
	}

	// Guide toggle functionality - moved from index.html  
	window.toggleControls = function() {
		var content = document.getElementById('controls-content');
		var toggle = document.getElementById('controls-toggle');
		
		if (content.style.display === 'none') {
			content.style.display = 'block';
			toggle.textContent = '▼';
			// Save expanded state
			localStorage.setItem('guideExpanded', 'true');
		} else {
			content.style.display = 'none';
			toggle.textContent = '►';
			// Save collapsed state
			localStorage.setItem('guideExpanded', 'false');
		}
	};

	// Initialize guide box state from localStorage - moved from index.html
	function initializeGuideBoxState() {
		var isExpanded = localStorage.getItem('guideExpanded');
		var content = document.getElementById('controls-content');
		var toggle = document.getElementById('controls-toggle');
		
		// Default to collapsed if no preference saved, or if preference is explicitly 'true'
		if (isExpanded === 'true') {
			content.style.display = 'block';
			toggle.textContent = '▼';
		} else {
			content.style.display = 'none';
			toggle.textContent = '►';
		}
	}

	// Set up event listeners and initialize UI - moved from index.html
	window.addEventListener('resize', resizeCanvas);
	resizeCanvas(); // Initial resize
	initializeFilenameInput();
	initializeGuideBoxState();

	canvas.onmousedown = function(e) {
		console.log("canvas element in mousedown:", canvas);
		var mouse = crossBrowserRelativeMousePos(e);
		
		// Check for middle-click panning
		if (e.button === 1) { // Middle mouse button
			startPanning(mouse.x, mouse.y);
			return false; // Prevent default middle-click behavior
		}
		
		// Convert to world coordinates for object interaction
		var worldMouse = screenToWorld(mouse.x, mouse.y);
		InteractionManager.setSelected(selectObject(worldMouse.x, worldMouse.y));
		movingObject = false;
		originalClick = worldMouse;

		if(InteractionManager.getSelected() != null) {
			// Check if clicked node is part of current multi-selection
			var isPartOfMultiSelection = (InteractionManager.getSelected() instanceof Node && selectedNodes.indexOf(InteractionManager.getSelected()) !== -1);
			
			if(!isPartOfMultiSelection) {
				// Clear group selection when individual object is selected (not part of group)
				selectedNodes = [];
			}
			
			if(shift && InteractionManager.getSelected() instanceof Node) {
				currentLink = new SelfLink(InteractionManager.getSelected(), worldMouse);
			} else {
				movingObject = true;
				deltaMouseX = deltaMouseY = 0;
				if(InteractionManager.getSelected().setMouseStart) {
					InteractionManager.getSelected().setMouseStart(worldMouse.x, worldMouse.y);
				}
			}
			
			// Only reset caret if we're in editing mode (ui_flow_v2) or legacy mode with text editing capability
			if (!ui_flow_v2 && InteractionManager.canEditText()) {
				resetCaret();
			} else if (ui_flow_v2 && InteractionManager.getMode() === 'editing_text') {
				resetCaret();
			}
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
		InteractionManager.setSelected(selectObject(worldMouse.x, worldMouse.y));

		if(InteractionManager.getSelected() == null) {
			// Clear group selection when creating new node
			selectedNodes = [];
			
			// Create new node with specified shape and color
			var shape = getShapeFromModifier(shapeModifier);
			var color = getColorFromModifier(colorModifier);
			InteractionManager.setSelected(new Node(worldMouse.x, worldMouse.y, shape, color));
			nodes.push(InteractionManager.getSelected());
			
			// If we used a modifier, suppress typing briefly to allow key release
			if(shapeModifier != null || colorModifier != null) {
				suppressTypingUntil = Date.now() + 300; // 300ms suppression
			}
			
			resetCaret();
			updateLegend(); // Update legend when new node created
			draw();
		} else if(InteractionManager.getSelected() instanceof Node) {
			var needsLegendUpdate = false;
			if(shapeModifier != null && InteractionManager.canChangeNodeAppearance()) {
				// Change existing node to specific shape
				InteractionManager.getSelected().shape = getShapeFromModifier(shapeModifier);
				// Suppress typing briefly when changing shapes too
				suppressTypingUntil = Date.now() + 300;
				needsLegendUpdate = true;
			}
			if(colorModifier != null && InteractionManager.canChangeNodeAppearance()) {
				// Change existing node to specific color
				InteractionManager.getSelected().color = getColorFromModifier(colorModifier);
				// Suppress typing briefly when changing colors too
				suppressTypingUntil = Date.now() + 300;
				needsLegendUpdate = true;
			}
			// Update legend if node appearance changed
			if(needsLegendUpdate) {
				updateLegend();
			}
			
			// Mode transition: double-clicking a node without modifiers switches to editing mode
			if(ui_flow_v2 && shapeModifier == null && colorModifier == null) {
				InteractionManager.enterEditingMode(InteractionManager.getSelected());
			}
			
			draw();
		} else if(InteractionManager.getSelected() && 'text' in InteractionManager.getSelected()) {
			// Mode transition: double-clicking any object with text (links) switches to editing mode
			if(ui_flow_v2) {
				InteractionManager.enterEditingMode(InteractionManager.getSelected());
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

			if(InteractionManager.getSelected() == null) {
				if(targetNode != null) {
					currentLink = new StartLink(targetNode, originalClick);
				} else {
					currentLink = new TemporaryLink(originalClick, worldMouse);
				}
			} else {
				if(targetNode == InteractionManager.getSelected()) {
					currentLink = new SelfLink(InteractionManager.getSelected(), worldMouse);
				} else if(targetNode != null) {
					currentLink = new Link(InteractionManager.getSelected(), targetNode);
				} else {
					currentLink = new TemporaryLink(InteractionManager.getSelected().closestPointOnShapeToEdgeArc(worldMouse.x, worldMouse.y), worldMouse);
				}
			}
			draw();
		}

		if(movingObject && InteractionManager.canDrag()) {
			// Check if we're moving a node that's part of a multi-selection
			var isGroupMovement = (InteractionManager.getSelected() instanceof Node && selectedNodes.length > 0 && selectedNodes.indexOf(InteractionManager.getSelected()) !== -1);
			
			if(isGroupMovement) {
				// Calculate movement delta from the selected object's previous position
				var oldX = InteractionManager.getSelected().x;
				var oldY = InteractionManager.getSelected().y;
				
				// Move the primary selected object
				InteractionManager.getSelected().setAnchorPoint(worldMouse.x, worldMouse.y);
				if(InteractionManager.getSelected() instanceof Node) {
					snapNode(InteractionManager.getSelected());
				}
				
				// Calculate the actual delta after snapping
				var deltaX = InteractionManager.getSelected().x - oldX;
				var deltaY = InteractionManager.getSelected().y - oldY;
				
				// Move all other selected nodes by the same delta
				for(var i = 0; i < selectedNodes.length; i++) {
					if(selectedNodes[i] !== InteractionManager.getSelected()) {
						selectedNodes[i].x += deltaX;
						selectedNodes[i].y += deltaY;
					}
				}
			} else {
				// Normal individual object movement
				InteractionManager.getSelected().setAnchorPoint(worldMouse.x, worldMouse.y);
				if(InteractionManager.getSelected() instanceof Node) {
					snapNode(InteractionManager.getSelected());
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
			
			// If nodes were selected, clear individual selectedObject and enter multiselect mode
			if(selectedNodes.length > 0) {
				InteractionManager.setSelected(null);
				InteractionManager.enterMultiselectMode();
			} else {
				// If no nodes selected and this was a very small rectangle (likely a click), clear all selections
				var rectWidth = Math.abs(selectionBox.endX - selectionBox.startX);
				var rectHeight = Math.abs(selectionBox.endY - selectionBox.startY);
				if(rectWidth < 5 && rectHeight < 5) {
					InteractionManager.setSelected(null);
					selectedNodes = [];
				}
			}
			
			draw();
		} else if(currentLink != null) {
			if(!(currentLink instanceof TemporaryLink)) {
				InteractionManager.setSelected(currentLink);
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
		
		// Immediate shape change in selection or multiselect mode
		if(ui_flow_v2 && InteractionManager.canChangeNodeAppearance()) {
			if(InteractionManager.getMode() === 'selection') {
				// Single node selection
				InteractionManager.getSelected().shape = getShapeFromModifier(shapeModifier);
			} else if(InteractionManager.getMode() === 'multiselect') {
				// Multiple node selection - apply to all selected nodes
				for(var i = 0; i < selectedNodes.length; i++) {
					selectedNodes[i].shape = getShapeFromModifier(shapeModifier);
				}
			}
			suppressTypingUntil = Date.now() + 300; // Suppress typing briefly
			updateLegend(); // Update legend after shape change
			draw();
		}
	} else if(key == 81 || key == 87 || key == 69 || key == 82 || key == 84) { // Q, W, E, R, T keys
		colorModifier = String.fromCharCode(key); // Convert keycode to letter (Q, W, E, R, T)
		
		// Immediate color change in selection or multiselect mode
		if(ui_flow_v2 && InteractionManager.canChangeNodeAppearance()) {
			if(InteractionManager.getMode() === 'selection') {
				// Single node selection
				InteractionManager.getSelected().color = getColorFromModifier(colorModifier);
			} else if(InteractionManager.getMode() === 'multiselect') {
				// Multiple node selection - apply to all selected nodes
				for(var i = 0; i < selectedNodes.length; i++) {
					selectedNodes[i].color = getColorFromModifier(colorModifier);
				}
			}
			suppressTypingUntil = Date.now() + 300; // Suppress typing briefly
			updateLegend(); // Update legend after color change
			draw();
		}
	} else if(!canvasHasFocus()) {
		// don't read keystrokes when other things have focus
		return true;
	} else if(key == 8) { // backspace key
		if(InteractionManager.canEditText()) {
			var selected = InteractionManager.getSelected();
			if (selected.cursorPosition !== undefined && selected.cursorPosition > 0) {
				// Direct cursor implementation: delete character before cursor
				var before = selected.text.substring(0, selected.cursorPosition - 1);
				var after = selected.text.substring(selected.cursorPosition);
				selected.text = before + after;
				selected.cursorPosition--;
			} else if (selected.cursorPosition === undefined) {
				// Legacy behavior: delete from end
				selected.text = selected.text.substr(0, selected.text.length - 1);
			}
			resetCaret();
			draw();
		}

		// backspace is a shortcut for the back button, but do NOT want to change pages
		return false;
	} else if(key == 37) { // left arrow key
		if(InteractionManager.canEditText() && InteractionManager.getSelected().cursorPosition !== undefined) {
			var selected = InteractionManager.getSelected();
			if (selected.cursorPosition > 0) {
				selected.cursorPosition--;
				resetCaret(); // Make cursor visible immediately when moving
				draw();
			}
		}
		return false;
	} else if(key == 39) { // right arrow key
		if(InteractionManager.canEditText() && InteractionManager.getSelected().cursorPosition !== undefined) {
			var selected = InteractionManager.getSelected();
			if (selected.cursorPosition < selected.text.length) {
				selected.cursorPosition++;
				resetCaret(); // Make cursor visible immediately when moving
				draw();
			}
		}
		return false;
	} else if(key == 36) { // home key
		if(InteractionManager.canEditText() && InteractionManager.getSelected().cursorPosition !== undefined) {
			InteractionManager.getSelected().cursorPosition = 0;
			resetCaret(); // Make cursor visible immediately when moving
			draw();
		}
		return false;
	} else if(key == 35) { // end key
		if(InteractionManager.canEditText() && InteractionManager.getSelected().cursorPosition !== undefined) {
			var selected = InteractionManager.getSelected();
			selected.cursorPosition = selected.text.length;
			resetCaret(); // Make cursor visible immediately when moving
			draw();
		}
		return false;
	} else if(key == 46) { // delete key
		// Only delete nodes/links when NOT in text editing mode
		if(ui_flow_v2 && InteractionManager.getMode() === 'editing_text') {
			// In text editing mode, delete key should delete character at cursor (forward delete)
			if(InteractionManager.canEditText()) {
				var selected = InteractionManager.getSelected();
				if (selected.cursorPosition !== undefined && selected.cursorPosition < selected.text.length) {
					// Delete character at cursor position (forward delete)
					var before = selected.text.substring(0, selected.cursorPosition);
					var after = selected.text.substring(selected.cursorPosition + 1);
					selected.text = before + after;
					// Cursor position stays the same (character after was deleted)
					resetCaret(); // Make cursor visible after deletion
					draw();
				}
			}
		} else if(selectedNodes.length > 0) {
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
			InteractionManager.setSelected(null);
			updateLegend(); // Update legend after deleting nodes
			draw();
		} else if(InteractionManager.getSelected() != null) {
			// Original single object deletion logic
			for(var i = 0; i < nodes.length; i++) {
				if(nodes[i] == InteractionManager.getSelected()) {
					nodes.splice(i--, 1);
				}
			}
			for(var i = 0; i < links.length; i++) {
				if(links[i] == InteractionManager.getSelected() || links[i].node == InteractionManager.getSelected() || links[i].nodeA == InteractionManager.getSelected() || links[i].nodeB == InteractionManager.getSelected()) {
					links.splice(i--, 1);
				}
			}
			InteractionManager.setSelected(null);
			updateLegend(); // Update legend after deleting node
			draw();
		}
	} else if(key == 27) { // escape key
		if(ui_flow_v2) {
			// Mode transitions: editing_text → selection → canvas, multiselect → canvas
			if(InteractionManager.getMode() === 'editing_text') {
				InteractionManager.enterSelectionMode(InteractionManager.getSelected());
				draw(); // Redraw to hide the caret immediately
			} else if(InteractionManager.getMode() === 'selection') {
				InteractionManager.enterCanvasMode();
				draw(); // Redraw to update visual state
			} else if(InteractionManager.getMode() === 'multiselect') {
				// Exit multiselect mode and clear selections
				selectedNodes = [];
				InteractionManager.enterCanvasMode();
				draw(); // Redraw to update visual state
			}
			// If already in canvas mode, escape does nothing
		}
	} else if(key == 13) { // enter key
		if(ui_flow_v2) {
			// Mode transition: selection → editing_text (if node with text is selected)
			if(InteractionManager.getMode() === 'selection' && InteractionManager.getSelected() && 'text' in InteractionManager.getSelected()) {
				InteractionManager.enterEditingMode(InteractionManager.getSelected());
				draw(); // Redraw to show the caret
			}
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
	} else if(key >= 0x20 && key <= 0x7E && !e.metaKey && !e.altKey && !e.ctrlKey && InteractionManager.canEditText()) {
		// Mode transition: automatically enter editing_text mode when typing begins
		if(ui_flow_v2 && InteractionManager.getMode() !== 'editing_text') {
			InteractionManager.enterEditingMode(InteractionManager.getSelected());
		}
		
		var selected = InteractionManager.getSelected();
		if (selected.cursorPosition !== undefined) {
			// Direct cursor implementation: insert character at cursor position
			var before = selected.text.substring(0, selected.cursorPosition);
			var after = selected.text.substring(selected.cursorPosition);
			selected.text = before + String.fromCharCode(key) + after;
			selected.cursorPosition++;
		} else {
			// Legacy behavior: append to end
			selected.text += String.fromCharCode(key);
		}
		
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
	
	// Serialize legend descriptions (exclude DOM elements and counts)
	var jsonLegend = {};
	for (var key in legendEntries) {
		if (legendEntries[key].description && legendEntries[key].description.trim() !== '') {
			jsonLegend[key] = legendEntries[key].description;
		}
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
		links: jsonLinks,
		legend: jsonLegend
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
	InteractionManager.setSelected(null);
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
	
	// Restore legend descriptions if present (before updating legend)
	if (jsonData.legend) {
		// Clear any existing legend descriptions
		for (var key in legendEntries) {
			if (legendEntries[key]) {
				legendEntries[key].description = '';
			}
		}
		
		// Pre-populate legend descriptions from imported data
		for (var legendKey in jsonData.legend) {
			// Create legend entry structure if it doesn't exist
			if (!legendEntries[legendKey]) {
				var parts = legendKey.split('_');
				if (parts.length === 2) {
					legendEntries[legendKey] = {
						color: parts[0],
						shape: parts[1],
						description: jsonData.legend[legendKey],
						count: 0,
						inputElement: null
					};
				}
			} else {
				// Update existing entry description
				legendEntries[legendKey].description = jsonData.legend[legendKey];
			}
		}
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
	
	// Update legend after importing (will preserve descriptions and update counts)
	updateLegend();
	
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
    InteractionManager.setSelected(null);
    currentLink = null;
    
    // Reset filename to default
    var input = document.getElementById('filenameInput');
    if (input) {
        input.value = '';
        updateDocumentTitle(); // Update title when clearing filename
        saveFilenameToBrowserStorage(); // Save the reset filename to browserStorage
    }
    
    // Clear the legend
    legendEntries = {};
    updateLegendHTML();
    
    // Redraw the canvas (will show empty canvas)
    draw();
    
    // Save the cleared state to localStorage
    saveBackup();
}

function toggleLegend() {
    var content = document.getElementById('legend-content');
    var toggle = document.getElementById('legend-toggle');
    
    if (content && toggle) {
        if (content.style.display === 'none') {
            content.style.display = 'block';
            toggle.textContent = '▼';
            // Save expanded state
            localStorage.setItem('legendExpanded', 'true');
        } else {
            content.style.display = 'none';
            toggle.textContent = '►';
            // Save collapsed state
            localStorage.setItem('legendExpanded', 'false');
        }
    }
}

function initializeLegendState() {
    var isExpanded = localStorage.getItem('legendExpanded');
    var content = document.getElementById('legend-content');
    var toggle = document.getElementById('legend-toggle');
    
    if (content && toggle) {
        // Default to expanded if no preference saved, or if preference is 'true'
        if (isExpanded === null || isExpanded === 'true') {
            content.style.display = 'block';
            toggle.textContent = '▼';
        } else {
            content.style.display = 'none';
            toggle.textContent = '►';
        }
    }
}
