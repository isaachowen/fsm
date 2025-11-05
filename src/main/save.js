function restoreBackup() {
	if(!localStorage || !JSON) {
		return;
	}

	try {
		var backup = JSON.parse(localStorage['fsm']);

		for(var i = 0; i < backup.nodes.length; i++) {
			var backupNode = backup.nodes[i];
			var node = new Node(backupNode.x, backupNode.y, backupnode.colorKey);
			node.text = backupNode.text;
			// Handle backward compatibility - default to yellow if no color specified
			if (!node.colorKey) {
				node.colorKey = 'yellow';
			}
			nodes.push(node);
		}
		for(var i = 0; i < backup.links.length; i++) {
			var backupLink = backup.links[i];
			var link = null;
			if(backupLink.type == 'SelfLink') {
				link = new SelfLink(nodes[backupLink.node]);
				link.anchorAngle = backupLink.anchorAngle;
				link.text = backupLink.text;
				link.arrowType = backupLink.arrowType || 'arrow';
				link.colorKey = backuplink.colorKey || 'gray';
			} else if(backupLink.type == 'StartLink') {
				link = new StartLink(nodes[backupLink.node]);
				link.deltaX = backupLink.deltaX;
				link.deltaY = backupLink.deltaY;
				link.text = backupLink.text;
				link.arrowType = backupLink.arrowType || 'arrow';
				link.colorKey = backuplink.colorKey || 'gray';
			} else if(backupLink.type == 'Link') {
				link = new Link(nodes[backupLink.nodeA], nodes[backupLink.nodeB]);
				link.parallelPart = backupLink.parallelPart;
				link.perpendicularPart = backupLink.perpendicularPart;
				link.text = backupLink.text;
				link.lineAngleAdjust = backupLink.lineAngleAdjust;
				link.arrowType = backupLink.arrowType || 'arrow';
				link.colorKey = backuplink.colorKey || 'gray';
			}
			if(link != null) {
				links.push(link);
			}
		}
	} catch(e) {
		localStorage['fsm'] = '';
	}
	
	// Restore filename if saved
	if (backup.filename !== undefined) {
		var input = document.getElementById('filenameInput');
		if (input) {
			input.value = backup.filename;
			// Update title after restoring filename
			if (typeof updateDocumentTitle === 'function') {
				updateDocumentTitle();
			}
		}
	}

	// Restore legend descriptions if available
	if (backup.legend && typeof legendEntries !== 'undefined') {
		// Pre-populate legendEntries with saved descriptions before updating the legend
		for (var key in backup.legend) {
			if (backup.legend.hasOwnProperty(key)) {
				if (!legendEntries[key]) {
					legendEntries[key] = {};
				}
				legendEntries[key].description = backup.legend[key];
			}
		}
		// Trigger legend update to refresh display with restored descriptions
		if (typeof updateLegendEntries === 'function') {
			updateLegendEntries();
		}
	}

	// Clear any selection state when restoring
	selectedObject = null;
	selectedNodes = [];
	selectionBox.active = false;
	isSelecting = false;
}

function saveBackup() {
	if(!localStorage || !JSON) {
		return;
	}

	// Get current filename from input
	var input = document.getElementById('filenameInput');
	var currentFilename = input ? input.value.trim() : '';

	// Create legend data for backup
	var backupLegend = {};
	for (var key in legendEntries) {
		if (legendEntries.hasOwnProperty(key) && legendEntries[key].description !== undefined) {
			backupLegend[key] = legendEntries[key].description;
		}
	}

	var backup = {
		'nodes': [],
		'links': [],
		'filename': currentFilename,
		'legend': backupLegend,
	};
	for(var i = 0; i < nodes.length; i++) {
		var node = nodes[i];
		var backupNode = {
			'x': node.x,
			'y': node.y,
			'text': node.text,
			'color': node.colorKey || 'yellow', // Include color property with fallback
		};
		backup.nodes.push(backupNode);
	}
	for(var i = 0; i < links.length; i++) {
		var link = links[i];
		var backupLink = null;
		if(link instanceof SelfLink) {
			backupLink = {
				'type': 'SelfLink',
				'node': nodes.indexOf(link.node),
				'text': link.text,
				'anchorAngle': link.anchorAngle,
				'arrowType': link.arrowType || 'arrow',
				'color': link.colorKey || 'gray',
			};
		} else if(link instanceof StartLink) {
			backupLink = {
				'type': 'StartLink',
				'node': nodes.indexOf(link.node),
				'text': link.text,
				'deltaX': link.deltaX,
				'deltaY': link.deltaY,
				'arrowType': link.arrowType || 'arrow',
				'color': link.colorKey || 'gray',
			};
		} else if(link instanceof Link) {
			backupLink = {
				'type': 'Link',
				'nodeA': nodes.indexOf(link.nodeA),
				'nodeB': nodes.indexOf(link.nodeB),
				'text': link.text,
				'lineAngleAdjust': link.lineAngleAdjust,
				'parallelPart': link.parallelPart,
				'perpendicularPart': link.perpendicularPart,
				'arrowType': link.arrowType || 'arrow',
				'color': link.colorKey || 'gray',
			};
		}
		if(backupLink != null) {
			backup.links.push(backupLink);
		}
	}

	localStorage['fsm'] = JSON.stringify(backup);
}
