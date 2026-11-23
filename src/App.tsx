import React, { useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  ArrowUp,
  Award,
  Bookmark,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  GraduationCap,
  Home,
  LogOut,
  MessageSquare,
  Moon,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Sun,
  Trash2,
  UserCheck,
  Users,
  Video,
} from 'lucide-react';
import { AuthGate } from './components/AuthGate';
import { PostComposerModal } from './components/PostComposerModal';
import { PostThreadModal } from './components/PostThreadModal';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';
import { QuizBuilderModal, QuizRunnerModal } from './components/QuizModal';
import { SessionModal } from './components/SessionModal';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './lib/firebase';
import {
  AcademicQuiz,
  BLUEPRINT_LIMITS,
  CommunityPost,
  getPostTypeLabel,
  getSubjectLabel,
  makeSafeId,
  MemberPublic,
  PostReply,
  PostType,
  QuizQuestion,
  StudySession,
  SUBJECTS,
  SubjectKey,
  UserPrivate,
  UserRole,
} from './types';

type NavTab = 'feed' | 'quizzes' | 'sessions' | 'profile';

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  const [userPrivate, setUserPrivate] = useState<UserPrivate | null>(null);
  const [myMember, setMyMember] = useState<MemberPublic | null>(null);
  const [members, setMembers] = useState<MemberPublic[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [votedPostIds, setVotedPostIds] = useState<Record<string, boolean>>({});
  const [quizzes, setQuizzes] = useState<AcademicQuiz[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);

  const [activeTab, setActiveTab] = useState<NavTab>('feed');
  const [selectedSubject, setSelectedSubject] = useState<SubjectKey | 'all'>('all');
  const [postFilter, setPostFilter] = useState<'all' | 'question' | 'resource' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [showComposer, setShowComposer] = useState(false);
  const [activeThreadPostId, setActiveThreadPostId] = useState<string | null>(null);
  const [showQuizBuilder, setShowQuizBuilder] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<AcademicQuiz | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);

  // Profile edit state
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('student');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editInstitution, setEditInstitution] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Study Focus Pomodoro Timer (25 min)
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('minbar_theme') === 'dark';
    }
    return false;
  });

  if (fatalError) {
    throw fatalError;
  }

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('minbar_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('minbar_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 25 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);

      if (nextUser) {
        const userRef = doc(db, 'users', nextUser.uid);
        const memberRef = doc(db, 'members', nextUser.uid);
        try {
          const [uSnap, mSnap] = await Promise.all([getDoc(userRef), getDoc(memberRef)]);
          const safeName = (nextUser.displayName || 'عضو مِنبَر')
            .trim()
            .slice(0, BLUEPRINT_LIMITS.NAME_MAX);
          const safeEmail = (nextUser.email || 'user@example.com').trim().slice(0, 120);

          if (!uSnap.exists() || !mSnap.exists()) {
            const batch = writeBatch(db);
            if (!uSnap.exists()) {
              batch.set(userRef, {
                uid: nextUser.uid,
                displayName: safeName,
                email: safeEmail,
                role: 'student',
                specialty: 'علوم عامة',
                institution: '',
                savedPostIds: [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
            if (!mSnap.exists()) {
              batch.set(memberRef, {
                uid: nextUser.uid,
                displayName: safeName,
                role: 'student',
                specialty: 'علوم عامة',
                institution: '',
                points: 10,
                answersCount: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
            await batch.commit();
          }
        } catch (err) {
          setFatalError(() => {
            handleFirestoreError(err, OperationType.WRITE, `users/${nextUser.uid}`);
            return new Error('Firestore init error');
          });
        }
      } else {
        setUserPrivate(null);
        setMyMember(null);
        setMembers([]);
        setPosts([]);
        setQuizzes([]);
        setSessions([]);
      }
    });
    return () => unsub();
  }, []);

  // Real-time Firestore Listeners
  useEffect(() => {
    if (!authReady || !user) return;

    const unsubUser = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserPrivate;
          setUserPrivate(data);
          setEditName(data.displayName);
          setEditRole(data.role);
          setEditSpecialty(data.specialty);
          setEditInstitution(data.institution || '');
        }
      },
      (err) => {
        setFatalError(() => {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
          return new Error('Firestore error');
        });
      }
    );

    const unsubMembers = onSnapshot(
      query(collection(db, 'members'), where('role', 'in', ['student', 'teacher'])),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as MemberPublic);
        list.sort((a, b) => b.points - a.points);
        setMembers(list);
        const self = list.find((m) => m.uid === user.uid) || null;
        setMyMember(self);
      },
      (err) => {
        setFatalError(() => {
          handleFirestoreError(err, OperationType.LIST, 'members');
          return new Error('Firestore error');
        });
      }
    );

    const unsubPosts = onSnapshot(
      query(collection(db, 'posts'), where('status', 'in', ['open', 'resolved'])),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as CommunityPost);
        list.sort((a, b) => {
          const at = (a.createdAt as { seconds?: number } | undefined)?.seconds || 0;
          const bt = (b.createdAt as { seconds?: number } | undefined)?.seconds || 0;
          return bt - at;
        });
        setPosts(list);
      },
      (err) => {
        setFatalError(() => {
          handleFirestoreError(err, OperationType.LIST, 'posts');
          return new Error('Firestore error');
        });
      }
    );

    const unsubQuizzes = onSnapshot(
      query(
        collection(db, 'quizzes'),
        where('subject', 'in', SUBJECTS.map((s) => s.key))
      ),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as AcademicQuiz);
        setQuizzes(list);
      },
      (err) => {
        setFatalError(() => {
          handleFirestoreError(err, OperationType.LIST, 'quizzes');
          return new Error('Firestore error');
        });
      }
    );

    const unsubSessions = onSnapshot(
      query(collection(db, 'sessions'), where('status', 'in', ['upcoming', 'live', 'completed'])),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as StudySession);
        list.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
        setSessions(list);
      },
      (err) => {
        setFatalError(() => {
          handleFirestoreError(err, OperationType.LIST, 'sessions');
          return new Error('Firestore error');
        });
      }
    );

    return () => {
      unsubUser();
      unsubMembers();
      unsubPosts();
      unsubQuizzes();
      unsubSessions();
    };
  }, [authReady, user]);

  // Check current user's vote status on visible posts
  useEffect(() => {
    if (!authReady || !user || posts.length === 0) return;
    let cancelled = false;
    Promise.all(
      posts.slice(0, 30).map(async (p) => {
        try {
          const v = await getDoc(doc(db, 'posts', p.id, 'votes', user.uid));
          return [p.id, v.exists()] as const;
        } catch {
          return [p.id, false] as const;
        }
      })
    ).then((entries) => {
      if (!cancelled) {
        const map: Record<string, boolean> = {};
        for (const [id, exists] of entries) map[id] = exists;
        setVotedPostIds(map);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [authReady, user, posts.length]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  };

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      setAuthError('تعذر تسجيل الدخول بحساب Google. تأكد من السماح بالنوافذ المنبثقة.');
    }
  };

  const currentRole: UserRole = myMember?.role || userPrivate?.role || 'student';
  const currentName = myMember?.displayName || userPrivate?.displayName || user?.displayName || 'عضو';
  const currentSpecialty = myMember?.specialty || userPrivate?.specialty || 'علوم عامة';

  const handlePublishPost = async (payload: {
    subject: SubjectKey;
    postType: PostType;
    title: string;
    body: string;
    attachmentUrl: string;
  }) => {
    if (!user) return;
    const postId = makeSafeId('post');
    const batch = writeBatch(db);
    batch.set(doc(db, 'posts', postId), {
      id: postId,
      authorId: user.uid,
      authorName: currentName,
      authorRole: currentRole,
      authorSpecialty: currentSpecialty,
      subject: payload.subject,
      postType: payload.postType,
      title: payload.title,
      body: payload.body,
      attachmentUrl: payload.attachmentUrl,
      status: 'open',
      votesCount: 0,
      repliesCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (myMember) {
      batch.update(doc(db, 'members', user.uid), {
        points: myMember.points + 10,
        answersCount: myMember.answersCount,
        updatedAt: serverTimestamp(),
      });
    }
    try {
      await batch.commit();
      setActiveTab('feed');
      showToast('تم نشر مشاركتك (+10 نقاط مساهمة).');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `posts/${postId}`);
    }
  };

  const handleToggleVote = async (post: CommunityPost) => {
    if (!user) return;
    const voteRef = doc(db, 'posts', post.id, 'votes', user.uid);
    const postRef = doc(db, 'posts', post.id);
    const currentlyVoted = !!votedPostIds[post.id];

    const batch = writeBatch(db);
    if (currentlyVoted) {
      batch.delete(voteRef);
      batch.update(postRef, {
        votesCount: Math.max(0, post.votesCount - 1),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(voteRef, {
        voterId: user.uid,
        postId: post.id,
        createdAt: serverTimestamp(),
      });
      batch.update(postRef, {
        votesCount: post.votesCount + 1,
        updatedAt: serverTimestamp(),
      });
    }

    try {
      await batch.commit();
      setVotedPostIds((prev) => ({ ...prev, [post.id]: !currentlyVoted }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const handleToggleSavePost = async (postId: string) => {
    if (!user || !userPrivate) return;
    const exists = userPrivate.savedPostIds.includes(postId);
    const next = exists
      ? userPrivate.savedPostIds.filter((id) => id !== postId)
      : [postId, ...userPrivate.savedPostIds].slice(0, BLUEPRINT_LIMITS.SAVED_MAX);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        savedPostIds: next,
        updatedAt: serverTimestamp(),
      });
      showToast(exists ? 'تمت الإزالة من المحفوظات.' : 'تم حفظ المشاركة في مكتبتك.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleAddReply = async (post: CommunityPost, body: string) => {
    if (!user) return;
    const replyId = makeSafeId('rep');
    const batch = writeBatch(db);
    batch.set(doc(db, 'posts', post.id, 'replies', replyId), {
      id: replyId,
      postId: post.id,
      authorId: user.uid,
      authorName: currentName,
      authorRole: currentRole,
      body,
      isVerifiedAnswer: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'posts', post.id), {
      repliesCount: post.repliesCount + 1,
      updatedAt: serverTimestamp(),
    });
    if (myMember) {
      batch.update(doc(db, 'members', user.uid), {
        points: myMember.points + 15,
        answersCount: myMember.answersCount + 1,
        updatedAt: serverTimestamp(),
      });
    }
    try {
      await batch.commit();
      showToast('تمت إضافة إجابتك (+15 نقطة).');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `posts/${post.id}/replies/${replyId}`);
    }
  };

  const handleVerifyReply = async (post: CommunityPost, reply: PostReply) => {
    const batch = writeBatch(db);
    batch.update(doc(db, 'posts', post.id, 'replies', reply.id), {
      isVerifiedAnswer: true,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'posts', post.id), {
      status: 'resolved',
      updatedAt: serverTimestamp(),
    });
    try {
      await batch.commit();
      showToast('تم اعتماد الإجابة كحل علمي موثّق.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${post.id}/replies/${reply.id}`);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deleteDoc(doc(db, 'posts', postId));
      showToast('تم حذف المشاركة.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
    }
  };

  const handleDeleteReply = async (postId: string, replyId: string) => {
    try {
      await deleteDoc(doc(db, 'posts', postId, 'replies', replyId));
      showToast('تم حذف التعليق.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}/replies/${replyId}`);
    }
  };

  const handleCreateQuiz = async (payload: {
    subject: SubjectKey;
    title: string;
    description: string;
    questions: QuizQuestion[];
  }) => {
    if (!user) return;
    const quizId = makeSafeId('quiz');
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'quizzes', quizId), {
        id: quizId,
        authorId: user.uid,
        authorName: currentName,
        subject: payload.subject,
        title: payload.title,
        description: payload.description,
        questions: payload.questions,
        attemptsCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (myMember) {
        batch.update(doc(db, 'members', user.uid), {
          points: myMember.points + 20,
          answersCount: myMember.answersCount,
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      showToast('تم نشر الاختبار التفاعلي للطلاب.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `quizzes/${quizId}`);
    }
  };

  const handleCompleteQuiz = async (quiz: AcademicQuiz) => {
    if (!user) return;
    const batch = writeBatch(db);
    batch.update(doc(db, 'quizzes', quiz.id), {
      attemptsCount: quiz.attemptsCount + 1,
      updatedAt: serverTimestamp(),
    });
    if (myMember) {
      batch.update(doc(db, 'members', user.uid), {
        points: myMember.points + 15,
        answersCount: myMember.answersCount,
        updatedAt: serverTimestamp(),
      });
    }
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `quizzes/${quiz.id}`);
    }
  };

  const handleCreateSession = async (payload: {
    subject: SubjectKey;
    title: string;
    description: string;
    scheduledAt: string;
    durationMinutes: number;
    meetingLink: string;
  }) => {
    if (!user) return;
    const sessionId = makeSafeId('sess');
    try {
      await setSessionDoc(sessionId, payload);
      showToast('تمت جدولة الجلسة الدراسية بنجاح.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `sessions/${sessionId}`);
    }
  };

  const setSessionDoc = async (
    sessionId: string,
    payload: {
      subject: SubjectKey;
      title: string;
      description: string;
      scheduledAt: string;
      durationMinutes: number;
      meetingLink: string;
    }
  ) => {
    if (!user) return;
    const batch = writeBatch(db);
    batch.set(doc(db, 'sessions', sessionId), {
      id: sessionId,
      hostId: user.uid,
      hostName: currentName,
      hostRole: currentRole,
      subject: payload.subject,
      title: payload.title,
      description: payload.description,
      scheduledAt: payload.scheduledAt,
      durationMinutes: payload.durationMinutes,
      meetingLink: payload.meetingLink,
      status: 'upcoming',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteDoc(doc(db, 'sessions', sessionId));
      showToast('تم حذف الجلسة.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `sessions/${sessionId}`);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const cleanName = editName.trim().slice(0, BLUEPRINT_LIMITS.NAME_MAX) || currentName;
    const cleanSpec = editSpecialty.trim().slice(0, BLUEPRINT_LIMITS.NAME_MAX) || 'علوم عامة';
    const cleanInst = editInstitution.trim().slice(0, BLUEPRINT_LIMITS.INSTITUTION_MAX);

    setSavingProfile(true);
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', user.uid), {
      displayName: cleanName,
      role: editRole,
      specialty: cleanSpec,
      institution: cleanInst,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'members', user.uid), {
      displayName: cleanName,
      role: editRole,
      specialty: cleanSpec,
      institution: cleanInst,
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
      showToast('تم تحديث ملفك الأكاديمي.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `members/${user.uid}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (selectedSubject !== 'all' && p.subject !== selectedSubject) return false;
      if (postFilter === 'question' && p.postType !== 'question') return false;
      if (postFilter === 'resource' && p.postType !== 'resource') return false;
      if (postFilter === 'resolved' && p.status !== 'resolved') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.body.toLowerCase().includes(q) ||
          p.authorName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [posts, selectedSubject, postFilter, searchQuery]);

  const activeThreadPost = useMemo(
    () => posts.find((p) => p.id === activeThreadPostId) || null,
    [posts, activeThreadPostId]
  );

  const savedPosts = useMemo(() => {
    const ids = userPrivate?.savedPostIds || [];
    return posts.filter((p) => ids.includes(p.id));
  }, [posts, userPrivate]);

  const timerDisplay = `${String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:${String(
    timerSeconds % 60
  ).padStart(2, '0')}`;

  if (!authReady) {
    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center bg-[#F6F7FB] dark:bg-[#0B0F17] text-slate-500 text-sm"
      >
        جاري التحميل...
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthGate onSignIn={handleSignIn} authError={authError} />
        <OfflineIndicator />
      </>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#F6F7FB] dark:bg-[#0B0F17] pb-24 md:pb-12">
      {/* Top Bar Contract: 3 zones */}
      <header className="sticky top-0 z-30 h-14 bg-white/95 dark:bg-[#121824]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <img src="/icon.svg" alt="مِنبَر" className="w-7 h-7 rounded-lg shrink-0" />
            <span className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              مِنبَر
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
            {[
              { key: 'feed' as NavTab, label: 'الساحة الأكاديمية' },
              { key: 'quizzes' as NavTab, label: 'الاختبارات' },
              { key: 'sessions' as NavTab, label: 'حلقات المذاكرة' },
              { key: 'profile' as NavTab, label: 'المكتبة وحسابي' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === item.key
                    ? 'border-blue-800 dark:border-blue-400 text-slate-900 dark:text-white font-semibold'
                    : 'border-transparent hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowComposer(true)}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-blue-900 dark:bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 dark:hover:bg-blue-600 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>مشاركة أو سؤال</span>
            </button>
          </div>
        </div>
      </header>

      {toast && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3">
          <div className="rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 px-4 py-2.5 text-xs font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toast}</span>
          </div>
        </div>
      )}

      {/* Main 3-Column Global Community Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Navigation & Study Tools Rail */}
        <aside className="hidden lg:block lg:col-span-3 space-y-5 sticky top-20">
          {/* User Card */}
          <div className="rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-display text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                  {currentName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {currentRole === 'teacher' ? 'معلم' : 'طالب'} · {currentSpecialty}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="text-xs font-semibold text-blue-800 dark:text-blue-400 hover:underline whitespace-nowrap cursor-pointer"
              >
                تعديل
              </button>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-lg font-bold tabular-nums text-blue-900 dark:text-blue-400">
                  {myMember?.points ?? 10}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">نقطة علمية</p>
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {myMember?.answersCount ?? 0}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">إجابة ومشاركة</p>
              </div>
            </div>
          </div>

          {/* Subject Channels */}
          <div className="rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-slate-800 p-4 space-y-1.5">
            <p className="px-2 pb-1 text-xs font-bold text-slate-500 dark:text-slate-400">
              قنوات المواد والتخصصات
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedSubject('all');
                setActiveTab('feed');
              }}
              className={`w-full min-h-[40px] px-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                selectedSubject === 'all'
                  ? 'bg-blue-900 dark:bg-blue-700 text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>جميع التخصصات</span>
              <span className="tabular-nums opacity-80">{posts.length}</span>
            </button>
            {SUBJECTS.map((s) => {
              const count = posts.filter((p) => p.subject === s.key).length;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    setSelectedSubject(s.key);
                    setActiveTab('feed');
                  }}
                  className={`w-full min-h-[40px] px-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                    selectedSubject === s.key
                      ? 'bg-blue-900 dark:bg-blue-700 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{s.label}</span>
                  <span className="tabular-nums opacity-80">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Study Focus Pomodoro Timer */}
          <div className="rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>مؤقت التركيز الدراسي</span>
              </span>
              <span className="font-mono text-base font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {timerDisplay}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTimerRunning(!timerRunning)}
                className="flex-1 min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
              >
                {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{timerRunning ? 'إيقاف' : 'بدء 25 د'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimerRunning(false);
                  setTimerSeconds(25 * 60);
                }}
                aria-label="إعادة ضبط المؤقت"
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* Center Main Content Area */}
        <section className="lg:col-span-9 xl:col-span-6 space-y-5">
          {/* FEED TAB */}
          {activeTab === 'feed' && (
            <>
              {/* Mobile Subject Filter Strip */}
              <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedSubject('all')}
                  className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedSubject === 'all'
                      ? 'bg-blue-900 text-white'
                      : 'bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  كل المواد
                </button>
                {SUBJECTS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSelectedSubject(s.key)}
                    className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedSubject === s.key
                        ? 'bg-blue-900 text-white'
                        : 'bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Search & Filter Controls */}
              <div className="rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث في الأسئلة، الملخصات، أو أسماء المعلمين..."
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 pr-10 pl-3.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                    {[
                      { key: 'all', label: 'الكل' },
                      { key: 'question', label: 'أسئلة' },
                      { key: 'resource', label: 'ملخصات' },
                      { key: 'resolved', label: 'مُجابة' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() =>
                          setPostFilter(tab.key as 'all' | 'question' | 'resource' | 'resolved')
                        }
                        className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          postFilter === tab.key
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {filteredPosts.length} مشاركة
                  </span>
                </div>
              </div>

              {/* Community Feed */}
              {filteredPosts.length === 0 ? (
                <div className="rounded-2xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 p-8 text-center space-y-4">
                  <BookOpen className="w-10 h-10 mx-auto text-blue-800 dark:text-blue-400" />
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                    الساحة جاهزة لأول سؤال أو ملخص علمي
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    انشر سؤالاً في مادة دراسية أو شارك ملخصاً ليستفيد منه الطلاب والمعلمون في المجتمع.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowComposer(true)}
                    className="min-h-[44px] rounded-xl bg-blue-900 dark:bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 cursor-pointer"
                  >
                    اكتب أول مشاركة الآن
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPosts.map((post) => {
                    const voted = !!votedPostIds[post.id];
                    const saved = userPrivate?.savedPostIds.includes(post.id) ?? false;
                    return (
                      <article
                        key={post.id}
                        className="rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-slate-800 p-5 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                      >
                        {/* Clean unboxed metadata with typographic separators */}
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="truncate">
                            {post.authorName} ·{' '}
                            <strong
                              className={
                                post.authorRole === 'teacher'
                                  ? 'text-blue-800 dark:text-blue-400 font-semibold'
                                  : 'font-medium'
                              }
                            >
                              {post.authorRole === 'teacher' ? 'معلم' : 'طالب'}
                            </strong>{' '}
                            · {getSubjectLabel(post.subject)} · {getPostTypeLabel(post.postType)}
                          </span>
                          {post.status === 'resolved' && (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>موثّقة</span>
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveThreadPostId(post.id)}
                          className="w-full text-right space-y-2 cursor-pointer group"
                        >
                          <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-800 dark:group-hover:text-blue-400 transition-colors">
                            {post.title}
                          </h2>
                          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                            {post.body}
                          </p>
                        </button>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleVote(post)}
                              className={`min-h-[38px] px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                                voted
                                  ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                              <span className="tabular-nums">{post.votesCount}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setActiveThreadPostId(post.id)}
                              className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span className="tabular-nums">{post.repliesCount} إجابة</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleSavePost(post.id)}
                            aria-label="حفظ المشاركة"
                            className={`min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                              saved
                                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                                : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                          >
                            <Bookmark className="w-4 h-4" />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* QUIZZES TAB */}
          {activeTab === 'quizzes' && (
            <div className="space-y-5">
              <div className="rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-slate-800 overflow-hidden grid grid-cols-1 sm:grid-cols-12 items-stretch">
                <div className="sm:col-span-7 p-6 flex flex-col justify-center space-y-3">
                  <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                    التحديات والاختبارات التفاعلية
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    اختبر مستواك عبر أسئلة سريعة يعدها المعلمون مع تصحيح فوري وشرح تفصيلي لكل إجابة.
                  </p>
                  {currentRole === 'teacher' ? (
                    <button
                      type="button"
                      onClick={() => setShowQuizBuilder(true)}
                      className="self-start min-h-[42px] inline-flex items-center gap-1.5 rounded-xl bg-blue-900 dark:bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إنشاء اختبار جديد</span>
                    </button>
                  ) : (
                    <p className="text-xs text-blue-800 dark:text-blue-400 font-semibold">
                      يمكن للمعلمين نشر الاختبارات (يمكنك تغيير صفتك إلى معلم من صفحة حسابي).
                    </p>
                  )}
                </div>
                <div className="sm:col-span-5 min-h-[150px] bg-slate-100 dark:bg-slate-800">
                  <img
                    src="/src/assets/images/minbar_science_notebook_1795449252722.jpg"
                    alt="دفتر ملاحظات علمي وأدوات هندسية"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {quizzes.length === 0 ? (
                <div className="rounded-2xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
                  <Sparkles className="w-9 h-9 mx-auto text-blue-700 dark:text-blue-400" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    لا توجد اختبارات منشورة حالياً.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {quizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-slate-800 p-5 flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {getSubjectLabel(quiz.subject)} · {quiz.questions.length} أسئلة ·{' '}
                          <span className="tabular-nums">{quiz.attemptsCount} محاولة</span>
                        </p>
                        <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                          {quiz.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          إعداد المعلم: {quiz.authorName}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveQuiz(quiz)}
                        className="w-full min-h-[42px] rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 cursor-pointer"
                      >
                        ابدأ الاختبار الآن
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STUDY SESSIONS TAB */}
          {activeTab === 'sessions' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                    حلقات المذاكرة والساعات المكتبية
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    انضم إلى جلسات مراجعة جماعية أو ساعات أسئلة مباشرة مع المعلمين
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSessionModal(true)}
                  className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl bg-blue-900 dark:bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>جدولة جلسة</span>
                </button>
              </div>

              {sessions.length === 0 ? (
                <div className="rounded-2xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
                  <Video className="w-9 h-9 mx-auto text-blue-700 dark:text-blue-400" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    لا توجد جلسات مجدولة حالياً. بادر بإنشاء حلقة مذاكرة لمادتك!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-slate-800 p-5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {getSubjectLabel(sess.subject)} · يستضيفها {sess.hostName} (
                            {sess.hostRole === 'teacher' ? 'معلم' : 'طالب'})
                          </p>
                          <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                            {sess.title}
                          </h3>
                        </div>
                        {sess.hostId === user.uid && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSession(sess.id)}
                            aria-label="حذف الجلسة"
                            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {sess.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {sess.description}
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 tabular-nums">
                          <Calendar className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                          <span>{sess.scheduledAt.replace('T', ' · ')}</span>
                          <span>({sess.durationMinutes} دقيقة)</span>
                        </span>
                        {sess.meetingLink && (
                          <a
                            href={sess.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 font-semibold inline-flex items-center gap-1.5 hover:bg-blue-100"
                          >
                            <span>رابط الانضمام</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PROFILE, LIBRARY & ANDROID INSTALL TAB */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Academic Profile Editor */}
              <form
                onSubmit={handleSaveProfile}
                className="rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-slate-800 p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                    ملفك الأكاديمي والصفة
                  </h2>
                  <span className="text-xs text-slate-500">{user.email}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setEditRole('student')}
                    className={`min-h-[42px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                      editRole === 'student'
                        ? 'bg-white dark:bg-slate-800 text-blue-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>طالب</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRole('teacher')}
                    className={`min-h-[42px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                      editRole === 'teacher'
                        ? 'bg-white dark:bg-slate-800 text-blue-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>معلم / أستاذ</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      الاسم الظاهر في المجتمع
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={BLUEPRINT_LIMITS.NAME_MAX}
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      التخصص أو المرحلة الدراسية
                    </label>
                    <input
                      type="text"
                      value={editSpecialty}
                      onChange={(e) => setEditSpecialty(e.target.value)}
                      maxLength={BLUEPRINT_LIMITS.NAME_MAX}
                      placeholder="مثال: هندسة برمجيات، ثانوي، رياضيات"
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    الجامعة أو المدرسة (اختياري)
                  </label>
                  <input
                    type="text"
                    value={editInstitution}
                    onChange={(e) => setEditInstitution(e.target.value)}
                    maxLength={BLUEPRINT_LIMITS.INSTITUTION_MAX}
                    placeholder="مثال: جامعة الملك سعود / مدرسة ثانوية"
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full min-h-[44px] rounded-xl bg-blue-900 dark:bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 cursor-pointer"
                >
                  {savingProfile ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
              </form>

              {/* Saved Bookmarks Library */}
              <div className="rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  مكتبتك المحفوظة ({savedPosts.length})
                </h2>
                {savedPosts.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    احفظ أي سؤال أو ملخص بالضغط على علامة الحفظ للرجوع إليه وقت المذاكرة.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {savedPosts.map((sp) => (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => setActiveThreadPostId(sp.id)}
                        className="w-full py-3 text-right flex items-center justify-between gap-3 hover:opacity-80 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {sp.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {getSubjectLabel(sp.subject)} · {sp.authorName}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-blue-800 dark:text-blue-400 shrink-0">
                          فتح
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Android PWA Install + Theme & Logout */}
              <div className="rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <img
                    src="/pwa-192x192.png"
                    alt="شعار مِنبَر"
                    className="w-12 h-12 rounded-2xl shrink-0"
                  />
                  <div>
                    <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                      تثبيت مِنبَر على جوال الأندرويد
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      ثبّت التطبيق على شاشة جوالك للوصول الفوري وتنزيل الملخصات.
                    </p>
                  </div>
                </div>
                <PWAInstallButton variant="full" />
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDarkMode(!darkMode)}
                    className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    <span>{darkMode ? 'المظهر النهاري' : 'المظهر الليلي'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => signOut(auth)}
                    className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-semibold cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Right Contextual Rail (Leaderboard & Upcoming Sessions) */}
        <aside className="hidden xl:block xl:col-span-3 space-y-5 sticky top-20">
          <div className="rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                المساهمون الأبرز في المجتمع
              </h2>
            </div>
            {members.length === 0 ? (
              <p className="text-xs text-slate-500">لا يوجد أعضاء مسجلون بعد.</p>
            ) : (
              <div className="space-y-3">
                {members.slice(0, 6).map((m, idx) => (
                  <div key={m.uid} className="flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {idx + 1}. {m.displayName}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {m.role === 'teacher' ? 'معلم' : 'طالب'} · {m.specialty}
                      </p>
                    </div>
                    <span className="font-bold tabular-nums text-blue-900 dark:text-blue-400 shrink-0">
                      {m.points} نقطة
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <span>جلسات قادمة</span>
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab('sessions')}
                className="text-xs font-semibold text-blue-800 dark:text-blue-400 hover:underline cursor-pointer"
              >
                عرض الكل
              </button>
            </div>
            {sessions.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                لا توجد جلسات مجدولة حالياً.
              </p>
            ) : (
              <div className="space-y-2.5">
                {sessions.slice(0, 3).map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 p-3"
                  >
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {s.title}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                      {s.hostName} · {s.scheduledAt.replace('T', ' ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <PWAInstallButton variant="full" />
        </aside>
      </main>

      {/* Mobile Fixed Thumb-Zone Bottom Navigation Bar */}
      <nav
        aria-label="التنقل السريع"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#121824]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800"
      >
        <div className="grid grid-cols-4 items-center h-16 pb-safe">
          {[
            { key: 'feed' as NavTab, label: 'الساحة', Icon: Home },
            { key: 'quizzes' as NavTab, label: 'الاختبارات', Icon: Sparkles },
            { key: 'sessions' as NavTab, label: 'الحلقات', Icon: Video },
            { key: 'profile' as NavTab, label: 'حسابي', Icon: GraduationCap },
          ].map(({ key, label, Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                  active
                    ? 'text-blue-900 dark:text-blue-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] whitespace-nowrap">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals */}
      <PostComposerModal
        open={showComposer}
        initialSubject={selectedSubject === 'all' ? 'math' : selectedSubject}
        onClose={() => setShowComposer(false)}
        onPublish={handlePublishPost}
      />

      <PostThreadModal
        post={activeThreadPost}
        currentUid={user.uid}
        currentRole={currentRole}
        isVoted={activeThreadPost ? !!votedPostIds[activeThreadPost.id] : false}
        isSaved={
          activeThreadPost
            ? userPrivate?.savedPostIds.includes(activeThreadPost.id) ?? false
            : false
        }
        onClose={() => setActiveThreadPostId(null)}
        onToggleVote={handleToggleVote}
        onToggleSave={handleToggleSavePost}
        onAddReply={handleAddReply}
        onVerifyReply={handleVerifyReply}
        onDeletePost={handleDeletePost}
        onDeleteReply={handleDeleteReply}
      />

      <QuizBuilderModal
        open={showQuizBuilder}
        onClose={() => setShowQuizBuilder(false)}
        onSave={handleCreateQuiz}
      />

      <QuizRunnerModal
        quiz={activeQuiz}
        onClose={() => setActiveQuiz(null)}
        onComplete={handleCompleteQuiz}
      />

      <SessionModal
        open={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        onSave={handleCreateSession}
      />

      <OfflineIndicator />
    </div>
  );
}
