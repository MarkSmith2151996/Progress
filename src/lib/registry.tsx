'use client';

import React, { useState } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { ServerStyleSheet, StyleSheetManager } from 'styled-components';
import isPropValid from '@emotion/is-prop-valid';

function shouldForwardProp(propName: string, target: unknown) {
  if (typeof target === 'string') {
    return isPropValid(propName);
  }
  return true;
}

export default function StyledComponentsRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  // Only create stylesheet once with lazy initial state
  const [styledComponentsStyleSheet] = useState(() => new ServerStyleSheet());

  useServerInsertedHTML(() => {
    const styles = styledComponentsStyleSheet.getStyleElement();
    styledComponentsStyleSheet.instance.clearTag();
    return <>{styles}</>;
  });

  if (typeof window !== 'undefined') {
    return (
      <StyleSheetManager shouldForwardProp={shouldForwardProp}>
        {children}
      </StyleSheetManager>
    );
  }

  return (
    <StyleSheetManager
      sheet={styledComponentsStyleSheet.instance}
      shouldForwardProp={shouldForwardProp}
    >
      {children}
    </StyleSheetManager>
  );
}
