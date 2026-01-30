'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Window, WindowHeader, WindowContent } from 'react95';

const Container = styled.div`
  min-height: 100vh;
  background: #008080;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
`;

const MessageWindow = styled(Window)`
  width: 100%;
  max-width: 320px;
`;

const Message = styled.p`
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
  padding: 16px 8px;
`;

export default function MobileCoachPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home after 3 seconds
    const timer = setTimeout(() => {
      router.push('/mobile');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <Container>
      <MessageWindow>
        <WindowHeader>
          <span>Coach - Unavailable</span>
        </WindowHeader>
        <WindowContent>
          <Message>
            The Coach feature is only available on desktop (localhost).
            <br /><br />
            Redirecting to home...
          </Message>
        </WindowContent>
      </MessageWindow>
    </Container>
  );
}
