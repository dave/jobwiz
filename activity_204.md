# Activity Log for Issue #204 - Module Content Cleanup

**Parent Issue:** [#204](https://github.com/dave/jobwiz/issues/204)

## Summary
Clean up generated module content to remove low-quality scraped data, placeholder video sections, and add a proper course introduction.

## Sub-issues Checklist
- [x] #205 - Remove video sections from all modules
- [x] #206 - Create course intro for universal-fundamentals
- [ ] #207 - Manual quality review of company modules
  - [x] #208 - Big Tech batch
  - [x] #209 - High-growth startups batch
  - [x] #210 - Finance batch
  - [x] #211 - Consulting batch
  - [ ] #212 - E-commerce/Retail batch
  - [ ] #213 - Healthcare/Biotech batch
  - [ ] #214 - Enterprise SaaS batch
  - [ ] #215 - Media/Entertainment batch
  - [ ] #216 - Other companies batch

---

## 2026-01-19 - Issue #210: Content review: Finance batch

**Completed:**
- Reviewed all 14 finance company modules
- Cleaned modules with garbage Reddit scrapes (replaced with proper company-specific content):
  - `company-goldman-sachs.json` - Fixed garbage "Common Interview Questions" and "Insider Tips"
  - `company-jpmorgan.json` - Fixed garbage "Common Interview Questions" and "Insider Tips"
  - `company-morgan-stanley.json` - Fixed garbage "Common Interview Questions" and "Insider Tips"
  - `company-bank-of-america.json` - Fixed garbage "Common Interview Questions" and "Insider Tips"
  - `company-citadel.json` - Fixed garbage "Insider Tips"
  - `company-jane-street.json` - Fixed garbage "Insider Tips"
  - `company-two-sigma.json` - Fixed garbage "Common Interview Questions" and "Insider Tips"
  - `company-blackrock.json` - Fixed garbage "Common Interview Questions" and "Insider Tips"
  - `company-fidelity.json` - Fixed garbage "Common Interview Questions" and "Insider Tips"
  - `company-charles-schwab.json` - Fixed garbage "Common Interview Questions" and "Insider Tips"
  - `company-mastercard.json` - Fixed garbage "Common Interview Questions" and "Insider Tips"
  - `company-visa.json` - Fixed garbage "Insider Tips"
  - `company-paypal.json` - Fixed garbage "Common Interview Questions" and "Insider Tips"
  - `company-robinhood.json` - Fixed garbage "Insider Tips"

**Files Modified:**
- `data/generated/modules/company-goldman-sachs.json`
- `data/generated/modules/company-jpmorgan.json`
- `data/generated/modules/company-morgan-stanley.json`
- `data/generated/modules/company-bank-of-america.json`
- `data/generated/modules/company-citadel.json`
- `data/generated/modules/company-jane-street.json`
- `data/generated/modules/company-two-sigma.json`
- `data/generated/modules/company-blackrock.json`
- `data/generated/modules/company-fidelity.json`
- `data/generated/modules/company-charles-schwab.json`
- `data/generated/modules/company-mastercard.json`
- `data/generated/modules/company-visa.json`
- `data/generated/modules/company-paypal.json`
- `data/generated/modules/company-robinhood.json`

**Verification:**
- All 14 JSON files valid
- `npm run lint` - passes
- `npm run type-check` - passes
- `npm run build` - passes

## 2026-01-19 - Issue #211: Content review: Consulting batch

**Completed:**
- Reviewed all 10 consulting company modules
- Cleaned modules with garbage Reddit scrapes and inappropriate tech-focused content:
  - All 10 modules had "Key cultural themes" containing inappropriate tech-interview terms like "System design emphasis", "Heavy focus on coding", "Technical deep dive" that don't apply to consulting firms
  - All 10 modules had garbage Reddit scrapes in "Common Interview Questions" and "Insider Tips" sections
- Replaced with proper consulting-specific content for:
  - `company-mckinsey.json` - Culture, questions, and tips focused on MBB consulting
  - `company-bcg.json` - Culture, questions, and tips focused on BCG-specific practices
  - `company-bain.json` - Culture, questions, and tips focused on Bain's "True North" approach
  - `company-deloitte.json` - Culture, questions, and tips focused on Big Four advisory
  - `company-ey.json` - Culture, questions, and tips focused on EY's purpose-driven mission
  - `company-kpmg.json` - Culture, questions, and tips focused on KPMG's values
  - `company-pwc.json` - Culture, questions, and tips focused on PwC's "New Equation" strategy
  - `company-accenture.json` - Culture, questions, and tips focused on tech/digital consulting
  - `company-booz-allen.json` - Culture, questions, and tips focused on government/defense consulting
  - `company-capgemini.json` - Culture, questions, and tips focused on European heritage and IT services

**Files Modified:**
- `data/generated/modules/company-mckinsey.json`
- `data/generated/modules/company-bcg.json`
- `data/generated/modules/company-bain.json`
- `data/generated/modules/company-deloitte.json`
- `data/generated/modules/company-ey.json`
- `data/generated/modules/company-kpmg.json`
- `data/generated/modules/company-pwc.json`
- `data/generated/modules/company-accenture.json`
- `data/generated/modules/company-booz-allen.json`
- `data/generated/modules/company-capgemini.json`

**Verification:**
- All 10 JSON files valid
- `npm run lint` - passes
- `npm run type-check` - passes
- `npm run build` - passes

