# Company Module Template

## Metadata

```yaml
name: "{company} Interview Prep"
moduleType: company
description: Company-specific interview preparation for {company}
companySlug: "{company-slug}"
```

---

## Sections

### 1. Company Overview

- **Required:** true
- **Block Types:** header, text, infographic
- **Estimated Word Count:** 300

Quick facts about the company including founding, size, mission, and recent news.

**Example Content:**

```
# About {Company}

Founded in {year} by {founders}, {Company} has grown to become {description of current state}. With headquarters in {location} and approximately {employee_count} employees, they operate in {industry/markets}.

**Mission:** "{company_mission}"

[Infographic: Company Timeline and Key Milestones]

**Recent Headlines:** In the past year, {Company} has {recent news summary relevant to candidates}.
```

---

### 2. Company Culture & Values

- **Required:** true
- **Block Types:** header, text, quote, video
- **Estimated Word Count:** 400

What the company values and how it affects hiring decisions.

**Example Content:**

```
# What {Company} Looks For

{Company}'s culture can be summarized in their core values:

1. **{Value 1}** - {Brief explanation of how this manifests}
2. **{Value 2}** - {Brief explanation}
3. **{Value 3}** - {Brief explanation}

> "{Quote from CEO or leadership about culture}" — {Leader Name}, {Title}

**What This Means for You:** When answering interview questions, weave in examples that demonstrate these values. Interviewers are trained to assess cultural fit alongside skills.

[Video: Day in the Life at {Company}]
```

---

### 3. Interview Process

- **Required:** true
- **Block Types:** header, text, infographic, tip, checklist
- **Estimated Word Count:** 350

The specific interview stages at this company.

**Example Content:**

```
# {Company}'s Interview Process

Based on candidate reports, here's what to expect:

1. **Recruiter Screen** (15-30 min) - Basic fit assessment
2. **Hiring Manager Call** (30-45 min) - Role-specific discussion
3. **Technical/Skill Assessment** - {Company-specific format}
4. **On-site/Virtual Loop** (3-5 hours) - Multiple interviewers
5. **Final Decision** - Usually within 1-2 weeks

[Infographic: {Company} Interview Pipeline]

**Pro Tip:** {Company} is known for {specific quirk or emphasis in their process}.

**Pre-Interview Checklist:**
- [ ] Review {Company}'s recent earnings call or blog posts
- [ ] Understand their main products/services
- [ ] Research your interviewers on LinkedIn
- [ ] Prepare {company-specific} examples
```

---

### 4. What Interviewers Really Want

- **Required:** true
- **Block Types:** header, text, tip, warning
- **Estimated Word Count:** 400

Psychology behind what {Company} interviewers are assessing.

**Example Content:**

```
# Inside the Interviewer's Mind at {Company}

{Company} interviewers are trained to evaluate specific competencies. Here's what they're really looking for:

**{Competency 1}:** They want to see {specific behavior/evidence}. When they ask about {common question type}, they're checking if you {what they're assessing}.

**{Competency 2}:** Demonstrate this by {how to show it}. Red flag if you {what to avoid}.

**Pro Tip:** {Company} places heavy emphasis on {specific trait}. Every answer should subtly reinforce this about you.

**Warning:** Avoid {specific thing that turns off {Company} interviewers}. This is a common reason strong candidates get rejected here.
```

---

### 5. Common Questions at {Company}

- **Required:** true
- **Block Types:** header, text, quiz
- **Estimated Word Count:** 500

Frequently asked interview questions specific to this company.

**Example Content:**

```
# Questions You'll Likely Face at {Company}

Based on Glassdoor reports and candidate feedback, these questions come up repeatedly:

**"Why {Company}?"**
What they're really asking: Do you understand what makes us different, and are you genuinely interested or just applying everywhere?

**"{Company-specific behavioral question}"**
What they're really asking: {Explanation of underlying assessment}

**"{Company-specific technical/case question}"**
What they're really asking: {Explanation}

[Quiz: Match the {Company} Question to What They're Really Asking]
```

---

### 6. {Company} Trivia

- **Required:** false
- **Block Types:** header, text, quiz
- **Estimated Word Count:** 200

Fun facts that demonstrate you've done your homework.

**Example Content:**

```
# Know Your {Company} Facts

Dropping these naturally in conversation shows you've done real research:

- {Founder story or origin fact}
- {Interesting product or business fact}
- {Recent achievement or milestone}
- {Unique cultural tradition}

[Quiz: {Company} Trivia Challenge]
```

---

### 7. Red Flags & Deal Breakers

- **Required:** true
- **Block Types:** header, text, warning, checklist
- **Estimated Word Count:** 250

Things that specifically get candidates rejected at this company.

**Example Content:**

```
# What Gets You Rejected at {Company}

Every company has its pet peeves. At {Company}, avoid these:

**Warning:** {Specific behavior that's an instant rejection}

**Common Rejection Reasons:**
- [ ] {Reason 1 - often company-culture specific}
- [ ] {Reason 2}
- [ ] {Reason 3}
- [ ] Not asking thoughtful questions about {Company-specific topic}
```

---

### 8. Insider Tips

- **Required:** true
- **Block Types:** header, text, tip, quote
- **Estimated Word Count:** 300

Advice from people who've been through the process.

**Example Content:**

```
# From Those Who've Been There

Advice from successful {Company} candidates and employees:

> "{Quote from successful candidate about what helped them}" — {Source}

**Pro Tip:** {Specific tactical advice that's worked for others}

**Pro Tip:** {Another insider tip}

The most consistent advice: {Summary of common themes from successful candidates}
```

---

## Data Sources

This template should be populated using:
- Glassdoor interview reviews (scraped via #4)
- Reddit discussions (r/cscareerquestions, company-specific subreddits)
- Company careers page and blog
- Recent news articles
- Wikipedia for factual information
- Company trivia (generated via #19)

## Usage Notes

- Always verify factual claims against multiple sources
- Update interview process info quarterly (companies change)
- Flag outdated information based on source dates
- Tone should match company culture (formal for finance, casual for startups)
