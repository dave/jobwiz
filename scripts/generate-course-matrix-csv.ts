#!/usr/bin/env ts-node
/**
 * Generates a CSV mapping every potential course (company × role) to
 * slide-level copy for each of the 5 master templates.
 *
 * Output: data/course-matrix.csv
 */

import * as fs from "fs";
import * as path from "path";

// ── Data ──────────────────────────────────────────────────────────────────────

const companies: { name: string; slug: string; category: string }[] = [];
const companiesData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "trends/companies.json"), "utf-8")
);
for (const cat of companiesData.categories) {
  for (const c of cat.companies) {
    companies.push({ name: c.name, slug: c.slug, category: cat.name });
  }
}

const rolesData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "trends/roles.json"), "utf-8")
);
const roles: { name: string; slug: string }[] = rolesData.roles;

// ── Template assignment ───────────────────────────────────────────────────────

type TemplateName =
  | "PM / Product / Strategy"
  | "Engineering / Technical"
  | "Design / UX / Research"
  | "Business / Operations"
  | "Consulting / Case-Based";

const roleToTemplate: Record<string, TemplateName> = {
  "Product Manager": "PM / Product / Strategy",
  "Software Engineer": "Engineering / Technical",
  "Data Scientist": "Engineering / Technical",
  "DevOps Engineer": "Engineering / Technical",
  "Engineering Manager": "Engineering / Technical",
  "Solutions Architect": "Engineering / Technical",
  "UX Designer": "Design / UX / Research",
  "Data Analyst": "Business / Operations",
  "Business Analyst": "Business / Operations",
  Consultant: "Consulting / Case-Based",
};

// ── Slide definitions per template ────────────────────────────────────────────
// Each slide: [slideNumber, title, blockType, free/premium, masterCopy]
// {C} = company name, {R} = role name

type Slide = [number, string, string, "free" | "premium", string];

const pmSlides: Slide[] = [
  [
    1,
    "Welcome",
    "hero",
    "free",
    `{C} {R} interview prep\n\nYou are not preparing for a generic interview. You are preparing for a {C} {R} interview, which means the bar, the question mix, and the decision criteria are all slightly different.\n\nThis course is built to help you understand what this interview is actually testing, how strong candidates answer, and where people usually lose points.`,
  ],
  [
    2,
    "Interview snapshot",
    "infographic",
    "free",
    `What this interview usually looks like\n\nMost {C} {R} interviews are trying to answer a few core questions:\n- Can you think clearly under ambiguity?\n- Can you make good product decisions?\n- Can you explain tradeoffs?\n- Can you work well with other people?\n- Can you turn ideas into outcomes?\n\nThe exact loop varies, but the pattern is consistent. Interviewers are looking for signals, not perfect scripts.`,
  ],
  [
    3,
    "What they screen for",
    "checklist",
    "free",
    `What interviewers are screening for\n\nAt {C}, strong {R} candidates usually show:\n- Clear structure\n- Strong product judgment\n- Thoughtful tradeoffs\n- Comfort with metrics\n- Collaborative decision-making\n\nThis is the real scoring layer underneath the questions.`,
  ],
  [
    4,
    "Core answer framework",
    "checklist",
    "free",
    `A better way to answer PM-style questions\n\nWeak candidates jump straight to ideas. Stronger candidates usually move through this sequence:\n1. Clarify the situation\n2. Define the goal\n3. Explore a few options\n4. Explain the tradeoffs\n5. Make a recommendation\n\nThis structure helps your answers sound thoughtful without sounding rehearsed.`,
  ],
  [
    5,
    "Mini drill",
    "quiz",
    "free",
    `Quick check\n\nWhich opening sounds stronger?\n\nThis is not about sounding smart quickly. It is about showing the interviewer that your thinking has structure.`,
  ],
  [
    6,
    "Paywall",
    "paywall",
    "free",
    `You've seen the shape of the interview. Now unlock the real prep path.\n\nThe premium course goes deeper into:\n- The exact {C} {R} loop\n- How to answer behavioral questions well\n- How to handle product design questions\n- How to think through metrics and tradeoffs\n- The patterns that most often lead to rejection`,
  ],
  [
    7,
    "Full loop",
    "infographic",
    "premium",
    `The full interview loop\n\nDifferent rounds test different things. A common mistake is preparing for the question format without understanding what each round is actually trying to measure.\n\nIn this course, we will map each round back to the signal behind it.`,
  ],
  [
    8,
    "Behavioral",
    "text + tip + quiz",
    "premium",
    `Behavioral questions\n\nBehavioral questions are rarely just about what happened. For {R} interviews, they are usually testing things like judgment, ownership, influence, prioritization, and how you work through ambiguity.\n\nKeep the setup short. Spend most of your time on what you did, why you chose that path, and what changed because of it.\n\nTip: If your answer spends too long on background, you are probably hiding the strongest part.`,
  ],
  [
    9,
    "Product design",
    "checklist + warning + quiz",
    "premium",
    `Product design questions\n\nInterviewers are not looking for a flood of features. They want to see whether you can define the user, frame the problem, prioritize thoughtfully, and explain tradeoffs.\n\nA strong pattern is:\n- Choose a user segment\n- Define the problem\n- Set a goal\n- Generate focused options\n- Prioritize clearly\n- Explain how success would be measured\n\nWatch out: If you list five ideas before naming the user or the goal, your answer is probably moving too fast.`,
  ],
  [
    10,
    "Metrics / analytics",
    "infographic + quiz",
    "premium",
    `Metrics and analytical questions\n\nStrong candidates do more than name a KPI. They explain:\n- What outcome matters\n- Which metric best reflects it\n- What guardrails matter\n- Where the tradeoffs might appear\n- How they would investigate changes\n\nInterviewers want evidence that you understand product behavior, not just dashboards.`,
  ],
  [
    11,
    "Strategy / prioritization",
    "text + checklist",
    "premium",
    `Strategy and prioritization\n\nThese questions reveal how you make decisions when there is no perfect answer.\n\nA strong answer usually connects:\n- User value\n- Business impact\n- Effort\n- Risk\n- Timing\n\nWeak candidates sound energetic. Strong candidates sound decisive.`,
  ],
  [
    12,
    "Company-fit / collaboration",
    "quote + text",
    "premium",
    `How to sound right for {C}\n\nThis is where company context matters. At {C}, the same answer can feel stronger or weaker depending on how well it reflects the company's style, values, and decision-making culture.\n\nYou are not trying to imitate the company. You are trying to show that you would operate well inside it.`,
  ],
  [
    13,
    "Failure patterns",
    "warning",
    "premium",
    `The patterns that usually hurt candidates\n\nMost candidates do not fail because they lack ideas. They fail because:\n- Their thinking is hard to follow\n- Their tradeoffs are weak\n- Their examples lack evidence\n- Their answers drift\n- They never quite land the point\n\nThese are repairable problems, but only if you can see them clearly.`,
  ],
  [
    14,
    "Final prep sprint",
    "checklist",
    "premium",
    `Your final prep sprint\n\nIn the last 48 hours before the interview:\n- Rehearse your strongest behavioral stories\n- Practice a few realistic prompts out loud\n- Review {C}'s products, priorities, and language\n- Prepare thoughtful questions for the interviewer\n- Simplify, do not cram\n\nAt this point, the goal is fluency and calm. Not more content.`,
  ],
];

const engSlides: Slide[] = [
  [
    1,
    "Welcome",
    "hero",
    "free",
    `{C} {R} interview prep\n\nThis course is built for the real shape of a {C} {R} interview. Not just coding practice. Not just generic advice.\n\nThe goal is to help you understand what each part of the interview is testing, how strong candidates communicate their thinking, and where technical candidates most often lose points.`,
  ],
  [
    2,
    "Interview snapshot",
    "infographic",
    "free",
    `What this interview usually looks like\n\nMost technical interviews are trying to measure some combination of:\n- Problem solving\n- Communication\n- Correctness\n- Judgment\n- Depth\n- Tradeoff thinking\n\nThe exact loop changes by company, but strong candidates usually make their reasoning visible from the beginning.`,
  ],
  [
    3,
    "What they screen for",
    "checklist",
    "free",
    `What interviewers are screening for\n\nAt {C}, strong {R} candidates typically show:\n- Clear problem-solving structure\n- Strong coding fundamentals\n- Careful handling of constraints and edge cases\n- Sound technical judgment\n- Calm communication under pressure`,
  ],
  [
    4,
    "Core technical answer framework",
    "checklist",
    "free",
    `A better way to approach technical questions\n\nA strong pattern is:\n1. Clarify the problem\n2. State your approach\n3. Solve clearly\n4. Test your solution\n5. Reflect on tradeoffs\n\nThis helps interviewers trust both your thinking and your code.`,
  ],
  [
    5,
    "Mini drill",
    "quiz",
    "free",
    `Quick check\n\nWhen a problem is ambiguous, the strongest move is usually not speed. It is clarity.`,
  ],
  [
    6,
    "Paywall",
    "paywall",
    "free",
    `Unlock the full technical prep path\n\nThe premium course goes deeper into:\n- The full {C} {R} loop\n- Coding expectations\n- Debugging style\n- System design or architecture thinking\n- Technical depth and project discussion\n- The patterns that most often hurt candidates`,
  ],
  [
    7,
    "Full loop",
    "infographic",
    "premium",
    `The full interview loop\n\nDifferent rounds test different things. If you prepare only for algorithm questions, you can still underperform because of communication, debugging, design, or technical depth.`,
  ],
  [
    8,
    "Behavioral",
    "text + tip + quiz",
    "premium",
    `Behavioral questions for technical roles\n\nBehavioral rounds are often where companies test ownership, teamwork, resilience, and communication. Do not treat them as a side quest.\n\nFor many candidates, this is where the interviewer decides whether they would actually want to work with you.`,
  ],
  [
    9,
    "Coding",
    "checklist + warning + quiz",
    "premium",
    `Coding interviews\n\nStrong candidates usually do four things well:\n- They clarify before coding\n- They describe the plan\n- They write cleanly\n- They test thoughtfully\n\nA correct solution helps. A correct solution that is easy to follow helps even more.\n\nWatch out: If the interviewer has to infer your reasoning, you are making the round harder than it needs to be.`,
  ],
  [
    10,
    "Debugging",
    "text + quiz",
    "premium",
    `Debugging interviews\n\nThese rounds are less about heroics and more about method. Interviewers want to see whether you can:\n- Isolate the issue\n- Form useful hypotheses\n- Test them systematically\n- Recover without spiraling\n\nRandom fixes create noise. Good debugging creates confidence.`,
  ],
  [
    11,
    "System design",
    "infographic + checklist",
    "premium",
    `System design\n\nA good design answer does not begin with architecture diagrams. It begins with requirements, constraints, and tradeoffs.\n\nStrong candidates:\n- Clarify the problem\n- Define scale and constraints\n- Propose a sensible design\n- Explain tradeoffs clearly\n- Evolve the design as needed`,
  ],
  [
    12,
    "Project deep dive / technical fit",
    "text",
    "premium",
    `Project deep dive\n\nWhen you talk about past work, do not just describe what the team built. Show:\n- What the real problem was\n- What decisions mattered\n- What constraints shaped the solution\n- What your role actually was\n- What you learned\n\nThis is where depth becomes visible.`,
  ],
  [
    13,
    "Failure patterns",
    "warning",
    "premium",
    `The patterns that usually hurt technical candidates\n\nCommon issues include:\n- Solving before clarifying\n- Silent coding\n- Weak testing\n- Shallow tradeoff discussion\n- Overclaiming ownership\n- Messy explanations under pressure`,
  ],
  [
    14,
    "Final prep sprint",
    "checklist",
    "premium",
    `Your final prep sprint\n\nBefore the interview:\n- Practice a few representative questions out loud\n- Rehearse how you clarify before coding\n- Review one or two strong project stories\n- Refresh design fundamentals if relevant\n- Focus on clarity, not volume`,
  ],
];

const designSlides: Slide[] = [
  [
    1,
    "Welcome",
    "hero",
    "free",
    `{C} {R} interview prep\n\nDesign interviews are not just about taste. This course is built to help you show decision quality, user understanding, collaboration, and the thinking behind your work.`,
  ],
  [
    2,
    "Interview snapshot",
    "infographic",
    "free",
    `What this interview usually looks like\n\nMost design interviews test some combination of:\n- Portfolio communication\n- Product thinking\n- Critique ability\n- Collaboration\n- Craft judgment\n- Reasoning under feedback\n\nThe strongest candidates make their process legible.`,
  ],
  [
    3,
    "What they screen for",
    "checklist",
    "free",
    `What interviewers are screening for\n\nAt {C}, strong {R} candidates usually show:\n- Strong user-centered reasoning\n- Clear design rationale\n- Thoughtful prioritization\n- Cross-functional collaboration\n- The ability to explain tradeoffs without sounding defensive`,
  ],
  [
    4,
    "Core answer framework",
    "checklist",
    "free",
    `A better way to talk about design decisions\n\nA strong pattern is:\n1. Explain the context\n2. Define the user need\n3. Show the options you explored\n4. Explain the tradeoff\n5. Connect to the outcome or learning\n\nThis helps your work sound thoughtful, not just polished.`,
  ],
  [
    5,
    "Mini drill",
    "quiz",
    "free",
    `Quick check\n\nThe strongest critique answers usually do not start with visual taste. They start with users, goals, friction, and priority.`,
  ],
  [
    6,
    "Paywall",
    "paywall",
    "free",
    `Unlock the full design prep path\n\nThe premium course goes deeper into:\n- The full {C} {R} loop\n- Portfolio walkthrough coaching\n- Critique and product thinking drills\n- Collaboration and feedback signals\n- The patterns that most often weaken candidates`,
  ],
  [
    7,
    "Full loop",
    "infographic",
    "premium",
    `The full interview loop\n\nDifferent rounds reveal different parts of your design bar. A polished portfolio is not enough if your critique is weak. Strong craft is not enough if your reasoning is hard to follow.`,
  ],
  [
    8,
    "Behavioral",
    "text + tip + quiz",
    "premium",
    `Behavioral questions\n\nBehavioral questions often reveal how you handle feedback, disagreement, ambiguity, and cross-functional work. For design roles, these answers should show both judgment and collaboration.`,
  ],
  [
    9,
    "Portfolio walkthrough",
    "text + checklist",
    "premium",
    `Portfolio walkthroughs\n\nDo not just narrate the project. Use your walkthrough to show:\n- What problem mattered\n- What constraints shaped the work\n- What options you considered\n- Why you chose the direction you did\n- What changed as a result\n\nStrong walkthroughs feel selective and intentional.`,
  ],
  [
    10,
    "Product critique",
    "checklist + quiz",
    "premium",
    `Product critique\n\nThese questions are not asking whether you "like" the product. They are asking whether you can:\n- Identify the user\n- Infer the likely goal\n- Spot friction\n- Prioritize improvements\n- Explain why your recommendations matter`,
  ],
  [
    11,
    "Collaboration / stakeholder management",
    "text",
    "premium",
    `Collaboration and stakeholder management\n\nStrong design candidates can explain how they worked with PMs, engineers, researchers, writers, or leadership without sounding passive.\n\nInterviewers want evidence that you can advocate for users while still moving the work forward.`,
  ],
  [
    12,
    "Craft / systems / research thinking",
    "text",
    "premium",
    `How depth shows up\n\nDepending on the role, this section may focus more on:\n- Visual craft\n- Interaction quality\n- Design systems\n- Research interpretation\n- Experimentation\n- Scaling decisions\n\nThe goal is not to sound broad. It is to sound grounded.`,
  ],
  [
    13,
    "Failure patterns",
    "warning",
    "premium",
    `The patterns that usually hurt design candidates\n\nCommon issues include:\n- Too much storytelling, not enough decision-making\n- Polished work with weak rationale\n- Critique based on taste\n- Vague collaboration stories\n- Weak prioritization\n- Defensiveness around tradeoffs`,
  ],
  [
    14,
    "Final prep sprint",
    "checklist",
    "premium",
    `Your final prep sprint\n\nBefore the interview:\n- Tighten your strongest project stories\n- Rehearse one or two clean critique structures\n- Prepare examples of feedback and collaboration\n- Review {C}'s product language and priorities\n- Simplify your explanations\n\nAt this stage, clarity beats volume.`,
  ],
];

const bizSlides: Slide[] = [
  [
    1,
    "Welcome",
    "hero",
    "free",
    `{C} {R} interview prep\n\nThis course is built to help you prepare for the real shape of a {C} {R} interview. The goal is to show how strong candidates think, decide, communicate, and operate, not just how they answer standard questions.`,
  ],
  [
    2,
    "Interview snapshot",
    "infographic",
    "free",
    `What this interview usually looks like\n\nFor business and operations roles, companies are often looking for some mix of:\n- Structured thinking\n- Execution discipline\n- Stakeholder management\n- Business judgment\n- Prioritization\n- Communication\n\nThe exact title changes. The core signals are often surprisingly consistent.`,
  ],
  [
    3,
    "What they screen for",
    "checklist",
    "free",
    `What interviewers are screening for\n\nAt {C}, strong {R} candidates usually show:\n- Clear and practical thinking\n- Good judgment under tradeoffs\n- Strong cross-functional communication\n- Comfort with goals and metrics\n- The ability to move work forward`,
  ],
  [
    4,
    "Core answer framework",
    "checklist",
    "free",
    `A better way to answer business-role questions\n\nA strong pattern is:\n1. Define the objective\n2. Understand the constraints\n3. Identify the main options\n4. Explain the tradeoffs\n5. Recommend a path\n\nThis helps your answers sound operational, not abstract.`,
  ],
  [
    5,
    "Mini drill",
    "quiz",
    "free",
    `Quick check\n\nThe strongest answers usually connect action to outcome. Not just what you did, but why it mattered.`,
  ],
  [
    6,
    "Paywall",
    "paywall",
    "free",
    `Unlock the full prep path\n\nThe premium course goes deeper into:\n- The full {C} {R} interview loop\n- Execution and planning questions\n- Stakeholder and cross-functional scenarios\n- Business judgment and metrics\n- The patterns that most often weaken candidates`,
  ],
  [
    7,
    "Full loop",
    "infographic",
    "premium",
    `The full interview loop\n\nDifferent rounds often focus on different parts of the job:\n- Execution\n- Judgment\n- Communication\n- Planning\n- Stakeholder influence\n- Business understanding\n\nThe more clearly you understand the round, the more targeted your prep can be.`,
  ],
  [
    8,
    "Behavioral",
    "text + tip + quiz",
    "premium",
    `Behavioral questions\n\nBehavioral questions are usually where interviewers test ownership, communication, prioritization, and your ability to deal with friction. Good answers show not just activity, but decision-making.`,
  ],
  [
    9,
    "Functional execution",
    "text + checklist",
    "premium",
    `Execution questions\n\nThese questions are trying to understand whether you can turn plans into outcomes. Strong answers often show:\n- How you scoped the work\n- How you made decisions\n- How you handled obstacles\n- How you tracked progress\n- What the result was`,
  ],
  [
    10,
    "Stakeholder / cross-functional work",
    "text + checklist",
    "premium",
    `Cross-functional work\n\nMany roles are really testing whether you can work effectively across teams. Strong answers show:\n- Alignment\n- Influence\n- Communication\n- Escalation judgment\n- The ability to move through ambiguity`,
  ],
  [
    11,
    "Strategy / planning / prioritization",
    "text + checklist",
    "premium",
    `Strategy and prioritization\n\nThese questions reveal how you make choices when time, resources, or attention are limited. A strong answer should sound practical, sequenced, and tied to goals.`,
  ],
  [
    12,
    "Metrics / business judgment",
    "text + checklist",
    "premium",
    `Metrics and business judgment\n\nStrong candidates connect action to measurement. They can explain:\n- What success looks like\n- Which numbers matter most\n- What tradeoffs they are watching\n- What they would investigate next`,
  ],
  [
    13,
    "Failure patterns",
    "warning",
    "premium",
    `The patterns that usually hurt candidates\n\nCommon issues include:\n- Vague ownership\n- Lots of activity, little impact\n- Poor prioritization logic\n- Weak metrics thinking\n- Unclear stakeholder handling\n- Overly abstract recommendations`,
  ],
  [
    14,
    "Final prep sprint",
    "checklist",
    "premium",
    `Your final prep sprint\n\nBefore the interview:\n- Rehearse your strongest examples\n- Tighten your execution and stakeholder stories\n- Review role-specific goals and metrics\n- Prepare thoughtful questions\n- Focus on clarity and relevance`,
  ],
];

const consultingSlides: Slide[] = [
  [
    1,
    "Welcome",
    "hero",
    "free",
    `{C} {R} interview prep\n\nThis course is built to help you prepare for the actual shape of a {C} {R} interview. That means not just practicing cases, but understanding how interviewers evaluate structure, analysis, synthesis, and communication.`,
  ],
  [
    2,
    "Interview snapshot",
    "infographic",
    "free",
    `What this interview usually looks like\n\nMost consulting-style interviews are trying to measure:\n- Structured problem solving\n- Quantitative reasoning\n- Synthesis\n- Communication\n- Judgment\n- Personal impact\n\nThe strongest candidates make the structure of their thinking visible early.`,
  ],
  [
    3,
    "What they screen for",
    "checklist",
    "free",
    `What interviewers are screening for\n\nAt {C}, strong candidates usually show:\n- Clear structure\n- Disciplined analysis\n- Insight, not just math\n- Concise synthesis\n- Calm, top-down communication`,
  ],
  [
    4,
    "Core case framework",
    "checklist",
    "free",
    `A better way to approach case questions\n\nA strong pattern is:\n1. Restate the problem\n2. Propose a structure\n3. Work through the analysis\n4. Surface the insight\n5. Make a recommendation\n\nThis helps your case feel coherent from the beginning.`,
  ],
  [
    5,
    "Mini drill",
    "quiz",
    "free",
    `Quick check\n\nThe strongest first move in a case is usually not a fast answer. It is a useful structure.`,
  ],
  [
    6,
    "Paywall",
    "paywall",
    "free",
    `Unlock the full consulting prep path\n\nThe premium course goes deeper into:\n- The full {C} interview loop\n- Fit and personal impact stories\n- Case structure drills\n- Quantitative reasoning and synthesis\n- The patterns that most often weaken candidates`,
  ],
  [
    7,
    "Full loop",
    "infographic",
    "premium",
    `The full interview loop\n\nDifferent rounds often stress different parts of the bar. Some rounds reward structure and math. Others reveal communication, synthesis, or personal impact.\n\nYou need to prepare for all of them.`,
  ],
  [
    8,
    "Fit / personal impact",
    "text + tip + quiz",
    "premium",
    `Fit and personal impact\n\nThese interviews are often testing whether you can communicate with polish, show leadership, and reflect on what you learned from difficult situations. Good stories feel specific, active, and thoughtful.`,
  ],
  [
    9,
    "Case structure",
    "checklist + warning + quiz",
    "premium",
    `Case structure\n\nA useful structure should help answer the client's problem. It should not be decorative.\n\nStrong candidates create a structure that is:\n- Clear\n- Relevant\n- Non-overlapping\n- Easy to use`,
  ],
  [
    10,
    "Quantitative reasoning",
    "infographic + quiz",
    "premium",
    `Quantitative reasoning\n\nThis is not just about getting the arithmetic right. Interviewers want to see whether you can use numbers to support judgment, identify what matters, and move the case forward.`,
  ],
  [
    11,
    "Synthesis / recommendation",
    "text + checklist",
    "premium",
    `Synthesis and recommendation\n\nOne of the clearest differences between average and strong candidates is where the recommendation appears. Strong candidates lead with it. Then they support it.\n\nDo not bury the answer.`,
  ],
  [
    12,
    "Communication polish / client style",
    "text",
    "premium",
    `How to sound stronger in the room\n\nFor consulting-style interviews, polish matters. That usually means:\n- Structured communication\n- Concise transitions\n- Confidence without over-talking\n- Clear synthesis at key moments\n- Recommendations that sound usable`,
  ],
  [
    13,
    "Failure patterns",
    "warning",
    "premium",
    `The patterns that usually hurt candidates\n\nCommon issues include:\n- Messy structures\n- Analysis without insight\n- Weak synthesis\n- Buried recommendations\n- Overlong answers\n- Flat fit stories`,
  ],
  [
    14,
    "Final prep sprint",
    "checklist",
    "premium",
    `Your final prep sprint\n\nBefore the interview:\n- Rehearse a few clean fit stories\n- Practice case openings and synthesis out loud\n- Review mental math and structure patterns\n- Tighten how you lead with recommendations\n- Simplify your communication`,
  ],
];

const templateSlides: Record<TemplateName, Slide[]> = {
  "PM / Product / Strategy": pmSlides,
  "Engineering / Technical": engSlides,
  "Design / UX / Research": designSlides,
  "Business / Operations": bizSlides,
  "Consulting / Case-Based": consultingSlides,
};

// ── CSV generation ────────────────────────────────────────────────────────────

function escapeCSV(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function renderCopy(copy: string, company: string, role: string): string {
  return copy.replace(/\{C\}/g, company).replace(/\{R\}/g, role);
}

// Build header
const headers = [
  "company",
  "company_slug",
  "company_category",
  "role",
  "role_slug",
  "template",
  "course_url",
];

for (let i = 1; i <= 14; i++) {
  headers.push(`slide_${i}_title`);
  headers.push(`slide_${i}_block_type`);
  headers.push(`slide_${i}_access`);
  headers.push(`slide_${i}_copy`);
}

const rows: string[] = [headers.map(escapeCSV).join(",")];

for (const company of companies) {
  for (const role of roles) {
    const template = roleToTemplate[role.name];
    if (!template) continue;

    const slides = templateSlides[template];
    const courseUrl = `ace-that-interview.com/${company.slug}/${role.slug}`;

    const row: string[] = [
      company.name,
      company.slug,
      company.category,
      role.name,
      role.slug,
      template,
      courseUrl,
    ];

    for (const slide of slides) {
      const [, title, blockType, access, copy] = slide;
      row.push(escapeCSV(title));
      row.push(escapeCSV(blockType));
      row.push(access);
      row.push(escapeCSV(renderCopy(copy, company.name, role.name)));
    }

    rows.push(row.map(escapeCSV).join(","));
  }
}

const outPath = path.join(__dirname, "..", "data", "course-matrix.csv");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, rows.join("\n"), "utf-8");

console.log(`Generated ${rows.length - 1} courses → ${outPath}`);
console.log(
  `${companies.length} companies × ${roles.length} roles = ${companies.length * roles.length} combos`
);
console.log(`Columns: ${headers.length}`);
