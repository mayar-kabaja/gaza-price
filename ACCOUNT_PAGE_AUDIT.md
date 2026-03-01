# Profile (Account) Page Audit

## Features List

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | **Header: Avatar + display name** | ✅ Works | Shows first letter or "م". Uses display_handle or "مساهم [trust_level]" |
| 2 | **Header: Session ID + joined date** | ✅ Works | Shows last 4 chars of anon_session_id + joined_at |
| 3 | **Stats: نقطة ثقة (trust score)** | ⚠️ Backend returns 0 | Backend `formatMeProfile` hardcodes `trust_score_total: 0` |
| 4 | **Stats: تأكيد قدّمته (confirmations)** | ✅ Works | From contributor.confirmation_count |
| 5 | **Stats: سعر أضفته (reports)** | ✅ Works | From contributor.report_count |
| 6 | **Banned banner** | ✅ Works | Shows when contributor.is_banned |
| 7 | **Trust level section** | ✅ Works | TrustLevelBar + progress to next level |
| 8 | **مساهماتي: Empty state** | ✅ Works | When report_count=0, shows CTA to add first price |
| 9 | **مساهماتي: "عرض كل مساهماتي" link** | ✅ Works | Links to `/account/reports` — page lists user's reports with status filter |
| 10 | **Settings: منطقتي (my area)** | ✅ Works | Area picker sheet, PATCH /contributors/me |
| 11 | **Settings: اسم العرض (display handle)** | ✅ Works | Edit modal, PATCH /contributors/me |
| 12 | **Settings: الإشعارات (notifications)** | 🔜 Placeholder | Shows "قريباً" badge, not implemented |
| 13 | **Settings: حذف بياناتي (delete account)** | ✅ Works | Confirmation modal, DELETE /contributors/me, redirects to /onboarding |
| 14 | **Onboarding redirect** | ✅ Works | If onboarding_done not in localStorage, redirects to /onboarding |

## What Does NOT Work

1. ~~**`/account/reports` page**~~ – Implemented. Page at `/account/reports` with API route `/api/contributors/me/reports`.
2. **Trust score total** – Always shows 0 because backend returns `trust_score_total: 0`.

## API Coverage

| Backend endpoint | Next.js API | Frontend usage |
|-----------------|-------------|----------------|
| GET /contributors/me | ✅ /api/contributors/me | useContributorMe, useSession |
| PATCH /contributors/me | ✅ /api/contributors/me | useUpdateContributorMe |
| DELETE /contributors/me | ✅ /api/contributors/me | confirmDelete in account page |
| GET /contributors/me/reports | ✅ /api/contributors/me/reports | Account reports page |

## Recommended Fixes

1. ~~**Create `/account/reports` page**~~ – Done. Page lists user's reports with status filter (all, pending, confirmed, expired).
2. **Fix trust_score_total** – Backend should compute it (or remove the stat if not needed).
3. **Add cursor-pointer** to Settings buttons for better UX (like AppHeader area chip).
