export const DIRTY_DOZEN_PAYLOADS = [
  { name: '01_pii_scraping_users_list', path: '/users', expected: 'PERMISSION_DENIED' },
  { name: '02_email_injection_public_member', path: '/members/u1', payload: { email: 'leak@test.com' }, expected: 'PERMISSION_DENIED' },
  { name: '03_student_creating_official_quiz', path: '/quizzes/q1', role: 'student', expected: 'PERMISSION_DENIED' },
  { name: '04_fake_upvote_count_inflation', path: '/posts/p1', payload: { votesCount: 999 }, expected: 'PERMISSION_DENIED' },
  { name: '05_self_verify_answer_on_create', path: '/posts/p1/replies/r1', payload: { isVerifiedAnswer: true }, expected: 'PERMISSION_DENIED' },
  { name: '06_non_teacher_non_author_verify_reply', path: '/posts/p1/replies/r1', operation: 'update', expected: 'PERMISSION_DENIED' },
  { name: '07_member_points_tampering', path: '/members/u1', payload: { points: 50000 }, expected: 'PERMISSION_DENIED' },
  { name: '08_orphaned_reply_write', path: '/posts/missing_post/replies/r1', expected: 'PERMISSION_DENIED' },
  { name: '09_path_id_poisoning', path: '/posts/bad$id.chars', expected: 'PERMISSION_DENIED' },
  { name: '10_completed_session_tampering', path: '/sessions/s1', existingStatus: 'completed', expected: 'PERMISSION_DENIED' },
  { name: '11_unverified_email_write', path: '/posts/p1', auth: { email_verified: false }, expected: 'PERMISSION_DENIED' },
  { name: '12_client_timestamp_tampering', path: '/posts/p1', payload: { createdAt: '2020-01-01T00:00:00Z' }, expected: 'PERMISSION_DENIED' },
];
