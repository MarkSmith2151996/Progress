'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MobileCoachPage() {
  const router = useRouter();

  useEffect(() => {
    // Coach is now integrated as a tab in the main mobile page
    router.replace('/mobile');
  }, [router]);

  return null;
}
