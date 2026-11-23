# Security Specification — Minbar Student & Teacher Community

## 1. Data Invariants
1. **Strict PII Isolation**: `/users/{userId}` holds `email` and `savedPostIds` and is strictly readable/writable ONLY by `request.auth.uid == userId` (`allow list: if false;`). Public profiles live in `/members/{memberId}` with ZERO email or contact PII.
2. **Atomic Upvote Integrity (existsAfter)**: Incrementing `posts/{postId}.votesCount` requires creating `/posts/{postId}/votes/{uid}` in the same atomic batch, and decrementing requires deleting it in the same batch.
3. **Role-Gated Teacher Authority**: Only users whose `/members/{uid}.role == 'teacher'` can publish official quizzes in `/quizzes/{quizId}` or verify another user's reply (`isVerifiedAnswer == true`) on posts they didn't author.
4. **Master Gate on Subcollections**: `/posts/{postId}/replies/{replyId}` and `/posts/{postId}/votes/{voterId}` enforce parent `/posts/{postId}` existence on creation and validate matching `postId`.
5. **Terminal State Locking**: Once a study session reaches `status == 'completed'`, updates are denied.
6. **Temporal Integrity & Strict Key Allowlists**: Every document enforces `createdAt == request.time`, `updatedAt == request.time`, `keys().hasAll(...) && keys().hasOnly(...)` on create, and `affectedKeys().hasOnly(...)` + `isValid[Entity](incoming())` on update.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **PII Scraping on /users**: Listing `/users` or getting `/users/otherUid`. Expected: `PERMISSION_DENIED`.
2. **Email Injection into /members**: Creating `/members/u1` with an unpermitted `email` key. Expected: `PERMISSION_DENIED`.
3. **Student Publishing Official Quiz**: Student (`role == 'student'`) creating `/quizzes/q1`. Expected: `PERMISSION_DENIED`.
4. **Fake Upvote Count Inflation**: Updating `/posts/p1` `votesCount` by `+100` or without creating `/posts/p1/votes/{uid}` atomically. Expected: `PERMISSION_DENIED`.
5. **Self-Verify Answer Spoof**: Student creating `/posts/p1/replies/r1` with `isVerifiedAnswer: true`. Expected: `PERMISSION_DENIED`.
6. **Unauthorized Answer Verification**: Non-author student marking another user's reply `isVerifiedAnswer: true`. Expected: `PERMISSION_DENIED`.
7. **Points Manipulation**: Updating `/members/u1` `points` by `+99999` in a single write. Expected: `PERMISSION_DENIED`.
8. **Orphaned Reply Write**: Creating `/posts/nonexistent/replies/r1`. Expected: `PERMISSION_DENIED`.
9. **Path ID Poisoning**: Creating `/posts/bad$id..chars` or >128 char ID. Expected: `PERMISSION_DENIED`.
10. **Completed Session Tampering**: Updating `/sessions/s1` when `existing().status == 'completed'`. Expected: `PERMISSION_DENIED`.
11. **Unverified Email Write**: Creating `/posts/p1` when `email_verified == false`. Expected: `PERMISSION_DENIED`.
12. **Client Timestamp Tampering**: Creating `/posts/p1` with forged `createdAt` instead of `request.time`. Expected: `PERMISSION_DENIED`.
