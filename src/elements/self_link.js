function SelfLink(node, mouse) {
	/**
	 * SelfLink constructor - Creates a self-loop arrow from a node back to itself
	 * 
	 * Called by:
	 * - canvas event handlers in fsm.js when creating new self-loops
	 * - User interaction code during FSM design/editing
	 * - Any code that needs to create reflexive state transitions
	 * 
	 * Calls:
	 * - this.setAnchorPoint() if mouse position is provided during construction
	 * - No other function calls during basic construction
	 * 
	 * Purpose: Initializes a self-link object that represents a state transition
	 * from a node back to itself (reflexive transition). Sets up the target node,
	 * anchor angle for positioning the loop, and optional initial mouse position.
	 * Self-links are rendered as circular arcs extending from and returning to the same node.
	 */
	this.node = node;
	this.anchorAngle = 0;
	this.mouseOffsetAngle = 0;
	this.text = '';
	this.arrowType = 'arrow'; // 'arrow' for traditional triangle, 'T' for T-shaped
	this.color = 'gray'; // Default link color (matches getColorFromModifier default for edges)

	if(mouse) {
		this.setAnchorPoint(mouse.x, mouse.y);
	}
}

SelfLink.prototype.setMouseStart = function(x, y) {
	/**
	 * setMouseStart - Records the initial mouse offset for dragging operations
	 * 
	 * Called by:
	 * - Mouse down event handlers in fsm.js when starting to drag a self-link
	 * - User interaction code that needs to track drag start position
	 * 
	 * Calls:
	 * - Math.atan2() to calculate angle from node center to mouse position
	 * - Uses this.node.x, this.node.y for node center coordinates
	 * - Accesses this.anchorAngle for current self-link orientation
	 * 
	 * Purpose: Establishes a reference point for mouse dragging by calculating
	 * the offset between the current anchor angle and the mouse position angle.
	 * This allows smooth dragging that maintains the relative position between
	 * mouse and self-link during drag operations.
	 */
	this.mouseOffsetAngle = this.anchorAngle - Math.atan2(y - this.node.y, x - this.node.x);
};

SelfLink.prototype.setAnchorPoint = function(x, y) {
	/**
	 * setAnchorPoint - Updates the angular position of the self-link around the node
	 * 
	 * Called by:
	 * - SelfLink constructor during initialization
	 * - Mouse drag handlers in fsm.js when repositioning self-links
	 * - User interaction code during self-link editing and positioning
	 * 
	 * Calls:
	 * - Math.atan2() to calculate angle from node center to target position
	 * - Math.round(), Math.abs() for snap-to-grid angle calculations
	 * - Uses this.mouseOffsetAngle for maintaining drag relationship
	 * 
	 * Purpose: Positions the self-link loop around the node by setting the anchor angle.
	 * Includes snap-to-90-degree functionality for clean alignment. Ensures the angle
	 * stays within -π to π range for consistent hit detection. The loop position
	 * determines where the circular arc appears relative to the node.
	 */
	this.anchorAngle = Math.atan2(y - this.node.y, x - this.node.x) + this.mouseOffsetAngle;
	// snap to 90 degrees
	var snap = Math.round(this.anchorAngle / (Math.PI / 2)) * (Math.PI / 2);
	if(Math.abs(this.anchorAngle - snap) < 0.1) this.anchorAngle = snap;
	// keep in the range -pi to pi so our containsPoint() function always works
	if(this.anchorAngle < -Math.PI) this.anchorAngle += 2 * Math.PI;
	if(this.anchorAngle > Math.PI) this.anchorAngle -= 2 * Math.PI;
};

SelfLink.prototype.getEndPointsAndArcParams = function() {
	/**
	 * getEndPointsAndArcParams - Calculates all geometric properties for the self-loop arc
	 * 
	 * Called by:
	 * - this.draw() during rendering to get complete arc geometry
	 * - this.containsPoint() during hit detection calculations
	 * - Any code that needs the self-link's geometric properties
	 * 
	 * Calls:
	 * - Math.cos(), Math.sin() for trigonometric calculations
	 * - nodeRadius global variable for node size calculations
	 * - Uses this.anchorAngle to determine loop orientation
	 * - Uses this.node.x, this.node.y for node center coordinates
	 * 
	 * Purpose: Computes the complete geometry for the self-loop including circle center,
	 * radius, start/end points, and angles. The loop is positioned 1.5 node radii away
	 * from the node center and has a radius of 0.75 node radii. Arc spans 1.6π radians
	 * (288 degrees) to create a visible loop that clearly returns to the same node.
	 */
	var circleX = this.node.x + 1.5 * nodeRadius * Math.cos(this.anchorAngle);
	var circleY = this.node.y + 1.5 * nodeRadius * Math.sin(this.anchorAngle);
	var circleRadius = 0.75 * nodeRadius;
	var startAngle = this.anchorAngle - Math.PI * 0.8;
	var endAngle = this.anchorAngle + Math.PI * 0.8;
	var startX = circleX + circleRadius * Math.cos(startAngle);
	var startY = circleY + circleRadius * Math.sin(startAngle);
	var endX = circleX + circleRadius * Math.cos(endAngle);
	var endY = circleY + circleRadius * Math.sin(endAngle);
	return {
		'hasCircle': true,
		'startX': startX,
		'startY': startY,
		'endX': endX,
		'endY': endY,
		'startAngle': startAngle,
		'endAngle': endAngle,
		'circleX': circleX,
		'circleY': circleY,
		'circleRadius': circleRadius
	};
};

SelfLink.prototype.draw = function(c) {
	/**
	 * draw - Renders the self-link as a circular arc with arrow and text label
	 * 
	 * Called by:
	 * - drawUsing() in fsm.js during main canvas rendering loop
	 * - All drawing contexts: main canvas, JSON export, and custom drawing operations
	 * 
	 * Calls:
	 * - this.getEndPointsAndArcParams() to get complete arc geometry
	 * - c.beginPath(), c.arc(), c.stroke() for drawing the circular arc
	 * - drawText() from fsm.js to render the transition label
	 * - drawArrow() from fsm.js to render the directional arrow head
	 * - Math.cos(), Math.sin() for text positioning calculations
	 * - selectedObject global variable to determine highlighting
	 * 
	 * Purpose: Main rendering function that draws the complete self-link visualization:
	 * circular arc loop, directional arrow head, and properly positioned text label.
	 * Text is positioned on the farthest point of the loop from the node center.
	 * Always draws as a circular arc (never straight lines).
	 */
	var stuff = this.getEndPointsAndArcParams();
	
	// Apply selection glow if this self-link is selected
	drawSelectionGlow(c, selectedObject == this, false);
	
	// draw arc - shorten it before the arrow
	c.beginPath();
	var pixelOffset = this.arrowType === 'T' ? 3 : 5;
	var arrowOffset = pixelOffset / stuff.circleRadius; // pixels converted to radians - shorter for T-arrows
	var adjustedEndAngle = stuff.endAngle - arrowOffset; // Always subtract for self-links
	c.arc(stuff.circleX, stuff.circleY, stuff.circleRadius, stuff.startAngle, adjustedEndAngle, false);
	c.stroke();
	
	// draw the head of the arrow
	if (this.arrowType === 'T') {
		drawTArrow(c, stuff.endX, stuff.endY, stuff.endAngle + Math.PI * 0.4);
	} else {
		drawArrow(c, stuff.endX, stuff.endY, stuff.endAngle + Math.PI * 0.4);
	}
	
	// Clear glow after drawing the self-link
	clearSelectionGlow(c);
	
	// draw the text on the loop farthest from the node
	var textX = stuff.circleX + stuff.circleRadius * Math.cos(this.anchorAngle);
	var textY = stuff.circleY + stuff.circleRadius * Math.sin(this.anchorAngle);
	drawText(c, this.text, textX, textY, this.anchorAngle, selectedObject == this);
};

SelfLink.prototype.containsPoint = function(x, y) {
	/**
	 * containsPoint - Performs hit detection to determine if a given point is on this self-link
	 * 
	 * Called by:
	 * - selectObject() in fsm.js during mouse click event handling
	 * - Used to determine which self-link (if any) was clicked for selection/interaction
	 * 
	 * Calls:
	 * - this.getEndPointsAndArcParams() to get the self-link's circular arc properties
	 * - Math.sqrt() and Math.abs() for distance calculations
	 * - hitTargetPadding global variable to define clickable area around the arc
	 * 
	 * Purpose: Critical for user interaction - determines if mouse clicks are hitting
	 * this specific self-link. Uses circular arc collision detection by calculating
	 * the distance from the point to the circle boundary. Returns true if the point
	 * (x,y) is within tolerance distance of the circular arc path.
	 */
	var stuff = this.getEndPointsAndArcParams();
	var dx = x - stuff.circleX;
	var dy = y - stuff.circleY;
	var distance = Math.sqrt(dx*dx + dy*dy) - stuff.circleRadius;
	return (Math.abs(distance) < hitTargetPadding);
};

SelfLink.prototype.getTextPosition = function() {
	/**
	 * getTextPosition - Returns world coordinates for self-link text positioning
	 * 
	 * Called by:
	 * - getTextScreenPosition() for overlay positioning
	 * - Text editing functions that need self-link text coordinates
	 * 
	 * Calls:
	 * - this.getEndPointsAndArcParams() for arc geometry
	 * - Math.cos(), Math.sin() for text positioning calculations
	 * 
	 * Purpose: Provides consistent text positioning coordinates for self-links,
	 * matching the same logic used in SelfLink.prototype.draw() for text rendering.
	 */
	var stuff = this.getEndPointsAndArcParams();
	
	// Use the same logic as SelfLink.prototype.draw() for text positioning
	var textX = stuff.circleX + stuff.circleRadius * Math.cos(this.anchorAngle);
	var textY = stuff.circleY + stuff.circleRadius * Math.sin(this.anchorAngle);
	
	return { x: textX, y: textY };
};
