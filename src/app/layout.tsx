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
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --accent-color: #008080;
            --font-base: 13px;
            --font-list: 13px;
            --font-label: 12px;
            --font-meta: 11px;
          }
          [data-font-size="small"] {
            --font-base: 11px;
            --font-list: 11px;
            --font-label: 10px;
            --font-meta: 9px;
          }
          [data-font-size="medium"] {
            --font-base: 13px;
            --font-list: 13px;
            --font-label: 12px;
            --font-meta: 11px;
          }
          [data-font-size="large"] {
            --font-base: 15px;
            --font-list: 15px;
            --font-label: 14px;
            --font-meta: 13px;
          }
        `}} />
      </head>
      <body>
        <StyledComponentsRegistry>
          <React95Provider>{children}</React95Provider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
