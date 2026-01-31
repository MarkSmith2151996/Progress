'use client';

import styled from 'styled-components';

// ============================================
// WINDOWS 95 PIXEL ART ICONS
// These are CSS-based pixel art icons that match the Win95 aesthetic
// ============================================

const IconBase = styled.div`
  width: 16px;
  height: 16px;
  image-rendering: pixelated;
  display: inline-block;
  position: relative;
`;

// Trophy Icon (for accomplishments)
export const TrophyIcon = styled(IconBase)`
  background:
    /* Cup body */
    linear-gradient(to right, #FFD700 0%, #FFD700 100%);
  clip-path: polygon(
    20% 0%, 80% 0%,
    90% 20%, 90% 50%,
    70% 70%, 70% 85%,
    80% 85%, 80% 100%,
    20% 100%, 20% 85%,
    30% 85%, 30% 70%,
    10% 50%, 10% 20%
  );
  &::before {
    content: '';
    position: absolute;
    top: 2px;
    left: 3px;
    width: 10px;
    height: 6px;
    background: #FFF8DC;
    clip-path: polygon(10% 0%, 90% 0%, 80% 100%, 20% 100%);
  }
`;

// Checkmark Icon (for habits)
export const CheckIcon = styled(IconBase)`
  &::before {
    content: '';
    position: absolute;
    left: 2px;
    top: 6px;
    width: 5px;
    height: 8px;
    border: solid #008000;
    border-width: 0 3px 3px 0;
    transform: rotate(45deg);
  }
`;

// Calendar Icon (for monthly)
export const CalendarIcon = styled(IconBase)`
  background: #fff;
  border: 2px solid #000080;
  border-top: 4px solid #800000;
  &::before {
    content: '';
    position: absolute;
    top: 5px;
    left: 2px;
    width: 10px;
    height: 2px;
    background: #000;
    box-shadow:
      0 3px 0 #000,
      0 6px 0 #000;
  }
`;

// Chart/Graph Icon (for summary)
export const ChartIcon = styled(IconBase)`
  background: #fff;
  border: 1px solid #808080;
  &::before {
    content: '';
    position: absolute;
    bottom: 2px;
    left: 2px;
    width: 3px;
    height: 4px;
    background: #008000;
    box-shadow:
      4px 0 0 #008000,
      4px -3px 0 #008000,
      8px 0 0 #000080,
      8px -2px 0 #000080,
      8px -5px 0 #000080;
  }
`;

// Settings/Gear Icon
export const GearIcon = styled(IconBase)`
  &::before {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 12px;
    height: 12px;
    background: #808080;
    border-radius: 50%;
    box-shadow:
      inset 0 0 0 3px #c0c0c0,
      inset 0 0 0 5px #808080;
  }
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 6px;
    width: 4px;
    height: 16px;
    background: #808080;
    box-shadow:
      -6px 6px 0 #808080,
      6px -6px 0 #808080;
  }
`;

// Target/Bullseye Icon (for goals)
export const TargetIcon = styled(IconBase)`
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 16px;
    height: 16px;
    background: #ff0000;
    border-radius: 50%;
    box-shadow:
      inset 0 0 0 2px #fff,
      inset 0 0 0 4px #ff0000,
      inset 0 0 0 6px #fff;
  }
  &::after {
    content: '';
    position: absolute;
    top: 6px;
    left: 6px;
    width: 4px;
    height: 4px;
    background: #ff0000;
    border-radius: 50%;
  }
`;

// Edit/Pencil Icon
export const EditIcon = styled(IconBase)`
  &::before {
    content: '';
    position: absolute;
    top: 1px;
    left: 9px;
    width: 6px;
    height: 10px;
    background: #FFD700;
    border: 1px solid #000;
    transform: rotate(45deg);
  }
  &::after {
    content: '';
    position: absolute;
    bottom: 1px;
    left: 1px;
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 6px solid #000;
    transform: rotate(-45deg);
  }
`;

// Folder Icon
export const FolderIcon = styled(IconBase)`
  &::before {
    content: '';
    position: absolute;
    top: 2px;
    left: 0;
    width: 6px;
    height: 3px;
    background: #FFD700;
    border: 1px solid #808080;
    border-bottom: none;
  }
  &::after {
    content: '';
    position: absolute;
    top: 5px;
    left: 0;
    width: 16px;
    height: 10px;
    background: #FFD700;
    border: 1px solid #808080;
  }
`;

// Star Icon (for streaks)
export const StarIcon = styled(IconBase)`
  &::before {
    content: '★';
    position: absolute;
    top: -2px;
    left: 0;
    font-size: 16px;
    color: #FFD700;
    text-shadow: 1px 1px 0 #808080;
  }
`;

// Home Icon
export const HomeIcon = styled(IconBase)`
  &::before {
    content: '';
    position: absolute;
    top: 6px;
    left: 2px;
    width: 12px;
    height: 8px;
    background: #c0c0c0;
    border: 1px solid #000;
  }
  &::after {
    content: '';
    position: absolute;
    top: 1px;
    left: 0;
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-bottom: 6px solid #800000;
  }
`;

// Plus Icon (for adding)
export const PlusIcon = styled(IconBase)`
  &::before {
    content: '';
    position: absolute;
    top: 6px;
    left: 2px;
    width: 12px;
    height: 4px;
    background: #008000;
  }
  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 6px;
    width: 4px;
    height: 12px;
    background: #008000;
  }
`;

// ============================================
// ICON WRAPPER COMPONENT
// Use this to display icons at different sizes
// ============================================

interface IconWrapperProps {
  size?: number;
  children: React.ReactNode;
}

export const IconWrapper = styled.span<{ $size?: number }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${props => props.$size || 16}px;
  height: ${props => props.$size || 16}px;
  transform: scale(${props => (props.$size || 16) / 16});
  transform-origin: center;
`;

// ============================================
// SIMPLE TEXT-BASED WIN95 ICONS
// More reliable cross-platform display
// ============================================

export const Win95Icon = styled.span<{ $bg?: string; $color?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: ${props => props.$bg || '#c0c0c0'};
  border: 2px solid;
  border-color: #dfdfdf #808080 #808080 #dfdfdf;
  font-size: 12px;
  font-weight: bold;
  color: ${props => props.$color || '#000'};
  font-family: 'MS Sans Serif', 'Segoe UI', Tahoma, sans-serif;
`;

// Pre-styled icons using Win95Icon
export const Win95Trophy = () => <Win95Icon $bg="#FFD700" $color="#800000">★</Win95Icon>;
export const Win95Check = () => <Win95Icon $bg="#90EE90" $color="#008000">✓</Win95Icon>;
export const Win95Calendar = () => <Win95Icon $bg="#ADD8E6" $color="#000080">▦</Win95Icon>;
export const Win95Chart = () => <Win95Icon $bg="#fff" $color="#008000">▊</Win95Icon>;
export const Win95Gear = () => <Win95Icon $bg="#c0c0c0" $color="#000">⚙</Win95Icon>;
export const Win95Target = () => <Win95Icon $bg="#fff" $color="#ff0000">◎</Win95Icon>;
export const Win95Edit = () => <Win95Icon $bg="#FFD700" $color="#000">✎</Win95Icon>;
export const Win95Plus = () => <Win95Icon $bg="#90EE90" $color="#008000">+</Win95Icon>;
export const Win95Home = () => <Win95Icon $bg="#c0c0c0" $color="#800000">⌂</Win95Icon>;
