import { Platform, Dimensions } from 'react-native';

// Check if the current platform is web
export const isWeb = Platform.OS === 'web';

// Get screen dimensions considering platform specifics
export const getScreenDimensions = () => {
  const { width, height } = Dimensions.get('window');
  
  // On web, use viewport height for better layout
  if (isWeb) {
    return {
      width,
      height: typeof window !== 'undefined' ? window.innerHeight : height,
      isSmallScreen: width < 768,
      isMediumScreen: width >= 768 && width < 1024,
      isLargeScreen: width >= 1024
    };
  }
  
  return {
    width,
    height,
    isSmallScreen: width < 375,
    isMediumScreen: width >= 375 && width < 768,
    isLargeScreen: width >= 768
  };
};

// Get platform-specific touchable props
export const getTouchableProps = () => {
  if (isWeb) {
    return {
      activeOpacity: 0.7,
      accessibilityRole: 'button',
      style: { 
        cursor: 'pointer'
      }
    };
  }
  
  return {
    activeOpacity: 0.8
  };
};

// Get platform-specific input props to fix focus issues on web
export const getInputProps = () => {
  if (isWeb) {
    return {
      autoCorrect: false,
      spellCheck: false,
      autoCapitalize: 'none',
      autoComplete: 'off',
      tabIndex: 0,
      className: 'web-input',
      placeholderTextColor: '#bbbbbb',
      style: {
        cursor: 'text !important',
        caretColor: 'black !important',
        outline: 'none !important',
        userSelect: 'text !important',
        WebkitUserSelect: 'text !important',
        touchAction: 'auto !important',
        pointerEvents: 'auto !important',
        backgroundColor: 'white !important',
        position: 'static',
        border: 'none'
      },
      onFocus: (e) => {
        // Ensure the input is properly focused
        if (e.target) {
          e.target.style.outline = 'none';
          e.target.style.position = 'static';
        }
      },
      onClick: (e) => {
        // Prevent event bubbling and ensure focus
        e.stopPropagation();
        e.target.focus();
      }
    };
  }
  
  return {
    placeholderTextColor: '#bbbbbb'
  };
};

// Get platform-specific style value
export const getPlatformStyleValue = (webValue, nativeValue) => {
  return isWeb ? webValue : nativeValue;
};

// Export a default object with all helpers
export default {
  isWeb,
  getScreenDimensions,
  getInputProps,
  getTouchableProps,
  getPlatformStyleValue
}; 