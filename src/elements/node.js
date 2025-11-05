function Node(x, y, colorKey) {
	this.x = x;
	this.y = y;
	this.mouseOffsetX = 0;
	this.mouseOffsetY = 0;
	this.text = '';
	this.colorKey = colorKey || 'A'; // Default to 'A' (yellow)
}

Node.prototype.setMouseStart = function(x, y) {
	this.mouseOffsetX = this.x - x;
	this.mouseOffsetY = this.y - y;
};

Node.prototype.setAnchorPoint = function(x, y) {
	this.x = x + this.mouseOffsetX;
	this.y = y + this.mouseOffsetY;
};

Node.prototype.getColor = function() {
	// Access global COLOR_CONFIG from fsm.js
	if (typeof COLOR_CONFIG !== 'undefined' && COLOR_CONFIG[this.colorKey]) {
		return COLOR_CONFIG[this.colorKey];
	}
	return COLOR_CONFIG['A']; // Fallback to yellow (A)
};

Node.prototype.draw = function(c) {
	// Check both selection states
	var isSelected = (selectedObject == this);
	var isMultiSelected = (selectedNodes && selectedNodes.indexOf(this) !== -1 && !isSelected);
	
	// Apply selection glow if this node is selected or multi-selected
	drawSelectionGlow(c, isSelected, isMultiSelected);
	
	// Set fill and stroke for the dot shape
	c.beginPath();
	this.drawDot(c);
	c.fill();
	c.stroke();
	
	// Clear glow after drawing the node shape
	clearSelectionGlow(c);

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


