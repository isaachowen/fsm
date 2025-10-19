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
	 * - this.getEndPointsAndArcParams() to determine circular arc geometry
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

Link.prototype.getEndPointsAndArcParams = function() {
	/**
	 * getEndPointsAndArcParams - Core geometric calculation for link rendering and hit detection
	 * 
	 * Called by:
	 * - this.draw() for rendering the link arc and positioning text/arrows
	 * - this.containsPoint() for hit detection during mouse interactions
	 * 
	 * Calls:
	 * - this.getAnchorPoint() to get current anchor position
	 * - circleFromThreePoints() from math.js to calculate arc geometry
	 * - this.nodeA.closestPointOnShapeToEdgeArc() and this.nodeB.closestPointOnShapeToEdgeArc() for straight line connections
	 * - this.findArcNodeIntersection() for curved arc shape-aware connection points
	 * - Math.atan2(), Math.cos(), Math.sin() for trigonometric calculations
	 * 
	 * Purpose: Determines whether to render as straight line or curved arc, then calculates
	 * all necessary geometry (start/end points, circle center/radius, angles) for both
	 * rendering and interaction. Uses shape-aware intersection for both straight and curved connections.
	 */
	if(this.perpendicularPart == 0) { // no perpendicular element=no arc, straight edge 
		var midX = (this.nodeA.x + this.nodeB.x) / 2;
		var midY = (this.nodeA.y + this.nodeB.y) / 2;
		var start = this.nodeA.closestPointOnShapeToEdgeArc(midX, midY);
		var end = this.nodeB.closestPointOnShapeToEdgeArc(midX, midY);
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
	
	// Calculate intersection points between arc circle and actual node shapes
	var startIntersection = this.findArcNodeIntersection(circle, this.nodeA, this.nodeB, false);
	var endIntersection = this.findArcNodeIntersection(circle, this.nodeB, this.nodeA, true);
	
	var startX = startIntersection.x;
	var startY = startIntersection.y;
	var endX = endIntersection.x;
	var endY = endIntersection.y;
	
	// Calculate angles for arrow/text positioning
	var startAngle = Math.atan2(startY - circle.y, startX - circle.x);
	var endAngle = Math.atan2(endY - circle.y, endX - circle.x);
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
	 * draw - Draws link as straight line or curved arc between node centers
	 * 
	 * Called by:
	 * - drawUsing() in fsm.js during main canvas rendering loop
	 * 
	 * Calls:
	 * - c.beginPath(), c.moveTo(), c.lineTo(), c.arc(), c.stroke() for drawing
	 * - drawArrow() from fsm.js to render the directional arrow head
	 * - drawText() from fsm.js to render the transition label
	 * - circleFromThreePoints() for arc calculations when curved
	 * 
	 * Purpose: Draws links directly between node centers. If perpendicularPart is 0,
	 * draws straight line. If perpendicularPart is non-zero, draws curved arc.
	 */
	
	if(this.perpendicularPart == 0) {
		// Draw straight line from nodeA center to nodeB center
		c.beginPath();
		c.moveTo(this.nodeA.x, this.nodeA.y);
		c.lineTo(this.nodeB.x, this.nodeB.y);
		c.stroke();
		
		// Draw arrow at nodeB end
		var angle = Math.atan2(this.nodeB.y - this.nodeA.y, this.nodeB.x - this.nodeA.x);
		drawArrow(c, this.nodeB.x, this.nodeB.y, angle);
		
		// Draw text at midpoint
		var textX = (this.nodeA.x + this.nodeB.x) / 2;
		var textY = (this.nodeA.y + this.nodeB.y) / 2;
		var textAngle = Math.atan2(this.nodeB.x - this.nodeA.x, this.nodeA.y - this.nodeB.y);
		drawText(c, this.text, textX, textY, textAngle + this.lineAngleAdjust, selectedObject == this);
	} else {
		// Draw curved arc
		var anchorPoint = this.getAnchorPoint();
		var circle = circleFromThreePoints(this.nodeA.x, this.nodeA.y, anchorPoint.x, anchorPoint.y, this.nodeB.x, this.nodeB.y);
		
		var isReversed = (this.perpendicularPart > 0);
		var reverseScale = isReversed ? 1 : -1;
		
		var startAngle = Math.atan2(this.nodeA.y - circle.y, this.nodeA.x - circle.x);
		var endAngle = Math.atan2(this.nodeB.y - circle.y, this.nodeB.x - circle.x);
		
		// Draw the arc
		c.beginPath();
		c.arc(circle.x, circle.y, circle.radius, startAngle, endAngle, isReversed);
		c.stroke();
		
		// Draw arrow at end
		drawArrow(c, this.nodeB.x, this.nodeB.y, endAngle - reverseScale * (Math.PI / 2));
		
		// Draw text on arc
		var startAngleCopy = startAngle;
		var endAngleCopy = endAngle;
		if(endAngleCopy < startAngleCopy) {
			endAngleCopy += Math.PI * 2;
		}
		var textAngle = (startAngleCopy + endAngleCopy) / 2 + isReversed * Math.PI;
		var textX = circle.x + circle.radius * Math.cos(textAngle);
		var textY = circle.y + circle.radius * Math.sin(textAngle);
		drawText(c, this.text, textX, textY, textAngle, selectedObject == this);
	}
};

Link.prototype.containsPoint = function(x, y) {
	/**
	 * containsPoint - Hit detection for both straight line and curved arc links
	 * 
	 * Called by:
	 * - selectObject() in fsm.js during mouse click/hover detection
	 * 
	 * Calls:
	 * - Math.sqrt(), Math.atan2() for distance and angle calculations
	 * - hitTargetPadding global variable to define clickable area around the link
	 * - circleFromThreePoints() for arc calculations when curved
	 * 
	 * Purpose: Determines if a given mouse coordinate (x, y) is close enough to the
	 * link (straight or curved) to be considered a "hit" for selection.
	 */
	
	if(this.perpendicularPart == 0) {
		// Straight line hit detection between node centers
		var dx = this.nodeB.x - this.nodeA.x;
		var dy = this.nodeB.y - this.nodeA.y;
		var length = Math.sqrt(dx*dx + dy*dy);
		
		if (length == 0) return false; // Nodes are at same position
		
		var percent = (dx * (x - this.nodeA.x) + dy * (y - this.nodeA.y)) / (length * length);
		var distance = Math.abs(dx * (y - this.nodeA.y) - dy * (x - this.nodeA.x)) / length;
		
		return (percent > 0 && percent < 1 && distance < hitTargetPadding);
	} else {
		// Curved arc hit detection
		var anchorPoint = this.getAnchorPoint();
		var circle = circleFromThreePoints(this.nodeA.x, this.nodeA.y, anchorPoint.x, anchorPoint.y, this.nodeB.x, this.nodeB.y);
		
		var dx = x - circle.x;
		var dy = y - circle.y;
		var distance = Math.sqrt(dx*dx + dy*dy) - circle.radius;
		
		if(Math.abs(distance) < hitTargetPadding) {
			var angle = Math.atan2(dy, dx);
			var startAngle = Math.atan2(this.nodeA.y - circle.y, this.nodeA.x - circle.x);
			var endAngle = Math.atan2(this.nodeB.y - circle.y, this.nodeB.x - circle.x);
			var isReversed = (this.perpendicularPart > 0);
			
			if(isReversed) {
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
	}
	return false;
};

Link.prototype.findArcNodeIntersection = function(circle, targetNode, otherNode, isEndPoint) {
	/**
	 * findArcNodeIntersection - Finds where the arc circle intersects the target node's actual shape boundary
	 * 
	 * Called by:
	 * - this.getEndPointsAndArcParams() for calculating curved arc connection points
	 * 
	 * Calls:
	 * - targetNode.closestPointOnShapeToEdgeArc() for polygon boundary detection
	 * - Math.atan2(), Math.cos(), Math.sin() for geometric calculations
	 * - Math.sqrt() for distance calculations
	 * 
	 * Purpose: Replaces the fixed nodeRadius assumption with actual shape-aware intersection
	 * calculation. For circles, preserves existing behavior. For polygons, finds proper
	 * intersection between the arc circle and polygon edges.
	 */
	
	// For circles, use existing circular calculation
	if (targetNode.shape === 'dot') {
		var dx = targetNode.x - circle.x;
		var dy = targetNode.y - circle.y;
		var angle = Math.atan2(dy, dx);
		var reverseScale = (this.perpendicularPart > 0) ? 1 : -1;
		var offsetAngle = angle + (isEndPoint ? reverseScale : -reverseScale) * nodeRadius / circle.radius;
		return {
			x: circle.x + circle.radius * Math.cos(offsetAngle),
			y: circle.y + circle.radius * Math.sin(offsetAngle)
		};
	}
	
	// For polygons, we need to find where the arc circle actually intersects the polygon
	// Start with the direction from arc center to node center
	var centerAngle = Math.atan2(targetNode.y - circle.y, targetNode.x - circle.x);
	
	// Use the same offset logic as circles to get the approximate connection angle
	var reverseScale = (this.perpendicularPart > 0) ? 1 : -1;
	var offsetAngle = centerAngle + (isEndPoint ? reverseScale : -reverseScale) * nodeRadius / circle.radius;
	
	// Calculate point on arc circle at this angle
	var arcX = circle.x + circle.radius * Math.cos(offsetAngle);
	var arcY = circle.y + circle.radius * Math.sin(offsetAngle);
	
	// Now find the closest point on the polygon boundary to this arc point
	var intersection = targetNode.closestPointOnShapeToEdgeArc(arcX, arcY);
	
	return intersection;
};

Link.prototype.getTextPosition = function() {
	/**
	 * getTextPosition - Returns world coordinates for link text positioning
	 * 
	 * Called by:
	 * - getTextScreenPosition() for overlay positioning
	 * - Text editing functions that need link text coordinates
	 * 
	 * Calls:
	 * - this.getEndPointsAndArcParams() for arc geometry
	 * - Math.cos(), Math.sin() for text positioning calculations
	 * 
	 * Purpose: Provides consistent text positioning coordinates for links,
	 * matching the same logic used in Link.prototype.draw() for text rendering.
	 */
	var stuff = this.getEndPointsAndArcParams();
	
	// Use the same logic as Link.prototype.draw() for text positioning
	if(stuff.hasCircle) {
		// For curved links, position text on the arc at the midpoint angle
		var startAngle = stuff.startAngle;
		var endAngle = stuff.endAngle;
		if(endAngle < startAngle) {
			endAngle += Math.PI * 2;
		}
		var textAngle = (startAngle + endAngle) / 2 + stuff.isReversed * Math.PI;
		var textX = stuff.circleX + stuff.circleRadius * Math.cos(textAngle);
		var textY = stuff.circleY + stuff.circleRadius * Math.sin(textAngle);
		return { x: textX, y: textY };
	} else {
		// For straight links, use simple midpoint
		var textX = (stuff.startX + stuff.endX) / 2;
		var textY = (stuff.startY + stuff.endY) / 2;
		return { x: textX, y: textY };
	}
};
