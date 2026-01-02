'use client';

import { createContext, useContext, useState, useEffect, ReactNode, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Smartphone, X, Monitor } from 'lucide-react';

interface MobilePreviewContextType {
  isMobilePreview: boolean;
  setMobilePreview: (value: boolean) => void;
}

const MobilePreviewContext = createContext<MobilePreviewContextType>({
  isMobilePreview: false,
  setMobilePreview: () => {},
});

export function useMobilePreview() {
  return useContext(MobilePreviewContext);
}

interface MobilePreviewProviderProps {
  children: ReactNode;
}

// Inner component that uses useSearchParams (needs Suspense)
function MobilePreviewInner({ children }: MobilePreviewProviderProps) {
  const [isMobilePreview, setMobilePreview] = useState(false);
  const [iframeUrl, setIframeUrl] = useState('');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Check if we're inside the iframe (hide toggle button)
  const isInsideIframe = searchParams.get('_mobilePreview') === 'true';

  // Update iframe URL when pathname changes
  useEffect(() => {
    if (isMobilePreview && typeof window !== 'undefined') {
      // Build URL with mobile preview flag
      const url = new URL(window.location.href);
      url.searchParams.set('_mobilePreview', 'true');
      setIframeUrl(url.toString());
    }
  }, [isMobilePreview, pathname]);

  // If we're inside the iframe, just render children without the toggle
  if (isInsideIframe) {
    return (
      <MobilePreviewContext.Provider value={{ isMobilePreview: true, setMobilePreview: () => {} }}>
        {children}
      </MobilePreviewContext.Provider>
    );
  }

  return (
    <MobilePreviewContext.Provider value={{ isMobilePreview, setMobilePreview }}>
      {/* Floating Toggle Button - Always visible (except inside iframe) */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
        <button
          onClick={() => setMobilePreview(!isMobilePreview)}
          className={`p-3 rounded-full shadow-lg transition-all hover:scale-110 ${
            isMobilePreview 
              ? 'bg-emerald-500 text-white' 
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
          title={isMobilePreview ? 'Exit mobile preview' : 'Preview mobile view'}
        >
          {isMobilePreview ? <Monitor className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Preview Mode */}
      {isMobilePreview ? (
        <div className="fixed inset-0 min-h-screen bg-slate-800 flex items-center justify-center p-4 z-[9998]">
          {/* Mobile Preview Label */}
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-slate-900 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Mobile Preview (375×812)
            <button 
              onClick={() => setMobilePreview(false)}
              className="ml-2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Phone Frame with iframe */}
          <div className="relative">
            {/* Notch - positioned above iframe */}
            <div className="absolute top-[8px] left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-slate-900 rounded-b-2xl z-10 pointer-events-none" />
            
            {/* Phone bezel */}
            <div className="w-[391px] h-[828px] bg-slate-900 rounded-[48px] p-[8px] shadow-2xl">
              {/* iframe with actual 375px viewport */}
              {iframeUrl && (
                <iframe
                  src={iframeUrl}
                  className="w-[375px] h-[812px] bg-white rounded-[40px] border-0"
                  title="Mobile Preview"
                  style={{
                    overflow: 'auto',
                  }}
                />
              )}
            </div>
            
            {/* Home Indicator - positioned below iframe */}
            <div className="absolute bottom-[10px] left-1/2 -translate-x-1/2 w-[134px] h-[5px] bg-slate-700 rounded-full z-10 pointer-events-none" />
          </div>
        </div>
      ) : null}

      {/* Normal content (always rendered, hidden when preview is active) */}
      <div className={isMobilePreview ? 'hidden' : ''}>
        {children}
      </div>
    </MobilePreviewContext.Provider>
  );
}

// Outer wrapper with Suspense for useSearchParams
export function MobilePreviewProvider({ children }: MobilePreviewProviderProps) {
  return (
    <Suspense fallback={children}>
      <MobilePreviewInner>{children}</MobilePreviewInner>
    </Suspense>
  );
}
