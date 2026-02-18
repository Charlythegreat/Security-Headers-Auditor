/**
 * DevTools entry point.
 * Registers the "Security Headers" panel inside Edge DevTools.
 */

chrome.devtools.panels.create(
  'Security Headers',       // Panel title
  'assets/icons/icon32.png', // Icon path (relative to extension root)
  'devtools/panel.html',     // HTML page for the panel
  (panel) => {
    console.log('[SHA] DevTools panel created.');
  },
);
