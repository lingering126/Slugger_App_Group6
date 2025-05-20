import React, { useRef } from 'react';
import { TextInput, Pressable, Platform } from 'react-native';

// Custom TextInput component that handles focus properly across platforms
const CustomTextInput = ({style, secureTextEntry, showPassword, ...props}) => {
  const inputRef = useRef(null);
  
  // For password fields on web, use a more aggressive approach to prevent browser's built-in toggle
  const webProps = Platform.OS === 'web' && secureTextEntry ? {
    autoComplete: 'off',
    spellCheck: false,
    autoCorrect: 'off',
    autoCapitalize: 'none',
    // This data attribute helps disable Chrome's built-in password reveal button
    'data-lpignore': 'true',
    // Additional style to hide browser's password toggle
    style: {
      ...style,
      outlineWidth: 0,
      // This ensures the browser's password toggle doesn't appear
      WebkitTextSecurity: secureTextEntry && !showPassword ? 'disc' : 'none',
    }
  } : {
    style: [style, Platform.OS === 'web' ? {outlineWidth: 0} : {}]
  };
  
  return (
    <Pressable onPress={() => inputRef.current && inputRef.current.focus()}>
      <TextInput
        ref={inputRef}
        {...props}
        {...webProps}
        secureTextEntry={Platform.OS !== 'web' ? secureTextEntry && !showPassword : false}
      />
    </Pressable>
  );
};

export default CustomTextInput; 