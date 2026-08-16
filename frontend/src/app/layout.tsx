import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>Han Global Lead Intelligence</title>
        <meta name="description" content="Han Global lead generation and CRM platform" />
        <link rel="icon" href="/logo.png" />
      </head>
      <body className="bg-zinc-950 text-white min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
