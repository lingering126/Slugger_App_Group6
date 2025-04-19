import React, { useEffect } from 'react';
import platformHelpers from '../utils/platformHelpers';

// Web-specific fixes for input focus and cursor issues
useEffect(() => {
  if (platformHelpers.isWeb) {
    // Create CSS rule for web rather than manipulating DOM elements
    try {
      const style = document.createElement('style');
      style.textContent = `
        input {
          cursor: text !important;
          caret-color: auto !important;
          outline: none !important;
        }
        button, [role="button"] {
          cursor: pointer !important;
          display: block !important;
          position: relative !important;
          z-index: 1 !important;
        }
        .buttonText {
          display: block !important;
          width: 100% !important;
        }
        .container {
          max-width: 400px;
          margin: 0 auto;
        }
      `;
      document.head.appendChild(style);
    } catch (e) {
      console.log('Could not inject web styles:', e);
    }
  }
}, []); 