'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Button } from 'react95';

// ============================================
// WIN95 GLOBAL ON-SCREEN KEYBOARD
// Auto-appears when any input/textarea is focused.
// Uses native value setter to work with React controlled inputs.
// ============================================

const KeyboardOverlay = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 3000;
`;

const KeyboardContainer = styled.div`
  background: #c0c0c0;
  border-top: 2px solid;
  border-color: #dfdfdf #808080 #808080 #dfdfdf;
  padding: 6px;
  user-select: none;
  -webkit-user-select: none;
`;

const KeyRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 3px;
  margin-bottom: 3px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const Key = styled(Button)<{ $width?: number }>`
  min-width: ${props => props.$width || 28}px;
  height: 34px;
  padding: 0 2px;
  font-size: 12px;
  font-family: 'MS Sans Serif', 'Microsoft Sans Serif', Arial, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
`;

const HideBar = styled.div`
  background: #c0c0c0;
  border-top: 1px solid #808080;
  padding: 2px 6px;
  display: flex;
  justify-content: flex-end;
`;

const HideButton = styled(Button)`
  font-size: 10px;
  padding: 2px 12px;
  min-width: auto;
`;

const ROWS_ALPHA = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

const ROW_NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

// Set a React controlled input's value using the native setter
// This triggers React's onChange handler reliably
function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const isTextArea = element.tagName === 'TEXTAREA';
  const prototype = isTextArea
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;

  const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  if (nativeSetter) {
    nativeSetter.call(element, value);
  }
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

export default function Win95Keyboard() {
  const [visible, setVisible] = useState(false);
  const [shifted, setShifted] = useState(false);
  const activeRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const input = target as HTMLInputElement;
        // Skip date inputs and selects — they use native pickers
        if (input.type === 'date' || input.type === 'select-one') return;
        activeRef.current = input;
        setVisible(true);
      }
    };

    const handleBlur = () => {
      // Delay to prevent keyboard from hiding when tapping keys
      // The keyboard buttons will re-focus the input
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);
    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, []);

  const handleKey = useCallback((key: string) => {
    if (!activeRef.current) return;
    const el = activeRef.current;
    const char = shifted ? key.toUpperCase() : key;
    setNativeValue(el, el.value + char);
    if (shifted) setShifted(false);
    // Keep focus on the input
    el.focus();
  }, [shifted]);

  const handleBackspace = useCallback(() => {
    if (!activeRef.current) return;
    const el = activeRef.current;
    setNativeValue(el, el.value.slice(0, -1));
    el.focus();
  }, []);

  const handleEnter = useCallback(() => {
    if (!activeRef.current) return;
    // For textareas, insert newline. For inputs, blur (submit).
    if (activeRef.current.tagName === 'TEXTAREA') {
      const el = activeRef.current;
      setNativeValue(el, el.value + '\n');
      el.focus();
    } else {
      activeRef.current.blur();
      setVisible(false);
      activeRef.current = null;
    }
  }, []);

  const handleHide = useCallback(() => {
    setVisible(false);
    if (activeRef.current) {
      activeRef.current.blur();
    }
    activeRef.current = null;
  }, []);

  if (!visible) return null;

  return (
    <KeyboardOverlay
      onMouseDown={(e) => {
        // Prevent keyboard taps from stealing focus from the input
        e.preventDefault();
      }}
      onTouchStart={(e) => {
        e.preventDefault();
      }}
    >
      <HideBar>
        <HideButton onClick={handleHide}>Done</HideButton>
      </HideBar>
      <KeyboardContainer>
        {/* Number row */}
        <KeyRow>
          {ROW_NUMBERS.map((key) => (
            <Key key={key} onClick={() => handleKey(key)}>{key}</Key>
          ))}
          <Key $width={44} onClick={handleBackspace}>{'<-'}</Key>
        </KeyRow>

        {/* QWERTY row */}
        <KeyRow>
          {ROWS_ALPHA[0].map((key) => (
            <Key key={key} onClick={() => handleKey(key)}>
              {shifted ? key.toUpperCase() : key}
            </Key>
          ))}
        </KeyRow>

        {/* ASDF row */}
        <KeyRow>
          {ROWS_ALPHA[1].map((key) => (
            <Key key={key} onClick={() => handleKey(key)}>
              {shifted ? key.toUpperCase() : key}
            </Key>
          ))}
        </KeyRow>

        {/* ZXCV row + shift */}
        <KeyRow>
          <Key
            $width={44}
            onClick={() => setShifted(!shifted)}
            active={shifted}
          >
            Shift
          </Key>
          {ROWS_ALPHA[2].map((key) => (
            <Key key={key} onClick={() => handleKey(key)}>
              {shifted ? key.toUpperCase() : key}
            </Key>
          ))}
          <Key $width={28} onClick={() => handleKey('.')}>.</Key>
          <Key $width={28} onClick={() => handleKey('?')}>?</Key>
        </KeyRow>

        {/* Space + special keys row */}
        <KeyRow>
          <Key $width={28} onClick={() => handleKey(',')}>,</Key>
          <Key $width={28} onClick={() => handleKey("'")}>&apos;</Key>
          <Key $width={150} onClick={() => handleKey(' ')}>Space</Key>
          <Key $width={50} onClick={handleEnter}>Enter</Key>
        </KeyRow>
      </KeyboardContainer>
    </KeyboardOverlay>
  );
}
