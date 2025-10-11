function Node(x, y, shape, color) {
	this.x = x;
	this.y = y;
	this.mouseOffsetX = 0;
	this.mouseOffsetY = 0;
	this.isAcceptState = false;
	this.text = '';
	this.shape = shape || 'circle'; // Default to circle for backward compatibility
	this.color = color || 'yellow'; // Default to yellow for backward compatibility
}

Node.prototype.setMouseStart = function(x, y) {
	this.mouseOffsetX = this.x - x;
	this.mouseOffsetY = this.y - y;
};

Node.prototype.setAnchorPoint = function(x, y) {
	this.x = x + this.mouseOffsetX;
	this.y = y + this.mouseOffsetY;
};

Node.prototype.getBaseColor = function() {
	switch(this.color) {
		case 'green': return '#c8e6c9';    // Soft mint green
		case 'blue': return '#bbdefb';     // Light sky blue
		case 'pink': return '#f8bbd9';     // Soft rose pink
		case 'purple': return '#e1bee7';   // Light lavender
		case 'orange': return '#ffe0b2';   // Warm peach
		case 'white': return '#ffffff';    // Pure white
		case 'yellow':
		default: return '#fff2a8';         // Yellow post-it (existing)
	}
};

Node.prototype.getSelectedColor = function() {
	switch(this.color) {
		case 'green': return '#a5d6a7';    // Darker green for selection
		case 'blue': return '#90caf9';     // Darker blue for selection
		case 'pink': return '#f48fb1';     // Darker pink for selection
		case 'purple': return '#ce93d8';   // Darker purple for selection
		case 'orange': return '#ffcc80';   // Darker orange for selection
		case 'white': return '#f0f0f0';    // Light gray for white selection
		case 'yellow':
		default: return '#ffcc66';         // Existing yellow selection color
	}
};

Node.prototype.draw = function(c) {
	// Set fill and stroke for the shape
	c.beginPath();
	
	switch(this.shape) {
		case 'circle':
			this.drawCircle(c);
			break;
		case 'triangle': 
			this.drawTriangle(c);
			break;
		case 'square':
			this.drawSquare(c);
			break;
		case 'pentagon':
			this.drawPentagon(c);
			break;
		case 'hexagon':
			this.drawHexagon(c);
			break;
		default:
			this.drawCircle(c); // Fallback
	}
	
	c.fill();
	c.stroke();

	// Draw the text
	drawText(c, this.text, this.x, this.y, null, selectedObject == this);

	// Draw accept state indicator (double border)
	if(this.isAcceptState) {
		this.drawAcceptState(c);
	}
};

Node.prototype.drawCircle = function(c) {
	c.arc(this.x, this.y, nodeRadius, 0, 2 * Math.PI, false);
};

Node.prototype.drawTriangle = function(c) {
	var r = nodeRadius;
	var x = this.x, y = this.y;
	c.moveTo(x, y - r);
	c.lineTo(x - r * Math.cos(Math.PI/6), y + r * Math.sin(Math.PI/6));
	c.lineTo(x + r * Math.cos(Math.PI/6), y + r * Math.sin(Math.PI/6));
	c.closePath();
};

Node.prototype.drawSquare = function(c) {
	var r = nodeRadius * 0.85; // Slightly smaller to maintain visual balance
	c.rect(this.x - r, this.y - r, 2 * r, 2 * r);
};

Node.prototype.drawPentagon = function(c) {
	this.drawRegularPolygon(c, 5);
};

Node.prototype.drawHexagon = function(c) {
	this.drawRegularPolygon(c, 6);
};

Node.prototype.drawRegularPolygon = function(c, sides) {
	var r = nodeRadius;
	var x = this.x, y = this.y;
	var angle = -Math.PI / 2; // Start from top
	
	c.moveTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
	for(var i = 1; i < sides; i++) {
		angle += 2 * Math.PI / sides;
		c.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
	}
	c.closePath();
};

Node.prototype.drawAcceptState = function(c) {
	c.beginPath();
	var innerRadius = nodeRadius - 6;
	switch(this.shape) {
		case 'circle':
			c.arc(this.x, this.y, innerRadius, 0, 2 * Math.PI, false);
			break;
		case 'triangle':
			// Scale down triangle
			var r = innerRadius;
			var x = this.x, y = this.y;
			c.moveTo(x, y - r);
			c.lineTo(x - r * Math.cos(Math.PI/6), y + r * Math.sin(Math.PI/6));
			c.lineTo(x + r * Math.cos(Math.PI/6), y + r * Math.sin(Math.PI/6));
			c.closePath();
			break;
		case 'square':
			var r = innerRadius * 0.85;
			c.rect(this.x - r, this.y - r, 2 * r, 2 * r);
			break;
		case 'pentagon':
			this.drawAcceptStatePolygon(c, 5, innerRadius);
			break;
		case 'hexagon':
			this.drawAcceptStatePolygon(c, 6, innerRadius);
			break;
	}
	c.stroke();
};

Node.prototype.drawAcceptStatePolygon = function(c, sides, radius) {
	var r = radius;
	var x = this.x, y = this.y;
	var angle = -Math.PI / 2;
	
	c.moveTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
	for(var i = 1; i < sides; i++) {
		angle += 2 * Math.PI / sides;
		c.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
	}
	c.closePath();
};

Node.prototype.closestPointOnCircle = function(x, y) {
	if(this.shape === 'circle') {
		// Original circular logic
		var dx = x - this.x;
		var dy = y - this.y;
		var scale = Math.sqrt(dx * dx + dy * dy);
		return {
			'x': this.x + dx * nodeRadius / scale,
			'y': this.y + dy * nodeRadius / scale,
		};
	} else {
		// For polygons, find closest edge point
		return this.closestPointOnShape(x, y);
	}
};

Node.prototype.closestPointOnShape = function(x, y) {
	switch(this.shape) {
		case 'triangle':
			return this.closestPointOnTriangle(x, y);
		case 'square':
			return this.closestPointOnSquare(x, y);
		case 'pentagon':
			return this.closestPointOnPolygon(x, y, 5);
		case 'hexagon':
			return this.closestPointOnPolygon(x, y, 6);
		default:
			// Fallback to circle
			var dx = x - this.x;
			var dy = y - this.y;
			var scale = Math.sqrt(dx * dx + dy * dy);
			return {
				'x': this.x + dx * nodeRadius / scale,
				'y': this.y + dy * nodeRadius / scale,
			};
	}
};

Node.prototype.closestPointOnTriangle = function(x, y) {
	var r = nodeRadius;
	var cx = this.x, cy = this.y;
	
	// Triangle vertices
	var vertices = [
		{x: cx, y: cy - r},
		{x: cx - r * Math.cos(Math.PI/6), y: cy + r * Math.sin(Math.PI/6)},
		{x: cx + r * Math.cos(Math.PI/6), y: cy + r * Math.sin(Math.PI/6)}
	];
	
	return this.closestPointOnPolygonEdges(x, y, vertices);
};

Node.prototype.closestPointOnSquare = function(x, y) {
	var r = nodeRadius * 0.85;
	var cx = this.x, cy = this.y;
	
	// Square vertices
	var vertices = [
		{x: cx - r, y: cy - r},
		{x: cx + r, y: cy - r},
		{x: cx + r, y: cy + r},
		{x: cx - r, y: cy + r}
	];
	
	return this.closestPointOnPolygonEdges(x, y, vertices);
};

Node.prototype.closestPointOnPolygon = function(x, y, sides) {
	var r = nodeRadius;
	var cx = this.x, cy = this.y;
	var vertices = [];
	var angle = -Math.PI / 2;
	
	// Generate vertices
	for(var i = 0; i < sides; i++) {
		vertices.push({
			x: cx + r * Math.cos(angle),
			y: cy + r * Math.sin(angle)
		});
		angle += 2 * Math.PI / sides;
	}
	
	return this.closestPointOnPolygonEdges(x, y, vertices);
};

Node.prototype.closestPointOnPolygonEdges = function(x, y, vertices) {
	var minDist = Infinity;
	var closest = {x: this.x, y: this.y};
	
	// Check each edge of the polygon
	for(var i = 0; i < vertices.length; i++) {
		var v1 = vertices[i];
		var v2 = vertices[(i + 1) % vertices.length];
		
		var edgePoint = this.closestPointOnLineSegment(x, y, v1.x, v1.y, v2.x, v2.y);
		var dist = Math.sqrt((x - edgePoint.x) * (x - edgePoint.x) + (y - edgePoint.y) * (y - edgePoint.y));
		
		if(dist < minDist) {
			minDist = dist;
			closest = edgePoint;
		}
	}
	
	return closest;
};

Node.prototype.closestPointOnLineSegment = function(px, py, x1, y1, x2, y2) {
	var dx = x2 - x1;
	var dy = y2 - y1;
	var length2 = dx * dx + dy * dy;
	
	if(length2 == 0) {
		return {x: x1, y: y1};
	}
	
	var t = ((px - x1) * dx + (py - y1) * dy) / length2;
	t = Math.max(0, Math.min(1, t));
	
	return {
		x: x1 + t * dx,
		y: y1 + t * dy
	};
};

Node.prototype.containsPoint = function(x, y) {
	switch(this.shape) {
		case 'circle':
			return (x - this.x)*(x - this.x) + (y - this.y)*(y - this.y) < nodeRadius*nodeRadius;
		case 'triangle':
			return this.pointInTriangle(x, y);
		case 'square':
			var r = nodeRadius * 0.85;
			return Math.abs(x - this.x) < r && Math.abs(y - this.y) < r;
		case 'pentagon':
			return this.pointInPolygon(x, y, 5);
		case 'hexagon':
			return this.pointInPolygon(x, y, 6);
		default:
			return (x - this.x)*(x - this.x) + (y - this.y)*(y - this.y) < nodeRadius*nodeRadius;
	}
};

Node.prototype.pointInTriangle = function(px, py) {
	var r = nodeRadius;
	var x = this.x, y = this.y;
	
	// Triangle vertices
	var x1 = x, y1 = y - r;
	var x2 = x - r * Math.cos(Math.PI/6), y2 = y + r * Math.sin(Math.PI/6);
	var x3 = x + r * Math.cos(Math.PI/6), y3 = y + r * Math.sin(Math.PI/6);
	
	// Barycentric coordinates method
	var denom = (y2 - y3)*(x1 - x3) + (x3 - x2)*(y1 - y3);
	var a = ((y2 - y3)*(px - x3) + (x3 - x2)*(py - y3)) / denom;
	var b = ((y3 - y1)*(px - x3) + (x1 - x3)*(py - y3)) / denom;
	var c = 1 - a - b;
	
	return a >= 0 && b >= 0 && c >= 0;
};

Node.prototype.pointInPolygon = function(px, py, sides) {
	var r = nodeRadius;
	var x = this.x, y = this.y;
	var vertices = [];
	var angle = -Math.PI / 2;
	
	// Generate vertices
	for(var i = 0; i < sides; i++) {
		vertices.push({
			x: x + r * Math.cos(angle),
			y: y + r * Math.sin(angle)
		});
		angle += 2 * Math.PI / sides;
	}
	
	// Ray casting algorithm
	var inside = false;
	for(var i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
		var vi = vertices[i], vj = vertices[j];
		if(((vi.y > py) != (vj.y > py)) && 
		   (px < (vj.x - vi.x) * (py - vi.y) / (vj.y - vi.y) + vi.x)) {
			inside = !inside;
		}
	}
	return inside;
};
