import React, { useState } from 'react';
import { CheckCircle2, Plus, Trash2, X, XCircle } from 'lucide-react';
import {
  AcademicQuiz,
  BLUEPRINT_LIMITS,
  getSubjectLabel,
  QuizQuestion,
  SUBJECTS,
  SubjectKey,
} from '../types';

interface QuizBuilderModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: {
    subject: SubjectKey;
    title: string;
    description: string;
    questions: QuizQuestion[];
  }) => Promise<void>;
}

export const QuizBuilderModal: React.FC<QuizBuilderModalProps> = ({
  open,
  onClose,
  onSave,
}) => {
  const [subject, setSubject] = useState<SubjectKey>('math');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    { question: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const addQuestion = () => {
    if (questions.length >= BLUEPRINT_LIMITS.QUIZ_QUESTIONS_MAX) return;
    setQuestions([
      ...questions,
      { question: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanTitle = title.trim().slice(0, 140);
    if (cleanTitle.length < 3) {
      setError('أدخل عنواناً واضحاً للاختبار.');
      return;
    }
    const validQuestions = questions.filter(
      (q) => q.question.trim() && q.options.every((opt) => opt.trim())
    );
    if (validQuestions.length === 0) {
      setError('يرجى إكمال سؤال واحد وخياراته الأربعة على الأقل.');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        subject,
        title: cleanTitle,
        description: description.trim().slice(0, 400),
        questions: validQuestions.map((q) => ({
          question: q.question.trim().slice(0, 300),
          options: q.options.map((o) => o.trim().slice(0, 150)) as [string, string, string, string],
          correctIndex: q.correctIndex,
          explanation: q.explanation.trim().slice(0, 300),
        })),
      });
      setTitle('');
      setDescription('');
      setQuestions([{ question: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' }]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر نشر الاختبار.');
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
            إنشاء اختبار تفاعلي سريع (للمعلمين)
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                المادة
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as SubjectKey)}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 text-sm"
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
                عنوان الاختبار
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={140}
                placeholder="مثال: اختبار أساسيات المشتقات"
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((q, qIdx) => (
              <div
                key={qIdx}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/40"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    السؤال {qIdx + 1}
                  </span>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setQuestions(questions.filter((_, i) => i !== qIdx))}
                      className="text-xs text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={q.question}
                  onChange={(e) => {
                    const next = [...questions];
                    next[qIdx].question = e.target.value;
                    setQuestions(next);
                  }}
                  placeholder="نص السؤال..."
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121824] px-3 text-sm"
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qIdx}`}
                        checked={q.correctIndex === oIdx}
                        onChange={() => {
                          const next = [...questions];
                          next[qIdx].correctIndex = oIdx;
                          setQuestions(next);
                        }}
                        aria-label={`الخيار الصحيح ${oIdx + 1}`}
                        className="accent-emerald-600 w-4 h-4 shrink-0"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...questions];
                          next[qIdx].options[oIdx] = e.target.value;
                          setQuestions(next);
                        }}
                        placeholder={`الخيار ${oIdx + 1}`}
                        className="flex-1 min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121824] px-2.5 text-xs"
                        required
                      />
                    </div>
                  ))}
                </div>

                <input
                  type="text"
                  value={q.explanation}
                  onChange={(e) => {
                    const next = [...questions];
                    next[qIdx].explanation = e.target.value;
                    setQuestions(next);
                  }}
                  placeholder="تفسير الإجابة الصحيحة (يظهر للطالب بعد الحل)"
                  className="w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121824] px-3 text-xs"
                />
              </div>
            ))}
          </div>

          {questions.length < BLUEPRINT_LIMITS.QUIZ_QUESTIONS_MAX && (
            <button
              type="button"
              onClick={addQuestion}
              className="w-full min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة سؤال آخر</span>
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[48px] rounded-xl bg-blue-900 dark:bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-60 cursor-pointer"
          >
            {submitting ? 'جاري النشر...' : 'نشر الاختبار للطلاب'}
          </button>
        </form>
      </div>
    </div>
  );
};

interface QuizRunnerModalProps {
  quiz: AcademicQuiz | null;
  onClose: () => void;
  onComplete: (quiz: AcademicQuiz, score: number, total: number) => Promise<void>;
}

export const QuizRunnerModal: React.FC<QuizRunnerModalProps> = ({
  quiz,
  onClose,
  onComplete,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  if (!quiz) return null;

  const score = quiz.questions.reduce(
    (acc, q, idx) => (selectedAnswers[idx] === q.correctIndex ? acc + 1 : acc),
    0
  );

  const handleFinish = async () => {
    setSubmitted(true);
    await onComplete(quiz, score, quiz.questions.length);
  };

  const handleClose = () => {
    setSelectedAnswers({});
    setSubmitted(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
      onClick={handleClose}
    >
      <div
        className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {getSubjectLabel(quiz.subject)} · إعداد {quiz.authorName}
            </p>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {quiz.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="إغلاق"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted && (
          <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                النتيجة النهائية
              </p>
              <p className="text-2xl font-bold tabular-nums text-blue-900 dark:text-white">
                {score} / {quiz.questions.length}
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              +15 نقطة مساهمة علمية
            </span>
          </div>
        )}

        <div className="space-y-4">
          {quiz.questions.map((q, qIdx) => {
            const chosen = selectedAnswers[qIdx];
            return (
              <div
                key={qIdx}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3"
              >
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {qIdx + 1}. {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((opt, oIdx) => {
                    const isPicked = chosen === oIdx;
                    const isRight = q.correctIndex === oIdx;
                    let cls =
                      'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200';
                    if (submitted) {
                      if (isRight) {
                        cls =
                          'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold';
                      } else if (isPicked && !isRight) {
                        cls =
                          'border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200';
                      }
                    } else if (isPicked) {
                      cls =
                        'border-blue-700 bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 font-semibold';
                    }

                    return (
                      <button
                        key={oIdx}
                        type="button"
                        disabled={submitted}
                        onClick={() =>
                          setSelectedAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))
                        }
                        className={`w-full min-h-[44px] px-3.5 py-2 rounded-xl border text-right text-xs flex items-center justify-between transition-colors cursor-pointer ${cls}`}
                      >
                        <span>{opt}</span>
                        {submitted && isRight && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        {submitted && isPicked && !isRight && (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {submitted && q.explanation && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 pt-1">
                    التوضيح: {q.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {!submitted ? (
          <button
            type="button"
            onClick={handleFinish}
            disabled={Object.keys(selectedAnswers).length < quiz.questions.length}
            className="w-full min-h-[48px] rounded-xl bg-blue-900 dark:bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
          >
            تصحيح الإجابات وعرض النتيجة
          </button>
        ) : (
          <button
            type="button"
            onClick={handleClose}
            className="w-full min-h-[48px] rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold cursor-pointer"
          >
            إغلاق
          </button>
        )}
      </div>
    </div>
  );
};
