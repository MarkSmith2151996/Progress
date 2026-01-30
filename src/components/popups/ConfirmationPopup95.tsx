'use client';

import { useState } from 'react';
import styled, { css } from 'styled-components';
import { Window, WindowHeader, WindowContent, Button, Checkbox, TextInput } from 'react95';
import { ParsedItem } from '@/hooks/useElectron';

const sunken3D = css`
  border-top: 2px solid #808080;
  border-left: 2px solid #808080;
  border-right: 2px solid #ffffff;
  border-bottom: 2px solid #ffffff;
  box-shadow: inset 1px 1px 0 #000000;
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const PopupWindow = styled(Window)`
  width: 500px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

const Content = styled(WindowContent)`
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SummaryBox = styled.div`
  ${sunken3D}
  background: #ffffff;
  padding: 8px;
  font-size: 12px;
  margin-bottom: 8px;
`;

const ItemsContainer = styled.div`
  ${sunken3D}
  background: #ffffff;
  padding: 4px;
  max-height: 300px;
  overflow-y: auto;
`;

const ItemRow = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px;
  border-bottom: 1px solid #c0c0c0;
  background: ${props => props.$selected ? '#ffffff' : '#e0e0e0'};
  opacity: ${props => props.$selected ? 1 : 0.6};

  &:last-child {
    border-bottom: none;
  }
`;

const ItemContent = styled.div`
  flex: 1;
  font-size: 11px;
`;

const ItemType = styled.span<{ $type: string }>`
  display: inline-block;
  padding: 1px 4px;
  font-size: 9px;
  font-weight: bold;
  margin-right: 4px;
  color: #ffffff;
  background: ${props => {
    switch (props.$type) {
      case 'work_hours': return '#008000';
      case 'sat_score': return '#0000aa';
      case 'savings': return '#aa8800';
      case 'habit': return '#880088';
      default: return '#808080';
    }
  }};
`;

const ItemDescription = styled.span`
  color: #000000;
`;

const ItemValue = styled.span`
  color: #0000aa;
  font-weight: bold;
  margin-left: 4px;
`;

const EditRow = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 4px;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #808080;
`;

const NoItems = styled.div`
  padding: 16px;
  text-align: center;
  color: #808080;
  font-size: 12px;
`;

interface Props {
  items: ParsedItem[];
  summary: string;
  onConfirm: (items: ParsedItem[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmationPopup95({ items: initialItems, summary, onConfirm, onCancel, isLoading }: Props) {
  const [items, setItems] = useState<ParsedItem[]>(initialItems);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const toggleItem = (index: number) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, selected: !item.selected } : item
    ));
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(items[index].description);
  };

  const saveEdit = () => {
    if (editingIndex !== null) {
      setItems(prev => prev.map((item, i) =>
        i === editingIndex ? { ...item, description: editValue } : item
      ));
      setEditingIndex(null);
      setEditValue('');
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  const formatType = (type: string) => {
    return type.replace(/_/g, ' ').toUpperCase();
  };

  const formatValue = (item: ParsedItem) => {
    if (item.value === null) return '';
    switch (item.type) {
      case 'work_hours': return `${item.value}h`;
      case 'sat_score': return item.value.toString();
      case 'savings': return `$${item.value}`;
      default: return item.value.toString();
    }
  };

  const selectedCount = items.filter(i => i.selected !== false).length;

  return (
    <Overlay onClick={onCancel}>
      <PopupWindow onClick={e => e.stopPropagation()}>
        <WindowHeader>
          <HeaderContent>
            <span>Confirm Changes</span>
            <Button size="sm" onClick={onCancel} disabled={isLoading}>X</Button>
          </HeaderContent>
        </WindowHeader>
        <Content>
          <SummaryBox>
            <strong>Claude detected:</strong> {summary}
          </SummaryBox>

          <div style={{ fontSize: 11, color: '#808080', marginBottom: 4 }}>
            {selectedCount} of {items.length} items selected
          </div>

          <ItemsContainer>
            {items.length === 0 ? (
              <NoItems>No items detected. Try being more specific.</NoItems>
            ) : (
              items.map((item, index) => (
                <ItemRow key={index} $selected={item.selected !== false}>
                  <Checkbox
                    checked={item.selected !== false}
                    onChange={() => toggleItem(index)}
                    disabled={isLoading}
                  />
                  <ItemContent>
                    {editingIndex === index ? (
                      <EditRow>
                        <TextInput
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          style={{ flex: 1, fontSize: 11 }}
                        />
                        <Button size="sm" onClick={saveEdit}>OK</Button>
                        <Button size="sm" onClick={cancelEdit}>X</Button>
                      </EditRow>
                    ) : (
                      <>
                        <ItemType $type={item.type}>{formatType(item.type)}</ItemType>
                        <ItemDescription>{item.description}</ItemDescription>
                        {item.value !== null && (
                          <ItemValue>{formatValue(item)}</ItemValue>
                        )}
                        <Button
                          size="sm"
                          onClick={() => startEdit(index)}
                          style={{ marginLeft: 8, padding: '0 4px', fontSize: 9 }}
                          disabled={isLoading}
                        >
                          Edit
                        </Button>
                      </>
                    )}
                  </ItemContent>
                </ItemRow>
              ))
            )}
          </ItemsContainer>

          <ButtonRow>
            <Button onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={() => onConfirm(items)}
              disabled={isLoading || selectedCount === 0}
              primary
            >
              {isLoading ? 'Saving...' : `Save ${selectedCount} Item${selectedCount !== 1 ? 's' : ''}`}
            </Button>
          </ButtonRow>
        </Content>
      </PopupWindow>
    </Overlay>
  );
}
