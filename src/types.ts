export type UserRole = 'student' | 'teacher';

export type SubjectKey =
  | 'math'
  | 'physics'
  | 'cs'
  | 'chemistry'
  | 'arabic'
  | 'english'
  | 'study';

export type PostType = 'question' | 'resource' | 'discussion';

export interface UserPrivate {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  specialty: string;
  institution: string;
  savedPostIds: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MemberPublic {
  uid: string;
  displayName: string;
  role: UserRole;
  specialty: string;
  institution: string;
  points: number;
  answersCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorSpecialty: string;
  subject: SubjectKey;
  postType: PostType;
  title: string;
  body: string;
  attachmentUrl: string;
  status: 'open' | 'resolved';
  votesCount: number;
  repliesCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PostReply {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  body: string;
  isVerifiedAnswer: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

export interface AcademicQuiz {
  id: string;
  authorId: string;
  authorName: string;
  subject: SubjectKey;
  title: string;
  description: string;
  questions: QuizQuestion[];
  attemptsCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StudySession {
  id: string;
  hostId: string;
  hostName: string;
  hostRole: UserRole;
  subject: SubjectKey;
  title: string;
  description: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingLink: string;
  status: 'upcoming' | 'live' | 'completed';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export const SUBJECTS: Array<{ key: SubjectKey; label: string; englishCode: string }> = [
  { key: 'math', label: 'الرياضيات والمنطق', englishCode: 'MATH' },
  { key: 'physics', label: 'الفيزياء والهندسة', englishCode: 'PHYS' },
  { key: 'cs', label: 'علوم الحاسب والبرمجة', englishCode: 'CS' },
  { key: 'chemistry', label: 'الكيمياء والأحياء', englishCode: 'BIO-CHEM' },
  { key: 'arabic', label: 'اللغة العربية والأدب', englishCode: 'ARAB' },
  { key: 'english', label: 'اللغات والترجمة', englishCode: 'LANG' },
  { key: 'study', label: 'مهارات البحث والمذاكرة', englishCode: 'RESEARCH' },
];

export const POST_TYPES: Array<{ key: PostType; label: string }> = [
  { key: 'question', label: 'سؤال علمي' },
  { key: 'resource', label: 'ملخص أو شرح' },
  { key: 'discussion', label: 'نقاش أكاديمي' },
];

export const BLUEPRINT_LIMITS = {
  NAME_MAX: 80,
  INSTITUTION_MAX: 100,
  TITLE_MAX: 160,
  BODY_MAX: 4000,
  REPLY_MAX: 2500,
  URL_MAX: 300,
  SAVED_MAX: 100,
  QUIZ_QUESTIONS_MAX: 10,
};

export function makeSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}_${rand}`.replace(/[^a-zA-Z0-9_\-]/g, '');
}

export function getSubjectLabel(key: SubjectKey): string {
  return SUBJECTS.find((s) => s.key === key)?.label ?? key;
}

export function getPostTypeLabel(type: PostType): string {
  return POST_TYPES.find((p) => p.key === type)?.label ?? type;
}
