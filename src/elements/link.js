function Link(a, b) {
	/**
	 * Link Constructor - Creates a state transition arrow between two nodes
	 * 
	 * Called by:
	 * - canvas.onmousemove() when creating new links via shift+drag
	 * - importFromJSON() when reconstructing links from saved data
	 * 
	 * Calls:
	 * - No other functions (constructor only sets initial properties)
	 * 
	 * Purpose: Represents a directed transition between two FSM states (nodeA -> nodeB)
	 * with customizable curvature controlled by anchor point positioning.
	 */
	this.nodeA = a;
	this.nodeB = b;
	this.text = '';
	this.lineAngleAdjust = 0; // value to add to textAngle when link is straight line

	// make anchor point relative to the locations of nodeA and nodeB
	this.parallelPart = 0.5; // percentage from nodeA to nodeB
	this.perpendicularPart = 0; // pixels from line between nodeA and nodeB
    

    // Isaac question: what is parallelPart and perpendicularPart? I'm still confused, what is this used for? something with screen coordinates??
}

Link.prototype.getAnchorPoint = function() {
	/**
	 * getAnchorPoint - Calculates the current anchor point position for link curvature
	 * 
	 * Called by:
	 * - this.getEndPointsAndCircle() to determine circular arc geometry
	 * - Canvas interaction code when displaying anchor points during editing
	 * 
	 * Calls:
	 * - Math.sqrt() for distance calculations
	 * 
	 * Purpose: Converts the relative anchor position (parallelPart, perpendicularPart)
	 * into absolute screen coordinates. This point determines how curved the link appears.
	 */
	var dx = this.nodeB.x - this.nodeA.x;
	var dy = this.nodeB.y - this.nodeA.y;
	var scale = Math.sqrt(dx * dx + dy * dy);
	return {
		'x': this.nodeA.x + dx * this.parallelPart - dy * this.perpendicularPart / scale,
		'y': this.nodeA.y + dy * this.parallelPart + dx * this.perpendicularPart / scale
	};
    // Isaac question: is the anchorpoint the ROOT node of the link? or the endpoint node of the link? Or somewhere in between the two nodes
};

Link.prototype.setAnchorPoint = function(x, y) {
	/**
	 * setAnchorPoint - Updates the link's anchor point based on absolute coordinates
	 * 
	 * Called by:
	 * - selectedObject.setAnchorPoint() in canvas.onmousemove() during link dragging
	 * - General object manipulation functions when moving links
	 * 
	 * Calls:
	 * - Math.sqrt() and Math.abs() for geometric calculations
	 * - snapToPadding global variable for snap-to-straight-line behavior
	 * 
	 * Purpose: Converts absolute anchor point coordinates back to relative position
	 * (parallelPart, perpendicularPart). Includes smart snapping to straight lines
	 * when the anchor is close to the direct path between nodes.
	 */
	var dx = this.nodeB.x - this.nodeA.x;
	var dy = this.nodeB.y - this.nodeA.y;
	var scale = Math.sqrt(dx * dx + dy * dy);
	this.parallelPart = (dx * (x - this.nodeA.x) + dy * (y - this.nodeA.y)) / (scale * scale);
	this.perpendicularPart = (dx * (y - this.nodeA.y) - dy * (x - this.nodeA.x)) / scale;
	// snap to a straight line
	if(this.parallelPart > 0 && this.parallelPart < 1 && Math.abs(this.perpendicularPart) < snapToPadding) {
		this.lineAngleAdjust = (this.perpendicularPart < 0) * Math.PI;
		this.perpendicularPart = 0;
	}
};

Link.prototype.getEndPointsAndCircle = function() {
	/**
	 * getEndPointsAndCircle - Core geometric calculation for link rendering and hit detection
	 * 
	 * Called by:
	 * - this.draw() for rendering the link arc and positioning text/arrows
	 * - this.containsPoint() for hit detection during mouse interactions
	 * 
	 * Calls:
	 * - this.getAnchorPoint() to get current anchor position
	 * - circleFromThreePoints() from math.js to calculate arc geometry
	 * - this.nodeA.closestPointOnCircle() and this.nodeB.closestPointOnCircle() for node edge connections
	 * - Math.atan2(), Math.cos(), Math.sin() for trigonometric calculations
	 * - nodeRadius global variable for node collision boundaries
	 * 
	 * Purpose: Determines whether to render as straight line or curved arc, then calculates
	 * all necessary geometry (start/end points, circle center/radius, angles) for both
	 * rendering and interaction. This is the mathematical heart of the Link class.
	 */
	if(this.perpendicularPart == 0) {
		var midX = (this.nodeA.x + this.nodeB.x) / 2;
		var midY = (this.nodeA.y + this.nodeB.y) / 2;
		var start = this.nodeA.closestPointOnCircle(midX, midY);
		var end = this.nodeB.closestPointOnCircle(midX, midY);
		return {
			'hasCircle': false,
			'startX': start.x,
			'startY': start.y,
			'endX': end.x,
			'endY': end.y,
		};
	}
	var anchor = this.getAnchorPoint();
	var circle = circleFromThreePoints(this.nodeA.x, this.nodeA.y, this.nodeB.x, this.nodeB.y, anchor.x, anchor.y);
	var isReversed = (this.perpendicularPart > 0);
	var reverseScale = isReversed ? 1 : -1;
	var startAngle = Math.atan2(this.nodeA.y - circle.y, this.nodeA.x - circle.x) - reverseScale * nodeRadius / circle.radius;
	var endAngle = Math.atan2(this.nodeB.y - circle.y, this.nodeB.x - circle.x) + reverseScale * nodeRadius / circle.radius;
	var startX = circle.x + circle.radius * Math.cos(startAngle);
	var startY = circle.y + circle.radius * Math.sin(startAngle);
	var endX = circle.x + circle.radius * Math.cos(endAngle);
	var endY = circle.y + circle.radius * Math.sin(endAngle);
	return {
		'hasCircle': true,
		'startX': startX,
		'startY': startY,
		'endX': endX,
		'endY': endY,
		'startAngle': startAngle,
		'endAngle': endAngle,
		'circleX': circle.x,
		'circleY': circle.y,
		'circleRadius': circle.radius,
		'reverseScale': reverseScale,
		'isReversed': isReversed,
	};
};

Link.prototype.draw = function(c) {
	/**
	 * draw - Renders the link as either a straight line or curved arc with arrow and text
	 * 
	 * Called by:
	 * - drawUsing() in fsm.js during main canvas rendering loop
	 * - All contexts: main canvas, JSON export, and any custom drawing contexts
	 * 
	 * Calls:
	 * - this.getEndPointsAndCircle() to get all geometric data for rendering
	 * - c.beginPath(), c.arc(), c.moveTo(), c.lineTo(), c.stroke() for drawing the path
	 * - drawArrow() from fsm.js to render the directional arrow head
	 * - drawText() from fsm.js to render the transition label
	 * - selectedObject global variable to determine if this link should be highlighted
	 * 
	 * Purpose: Main rendering function that draws the complete link visualization:
	 * curved or straight line, directional arrow, and properly positioned/rotated text label.
	 * Handles both curved arc geometry and straight line special cases.
	 */
	var stuff = this.getEndPointsAndCircle();
	// draw arc
	c.beginPath();
	if(stuff.hasCircle) {
		c.arc(stuff.circleX, stuff.circleY, stuff.circleRadius, stuff.startAngle, stuff.endAngle, stuff.isReversed);
	} else {
		c.moveTo(stuff.startX, stuff.startY);
		c.lineTo(stuff.endX, stuff.endY);
	}
	c.stroke();
	// draw the head of the arrow
	if(stuff.hasCircle) {
		drawArrow(c, stuff.endX, stuff.endY, stuff.endAngle - stuff.reverseScale * (Math.PI / 2));
	} else {
		drawArrow(c, stuff.endX, stuff.endY, Math.atan2(stuff.endY - stuff.startY, stuff.endX - stuff.startX));
	}
	// draw the text
	if(stuff.hasCircle) {
		var startAngle = stuff.startAngle;
		var endAngle = stuff.endAngle;
		if(endAngle < startAngle) {
			endAngle += Math.PI * 2;
		}
		var textAngle = (startAngle + endAngle) / 2 + stuff.isReversed * Math.PI;
		var textX = stuff.circleX + stuff.circleRadius * Math.cos(textAngle);
		var textY = stuff.circleY + stuff.circleRadius * Math.sin(textAngle);
		drawText(c, this.text, textX, textY, textAngle, selectedObject == this);
	} else {
		var textX = (stuff.startX + stuff.endX) / 2;
		var textY = (stuff.startY + stuff.endY) / 2;
		var textAngle = Math.atan2(stuff.endX - stuff.startX, stuff.startY - stuff.endY);
		drawText(c, this.text, textX, textY, textAngle + this.lineAngleAdjust, selectedObject == this);
	}
};

Link.prototype.containsPoint = function(x, y) {
	/**
	 * containsPoint - Hit detection for mouse interactions with the link
	 * 
	 * Called by:
	 * - selectObject() in fsm.js during mouse click/hover detection
	 * - Canvas event handlers to determine if mouse is over this link
	 * 
	 * Calls:
	 * - this.getEndPointsAndCircle() to get current geometry for hit testing
	 * - Math.sqrt(), Math.atan2(), Math.abs() for distance and angle calculations
	 * - hitTargetPadding global variable to define clickable area around the link
	 * 
	 * Purpose: Determines if a given mouse coordinate (x, y) is close enough to the
	 * link to be considered a "hit" for selection/interaction. Handles both curved
	 * arc hit detection (checking distance from arc and angle bounds) and straight
	 * line hit detection (perpendicular distance from line segment).
	 */
	var stuff = this.getEndPointsAndCircle();
	if(stuff.hasCircle) {
		var dx = x - stuff.circleX;
		var dy = y - stuff.circleY;
		var distance = Math.sqrt(dx*dx + dy*dy) - stuff.circleRadius;
		if(Math.abs(distance) < hitTargetPadding) {
			var angle = Math.atan2(dy, dx);
			var startAngle = stuff.startAngle;
			var endAngle = stuff.endAngle;
			if(stuff.isReversed) {
				var temp = startAngle;
				startAngle = endAngle;
				endAngle = temp;
			}
			if(endAngle < startAngle) {
				endAngle += Math.PI * 2;
			}
			if(angle < startAngle) {
				angle += Math.PI * 2;
			} else if(angle > endAngle) {
				angle -= Math.PI * 2;
			}
			return (angle > startAngle && angle < endAngle);
		}
	} else {
		var dx = stuff.endX - stuff.startX;
		var dy = stuff.endY - stuff.startY;
		var length = Math.sqrt(dx*dx + dy*dy);
		var percent = (dx * (x - stuff.startX) + dy * (y - stuff.startY)) / (length * length);
		var distance = (dx * (y - stuff.startY) - dy * (x - stuff.startX)) / length;
		return (percent > 0 && percent < 1 && Math.abs(distance) < hitTargetPadding);
	}
	return false;
};
