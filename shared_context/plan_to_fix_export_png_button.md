# Plan to Fix Export PNG Button

## Problem Diagnosis

The PNG export button currently fails because the `saveAsPNG()` function in `src/main/fsm.js` uses an outdated approach of setting `document.location.href = pngData` which attempts to navigate the browser to the data URL instead of downloading the PNG file. Modern browsers block this behavior for security reasons, preventing the PNG export from working. In contrast, the SVG and LaTeX export functions properly use the `output()` function to display the exported content in a textarea, but PNG export needs a different approach since it's binary data that should trigger a download rather than display text.

## Plan

Modify the `saveAsPNG()` function in `src/main/fsm.js` to create a downloadable blob and use a temporary anchor element with the `download` attribute to trigger a proper file download instead of attempting to navigate to the data URL.
