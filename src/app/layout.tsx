import type { Metadata } from 'next';
import StyledComponentsRegistry from '@/lib/registry';
import { React95Provider } from '@/components/providers/React95Provider';

export const metadata: Metadata = {
  title: 'Progress Tracker',
  description: 'Personal productivity and goal tracking system with AI coaching',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <StyledComponentsRegistry>
          <React95Provider>{children}</React95Provider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
