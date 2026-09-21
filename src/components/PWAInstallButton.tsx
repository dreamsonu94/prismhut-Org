import React, { useState } from 'react';
import { Download, Smartphone, Share, CheckCircle2, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWA.js';

export const PWAInstallButton: React.FC<{ className?: string; compact?: boolean }> = ({
  className = '',
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already installed in standalone mode, display a verified badge if requested or hide
  if (isInstalled) {
    if (compact) return null;
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1 rounded-lg">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span className="font-medium">App Installed</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const installed = await promptInstall();
      if (installed) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 4000);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  // Only render if browser supports beforeinstallprompt OR if running on iOS Safari
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      <button
        id="pwa-install-button"
        onClick={handleInstallClick}
        aria-label="Install Smart POS as App"
        className={`flex items-center gap-2 font-medium text-xs rounded-lg transition-all duration-200 shadow-sm ${
          compact
            ? 'p-2 bg-orange-600 hover:bg-orange-500 text-white'
            : 'px-3 py-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-orange-950/20'
        } ${className}`}
        title="Install Restaurant Smart POS App for Waiter & Floor Staff"
      >
        {isIOS ? (
          <Smartphone className="w-3.5 h-3.5 animate-pulse text-amber-200" />
        ) : (
          <Download className="w-3.5 h-3.5 text-white" />
        )}
        {!compact && (
          <span>{isIOS ? 'Install iOS App' : 'Install Waiter App'}</span>
        )}
      </button>

      {/* iOS Installation Instructions Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl relative">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-orange-500/20 border border-orange-500/30 rounded-xl text-orange-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Install on iPhone / iPad</h3>
                <p className="text-xs text-slate-400">Add to Home Screen for Waiters</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/50">
              <div className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-600 text-white font-bold text-[10px] shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  Tap the <strong className="text-white">Share</strong> icon <Share className="w-3.5 h-3.5 inline mx-0.5 text-sky-400" /> in the Safari toolbar (bottom or top).
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-600 text-white font-bold text-[10px] shrink-0 mt-0.5">
                  2
                </span>
                <p>
                  Scroll down the share sheet and tap <strong className="text-white">Add to Home Screen</strong>.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-600 text-white font-bold text-[10px] shrink-0 mt-0.5">
                  3
                </span>
                <p>
                  Tap <strong className="text-white">Add</strong> in the top-right corner to install the full-screen Waiter POS app!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-medium text-xs transition-colors shadow-lg shadow-orange-950/40"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}

      {/* Success banner */}
      {installSuccess && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4" />
          <span>App installed successfully! Launch from your home screen.</span>
        </div>
      )}
    </>
  );
};

export const OfflineBanner: React.FC = () => {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const [online, setOnline] = useState(isOnline);

  React.useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      id="offline-status-banner"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600/95 backdrop-blur-md px-3.5 py-2 text-xs font-medium text-white shadow-xl border border-amber-400/40 animate-pulse"
    >
      <span className="h-2 w-2 rounded-full bg-white animate-ping" />
      <span>Offline Mode — Active orders will resume syncing when connection is restored.</span>
    </div>
  );
};
