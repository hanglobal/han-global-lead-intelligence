'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login' || pathname === '/login/';

  useEffect(() => {
    if (isLoginPage) return;
    
    const sse = new EventSource('/api/lead-hunter/stream/');
    
    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Real-time SSE event:", data);
        if (data.type === 'CAMPAIGN_COMPLETED') {
          // Dispatch a custom browser event so any active view can react in real time
          const sseEvent = new CustomEvent('campaign-completed', { detail: data });
          window.dispatchEvent(sseEvent);
        } else if (data.type === 'CAMPAIGN_PROGRESS') {
          const sseEvent = new CustomEvent('campaign-progress', { detail: data });
          window.dispatchEvent(sseEvent);
        }
      } catch (err) {
        console.error("Error parsing SSE event:", err);
      }
    };
    
    return () => {
      sse.close();
    };
  }, [isLoginPage]);

  return (
    <html lang="en">
      <head>
        <title>Han Global Lead Intelligence</title>
        <meta name="description" content="Han Global lead generation and CRM platform" />
        <link rel="icon" href="/logo.png" />
      </head>
      <body className="bg-zinc-950 text-white min-h-screen antialiased">
        {isLoginPage ? (
          children
        ) : (
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 min-w-0 overflow-hidden">
              <div className="h-full flex flex-col p-8">
                {children}
              </div>
            </main>
          </div>
        )}
      </body>
    </html>
  );
}

