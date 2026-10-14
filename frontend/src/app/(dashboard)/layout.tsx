'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Keep tab session marked active
    sessionStorage.setItem('reli_session_active', 'true');
    setMounted(true);
    
    const sse = new EventSource('/api/lead-hunter/stream/');
    
    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'CAMPAIGN_COMPLETED') {
          window.dispatchEvent(new CustomEvent('campaign-completed', { detail: data }));
        } else if (data.type === 'CAMPAIGN_PROGRESS') {
          window.dispatchEvent(new CustomEvent('campaign-progress', { detail: data }));
        } else if (data.type === 'CAMPAIGN_LOG') {
          window.dispatchEvent(new CustomEvent('campaign-log', { detail: data }));
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    sse.onerror = () => {
      // EventSource auto-reconnects on error, no manual handling needed
      console.warn('SSE connection error — browser will auto-reconnect.');
    };
    
    return () => {
      sse.close();
    };
  }, []);

  return (
    <div className={`flex h-screen overflow-hidden transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-hidden">
        <div className="h-full flex flex-col p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
