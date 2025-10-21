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
	this.arrowType = 'arrow'; // 'arrow' for traditional triangle, 'T' for T-shaped
	this.color = 'gray'; // Default link color (matches getColorFromModifier default for edges)
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
	 * - this.nodeA.closestPointOnNodeToEdgeArc() and this.nodeB.closestPointOnNodeToEdgeArc() for straight line connections
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
		var start = this.nodeA.closestPointOnNodeToEdgeArc(midX, midY);
		var end = this.nodeB.closestPointOnNodeToEdgeArc(midX, midY);
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
	
	// Calculate intersection points between arc circle and actual node
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
	 * draw - Renders the link as either a straight line or curved arc with arrow and text
	 * 
	 * Called by:
	 * - drawUsing() in fsm.js during main canvas rendering loop
	 * - All contexts: main canvas, JSON export, and any custom drawing contexts
	 * 
	 * Calls:
	 * - this.getEndPointsAndArcParams() to get all geometric data for rendering
	 * - c.beginPath(), c.arc(), c.moveTo(), c.lineTo(), c.stroke() for drawing the path
	 * - drawArrow() from fsm.js to render the directional arrow head
	 * - drawText() from fsm.js to render the transition label
	 * - selectedObject global variable to determine if this link should be highlighted
	 * 
	 * Purpose: Main rendering function that draws the complete link visualization:
	 * curved or straight line, directional arrow, and properly positioned/rotated text label.
	 * Handles both curved arc geometry and straight line special cases.
	 */
	var stuff = this.getEndPointsAndArcParams();
	// draw arc
	c.beginPath();
	if(stuff.hasCircle) {
		// For curved lines, adjust the end angle to stop before the arrow
		// Use shorter offset for T-arrows since they're stepped back further
		var pixelOffset = this.arrowType === 'T' ? 3 : 5;
		var arrowOffset = pixelOffset / stuff.circleRadius; // pixels converted to radians
		
		// Always subtract from endAngle to shorten the arc (regardless of direction)
		var adjustedEndAngle;
		if (stuff.isReversed) {
			adjustedEndAngle = stuff.endAngle + arrowOffset; // For reversed arcs, add to shorten
		} else {
			adjustedEndAngle = stuff.endAngle - arrowOffset; // For normal arcs, subtract to shorten
		}
		
		c.arc(stuff.circleX, stuff.circleY, stuff.circleRadius, stuff.startAngle, adjustedEndAngle, stuff.isReversed);
	} else {
		// For straight lines, shorten the end point by moving it back along the line
		var dx = stuff.endX - stuff.startX;
		var dy = stuff.endY - stuff.startY;
		var length = Math.sqrt(dx * dx + dy * dy);
		var shortenBy = this.arrowType === 'T' ? 3 : 5; // pixels - shorter for T-arrows
		var adjustedEndX = stuff.endX - (dx / length) * shortenBy;
		var adjustedEndY = stuff.endY - (dy / length) * shortenBy;
		
		c.moveTo(stuff.startX, stuff.startY);
		c.lineTo(adjustedEndX, adjustedEndY);
	}
	c.stroke();
	// draw the head of the arrow
	if(stuff.hasCircle) {
		if (this.arrowType === 'T') {
			drawTArrow(c, stuff.endX, stuff.endY, stuff.endAngle - stuff.reverseScale * (Math.PI / 2));
		} else {
			drawArrow(c, stuff.endX, stuff.endY, stuff.endAngle - stuff.reverseScale * (Math.PI / 2));
		}
	} else {
		if (this.arrowType === 'T') {
			drawTArrow(c, stuff.endX, stuff.endY, Math.atan2(stuff.endY - stuff.startY, stuff.endX - stuff.startX));
		} else {
			drawArrow(c, stuff.endX, stuff.endY, Math.atan2(stuff.endY - stuff.startY, stuff.endX - stuff.startX));
		}
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
	 * - this.getEndPointsAndArcParams() to get current geometry for hit testing
	 * - Math.sqrt(), Math.atan2(), Math.abs() for distance and angle calculations
	 * - hitTargetPadding global variable to define clickable area around the link
	 * 
	 * Purpose: Determines if a given mouse coordinate (x, y) is close enough to the
	 * link to be considered a "hit" for selection/interaction. Handles both curved
	 * arc hit detection (checking distance from arc and angle bounds) and straight
	 * line hit detection (perpendicular distance from line segment).
	 */
	var stuff = this.getEndPointsAndArcParams();
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

Link.prototype.findArcNodeIntersection = function(circle, targetNode, otherNode, isEndPoint) {
	/**
	 * findArcNodeIntersection - Finds where the arc circle intersects the target node's actual shape boundary
	 * 
	 * Called by:
	 * - this.getEndPointsAndArcParams() for calculating curved arc connection points
	 * 
	 * Calls:
	 * - targetNode.closestPointOnNodeToEdgeArc() for polygon boundary detection
	 * - Math.atan2(), Math.cos(), Math.sin() for geometric calculations
	 * - Math.sqrt() for distance calculations
	 * 
	 * Purpose: Replaces the fixed nodeRadius assumption with actual shape-aware intersection
	 * calculation. For circles, preserves existing behavior. For polygons, finds proper
	 * intersection between the arc circle and polygon edges.
	 */
	
	// For circles/dots, use existing circular calculation
    var dx = targetNode.x - circle.x;
    var dy = targetNode.y - circle.y;
    var angle = Math.atan2(dy, dx);
    var reverseScale = (this.perpendicularPart > 0) ? 1 : -1;
    var offsetAngle = angle + (isEndPoint ? reverseScale : -reverseScale) * nodeRadius / circle.radius;
    return {
        x: circle.x + circle.radius * Math.cos(offsetAngle),
        y: circle.y + circle.radius * Math.sin(offsetAngle)
    };
	
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
	var intersection = targetNode.closestPointOnNodeToEdgeArc(arcX, arcY);
	
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
