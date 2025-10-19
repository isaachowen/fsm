function Node(x, y, color) {
	this.x = x;
	this.y = y;
	this.mouseOffsetX = 0;
	this.mouseOffsetY = 0;
	this.text = '';
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
	// Set fill and stroke for the dot shape
	c.beginPath();
	this.drawDot(c);
	c.fill();
	c.stroke();

	// Draw the text
	drawText(c, this.text, this.x, this.y, null, selectedObject == this);
};

Node.prototype.drawDot = function(c) {
	c.arc(this.x, this.y, nodeRadius, 0, 2 * Math.PI, false);
};



Node.prototype.closestPointOnNodeToEdgeArc = function(x, y) {
	var dx = x - this.x;
	var dy = y - this.y;
	var scale = Math.sqrt(dx * dx + dy * dy);
	return {
		'x': this.x + dx * nodeRadius / scale,
		'y': this.y + dy * nodeRadius / scale,
	};
};



Node.prototype.containsPoint = function(x, y) {
	return (x - this.x)*(x - this.x) + (y - this.y)*(y - this.y) < nodeRadius*nodeRadius;
};


