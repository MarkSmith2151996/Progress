'use client';

import styled from 'styled-components';
import { Window, WindowContent, Button, ProgressBar } from 'react95';

// ============================================
// SHARED MOBILE STYLES - Windows 95 / Coins95
// ============================================

// Main container with accent color background
export const MobileContainer = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--accent-color, #008080);
  display: flex;
  flex-direction: column;
`;

// Main window with chunky borders - fills most of screen
export const MainWindow = styled(Window)`
  flex: 1;
  margin: 8px;
  margin-bottom: 64px;
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
  font-size: 14px;
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

// Scrollable content area
export const ScrollArea = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
  background: #c0c0c0;
`;

// ============================================
// GOAL PROGRESS CARD
// ============================================

export const GoalCard = styled.div`
  margin-bottom: 16px;
  padding: 12px;
  background: #c0c0c0;
  border: 2px solid;
  border-color: #dfdfdf #808080 #808080 #dfdfdf;
`;

export const GoalTitle = styled.div`
  font-size: 14px;
  font-weight: bold;
  color: #000;
  margin-bottom: 8px;
`;

export const GoalProgressWrapper = styled.div`
  margin-bottom: 4px;
`;

export const GoalPercentage = styled.div`
  font-size: 12px;
  color: #000;
  text-align: center;
  margin-top: 4px;
`;

// Re-export ProgressBar from react95
export { ProgressBar };

// ============================================
// BOTTOM TAB NAVIGATION (4 tabs)
// ============================================

export const BottomTabs = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: #c0c0c0;
  border-top: 2px solid;
  border-color: #dfdfdf #808080 #808080 #dfdfdf;
  display: flex;
  z-index: 999;
`;

export const BottomTab = styled.button<{ $active?: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px 2px;
  font-size: 10px;
  font-family: inherit;
  background: ${props => props.$active ? '#c0c0c0' : '#c0c0c0'};
  border: 2px solid;
  border-color: ${props => props.$active
    ? '#808080 #dfdfdf #dfdfdf #808080'
    : '#dfdfdf #808080 #808080 #dfdfdf'};
  box-shadow: ${props => props.$active
    ? 'inset 1px 1px 2px rgba(0,0,0,0.3)'
    : 'none'};
  cursor: pointer;
  color: #000;
  gap: 2px;

  &:focus {
    outline: none;
  }
`;

export const TabIcon = styled.span`
  font-size: 18px;
  line-height: 1;
`;

export const TabLabel = styled.span`
  font-size: var(--font-meta, 9px);
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`;

// ============================================
// LIST ITEMS (for Accomplishments, Habits)
// ============================================

export const ListContainer = styled.div`
  background: #fff;
  border: 2px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
  box-shadow: inset 1px 1px 0 #0a0a0a;
  margin: 4px 0;
`;

export const ListItem = styled.div<{ $completed?: boolean; $clickable?: boolean }>`
  display: flex;
  align-items: center;
  padding: 12px 8px;
  border-bottom: 1px solid #c0c0c0;
  background: ${props => props.$completed ? '#e8ffe8' : '#fff'};
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};
  min-height: 44px;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${props => props.$clickable ? '#000080' : props.$completed ? '#e8ffe8' : '#fff'};
    color: ${props => props.$clickable ? '#fff' : 'inherit'};
  }
`;

export const Checkbox = styled.div<{ $checked?: boolean }>`
  width: 16px;
  height: 16px;
  border: 2px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
  background: ${props => props.$checked ? '#000080' : '#fff'};
  margin-right: 10px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  font-weight: bold;
`;

export const ListItemText = styled.span<{ $completed?: boolean }>`
  flex: 1;
  font-size: var(--font-list, 13px);
  color: #000;
  text-decoration: ${props => props.$completed ? 'line-through' : 'none'};
`;

export const ListItemMeta = styled.span`
  font-size: var(--font-meta, 11px);
  color: #808080;
  margin-left: 8px;
`;

// ============================================
// EMPTY STATE
// ============================================

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
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
  font-size: var(--font-meta, 11px);
  color: #808080;
  margin-bottom: 16px;
  max-width: 220px;
`;

// ============================================
// POPUP / MODAL
// ============================================

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

export const PopupContent = styled.div`
  padding: 12px;
  background: #c0c0c0;
`;

// ============================================
// FORM INPUTS
// ============================================

export const StyledInput = styled.input.attrs((props) => ({
  // Suppress native iOS keyboard — Win95 keyboard handles input
  // Skip for date inputs which need native date picker
  inputMode: props.type === 'date' ? undefined : ('none' as const),
}))`
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

export const StyledTextArea = styled.textarea.attrs({
  // Suppress native iOS keyboard — Win95 keyboard handles input
  inputMode: 'none' as const,
})`
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

export const StyledSelect = styled.select`
  width: 100%;
  padding: 6px 8px;
  font-size: 13px;
  border: 2px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
  box-shadow: inset 1px 1px 0 #0a0a0a;
  background: #fff;
  font-family: inherit;
  cursor: pointer;

  &:focus {
    outline: none;
  }
`;

export const ToggleButton = styled.button<{ $active?: boolean }>`
  flex: 1;
  padding: 8px 4px;
  font-size: 12px;
  font-family: inherit;
  background: ${props => props.$active ? '#000080' : '#c0c0c0'};
  color: ${props => props.$active ? '#fff' : '#000'};
  border: 2px solid;
  border-color: ${props => props.$active
    ? '#808080 #dfdfdf #dfdfdf #808080'
    : '#dfdfdf #808080 #808080 #dfdfdf'};
  cursor: pointer;

  &:focus {
    outline: none;
  }
`;

export const ToggleGroup = styled.div`
  display: flex;
  gap: 2px;
`;

export const FormRow = styled.div`
  margin-bottom: 12px;
`;

export const FormLabel = styled.label`
  display: block;
  font-size: var(--font-label, 12px);
  font-weight: bold;
  margin-bottom: 4px;
  color: #000;
`;

// ============================================
// SECTION HEADER
// ============================================

export const SectionHeader = styled.div`
  background: linear-gradient(90deg, #000080, #1084d0);
  color: #fff;
  padding: 6px 8px;
  font-size: 12px;
  font-weight: bold;
  margin: 8px 0 4px 0;
`;

// ============================================
// ADD BUTTON (for adding new items)
// ============================================

export const AddButton = styled(Button)`
  width: 100%;
  margin-top: 8px;
`;

// ============================================
// ACCOMPLISHMENT ITEM
// ============================================

export const AccomplishmentItem = styled.div`
  display: flex;
  align-items: flex-start;
  padding: 10px 8px;
  border-bottom: 1px solid #c0c0c0;
  background: #fff;

  &:last-child {
    border-bottom: none;
  }
`;

export const AccomplishmentIcon = styled.div`
  width: 24px;
  height: 24px;
  background: #ffd700;
  border: 1px solid #000;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  margin-right: 10px;
  flex-shrink: 0;
`;

export const AccomplishmentContent = styled.div`
  flex: 1;
`;

export const AccomplishmentText = styled.div`
  font-size: 13px;
  color: #000;
`;

export const AccomplishmentDate = styled.div`
  font-size: 10px;
  color: #808080;
  margin-top: 2px;
`;

// ============================================
// SYNC STATUS INDICATOR
// ============================================

export const SyncStatusBar = styled.div<{ $status: 'synced' | 'offline' | 'syncing' | 'error' }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: bold;
  background: ${props => {
    switch (props.$status) {
      case 'synced': return '#90EE90';
      case 'offline': return '#FFD700';
      case 'syncing': return '#ADD8E6';
      case 'error': return '#FF6B6B';
      default: return '#c0c0c0';
    }
  }};
  color: #000;
  border-bottom: 1px solid #808080;
`;

export const SyncStatusText = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const SyncStatusIcon = styled.span<{ $status: 'synced' | 'offline' | 'syncing' | 'error' }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => {
    switch (props.$status) {
      case 'synced': return '#008000';
      case 'offline': return '#808080';
      case 'syncing': return '#0000FF';
      case 'error': return '#FF0000';
      default: return '#808080';
    }
  }};
  ${props => props.$status === 'syncing' && `
    animation: pulse 1s ease-in-out infinite;
  `}

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

export const RefreshButton = styled(Button)`
  min-width: auto;
  padding: 2px 8px;
  font-size: 10px;
`;
