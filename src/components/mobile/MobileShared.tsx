'use client';

import styled from 'styled-components';
import { Window, WindowContent, Button } from 'react95';

// ============================================
// SHARED MOBILE STYLES - Coins95 Quality
// ============================================

// Main container with teal background
export const MobileContainer = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  background: #008080;
  display: flex;
  flex-direction: column;
`;

// Header with app title
export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 8px;
  background: #008080;
`;

export const AppTitle = styled.h1`
  font-size: 28px;
  font-weight: bold;
  font-style: italic;
  color: #ff00ff;
  text-shadow: 2px 2px 0 #800080;
  margin: 0;
  font-family: 'Times New Roman', serif;
`;

export const VersionBadge = styled.span`
  font-size: 10px;
  color: #c0c0c0;
  font-style: normal;
  margin-left: 4px;
  vertical-align: super;
`;

// Main window with chunky borders
export const MainWindow = styled(Window)`
  flex: 1;
  margin: 0 4px;
  margin-bottom: 108px;
  display: flex;
  flex-direction: column;
  min-height: 0;

  /* Chunky pixelated borders */
  box-shadow:
    inset -2px -2px 0 0 #0a0a0a,
    inset 2px 2px 0 0 #ffffff,
    inset -4px -4px 0 0 #808080,
    inset 4px 4px 0 0 #dfdfdf;
`;

export const ContentArea = styled(WindowContent)`
  flex: 1;
  padding: 0 !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #c0c0c0;
`;

// Window title bar (gradient blue)
export const TitleBar = styled.div`
  background: linear-gradient(90deg, #000080, #1084d0);
  color: #fff;
  padding: 4px 8px;
  font-weight: bold;
  font-size: 13px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const TitleBarButton = styled(Button)`
  min-width: 20px;
  min-height: 20px;
  padding: 0 4px;
  font-size: 12px;
  font-weight: bold;
`;

// Inset panel (sunken look)
export const InsetPanel = styled.div`
  background: #fff;
  border: 2px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
  box-shadow: inset 1px 1px 0 #0a0a0a;
  margin: 4px;
  flex: 1;
  overflow: auto;
`;

// Raised panel (outset look)
export const RaisedPanel = styled.div`
  background: #c0c0c0;
  border: 2px solid;
  border-color: #dfdfdf #808080 #808080 #dfdfdf;
  padding: 8px;
  margin: 4px;
`;

// Group box with label
export const StyledGroupBox = styled.div`
  border: 2px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
  margin: 8px 4px;
  padding: 12px 8px 8px;
  position: relative;
  background: #c0c0c0;
`;

export const GroupBoxLabel = styled.span`
  position: absolute;
  top: -8px;
  left: 8px;
  background: #c0c0c0;
  padding: 0 4px;
  font-size: 11px;
  font-weight: bold;
`;

// Floating action button
export const FloatingActionButton = styled(Button)`
  position: fixed;
  bottom: 70px;
  left: 50%;
  transform: translateX(-50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff00ff 0%, #800080 100%);
  border: 3px solid;
  border-color: #ff80ff #800080 #800080 #ff80ff;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #fff;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.4);

  &:active {
    border-color: #800080 #ff80ff #ff80ff #800080;
    transform: translateX(-50%) scale(0.95);
  }
`;

// Bottom taskbar
export const Taskbar = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 48px;
  background: #c0c0c0;
  border-top: 2px solid;
  border-color: #dfdfdf #808080 #808080 #dfdfdf;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 4px 8px;
  z-index: 999;
`;

export const TaskbarButton = styled(Button)<{ $active?: boolean }>`
  width: 52px;
  height: 38px;
  padding: 2px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  border: 2px solid;
  border-color: ${props => props.$active
    ? '#808080 #dfdfdf #dfdfdf #808080'
    : '#dfdfdf #808080 #808080 #dfdfdf'};
  background: ${props => props.$active ? '#c0c0c0' : '#c0c0c0'};
  box-shadow: ${props => props.$active
    ? 'inset 1px 1px 2px rgba(0,0,0,0.2)'
    : 'none'};
`;

export const TaskbarIcon = styled.span`
  font-size: 18px;
  line-height: 1;
`;

// Empty state component
export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
  min-height: 200px;
`;

export const EmptyStateIcon = styled.div`
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.8;
`;

export const EmptyStateTitle = styled.div`
  font-size: 14px;
  font-weight: bold;
  color: #000;
  margin-bottom: 8px;
`;

export const EmptyStateText = styled.div`
  font-size: 11px;
  color: #808080;
  margin-bottom: 16px;
  max-width: 200px;
`;

// Popup overlay
export const PopupOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
`;

export const PopupWindow = styled(Window)`
  width: 100%;
  max-width: 320px;
  box-shadow:
    inset -2px -2px 0 0 #0a0a0a,
    inset 2px 2px 0 0 #ffffff,
    inset -4px -4px 0 0 #808080,
    inset 4px 4px 0 0 #dfdfdf,
    4px 4px 8px rgba(0,0,0,0.3);
`;

// Table styling
export const TableContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: #fff;
  margin: 4px;
  border: 2px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
  box-shadow: inset 1px 1px 0 #0a0a0a;
`;

export const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
`;

export const TableHeader = styled.thead`
  background: #c0c0c0;
  border-bottom: 2px solid #808080;
  position: sticky;
  top: 0;
`;

export const TableHeaderCell = styled.th`
  padding: 8px 6px;
  text-align: left;
  font-weight: bold;
  font-size: 11px;
  border-right: 1px solid #808080;

  &:last-child {
    border-right: none;
  }
`;

export const TableBody = styled.tbody``;

export const TableRow = styled.tr<{ $clickable?: boolean }>`
  border-bottom: 1px solid #c0c0c0;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};

  &:nth-child(even) {
    background: #f8f8f8;
  }

  &:hover {
    background: ${props => props.$clickable ? '#000080' : 'inherit'};
    color: ${props => props.$clickable ? '#fff' : 'inherit'};
  }

  &:active {
    background: ${props => props.$clickable ? '#000080' : 'inherit'};
  }
`;

export const TableCell = styled.td`
  padding: 10px 6px;
  vertical-align: middle;
`;

// Icon badge (colorful square icon like crypto icons)
export const IconBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: ${props => props.$color};
  border: 1px solid #000;
  border-radius: 2px;
  font-size: 12px;
  margin-right: 8px;
  flex-shrink: 0;
`;

// Status indicators
export const StatusBadge = styled.span<{ $variant: 'success' | 'pending' | 'warning' }>`
  font-size: 11px;
  font-weight: bold;
  color: ${props =>
    props.$variant === 'success' ? '#008000' :
    props.$variant === 'warning' ? '#ff8c00' :
    '#808080'};
`;

// Input with Windows 95 style
export const StyledInput = styled.input`
  width: 100%;
  padding: 6px 8px;
  font-size: 13px;
  border: 2px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
  box-shadow: inset 1px 1px 0 #0a0a0a;
  background: #fff;
  font-family: inherit;

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: #808080;
  }
`;

export const StyledTextArea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 6px 8px;
  font-size: 13px;
  border: 2px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
  box-shadow: inset 1px 1px 0 #0a0a0a;
  background: #fff;
  font-family: inherit;
  resize: vertical;

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: #808080;
  }
`;

// Tabs container
export const TabsRow = styled.div`
  display: flex;
  background: #c0c0c0;
  border-top: 2px solid #808080;
  padding-top: 2px;
`;

export const TabButton = styled.button<{ $active?: boolean }>`
  flex: 1;
  padding: 8px 4px;
  font-size: 11px;
  font-family: inherit;
  background: ${props => props.$active ? '#c0c0c0' : '#a0a0a0'};
  border: 2px solid;
  border-color: ${props => props.$active
    ? '#dfdfdf #808080 #c0c0c0 #dfdfdf'
    : '#c0c0c0 #808080 #808080 #c0c0c0'};
  border-bottom: ${props => props.$active ? 'none' : '2px solid #808080'};
  margin-top: ${props => props.$active ? '0' : '2px'};
  cursor: pointer;
  position: relative;
  z-index: ${props => props.$active ? 1 : 0};

  &:focus {
    outline: none;
  }
`;

// List item for settings
export const ListItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 8px;
  border-bottom: 1px solid #c0c0c0;
  min-height: 44px;
  background: #fff;

  &:last-child {
    border-bottom: none;
  }
`;

export const ListItemIcon = styled.span`
  margin-right: 8px;
  font-size: 16px;
`;

export const ListItemText = styled.span`
  flex: 1;
  font-size: 13px;
`;

// Add form row
export const AddFormRow = styled.div`
  display: flex;
  gap: 4px;
  padding: 8px;
  background: #c0c0c0;
  border-top: 1px solid #808080;
`;
