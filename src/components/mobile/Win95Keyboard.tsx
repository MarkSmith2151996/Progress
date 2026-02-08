'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { Button } from 'react95';
import { useSettingsStore } from '@/stores/settingsStore';
import { KeyboardSize } from '@/types';

// ============================================
// WIN95 GLOBAL ON-SCREEN KEYBOARD
// Auto-appears when any input/textarea is focused.
// Uses flex layout so keys fill the full screen width.
// Size configurable via settings (compact / medium / large).
// ============================================

const SIZE_CONFIG: Record<KeyboardSize, {
  keyHeight: number;
  fontSize: number;
  gap: number;
  padding: number;
  hideFont: number;
}> = {
  compact: {
    keyHeight: 36,
    fontSize: 13,
    gap: 2,
    padding: 4,
    hideFont: 10,
  },
  medium: {
    keyHeight: 42,
    fontSize: 15,
    gap: 3,
    padding: 6,
    hideFont: 11,
  },
  large: {
    keyHeight: 50,
    fontSize: 17,
    gap: 3,
    padding: 8,
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
  width: 100%;
  gap: ${props => props.$gap}px;
  margin-bottom: ${props => props.$gap}px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const Key = styled(Button)<{ $h: number; $fs: number; $flex?: number }>`
  flex: ${props => props.$flex || 1};
  height: ${props => props.$h}px;
  padding: 0;
  font-size: ${props => props.$fs}px;
  font-family: 'MS Sans Serif', 'Microsoft Sans Serif', Arial, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  min-width: 0;
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
        if (input.type === 'date' || input.type === 'select-one') return;
        activeRef.current = input;
        setVisible(true);
      }
    };

    document.addEventListener('focusin', handleFocus);
    return () => {
      document.removeEventListener('focusin', handleFocus);
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

  const h = cfg.keyHeight;
  const fs = cfg.fontSize;

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
            <Key key={key} $h={h} $fs={fs} onClick={() => handleKey(key)}>
              {key}
            </Key>
          ))}
          <Key $h={h} $fs={fs} $flex={1.5} onClick={handleBackspace}>
            {'<-'}
          </Key>
        </KeyRow>

        {/* QWERTY row */}
        <KeyRow $gap={cfg.gap}>
          {ROWS_ALPHA[0].map((key) => (
            <Key key={key} $h={h} $fs={fs} onClick={() => handleKey(key)}>
              {shifted ? key.toUpperCase() : key}
            </Key>
          ))}
        </KeyRow>

        {/* ASDF row */}
        <KeyRow $gap={cfg.gap}>
          {ROWS_ALPHA[1].map((key) => (
            <Key key={key} $h={h} $fs={fs} onClick={() => handleKey(key)}>
              {shifted ? key.toUpperCase() : key}
            </Key>
          ))}
        </KeyRow>

        {/* ZXCV row + shift */}
        <KeyRow $gap={cfg.gap}>
          <Key $h={h} $fs={fs} $flex={1.5} onClick={() => setShifted(!shifted)} active={shifted}>
            Shift
          </Key>
          {ROWS_ALPHA[2].map((key) => (
            <Key key={key} $h={h} $fs={fs} onClick={() => handleKey(key)}>
              {shifted ? key.toUpperCase() : key}
            </Key>
          ))}
          <Key $h={h} $fs={fs} onClick={() => handleKey('.')}>.</Key>
          <Key $h={h} $fs={fs} onClick={() => handleKey('?')}>?</Key>
        </KeyRow>

        {/* Space + special keys row */}
        <KeyRow $gap={cfg.gap}>
          <Key $h={h} $fs={fs} onClick={() => handleKey(',')}>,</Key>
          <Key $h={h} $fs={fs} onClick={() => handleKey("'")}>&apos;</Key>
          <Key $h={h} $fs={fs} $flex={5} onClick={() => handleKey(' ')}>Space</Key>
          <Key $h={h} $fs={fs} $flex={1.8} onClick={handleEnter}>Enter</Key>
        </KeyRow>
      </KeyboardContainer>
    </KeyboardOverlay>
  );
}
