# Food Gedi Deployment Checklist

| Area | Check | Expected Result | Pass | Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| Hostinger Deployment | Select production Hostinger site and release branch. | Correct site and branch are active. |  |  |  |
| Environment Variables | Configure all real production secrets. | `npm run validate:prod-env` passes in production-equivalent env. |  |  |  |
| Cache Clear | Clear Hostinger/application cache after deploy. | Hosted pages serve current release. |  |  |  |
| Restart Application | Restart/redeploy application after env changes. | Runtime reads latest env values. |  |  |  |
| Deploy Latest Commit | Deploy current release branch commit. | `/api/release-info` matches release report. |  |  |  |
| Firebase Rules | Review and deploy Firestore rules. | Protected reads/writes pass; unauthorized access fails. |  |  |  |
| Firebase Indexes | Deploy required Firestore indexes. | Owner/POS/Kitchen/Admin queries run without index errors. |  |  |  |
| Firebase Authorized Domains | Add Hostinger and custom domains. | Google/Firebase auth works on hosted URLs. |  |  |  |
| SMTP Validation | Send OTP, owner credentials, order mail, outage alert. | Emails deliver and logs stay sanitized. |  |  |  |
| Razorpay Validation | Test order, verify, webhook, refund/settlement. | Payment records and statuses stay consistent. |  |  |  |
| Cloudinary Validation | Test signature, upload, image delivery. | Media uploads and renders correctly. |  |  |  |
| Google OAuth Validation | Test hosted Google sign-in. | Customer login succeeds with correct domain. |  |  |  |
| WhatsApp Validation | Test Cloud API send and webhook. | Events are recorded without secret leakage. |  |  |  |
| SMS Validation | Test selected provider. | OTP/transactional SMS succeeds. |  |  |  |
| Push Notification Validation | Test only after push implementation/provider approval. | Subscription and send flow works. |  |  |  |
| Printer Validation | Test 58mm, 80mm, A4, bill, receipt, KOT, reprint. | Physical output is readable and logged. |  |  |  |
| Browser Validation | Test Chrome, Edge/Safari, mobile, tablet, desktop. | No console errors or broken layouts. |  |  |  |
| Tablet Validation | Test POS and Kitchen tablet workflows. | Touch targets and sticky controls work. |  |  |  |
| Kitchen TV Validation | Test long-running KDS display. | Realtime, timers, sound, fullscreen work. |  |  |  |
| Rollback Plan | Keep previous deployment SHA and env backup. | Prior release can be restored quickly. |  |  |  |
| Release Verification | Run final route and workflow smoke. | Release is ready for customer traffic. |  |  |  |
