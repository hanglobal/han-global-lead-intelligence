/**
 * SSE Proxy Route
 * 
 * Next.js API rewrites buffer SSE streams, breaking real-time updates.
 * This route manually proxies the SSE stream from the Django backend,
 * forwarding auth headers and keeping the connection alive without buffering.
 */
import { getBackendApiUrl } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  let authHeader = request.headers.get('Authorization') || '';
  if (!authHeader) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/reli_session_token=([^;]+)/);
    if (match && match[1]) {
      authHeader = `Bearer ${decodeURIComponent(match[1])}`;
    }
  }

  const backendUrl = `${getBackendApiUrl()}/lead-hunter/stream/`;

  const backendResponse = await fetch(backendUrl, {
    headers: {
      Authorization: authHeader,
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
    // @ts-ignore - undici fetch supports duplex
    duplex: 'half',
  });

  if (!backendResponse.ok || !backendResponse.body) {
    return new Response('Failed to connect to SSE stream', { status: 502 });
  }

  // Pipe the backend stream directly to the client with no buffering
  return new Response(backendResponse.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, must-revalidate',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  });
}
