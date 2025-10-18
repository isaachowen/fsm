# Plan: Direct Cursor Implementation for Text Editing

## Problem Summary

The DOM overlay approach has proven problematic due to:
- Persistent alignment issues between HTML input and canvas text
- Different text measurement systems (canvas vs HTML)
- Complex positioning calculations that don't perfectly match
- Caret boundary constraints despite attempts to make input extremely wide

## Solution: Direct Cursor Implementation

Implement cursor navigation directly within the existing canvas-based text editing system, using keyboard events and manual cursor position tracking.

## Implementation Plan

### 1. Cursor State Management
- Add `cursorPosition` property to objects being edited
- Track cursor position as character index (0 = before first character, text.length = after last character)
- Initialize cursor position when entering text editing mode

### 2. Keyboard Event Handling
- **Left Arrow**: Move cursor left (if position > 0)
- **Right Arrow**: Move cursor right (if position < text.length)
- **Home**: Move cursor to beginning (position = 0)
- **End**: Move cursor to end (position = text.length)
- **Backspace**: Delete character before cursor, move cursor left
- **Delete**: Delete character at cursor position
- **Regular characters**: Insert at cursor position, advance cursor

### 3. Visual Cursor Rendering
- Modify `drawText()` function to draw cursor line when in editing mode
- Calculate cursor pixel position based on character index
- Use `measureText()` to get width of text before cursor position
- Draw blinking cursor line at calculated position

### 4. Text Insertion Logic
- Split text at cursor position: `before = text.substring(0, cursorPos)`, `after = text.substring(cursorPos)`
- Insert character: `newText = before + character + after`
- Update cursor position: `cursorPos++`

### 5. Mouse Click Positioning (Optional Enhancement)
- Calculate which character position was clicked
- Set cursor position based on click location

## Code Changes Required

### A. Add Cursor State to Editing System
```javascript
// In InteractionManager.enterEditingMode()
obj.cursorPosition = obj.text ? obj.text.length : 0; // Start at end
```

### B. Enhanced Keyboard Handling
```javascript
// In canvas.onkeydown - add cursor navigation
case 37: // Left arrow
    if (selectedObject.cursorPosition > 0) {
        selectedObject.cursorPosition--;
        draw();
    }
    break;
case 39: // Right arrow
    if (selectedObject.cursorPosition < selectedObject.text.length) {
        selectedObject.cursorPosition++;
        draw();
    }
    break;
```

### C. Modified Text Insertion
```javascript
// Replace character insertion logic
var before = selectedObject.text.substring(0, selectedObject.cursorPosition);
var after = selectedObject.text.substring(selectedObject.cursorPosition);
selectedObject.text = before + String.fromCharCode(key) + after;
selectedObject.cursorPosition++;
```

### D. Enhanced drawText() Function
```javascript
// Add cursor rendering to drawText()
if (isSelected && selectedObject && selectedObject.cursorPosition !== undefined) {
    // Calculate cursor position
    var beforeCursor = text.substring(0, selectedObject.cursorPosition);
    var cursorX = x + c.measureText(beforeCursor).width;
    
    // Draw blinking cursor
    if (caretVisible) {
        c.beginPath();
        c.moveTo(cursorX, y - 10);
        c.lineTo(cursorX, y + 10);
        c.stroke();
    }
}
```

## Benefits of Direct Implementation

1. **Perfect Alignment**: Cursor is drawn directly on canvas using same coordinate system as text
2. **Simpler Logic**: No complex DOM/canvas synchronization
3. **Consistent Behavior**: Same rendering system for text and cursor
4. **Better Performance**: No DOM manipulation during typing
5. **Reliable**: No browser compatibility issues with DOM overlay positioning

## Implementation Steps

1. Remove DOM overlay system completely
2. Add cursor state management to editing system  
3. Implement cursor navigation keyboard handlers
4. Modify text insertion to work with cursor position
5. Add cursor rendering to drawText() function
6. Test cursor movement and text editing functionality

This approach will be more maintainable and provide a better user experience with precise cursor control.