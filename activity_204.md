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
  - [x] #214 - Enterprise SaaS batch
  - [x] #215 - Media/Entertainment batch
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

## 2026-01-19 - Issue #214: Content review: Enterprise SaaS batch

**Completed:**
- Reviewed all 13 Enterprise SaaS company modules
- Cleaned modules with garbage Reddit scrapes and inappropriate tech-focused content:
  - All 13 modules had "Key cultural themes" containing generic tech-interview terms like "System design emphasis", "Heavy focus on coding" instead of actual company culture
  - All 13 modules had garbage Reddit scrapes in "Common Interview Questions" (e.g., "you working this weekend to finish?", "Hmm, what else is this guy lying about?")
  - All 13 modules had garbage Reddit scrapes in "Insider Tips" (e.g., "the company can't benefit from it", "and please exclude my ignorance")
- Replaced with proper Enterprise SaaS-specific content for:
  - `company-salesforce.json` - Culture focused on Ohana, Trust, V2MOM framework, Trailhead
  - `company-servicenow.json` - Culture focused on "Make the world work better", hungry and humble
  - `company-workday.json` - Culture focused on employees first, fun at work, HCM/ERP market
  - `company-hubspot.json` - Culture focused on HEART values, inbound philosophy, Culture Code
  - `company-atlassian.json` - Culture focused on "Don't #@!% the customer", Team Playbook, open company
  - `company-docusign.json` - Culture focused on Agreement Cloud, security, digital transformation
  - `company-slack.json` - Culture focused on making work simpler, empathy, Salesforce integration
  - `company-zoom.json` - Culture focused on delivering happiness, care priorities, Eric Yuan's mission
  - `company-twilio.json` - Culture focused on "Draw the owl", developer-first, Segment acquisition
  - `company-elastic.json` - Culture focused on distributed by design, open source roots, Elastic Stack
  - `company-cloudflare.json` - Culture focused on building a better internet, edge computing, transparency
  - `company-okta.json` - Culture focused on identity, zero trust, Auth0 acquisition
  - `company-splunk.json` - Culture focused on data to everything, SIEM, Cisco acquisition

**Files Modified:**
- `data/generated/modules/company-salesforce.json`
- `data/generated/modules/company-servicenow.json`
- `data/generated/modules/company-workday.json`
- `data/generated/modules/company-hubspot.json`
- `data/generated/modules/company-atlassian.json`
- `data/generated/modules/company-docusign.json`
- `data/generated/modules/company-slack.json`
- `data/generated/modules/company-zoom.json`
- `data/generated/modules/company-twilio.json`
- `data/generated/modules/company-elastic.json`
- `data/generated/modules/company-cloudflare.json`
- `data/generated/modules/company-okta.json`
- `data/generated/modules/company-splunk.json`

**Verification:**
- All 13 JSON files valid
- `npm run lint` - passes
- `npm run build` - passes

## 2026-01-19 - Issue #215: Content review: Media/Entertainment batch

**Completed:**
- Reviewed all 5 existing Media/Entertainment company modules (Warner Bros, Sony, Take-Two, and Zynga modules do not exist in the codebase)
- Cleaned modules with garbage Reddit scrapes and inappropriate tech-focused content:
  - `company-disney.json` - Fixed "Key cultural themes" (removed generic tech terms), "Common Interview Questions" (removed nonsense questions), and "Insider Tips" (removed garbage scrapes)
  - `company-netflix.json` - Fixed "Key cultural themes" (replaced generic tech terms with Netflix-specific culture: Freedom and Responsibility, candid feedback, etc.)
  - `company-spotify.json` - Fixed "Common Interview Questions" (removed nonsense) and "Insider Tips" (replaced garbage with Squad model, music passion, etc.)
  - `company-ea.json` - Fixed "Key cultural themes", "Common Interview Questions", and "Insider Tips" (replaced with gaming-specific content)
  - `company-activision-blizzard.json` - Already clean, no changes needed

**Files Modified:**
- `data/generated/modules/company-disney.json`
- `data/generated/modules/company-netflix.json`
- `data/generated/modules/company-spotify.json`
- `data/generated/modules/company-ea.json`

**Verification:**
- All 5 JSON files valid
- `npm run lint` - passes
- `npm run build` - passes

