'use client';

import { useState, useCallback } from 'react';
import styled from 'styled-components';
import { Button } from 'react95';

// ============================================
// WIN95 ON-SCREEN KEYBOARD
// ============================================

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

const ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

interface Win95KeyboardProps {
  onInput: (text: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  visible: boolean;
}

export default function Win95Keyboard({ onInput, onBackspace, onEnter, visible }: Win95KeyboardProps) {
  const [shifted, setShifted] = useState(false);

  const handleKey = useCallback((key: string) => {
    onInput(shifted ? key.toUpperCase() : key);
    if (shifted) setShifted(false);
  }, [shifted, onInput]);

  if (!visible) return null;

  return (
    <KeyboardContainer>
      {/* Number row */}
      <KeyRow>
        {ROWS[0].map((key) => (
          <Key key={key} onClick={() => handleKey(key)}>{key}</Key>
        ))}
        <Key $width={44} onClick={onBackspace}>{'<-'}</Key>
      </KeyRow>

      {/* QWERTY row */}
      <KeyRow>
        {ROWS[1].map((key) => (
          <Key key={key} onClick={() => handleKey(key)}>
            {shifted ? key.toUpperCase() : key}
          </Key>
        ))}
      </KeyRow>

      {/* ASDF row */}
      <KeyRow>
        {ROWS[2].map((key) => (
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
        {ROWS[3].map((key) => (
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
        <Key $width={180} onClick={() => handleKey(' ')}>Space</Key>
        <Key $width={60} onClick={onEnter}>Enter</Key>
      </KeyRow>
    </KeyboardContainer>
  );
}
