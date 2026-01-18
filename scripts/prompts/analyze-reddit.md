# Reddit Interview Data Analysis Prompt

Analyze the scraped Reddit interview data and extract actionable insights for job seekers.

## Input

Read the exported JSON files from `/data/scraped-exports/{company}.json` for each company listed below.

## Output

For each company, create a JSON file at `/data/generated/analysis/{company}.json` with this schema:

```json
{
  "company": "company-slug",
  "common_questions": [
    "Tell me about a time you handled a difficult situation",
    "Why do you want to work at {company}?",
    "Describe a project you're proud of"
  ],
  "themes": [
    "Heavy emphasis on system design",
    "Culture fit is critical",
    "Multiple rounds of behavioral interviews",
    "Expect coding challenges"
  ],
  "interview_tips": [
    "Be prepared for 5-6 interview rounds",
    "Research the team you're applying to",
    "Practice STAR method for behavioral questions",
    "Know the company's recent products/launches"
  ],
  "red_flags": [
    "Don't badmouth previous employers",
    "Avoid being too generic in answers",
    "Don't skip the 'questions for interviewer' section"
  ],
  "process_insights": {
    "typical_rounds": "4-6 rounds",
    "timeline": "2-4 weeks",
    "format": "Mix of phone screens, technical, behavioral, and team fit"
  },
  "source_count": 47
}
```

## Analysis Guidelines

1. **common_questions**: Extract actual interview questions mentioned in posts/comments. Include both behavioral ("Tell me about a time...") and technical questions. Aim for 5-15 questions.

2. **themes**: Identify recurring patterns about the interview process, culture, or what interviewers focus on. Be specific to the company.

3. **interview_tips**: Actionable advice based on what successful candidates did or what interviewers responded well to.

4. **red_flags**: Common mistakes candidates made or things that hurt their chances.

5. **process_insights**: Practical info about interview logistics (rounds, timeline, format).

6. **source_count**: Number of posts analyzed for this company.

## Important Notes

- Focus on insights unique to each company, not generic interview advice
- Quote or paraphrase actual experiences when possible
- If data is sparse (< 5 posts), note this in the output and be conservative with claims
- Prioritize recent posts (check created_utc) as processes change
- Include role-specific insights if the data reveals patterns (e.g., "SWE interviews focus on X, PM interviews focus on Y")

## Companies to Analyze

[LIST COMPANIES HERE - e.g., google, meta, amazon, apple, microsoft]
