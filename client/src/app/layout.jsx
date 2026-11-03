import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/common/Navbar';

export const metadata = {
  title: 'Dispatchly — Dynamic Technician Dispatcher',
  description: 'On-demand intelligent dispatch marketplace for Plumbing, HVAC, and Urgent Delivery',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col font-sans antialiased">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
          <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
            Dispatchly Platform &copy; {new Date().getFullYear()} &bull; Last-Mile Dynamic Technician Dispatcher MVP
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
