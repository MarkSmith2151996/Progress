'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { Button } from 'react95';
import { useSettingsStore } from '@/stores/settingsStore';
import { KeyboardSize } from '@/types';

// ============================================
// WIN95 GLOBAL ON-SCREEN KEYBOARD
// Auto-appears when any input/textarea is focused.
// Uses native value setter to work with React controlled inputs.
// Size configurable via settings (compact / medium / large).
// ============================================

const SIZE_CONFIG: Record<KeyboardSize, {
  keyWidth: number;
  keyHeight: number;
  gap: number;
  fontSize: number;
  padding: number;
  wideKeyWidth: number;
  spaceWidth: number;
  enterWidth: number;
  specialWidth: number;
  hideFont: number;
}> = {
  compact: {
    keyWidth: 24,
    keyHeight: 28,
    gap: 2,
    fontSize: 10,
    padding: 4,
    wideKeyWidth: 36,
    spaceWidth: 120,
    enterWidth: 42,
    specialWidth: 24,
    hideFont: 9,
  },
  medium: {
    keyWidth: 28,
    keyHeight: 34,
    gap: 3,
    fontSize: 12,
    padding: 6,
    wideKeyWidth: 44,
    spaceWidth: 150,
    enterWidth: 50,
    specialWidth: 28,
    hideFont: 10,
  },
  large: {
    keyWidth: 34,
    keyHeight: 42,
    gap: 4,
    fontSize: 14,
    padding: 8,
    wideKeyWidth: 52,
    spaceWidth: 180,
    enterWidth: 60,
    specialWidth: 34,
    hideFont: 12,
  },
};

const KeyboardOverlay = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 3000;
`;

const KeyboardContainer = styled.div<{ $padding: number }>`
  background: #c0c0c0;
  border-top: 2px solid;
  border-color: #dfdfdf #808080 #808080 #dfdfdf;
  padding: ${props => props.$padding}px;
  user-select: none;
  -webkit-user-select: none;
`;

const KeyRow = styled.div<{ $gap: number }>`
  display: flex;
  justify-content: center;
  gap: ${props => props.$gap}px;
  margin-bottom: ${props => props.$gap}px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const Key = styled(Button)<{ $w: number; $h: number; $fs: number }>`
  min-width: ${props => props.$w}px;
  height: ${props => props.$h}px;
  padding: 0 2px;
  font-size: ${props => props.$fs}px;
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

const HideButton = styled(Button)<{ $fs: number }>`
  font-size: ${props => props.$fs}px;
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
  const keyboard_size = useSettingsStore((s) => s.keyboard_size);

  const cfg = useMemo(() => SIZE_CONFIG[keyboard_size] || SIZE_CONFIG.medium, [keyboard_size]);

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
      onMouseDown={(e) => { e.preventDefault(); }}
      onTouchStart={(e) => { e.preventDefault(); }}
    >
      <HideBar>
        <HideButton $fs={cfg.hideFont} onClick={handleHide}>Done</HideButton>
      </HideBar>
      <KeyboardContainer $padding={cfg.padding}>
        {/* Number row */}
        <KeyRow $gap={cfg.gap}>
          {ROW_NUMBERS.map((key) => (
            <Key key={key} $w={cfg.keyWidth} $h={cfg.keyHeight} $fs={cfg.fontSize} onClick={() => handleKey(key)}>
              {key}
            </Key>
          ))}
          <Key $w={cfg.wideKeyWidth} $h={cfg.keyHeight} $fs={cfg.fontSize} onClick={handleBackspace}>
            {'<-'}
          </Key>
        </KeyRow>

        {/* QWERTY row */}
        <KeyRow $gap={cfg.gap}>
          {ROWS_ALPHA[0].map((key) => (
            <Key key={key} $w={cfg.keyWidth} $h={cfg.keyHeight} $fs={cfg.fontSize} onClick={() => handleKey(key)}>
              {shifted ? key.toUpperCase() : key}
            </Key>
          ))}
        </KeyRow>

        {/* ASDF row */}
        <KeyRow $gap={cfg.gap}>
          {ROWS_ALPHA[1].map((key) => (
            <Key key={key} $w={cfg.keyWidth} $h={cfg.keyHeight} $fs={cfg.fontSize} onClick={() => handleKey(key)}>
              {shifted ? key.toUpperCase() : key}
            </Key>
          ))}
        </KeyRow>

        {/* ZXCV row + shift */}
        <KeyRow $gap={cfg.gap}>
          <Key
            $w={cfg.wideKeyWidth} $h={cfg.keyHeight} $fs={cfg.fontSize}
            onClick={() => setShifted(!shifted)}
            active={shifted}
          >
            Shift
          </Key>
          {ROWS_ALPHA[2].map((key) => (
            <Key key={key} $w={cfg.keyWidth} $h={cfg.keyHeight} $fs={cfg.fontSize} onClick={() => handleKey(key)}>
              {shifted ? key.toUpperCase() : key}
            </Key>
          ))}
          <Key $w={cfg.specialWidth} $h={cfg.keyHeight} $fs={cfg.fontSize} onClick={() => handleKey('.')}>.</Key>
          <Key $w={cfg.specialWidth} $h={cfg.keyHeight} $fs={cfg.fontSize} onClick={() => handleKey('?')}>?</Key>
        </KeyRow>

        {/* Space + special keys row */}
        <KeyRow $gap={cfg.gap}>
          <Key $w={cfg.specialWidth} $h={cfg.keyHeight} $fs={cfg.fontSize} onClick={() => handleKey(',')}>,</Key>
          <Key $w={cfg.specialWidth} $h={cfg.keyHeight} $fs={cfg.fontSize} onClick={() => handleKey("'")}>&apos;</Key>
          <Key $w={cfg.spaceWidth} $h={cfg.keyHeight} $fs={cfg.fontSize} onClick={() => handleKey(' ')}>Space</Key>
          <Key $w={cfg.enterWidth} $h={cfg.keyHeight} $fs={cfg.fontSize} onClick={handleEnter}>Enter</Key>
        </KeyRow>
      </KeyboardContainer>
    </KeyboardOverlay>
  );
}
