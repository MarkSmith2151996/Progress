'use client';

import { useState } from 'react';
import styled from 'styled-components';
import { Window, WindowHeader, WindowContent, TextInput, Button } from 'react95';
import { useRouter, useSearchParams } from 'next/navigation';
import { React95Provider } from '@/components/providers/React95Provider';
import StyledComponentsRegistry from '@/lib/registry';

const LoginContainer = styled.div`
  min-height: 100vh;
  background: #008080;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
`;

const LoginWindow = styled(Window)`
  width: 100%;
  max-width: 320px;
`;

const TitleBar = styled(WindowHeader)`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Icon = styled.span`
  font-size: 16px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Label = styled.label`
  font-size: 12px;
  display: block;
  margin-bottom: 4px;
`;

const PinInput = styled(TextInput)`
  font-size: 24px;
  text-align: center;
  letter-spacing: 8px;
  font-family: monospace;
`;

const ErrorText = styled.div`
  color: #ff0000;
  font-size: 11px;
  text-align: center;
  padding: 8px;
  background: #fff0f0;
  border: 1px solid #ff0000;
`;

const SubmitButton = styled(Button)`
  width: 100%;
  padding: 12px;
  font-size: 14px;
`;

const Footer = styled.div`
  text-align: center;
  font-size: 10px;
  color: #666;
  margin-top: 8px;
`;

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/mobile';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      if (res.ok) {
        // Redirect to intended page
        router.push(redirect);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid PIN');
        setPin('');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(value);
    setError('');
  };

  return (
    <StyledComponentsRegistry>
      <React95Provider>
        <LoginContainer>
          <LoginWindow>
            <TitleBar>
              <Icon>🔒</Icon>
              <span>Progress Tracker - Login</span>
            </TitleBar>
            <WindowContent>
              <Form onSubmit={handleSubmit}>
                <div>
                  <Label htmlFor="pin">Enter PIN to continue:</Label>
                  <PinInput
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pin}
                    onChange={handlePinChange}
                    placeholder="****"
                    autoFocus
                    autoComplete="off"
                  />
                </div>

                {error && <ErrorText>{error}</ErrorText>}

                <SubmitButton
                  type="submit"
                  primary
                  disabled={pin.length < 4 || loading}
                >
                  {loading ? 'Verifying...' : 'Unlock'}
                </SubmitButton>

                <Footer>
                  Antonio&apos;s Progress Tracker
                </Footer>
              </Form>
            </WindowContent>
          </LoginWindow>
        </LoginContainer>
      </React95Provider>
    </StyledComponentsRegistry>
  );
}
