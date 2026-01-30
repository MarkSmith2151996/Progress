'use client';

import { useState } from 'react';
import styled, { css } from 'styled-components';
import { Button, TextInput } from 'react95';
import { useElectron, ParsedItem } from '@/hooks/useElectron';
import { ConfirmationPopup95 } from '../popups/ConfirmationPopup95';

const sunken3D = css`
  border-top: 2px solid #808080;
  border-left: 2px solid #808080;
  border-right: 2px solid #ffffff;
  border-bottom: 2px solid #ffffff;
  box-shadow: inset 1px 1px 0 #000000;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const InputArea = styled.textarea`
  ${sunken3D}
  width: 100%;
  min-height: 60px;
  padding: 4px;
  font-family: 'MS Sans Serif', 'Segoe UI', Tahoma, sans-serif;
  font-size: 12px;
  resize: vertical;
  border: none;
  background: #ffffff;

  &::placeholder {
    color: #808080;
  }

  &:focus {
    outline: none;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Hint = styled.span`
  font-size: 10px;
  color: #808080;
`;

const ErrorText = styled.span`
  font-size: 10px;
  color: #ff0000;
`;

const SuccessText = styled.span`
  font-size: 10px;
  color: #008000;
`;

interface Props {
  placeholder?: string;
  onSuccess?: () => void;
}

export function NaturalInput95({ placeholder, onSuccess }: Props) {
  const [input, setInput] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [parsedSummary, setParsedSummary] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { parseInput, applyItems, loading, error, isElectron } = useElectron();

  const handleParse = async () => {
    if (!input.trim()) return;

    setSuccessMessage('');
    const result = await parseInput(input.trim());

    if (result && result.items.length > 0) {
      setParsedItems(result.items);
      setParsedSummary(result.summary);
      setShowConfirm(true);
    }
  };

  const handleConfirm = async (items: ParsedItem[]) => {
    const success = await applyItems(items);
    if (success) {
      setShowConfirm(false);
      setInput('');
      setParsedItems([]);
      setParsedSummary('');
      setSuccessMessage('Saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      onSuccess?.();
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setParsedItems([]);
    setParsedSummary('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleParse();
    }
  };

  if (!isElectron) {
    return (
      <Container>
        <InputArea disabled placeholder="Natural language input requires the desktop app." />
      </Container>
    );
  }

  return (
    <Container>
      <InputArea
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Type naturally: 'Worked 4 hours at Rocky's, scored 1420 on SAT practice, saved $50'"}
        disabled={loading}
      />
      <ButtonRow>
        <Hint>
          {error && <ErrorText>{error}</ErrorText>}
          {successMessage && <SuccessText>{successMessage}</SuccessText>}
          {!error && !successMessage && 'Ctrl+Enter to submit'}
        </Hint>
        <Button onClick={handleParse} disabled={loading || !input.trim()}>
          {loading ? 'Processing...' : 'Log Entry'}
        </Button>
      </ButtonRow>

      {showConfirm && (
        <ConfirmationPopup95
          items={parsedItems}
          summary={parsedSummary}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          isLoading={loading}
        />
      )}
    </Container>
  );
}
