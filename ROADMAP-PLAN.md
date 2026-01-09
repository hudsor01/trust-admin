
## Roadmap (Sorted by Effort)

### Quick Wins (Hours)
- [ ] Activity log viewer UI (table exists, just need page)
- [ ] CSV export for any data table
- [ ] Admin auth gate (Better Auth already configured)
- [ ] Task due date email reminders
- [ ] Print-friendly report CSS
- [ ] Beneficiary portal: distribution history view

// TODO: Complete the implementations under the Small Effort heading and run all tests to ensure compatibility and accuracy of implementation.
### Small Effort (1-3 Days)
- [ ] PDF report generation (trust accounting summary)
- [ ] Document metadata tracking (link docs to assets without upload)
- [ ] Two-factor authentication (TOTP with Better Auth)
- [ ] Session management UI (view/revoke sessions)
- [ ] Estate settlement checklist (static checklist with completion tracking)
- [ ] Insurance renewal reminder system
- [ ] Creditor claims tracker (simple CRUD)

// TODO: Complete the implementations under the Medium Effort heading and run all tests to ensure compatibility and accuracy of implementation.
### Medium Effort (1-2 Weeks)
- [ ] **File upload** - S3/R2 storage + document viewer
- [ ] **K-1 generation** - PDF export with beneficiary tax data
- [ ] **Texas 113.152 report** - Court-ready annual accounting PDF
- [ ] Form 1041 data export (CSV/JSON for CPA import)
- [ ] Professional access roles (attorney, CPA, advisor permissions)
- [ ] Secure messaging (trustee ↔ beneficiary)
- [ ] Audit log export (PDF/CSV with filtering)
- [ ] Asset inventory report for probate filings


// TODO: Complete the implementations under the Large Effort heading and run all tests to ensure compatibility and accuracy of implementation.
### Large Effort (2-4 Weeks)
- [ ] **Plaid integration** - Bank transaction sync
- [ ] Tax basis tracking with stepped-up basis calculator
- [ ] Capital gains/loss calculator for investment sales
- [ ] Cash flow projections dashboard
- [ ] Depreciation schedules for rental properties
- [ ] Receipt OCR (scan receipts → expense entries)
- [ ] Beneficiary onboarding flow with identity verification
- [ ] Import from CSV/OFX/QFX bank files

// TODO: Complete the implementations under the Heavy Lift heading and run all tests to ensure compatibility and accuracy of implementation.
### Heavy Lift (1-2 Months)
- [ ] **Analytics dashboard** - Trust health, portfolio performance, YoY comparisons
- [ ] **Multi-trust support** - Multiple entities with consolidated reporting
- [ ] Investment account aggregation (read-only sync)
- [ ] Sub-trust creation workflow (split at triggering events)
- [ ] E-signature integration (DocuSign/HelloSign for distribution receipts)
- [ ] API access for third-party integrations

// TODO: Complete the implementations under the Major Migration heading and run all tests to ensure compatibility and accuracy of implementation.
### Major Migration (3+ Months)
- [ ] **Full tax preparation module** - Complete 1041 generation with schedules
- [ ] **Mobile app** - React Native with offline support
- [ ] Real-time collaboration (multiple admins editing)
- [ ] White-label for trust companies (multi-tenant SaaS)
- [ ] Automated transaction categorization with ML
