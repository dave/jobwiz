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
  - [x] #212 - E-commerce/Retail batch
  - [x] #213 - Healthcare/Biotech batch
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

## 2026-01-19 - Issue #212: Content review: E-commerce/Retail batch

**Completed:**
- Reviewed all 10 e-commerce/retail company modules
- Cleaned modules with garbage Reddit scrapes and inappropriate tech-focused content:
  - All 10 modules had "Key cultural themes" containing inappropriate tech-interview terms like "System design emphasis", "Heavy focus on coding", "Technical deep dive" that don't apply to retail companies
  - All 10 modules had garbage Reddit scrapes in "Common Interview Questions" and "Insider Tips" sections
- Replaced with proper retail/e-commerce-specific content for:
  - `company-walmart.json` - Culture focused on "Save Money, Live Better", servant leadership, operational excellence
  - `company-target.json` - Culture focused on guest-centric mindset, "Expect More, Pay Less", design-forward approach
  - `company-costco.json` - Culture focused on member-first philosophy, employee wellbeing, ethical practices
  - `company-home-depot.json` - Culture focused on "orange-blooded" passion, respect, entrepreneurial spirit
  - `company-best-buy.json` - Culture focused on helping customers with technology, "Be human" approach
  - `company-etsy.json` - Culture focused on keeping commerce human, supporting independent sellers
  - `company-shopify.json` - Culture focused on merchant obsession, bias for action, trust-based autonomy
  - `company-chewy.json` - Culture focused on pet parent obsession, personalized service, emotional connections
  - `company-wayfair.json` - Culture focused on data-driven decisions, customer obsession, innovation
  - `company-lululemon.json` - Culture focused on wellness, "Sweatlife" philosophy, community building

**Files Modified:**
- `data/generated/modules/company-walmart.json`
- `data/generated/modules/company-target.json`
- `data/generated/modules/company-costco.json`
- `data/generated/modules/company-home-depot.json`
- `data/generated/modules/company-best-buy.json`
- `data/generated/modules/company-etsy.json`
- `data/generated/modules/company-shopify.json`
- `data/generated/modules/company-chewy.json`
- `data/generated/modules/company-wayfair.json`
- `data/generated/modules/company-lululemon.json`

**Verification:**
- All 10 JSON files valid
- `npm run lint` - passes
- `npm run type-check` - passes
- `npm run build` - passes
- Module-related tests pass (93 tests)

## 2026-01-19 - Issue #213: Content review: Healthcare/Biotech batch

**Completed:**
- Reviewed all 9 healthcare/biotech company modules
- Cleaned modules with garbage Reddit scrapes and inappropriate tech-focused content:
  - Several modules had "Key cultural themes" containing inappropriate tech-interview terms like "Heavy focus on coding", "System design emphasis" that don't apply to healthcare companies
  - Several modules had garbage Reddit scrapes in "Common Interview Questions" and "Insider Tips" sections
- Replaced with proper healthcare/biotech-specific content for:
  - `company-jnj.json` - Already clean, no changes needed
  - `company-pfizer.json` - Fixed garbage "Insider Tips" with pharmaceutical-specific content
  - `company-moderna.json` - Already clean, no changes needed
  - `company-genentech.json` - Already clean, no changes needed
  - `company-illumina.json` - Already clean, no changes needed
  - `company-cvs-health.json` - Fixed "Key cultural themes", "Common Interview Questions", and "Insider Tips" with retail healthcare content
  - `company-unitedhealth.json` - Fixed "Key cultural themes", "Common Interview Questions", and "Insider Tips" with health insurance/Optum content
  - `company-cerner.json` - Fixed "Key cultural themes" and "Insider Tips" with EHR/Oracle Health content
  - `company-epic.json` - Fixed "Key cultural themes", "Common Interview Questions", and "Insider Tips" with Epic Systems-specific content

**Files Modified:**
- `data/generated/modules/company-pfizer.json`
- `data/generated/modules/company-cvs-health.json`
- `data/generated/modules/company-unitedhealth.json`
- `data/generated/modules/company-cerner.json`
- `data/generated/modules/company-epic.json`

**Verification:**
- All 9 JSON files valid
- `npm run lint` - passes
- `npm run type-check` - passes
- `npm run build` - passes
- Module-related tests pass (93 tests)

