import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/common/Navbar';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata = {
  title: 'Dispatchly — Dynamic Technician Dispatcher',
  description: 'The right technician, not just the nearest one. Intelligent on-demand dispatch for plumbing, AC repair, and urgent delivery.',
  openGraph: {
    title: 'Dispatchly — Dynamic Technician Dispatcher',
    description: 'Intelligent on-demand dispatch for plumbing, AC repair, and urgent delivery. We match by skill, parts in the van, and your deadline.',
    type: 'website',
  },
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="%23FFB400"/><circle cx="16" cy="16" r="6" fill="%2312161C"/><circle cx="21" cy="11" r="2.5" fill="%2312161C"/></svg>',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=Public+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col font-sans bg-white text-ink antialiased">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 w-full">
            {children}
          </main>
          <footer className="bg-concrete border-t border-line py-8">
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded-[4px] bg-amber flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-ink" />
                    </div>
                    <span className="font-headline font-bold text-base tracking-tight text-ink">Dispatchly</span>
                  </div>
                  <p className="text-xs text-ink/70 max-w-md">
                    Intelligent on-demand marketplace for plumbing, AC and HVAC, and urgent delivery.
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink/80">
                  <a href="#services" className="hover:text-ink">Services</a>
                  <a href="#how-it-works" className="hover:text-ink">How it works</a>
                  <a href="#for-technicians" className="hover:text-ink">For technicians</a>
                  <a href="/login" className="hover:text-ink">Log in</a>
                  <a href="/register" className="hover:text-ink">Register</a>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-line/60 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-ink/60">
                <span>Dispatchly platform &copy; {new Date().getFullYear()}</span>
                <span className="mt-1 sm:mt-0">Test mode active &bull; No real currency charged</span>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
