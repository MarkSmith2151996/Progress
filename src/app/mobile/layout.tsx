import type { Metadata, Viewport } from 'next';
import StyledComponentsRegistry from '@/lib/registry';
import { React95Provider } from '@/components/providers/React95Provider';
import Win95Keyboard from '@/components/mobile/Win95Keyboard';

export const metadata: Metadata = {
  title: 'Progress Tracker',
  description: 'Personal productivity and goal tracking with AI coaching',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Progress Tracker',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#c0c0c0',
};

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StyledComponentsRegistry>
      <React95Provider>
        <div style={{
          minHeight: '100vh',
          background: 'var(--accent-color, #008080)',
          paddingBottom: '60px', // Space for fixed taskbar
        }}>
          {children}
        </div>
        <Win95Keyboard />
      </React95Provider>
    </StyledComponentsRegistry>
  );
}
