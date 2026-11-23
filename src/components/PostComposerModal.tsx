import React, { useState } from 'react';
import { BookMarked, X } from 'lucide-react';
import {
  BLUEPRINT_LIMITS,
  POST_TYPES,
  PostType,
  SUBJECTS,
  SubjectKey,
} from '../types';

interface PostComposerModalProps {
  open: boolean;
  initialSubject?: SubjectKey;
  onClose: () => void;
  onPublish: (payload: {
    subject: SubjectKey;
    postType: PostType;
    title: string;
    body: string;
    attachmentUrl: string;
  }) => Promise<void>;
}

export const PostComposerModal: React.FC<PostComposerModalProps> = ({
  open,
  initialSubject,
  onClose,
  onPublish,
}) => {
  const [postType, setPostType] = useState<PostType>('question');
  const [subject, setSubject] = useState<SubjectKey>(initialSubject || 'math');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');

  // Built-in academic citation tool state
  const [showCitationTool, setShowCitationTool] = useState(false);
  const [citAuthor, setCitAuthor] = useState('');
  const [citTitle, setCitTitle] = useState('');
  const [citYear, setCitYear] = useState('2026');
  const [citStyle, setCitStyle] = useState<'APA' | 'MLA' | 'Chicago'>('APA');
  const [citLoading, setCitLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleInsertCitation = async () => {
    if (!citAuthor.trim() || !citTitle.trim()) return;
    setCitLoading(true);
    try {
      const res = await fetch('/api/format-citation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: citAuthor,
          title: citTitle,
          year: citYear,
          style: citStyle,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { formatted: string };
        setBody((prev) =>
          (prev ? `${prev}\n\nالمرجع (${citStyle}): ${data.formatted}` : `المرجع (${citStyle}): ${data.formatted}`).slice(
            0,
            BLUEPRINT_LIMITS.BODY_MAX
          )
        );
        setCitAuthor('');
        setCitTitle('');
        setShowCitationTool(false);
      }
    } finally {
      setCitLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanTitle = title.trim().slice(0, BLUEPRINT_LIMITS.TITLE_MAX);
    const cleanBody = body.trim().slice(0, BLUEPRINT_LIMITS.BODY_MAX);
    const cleanUrl = attachmentUrl.trim().slice(0, BLUEPRINT_LIMITS.URL_MAX);

    if (cleanTitle.length < 3) {
      setError('يرجى كتابة عنوان واضح لا يقل عن 3 أحرف.');
      return;
    }
    if (cleanBody.length < 5) {
      setError('يرجى كتابة تفاصيل المنشور أو السؤال (5 أحرف على الأقل).');
      return;
    }

    setSubmitting(true);
    try {
      await onPublish({
        subject,
        postType,
        title: cleanTitle,
        body: cleanBody,
        attachmentUrl: cleanUrl,
      });
      setTitle('');
      setBody('');
      setAttachmentUrl('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر نشر المشاركة.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            مشاركة جديدة في المجتمع
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
            {POST_TYPES.map((pt) => (
              <button
                key={pt.key}
                type="button"
                onClick={() => setPostType(pt.key)}
                className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  postType === pt.key
                    ? 'bg-white dark:bg-slate-800 text-blue-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {pt.label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              المادة أو التخصص
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as SubjectKey)}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100"
            >
              {SUBJECTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              العنوان
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={BLUEPRINT_LIMITS.TITLE_MAX}
              placeholder={
                postType === 'question'
                  ? 'مثال: كيف نثبت تقارب المتسلسلة الهندسية في التفاضل؟'
                  : postType === 'resource'
                  ? 'مثال: ملخص شامل لقوانين الديناميكا الحرارية'
                  : 'مثال: أفضل منهجية لتنظيم المذاكرة قبل الاختبارات النهائية'
              }
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                المحتوى والشرح
              </label>
              <button
                type="button"
                onClick={() => setShowCitationTool(!showCitationTool)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800 dark:text-blue-400 hover:underline cursor-pointer"
              >
                <BookMarked className="w-3.5 h-3.5" />
                <span>إدراج مرجع أكاديمي</span>
              </button>
            </div>

            {showCitationTool && (
              <div className="mb-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/30 p-3 space-y-2.5">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                  تنسيق مرجع علمي (APA / MLA / Chicago)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={citAuthor}
                    onChange={(e) => setCitAuthor(e.target.value)}
                    placeholder="اسم المؤلف"
                    className="min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                  />
                  <input
                    type="text"
                    value={citTitle}
                    onChange={(e) => setCitTitle(e.target.value)}
                    placeholder="عنوان الكتاب أو الورقة"
                    className="min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={citYear}
                    onChange={(e) => setCitYear(e.target.value)}
                    placeholder="السنة"
                    className="w-20 min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs tabular-nums"
                  />
                  <select
                    value={citStyle}
                    onChange={(e) => setCitStyle(e.target.value as 'APA' | 'MLA' | 'Chicago')}
                    className="min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                  >
                    <option value="APA">APA 7</option>
                    <option value="MLA">MLA 9</option>
                    <option value="Chicago">Chicago</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleInsertCitation}
                    disabled={citLoading}
                    className="mr-auto min-h-[38px] px-3 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 cursor-pointer"
                  >
                    {citLoading ? 'جاري التنسيق...' : 'إدراج'}
                  </button>
                </div>
              </div>
            )}

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={BLUEPRINT_LIMITS.BODY_MAX}
              rows={5}
              placeholder="اكتب شرحك، المعادلات، أو خطوات المسألة بوضوح..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3.5 text-sm text-slate-900 dark:text-slate-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              رابط ملف أو مصدر خارجي (اختياري)
            </label>
            <input
              type="url"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              maxLength={BLUEPRINT_LIMITS.URL_MAX}
              placeholder="https://..."
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[48px] rounded-xl bg-blue-900 dark:bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 dark:hover:bg-blue-600 disabled:opacity-60 active:scale-[0.99] transition-all cursor-pointer"
          >
            {submitting ? 'جاري النشر...' : 'نشر في مِنبَر'}
          </button>
        </form>
      </div>
    </div>
  );
};
