import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ variant?: 'compact' | 'full' }> = ({
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) return null;

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      {variant === 'compact' ? (
        <button
          type="button"
          onClick={handleClick}
          className="min-h-[40px] inline-flex items-center gap-2 rounded-xl border border-blue-700/25 bg-blue-50 dark:bg-blue-950/40 px-3 py-2 text-xs font-semibold text-blue-900 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>تثبيت التطبيق</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="w-full min-h-[48px] inline-flex items-center justify-center gap-2.5 rounded-xl bg-blue-900 dark:bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 dark:hover:bg-blue-600 active:scale-[0.99] transition-all whitespace-nowrap cursor-pointer"
        >
          <Smartphone className="w-5 h-5 shrink-0" />
          <span>
            {isInstallable
              ? 'تثبيت مِنبَر على أندرويد الآن'
              : 'تثبيت التطبيق على الجوال'}
          </span>
        </button>
      )}

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                تثبيت مِنبَر على جوالك
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="إغلاق"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              <ol className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <li>1. افتح رابط التطبيق في متصفح Safari.</li>
                <li>2. اضغط على أيقونة المشاركة في أسفل الشاشة.</li>
                <li>3. اختر «إضافة إلى الشاشة الرئيسية» (Add to Home Screen).</li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <li>1. افتح الرابط المشترك للتطبيق في متصفح Chrome على جوالك الأندرويد.</li>
                <li>2. اضغط على قائمة النقاط الثلاث في الزاوية العلوية.</li>
                <li>3. اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية» ليعمل كبرنامج مستقل بشاشة كاملة.</li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-6 w-full min-h-[44px] rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
            >
              حسناً
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-6 z-40 flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>أنت الآن دون اتصال — يتم عرض المحتوى المخزن مؤقتاً</span>
    </div>
  );
};
