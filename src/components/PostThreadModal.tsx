import React, { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import {
  ArrowUp,
  Bookmark,
  CheckCircle2,
  Download,
  ExternalLink,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  BLUEPRINT_LIMITS,
  CommunityPost,
  getPostTypeLabel,
  getSubjectLabel,
  PostReply,
  UserRole,
} from '../types';

interface PostThreadModalProps {
  post: CommunityPost | null;
  currentUid: string;
  currentRole: UserRole;
  isVoted: boolean;
  isSaved: boolean;
  onClose: () => void;
  onToggleVote: (post: CommunityPost) => Promise<void>;
  onToggleSave: (postId: string) => Promise<void>;
  onAddReply: (post: CommunityPost, body: string) => Promise<void>;
  onVerifyReply: (post: CommunityPost, reply: PostReply) => Promise<void>;
  onDeletePost: (postId: string) => Promise<void>;
  onDeleteReply: (postId: string, replyId: string) => Promise<void>;
}

export const PostThreadModal: React.FC<PostThreadModalProps> = ({
  post,
  currentUid,
  currentRole,
  isVoted,
  isSaved,
  onClose,
  onToggleVote,
  onToggleSave,
  onAddReply,
  onVerifyReply,
  onDeletePost,
  onDeleteReply,
}) => {
  const [replies, setReplies] = useState<PostReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!post) {
      setReplies([]);
      return;
    }
    const q = query(
      collection(db, 'posts', post.id, 'replies'),
      where('postId', '==', post.id)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as PostReply);
        list.sort((a, b) => (a.isVerifiedAnswer === b.isVerifiedAnswer ? 0 : a.isVerifiedAnswer ? -1 : 1));
        setReplies(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, `posts/${post.id}/replies`);
      }
    );
    return () => unsub();
  }, [post?.id]);

  if (!post) return null;

  const canVerify = currentUid === post.authorId || currentRole === 'teacher';

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = replyText.trim().slice(0, BLUEPRINT_LIMITS.REPLY_MAX);
    if (clean.length < 2) return;
    setSubmitting(true);
    try {
      await onAddReply(post, clean);
      setReplyText('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportNotes = async () => {
    let blob: Blob | null = null;
    try {
      const res = await fetch('/api/export-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: post.title,
          subject: getSubjectLabel(post.subject),
          authorName: post.authorName,
          authorRole: post.authorRole,
          content: post.body,
          replies: replies.map((r) => ({
            authorName: r.authorName,
            authorRole: r.authorRole,
            body: r.body,
            isVerifiedAnswer: r.isVerifiedAnswer,
          })),
        }),
      });
      if (res.ok) {
        blob = await res.blob();
      }
    } catch {
      // Static hosting fallback (e.g. GitHub Pages)
    }

    if (!blob) {
      const lines: string[] = [
        `# ${post.title}`,
        '',
        `- **المادة:** ${getSubjectLabel(post.subject)}`,
        `- **الكاتب:** ${post.authorName} (${post.authorRole === 'teacher' ? 'معلم' : 'طالب'})`,
        `- **تاريخ التصدير:** ${new Date().toISOString().slice(0, 10)}`,
        '',
        '---',
        '',
        post.body,
        '',
      ];
      if (replies.length > 0) {
        lines.push('---', '', '## الإجابات والنقاشات', '');
        replies.forEach((r, idx) => {
          const badge = r.isVerifiedAnswer ? ' [إجابة علمية موثّقة]' : '';
          const role = r.authorRole === 'teacher' ? 'معلم' : 'طالب';
          lines.push(`### ${idx + 1}. ${r.authorName} (${role})${badge}`, '', r.body, '');
        });
      }
      blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'minbar-study-notes.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
            {getSubjectLabel(post.subject)} · {getPostTypeLabel(post.postType)}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleExportNotes}
              title="تنزيل كملخص للمذاكرة"
              className="min-h-[40px] px-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">تنزيل ملخص</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Post Body */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>
                {post.authorName} · {post.authorRole === 'teacher' ? 'معلم' : 'طالب'} ·{' '}
                {post.authorSpecialty}
              </span>
              {post.status === 'resolved' && (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تمت الإجابة</span>
                </span>
              )}
            </div>

            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
              {post.title}
            </h2>

            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {post.body}
            </p>

            {post.attachmentUrl && (
              <a
                href={post.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800 dark:text-blue-400 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>فتح المرجع أو الملف المرفق</span>
              </a>
            )}

            <div className="pt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleVote(post)}
                className={`min-h-[40px] inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold border transition-colors cursor-pointer ${
                  isVoted
                    ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <ArrowUp className="w-4 h-4" />
                <span className="tabular-nums">مفيد ({post.votesCount})</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleSave(post.id)}
                className={`min-h-[40px] inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold border transition-colors cursor-pointer ${
                  isSaved
                    ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span>{isSaved ? 'محفوظ في مكتبتك' : 'حفظ للمراجعة'}</span>
              </button>

              {post.authorId === currentUid && (
                <button
                  type="button"
                  onClick={async () => {
                    await onDeletePost(post.id);
                    onClose();
                  }}
                  className="mr-auto min-h-[40px] inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>حذف المنشور</span>
                </button>
              )}
            </div>
          </div>

          {/* Replies Section */}
          <div className="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
              الإجابات والمناقشات ({replies.length})
            </h3>

            {replies.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                كن أول من يشارك بإجابة أو توضيح علمي.
              </p>
            ) : (
              <div className="space-y-3">
                {replies.map((rep) => (
                  <div
                    key={rep.id}
                    className={`rounded-2xl border p-4 space-y-2 ${
                      rep.isVerifiedAnswer
                        ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {rep.authorName} · {rep.authorRole === 'teacher' ? 'معلم' : 'طالب'}
                      </span>
                      {rep.isVerifiedAnswer && (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                          <ShieldCheck className="w-4 h-4" />
                          <span>إجابة علمية موثّقة</span>
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {rep.body}
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      {canVerify && !rep.isVerifiedAnswer && (
                        <button
                          type="button"
                          onClick={() => onVerifyReply(post, rep)}
                          className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline py-1 cursor-pointer"
                        >
                          اعتماد كأفضل إجابة علمية
                        </button>
                      )}
                      {rep.authorId === currentUid && (
                        <button
                          type="button"
                          onClick={() => onDeleteReply(post.id, rep.id)}
                          className="mr-auto text-xs text-slate-400 hover:text-rose-600 py-1 cursor-pointer"
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Reply Input */}
        <form
          onSubmit={handleReplySubmit}
          className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center gap-2"
        >
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            maxLength={BLUEPRINT_LIMITS.REPLY_MAX}
            placeholder="أضف إجابتك أو مشاركتك العلمية..."
            className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121824] px-3.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            type="submit"
            disabled={submitting || replyText.trim().length < 2}
            className="min-h-[44px] min-w-[44px] px-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-900 dark:bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>إرسال</span>
          </button>
        </form>
      </div>
    </div>
  );
};
