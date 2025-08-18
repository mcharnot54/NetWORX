"use client";

import { useEffect } from 'react';

export function SafeNavigation() {
  useEffect(() => {
    // Override problematic navigation that causes fetch failures
    const handleNavigation = (e: PopStateEvent) => {
      // Prevent default navigation that causes RSC fetch failures
      if (window.location.pathname.includes('reload=')) {
        e.preventDefault();
        // Force a full page reload instead of trying to fetch RSC payload
        window.location.href = window.location.pathname;
        return false;
      }
    };

    // Handle navigation safely
    window.addEventListener('popstate', handleNavigation);
    
    // Override Next.js router if it exists
    if (typeof window !== 'undefined' && (window as any).__NEXT_DATA__) {
      // Prevent automatic RSC fetching
      const router = (window as any).next?.router;
      if (router) {
        const originalPush = router.push;
        router.push = function(...args: any[]) {
          // Force full page navigation instead of client-side routing
          const url = args[0];
          if (typeof url === 'string') {
            window.location.href = url;
            return Promise.resolve(true);
          }
          return originalPush.apply(this, args);
        };
      }
    }

    return () => {
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []);

  return null; // This component doesn't render anything
}
