function StartLink(node, start) {
	/**
	 * StartLink constructor - Creates a start arrow pointing to a node (entry point for FSM)
	 * 
	 * Called by:
	 * - canvas event handlers in fsm.js when creating new start links
	 * - User interaction code during FSM design/editing
	 * 
	 * Calls:
	 * - this.setAnchorPoint() if start position is provided
	 * - No other function calls during construction
	 * 
	 * Purpose: Initializes a start link object that represents the initial state arrow
	 * in a finite state machine. Sets up the target node and optional starting position.
	 * Start links indicate which node is the entry point of the FSM.
	 */
	this.node = node;
	this.deltaX = 0;
	this.deltaY = 0;
	this.text = '';

	if(start) {
		this.setAnchorPoint(start.x, start.y);
	}
}

StartLink.prototype.setAnchorPoint = function(x, y) {
	/**
	 * setAnchorPoint - Sets the starting position of the start link arrow
	 * 
	 * Called by:
	 * - StartLink constructor during initialization
	 * - Mouse drag handlers in fsm.js when repositioning start links
	 * - User interaction code during start link editing
	 * 
	 * Calls:
	 * - Math.abs() for snap-to-grid calculations
	 * - snapToPadding global variable for alignment thresholds
	 * 
	 * Purpose: Positions the start point of the arrow relative to the target node.
	 * Includes snap-to-grid functionality to align start links with node centers
	 * when they're close enough. Updates deltaX and deltaY offsets.
	 */
	this.deltaX = x - this.node.x;
	this.deltaY = y - this.node.y;

	if(Math.abs(this.deltaX) < snapToPadding) {
		this.deltaX = 0;
	}

	if(Math.abs(this.deltaY) < snapToPadding) {
		this.deltaY = 0;
	}
};

StartLink.prototype.getEndPoints = function() {
	/**
	 * getEndPoints - Calculates the start and end coordinates for the start link arrow
	 * 
	 * Called by:
	 * - this.draw() during rendering to get arrow geometry
	 * - this.containsPoint() during hit detection calculations
	 * - Any code that needs the arrow's geometric properties
	 * 
	 * Calls:
	 * - this.node.closestPointOnCircle() to find where arrow meets the node boundary
	 * - Uses this.node.x, this.node.y for node center coordinates
	 * - Accesses this.deltaX, this.deltaY for start point offset
	 * 
	 * Purpose: Computes the exact pixel coordinates where the start arrow begins
	 * and ends. Start point is offset from node center by deltaX/deltaY, end point
	 * is on the node's circular boundary closest to the start point.
	 */
	var startX = this.node.x + this.deltaX;
	var startY = this.node.y + this.deltaY;
	var end = this.node.closestPointOnShapeToEdgeArc(startX, startY);
	return {
		'startX': startX,
		'startY': startY,
		'endX': end.x,
		'endY': end.y,
	};
};

StartLink.prototype.draw = function(c) {
	/**
	 * draw - Renders the start link as a straight arrow with optional text label
	 * 
	 * Called by:
	 * - drawUsing() in fsm.js during main canvas rendering loop
	 * - All drawing contexts: main canvas, JSON export, and custom drawing operations
	 * 
	 * Calls:
	 * - this.getEndPoints() to get arrow start and end coordinates
	 * - c.beginPath(), c.moveTo(), c.lineTo(), c.stroke() for drawing the line
	 * - drawText() from fsm.js to render the optional text label
	 * - drawArrow() from fsm.js to render the arrow head
	 * - Math.atan2() for angle calculations for text and arrow positioning
	 * - selectedObject global variable to determine highlighting
	 * 
	 * Purpose: Main rendering function that draws the complete start link visualization:
	 * straight line from start point to node boundary, directional arrow head,
	 * and properly positioned/rotated text label. Always draws straight lines (no curves).
	 */
	var stuff = this.getEndPoints();

	// draw the line
	c.beginPath();
	c.moveTo(stuff.startX, stuff.startY);
	c.lineTo(stuff.endX, stuff.endY);
	c.stroke();

	// draw the text at the end without the arrow
	var textAngle = Math.atan2(stuff.startY - stuff.endY, stuff.startX - stuff.endX);
	drawText(c, this.text, stuff.startX, stuff.startY, textAngle, selectedObject == this);

	// draw the head of the arrow
	drawArrow(c, stuff.endX, stuff.endY, Math.atan2(-this.deltaY, -this.deltaX));
};

StartLink.prototype.containsPoint = function(x, y) {
	/**
	 * containsPoint - Performs hit detection to determine if a given point is on this start link
	 * 
	 * Called by:
	 * - selectObject() in fsm.js during mouse click event handling
	 * - Used to determine which start link (if any) was clicked for selection/interaction
	 * 
	 * Calls:
	 * - this.getEndPoints() to get the start link's line segment coordinates
	 * - Math.sqrt() and Math.abs() for distance calculations
	 * - hitTargetPadding global variable to define clickable area around the arrow
	 * 
	 * Purpose: Critical for user interaction - determines if mouse clicks are hitting
	 * this specific start link. Uses line segment collision detection by calculating
	 * the perpendicular distance from the point to the line segment. Returns true
	 * if the point (x,y) is within tolerance distance of the start arrow.
	 */
	var stuff = this.getEndPoints();
	var dx = stuff.endX - stuff.startX;
	var dy = stuff.endY - stuff.startY;
	var length = Math.sqrt(dx*dx + dy*dy);
	var percent = (dx * (x - stuff.startX) + dy * (y - stuff.startY)) / (length * length);
	var distance = (dx * (y - stuff.startY) - dy * (x - stuff.startX)) / length;
	return (percent > 0 && percent < 1 && Math.abs(distance) < hitTargetPadding);
};

StartLink.prototype.getTextPosition = function() {
	/**
	 * getTextPosition - Returns world coordinates for start-link text positioning
	 * 
	 * Called by:
	 * - getTextScreenPosition() for overlay positioning
	 * - Text editing functions that need start-link text coordinates
	 * 
	 * Calls:
	 * - this.getEndPoints() for line segment geometry
	 * - Math calculations for positioning
	 * 
	 * Purpose: Provides consistent text positioning coordinates for start-links,
	 * matching the same logic used in StartLink.prototype.draw() for text rendering.
	 */
	var stuff = this.getEndPoints();
	
	// Use the same logic as StartLink.prototype.draw() - text at start point
	return { x: stuff.startX, y: stuff.startY };
};
