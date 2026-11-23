import React, { useState } from 'react';
import { Award, BookOpen, CheckCircle2, GraduationCap, Users } from 'lucide-react';
import heroCampusImg from '../assets/images/minbar_hero_campus_1795449252201.jpg';
import { PWAInstallButton } from './PWAInstallButton';

interface AuthGateProps {
  onSignIn: () => Promise<void>;
  authError: string | null;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onSignIn, authError }) => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await onSignIn();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#F6F7FB] dark:bg-[#0B0F17] flex flex-col justify-between">
      {/* Top Bar Contract */}
      <header className="max-w-7xl w-full mx-auto px-6 py-4 flex items-center justify-between gap-8 border-b border-slate-200/70 dark:border-slate-800/70">
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <img src="./icon.svg" alt="شعار مِنبَر" className="w-8 h-8 rounded-xl shrink-0" />
          <span className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
            مِنبَر
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <PWAInstallButton variant="compact" />
        </div>
      </header>

      {/* Main Split Hero */}
      <main className="max-w-7xl w-full mx-auto px-6 py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
          <p className="text-xs font-semibold text-blue-800 dark:text-blue-400">
            منصة أكاديمية عالمية · للطلاب والمعلمين
          </p>
          <h1
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 leading-tight"
            style={{ textWrap: 'balance' }}
          >
            مجتمع المعرفة حيث يلتقي شغف الطلاب بخبرة المعلمين.
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
            اسأل في أي مادة واحصل على إجابات علمية موثّقة من معلمين متخصصين، شارك الملخصات والمراجع الأكاديمية، اختبر فهمك بتحديات تفاعلية، وانضم إلى حلقات المذاكرة الحية.
          </p>

          <div className="rounded-2xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-w-md">
            {authError && (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3 text-xs text-rose-700 dark:text-rose-300">
                {authError}
              </div>
            )}
            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="w-full min-h-[48px] flex items-center justify-center gap-3 rounded-xl bg-blue-900 dark:bg-blue-700 text-white px-5 py-3 text-sm font-semibold hover:bg-blue-800 dark:hover:bg-blue-600 disabled:opacity-60 active:scale-[0.99] transition-all cursor-pointer"
            >
              <GraduationCap className="w-5 h-5 shrink-0" />
              <span>{loading ? 'جاري فتح الحساب...' : 'الدخول السريع بحساب Google'}</span>
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              بعد الدخول يمكنك اختيار صفتك الأكاديمية كـ «طالب» أو «معلم» وتحديد تخصصك خلال ثوانٍ.
            </p>
          </div>
        </div>

        <div className="lg:col-span-6 flex flex-col gap-5">
          <div className="relative flex-1 min-h-[260px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-800">
            <img
              src={heroCampusImg}
              alt="طلاب ومعلمون يتعاونون في مكتبة جامعية حديثة"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover lg:h-full"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent flex items-end p-6">
              <div className="text-white space-y-1.5">
                <p className="text-xs font-medium text-blue-200">
                  تعاون مباشر · إجابات معتمدة · اختبارات فورية
                </p>
                <p className="font-display text-lg font-bold">
                  بيئة دراسية منظمة خالية من التشتت ومصممة للتركيز والتميز العلمي
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-slate-800 p-4">
              <CheckCircle2 className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              <p className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                توثيق الإجابات
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                يعتمد المعلمون أدق حل علمي في كل نقاش.
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-slate-800 p-4">
              <BookOpen className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              <p className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                تصدير وتوثيق
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                مولّد مراجع APA/MLA وتنزيل الملخصات.
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-slate-800 p-4">
              <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <p className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                لوحة التميز
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                نقاط حقيقية لكل مساهمة وحل اختبار.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl w-full mx-auto px-6 py-4 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 dark:border-slate-800/70">
        <span className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          مِنبَر — مجتمع الطلاب والمعلمين
        </span>
        <span>متوافق مع أجهزة أندرويد وسطح المكتب</span>
      </footer>
    </div>
  );
};
