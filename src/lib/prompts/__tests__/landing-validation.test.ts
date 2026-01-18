import {
  validateLandingOutput,
  HeadlineOutputSchema,
  BulletsOutputSchema,
  CtaOutputSchema,
  MetaOutputSchema,
  LandingCopyOutputSchema,
} from "../landing-validation";

describe("landing-validation", () => {
  describe("HeadlineOutputSchema", () => {
    test("validates correct headline output", () => {
      const valid = {
        headlines: [
          {
            id: "h1",
            headline: "What Google interviewers look for",
            subheadline: "Get insider knowledge about the interview process",
            angle: "insider",
          },
          {
            id: "h2",
            headline: "Land your dream role",
            subheadline: "Complete prep system",
            angle: "transformation",
          },
          {
            id: "h3",
            headline: "Avoid common mistakes",
            subheadline: "What not to do",
            angle: "fear",
          },
        ],
      };
      expect(HeadlineOutputSchema.safeParse(valid).success).toBe(true);
    });

    test("rejects fewer than 3 headlines", () => {
      const invalid = {
        headlines: [
          { id: "h1", headline: "Test", subheadline: "Test", angle: "insider" },
        ],
      };
      expect(HeadlineOutputSchema.safeParse(invalid).success).toBe(false);
    });

    test("rejects invalid angle", () => {
      const invalid = {
        headlines: [
          { id: "h1", headline: "Test", subheadline: "Test", angle: "invalid" },
          { id: "h2", headline: "Test", subheadline: "Test", angle: "insider" },
          { id: "h3", headline: "Test", subheadline: "Test", angle: "fear" },
        ],
      };
      expect(HeadlineOutputSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe("BulletsOutputSchema", () => {
    test("validates correct bullets output", () => {
      const valid = {
        learn_bullets: [
          { id: "l1", text: "What interviewers evaluate", icon_suggestion: "target" },
          { id: "l2", text: "How to structure answers", icon_suggestion: "brain" },
          { id: "l3", text: "Common mistakes to avoid", icon_suggestion: "shield" },
          { id: "l4", text: "Culture fit signals", icon_suggestion: "users" },
        ],
        included_bullets: [
          { id: "i1", text: "Full interview guide", quantity: "5 modules" },
          { id: "i2", text: "Practice questions", quantity: "50+ questions" },
          { id: "i3", text: "Checklists", quantity: null },
          { id: "i4", text: "Culture breakdown", quantity: null },
        ],
      };
      expect(BulletsOutputSchema.safeParse(valid).success).toBe(true);
    });

    test("rejects fewer than 4 learn bullets", () => {
      const invalid = {
        learn_bullets: [
          { id: "l1", text: "Only one", icon_suggestion: "target" },
        ],
        included_bullets: [
          { id: "i1", text: "One", quantity: null },
          { id: "i2", text: "Two", quantity: null },
          { id: "i3", text: "Three", quantity: null },
          { id: "i4", text: "Four", quantity: null },
        ],
      };
      expect(BulletsOutputSchema.safeParse(invalid).success).toBe(false);
    });

    test("rejects more than 6 included bullets", () => {
      const invalid = {
        learn_bullets: [
          { id: "l1", text: "One", icon_suggestion: "target" },
          { id: "l2", text: "Two", icon_suggestion: "brain" },
          { id: "l3", text: "Three", icon_suggestion: "shield" },
          { id: "l4", text: "Four", icon_suggestion: "users" },
        ],
        included_bullets: [
          { id: "i1", text: "1", quantity: null },
          { id: "i2", text: "2", quantity: null },
          { id: "i3", text: "3", quantity: null },
          { id: "i4", text: "4", quantity: null },
          { id: "i5", text: "5", quantity: null },
          { id: "i6", text: "6", quantity: null },
          { id: "i7", text: "7 - too many", quantity: null },
        ],
      };
      expect(BulletsOutputSchema.safeParse(invalid).success).toBe(false);
    });

    test("rejects invalid icon suggestion", () => {
      const invalid = {
        learn_bullets: [
          { id: "l1", text: "Test", icon_suggestion: "invalid_icon" },
          { id: "l2", text: "Test", icon_suggestion: "brain" },
          { id: "l3", text: "Test", icon_suggestion: "shield" },
          { id: "l4", text: "Test", icon_suggestion: "users" },
        ],
        included_bullets: [
          { id: "i1", text: "1", quantity: null },
          { id: "i2", text: "2", quantity: null },
          { id: "i3", text: "3", quantity: null },
          { id: "i4", text: "4", quantity: null },
        ],
      };
      expect(BulletsOutputSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe("CtaOutputSchema", () => {
    test("validates correct CTA output", () => {
      const valid = {
        primary_cta: [
          {
            id: "p1",
            button_text: "Start Now",
            supporting_text: "Instant access",
            urgency_type: "none",
          },
          {
            id: "p2",
            button_text: "Get Ready",
            supporting_text: null,
            urgency_type: "time",
          },
          {
            id: "p3",
            button_text: "Unlock Access",
            supporting_text: null,
            urgency_type: "value",
          },
        ],
        secondary_cta: [
          { id: "s1", button_text: "Preview Free", supporting_text: null },
          { id: "s2", button_text: "See Included", supporting_text: null },
        ],
      };
      expect(CtaOutputSchema.safeParse(valid).success).toBe(true);
    });

    test("rejects fewer than 3 primary CTAs", () => {
      const invalid = {
        primary_cta: [
          {
            id: "p1",
            button_text: "Start Now",
            supporting_text: null,
            urgency_type: "none",
          },
        ],
        secondary_cta: [
          { id: "s1", button_text: "Preview Free", supporting_text: null },
          { id: "s2", button_text: "See Included", supporting_text: null },
        ],
      };
      expect(CtaOutputSchema.safeParse(invalid).success).toBe(false);
    });

    test("rejects fewer than 2 secondary CTAs", () => {
      const invalid = {
        primary_cta: [
          {
            id: "p1",
            button_text: "Start Now",
            supporting_text: null,
            urgency_type: "none",
          },
          {
            id: "p2",
            button_text: "Get Ready",
            supporting_text: null,
            urgency_type: "time",
          },
          {
            id: "p3",
            button_text: "Unlock Access",
            supporting_text: null,
            urgency_type: "value",
          },
        ],
        secondary_cta: [
          { id: "s1", button_text: "Preview Free", supporting_text: null },
        ],
      };
      expect(CtaOutputSchema.safeParse(invalid).success).toBe(false);
    });

    test("rejects invalid urgency type", () => {
      const invalid = {
        primary_cta: [
          {
            id: "p1",
            button_text: "Start Now",
            supporting_text: null,
            urgency_type: "invalid",
          },
          {
            id: "p2",
            button_text: "Get Ready",
            supporting_text: null,
            urgency_type: "time",
          },
          {
            id: "p3",
            button_text: "Unlock Access",
            supporting_text: null,
            urgency_type: "value",
          },
        ],
        secondary_cta: [
          { id: "s1", button_text: "Preview Free", supporting_text: null },
          { id: "s2", button_text: "See Included", supporting_text: null },
        ],
      };
      expect(CtaOutputSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe("MetaOutputSchema", () => {
    test("validates correct meta output", () => {
      const valid = {
        meta_title: "Google PM Interview Prep | JobWiz",
        meta_description: "Prepare for your Google PM interview with insider strategies.",
        og_title: "Google PM Interview Guide",
        og_description: "Everything you need for your Google PM interview.",
        keywords: ["google pm", "interview prep", "pm interview", "google interview", "product manager"],
      };
      expect(MetaOutputSchema.safeParse(valid).success).toBe(true);
    });

    test("rejects meta_title over 60 chars", () => {
      const invalid = {
        meta_title: "A".repeat(61),
        meta_description: "Valid description",
        og_title: "Valid",
        og_description: "Valid",
        keywords: ["1", "2", "3", "4", "5"],
      };
      expect(MetaOutputSchema.safeParse(invalid).success).toBe(false);
    });

    test("rejects meta_description over 160 chars", () => {
      const invalid = {
        meta_title: "Valid",
        meta_description: "A".repeat(161),
        og_title: "Valid",
        og_description: "Valid",
        keywords: ["1", "2", "3", "4", "5"],
      };
      expect(MetaOutputSchema.safeParse(invalid).success).toBe(false);
    });

    test("rejects fewer than 5 keywords", () => {
      const invalid = {
        meta_title: "Valid",
        meta_description: "Valid",
        og_title: "Valid",
        og_description: "Valid",
        keywords: ["one", "two"],
      };
      expect(MetaOutputSchema.safeParse(invalid).success).toBe(false);
    });

    test("rejects more than 10 keywords", () => {
      const invalid = {
        meta_title: "Valid",
        meta_description: "Valid",
        og_title: "Valid",
        og_description: "Valid",
        keywords: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"],
      };
      expect(MetaOutputSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe("validateLandingOutput", () => {
    const validHeadlines = {
      headlines: [
        { id: "h1", headline: "Test headline one", subheadline: "Test sub", angle: "insider" },
        { id: "h2", headline: "Test headline two", subheadline: "Test sub", angle: "fear" },
        { id: "h3", headline: "Test headline three", subheadline: "Test sub", angle: "authority" },
      ],
    };

    test("validates landing-headline type", () => {
      const result = validateLandingOutput(validHeadlines, "landing-headline");
      expect(result.valid).toBe(true);
    });

    test("validates landing-bullets type", () => {
      const validBullets = {
        learn_bullets: [
          { id: "l1", text: "Test one", icon_suggestion: "target" },
          { id: "l2", text: "Test two", icon_suggestion: "brain" },
          { id: "l3", text: "Test three", icon_suggestion: "shield" },
          { id: "l4", text: "Test four", icon_suggestion: "users" },
        ],
        included_bullets: [
          { id: "i1", text: "Included one", quantity: null },
          { id: "i2", text: "Included two", quantity: "5 items" },
          { id: "i3", text: "Included three", quantity: null },
          { id: "i4", text: "Included four", quantity: null },
        ],
      };
      const result = validateLandingOutput(validBullets, "landing-bullets");
      expect(result.valid).toBe(true);
    });

    test("validates landing-cta type", () => {
      const validCta = {
        primary_cta: [
          { id: "p1", button_text: "Start Now", supporting_text: null, urgency_type: "none" },
          { id: "p2", button_text: "Get Ready", supporting_text: null, urgency_type: "time" },
          { id: "p3", button_text: "Unlock Access", supporting_text: null, urgency_type: "value" },
        ],
        secondary_cta: [
          { id: "s1", button_text: "Preview Free", supporting_text: null },
          { id: "s2", button_text: "See Included", supporting_text: null },
        ],
      };
      const result = validateLandingOutput(validCta, "landing-cta");
      expect(result.valid).toBe(true);
    });

    test("validates landing-meta type", () => {
      const validMeta = {
        meta_title: "Test Title | JobWiz",
        meta_description: "Test description for SEO purposes.",
        og_title: "Test OG Title",
        og_description: "Test OG description for social sharing.",
        keywords: ["test", "keywords", "seo", "interview", "prep"],
      };
      const result = validateLandingOutput(validMeta, "landing-meta");
      expect(result.valid).toBe(true);
    });

    test("detects duplicate IDs", () => {
      const invalid = {
        headlines: [
          { id: "same", headline: "Test one", subheadline: "Test", angle: "insider" },
          { id: "same", headline: "Test two", subheadline: "Test", angle: "fear" },
          { id: "h3", headline: "Test three", subheadline: "Test", angle: "authority" },
        ],
      };
      const result = validateLandingOutput(invalid, "landing-headline");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Duplicate"))).toBe(true);
    });

    test("warns on long headlines", () => {
      const data = {
        headlines: [
          {
            id: "h1",
            headline: "This is a very long headline that has way more than twelve words in it",
            subheadline: "Short sub",
            angle: "insider",
          },
          { id: "h2", headline: "Short", subheadline: "Test", angle: "fear" },
          { id: "h3", headline: "Short", subheadline: "Test", angle: "authority" },
        ],
      };
      const result = validateLandingOutput(data, "landing-headline");
      expect(result.warnings.some((w) => w.includes("words"))).toBe(true);
    });

    test("warns when company not mentioned", () => {
      const data = {
        headlines: [
          { id: "h1", headline: "Generic headline", subheadline: "Generic sub", angle: "insider" },
          { id: "h2", headline: "Another generic", subheadline: "Generic sub", angle: "fear" },
          { id: "h3", headline: "Yet another", subheadline: "Generic sub", angle: "authority" },
        ],
      };
      const result = validateLandingOutput(data, "landing-headline", { companyName: "Google" });
      expect(result.warnings.some((w) => w.includes("company"))).toBe(true);
    });

    test("warns when role not mentioned", () => {
      const data = {
        headlines: [
          { id: "h1", headline: "Google headline", subheadline: "Google sub", angle: "insider" },
          { id: "h2", headline: "Google generic", subheadline: "Google sub", angle: "fear" },
          { id: "h3", headline: "Google another", subheadline: "Google sub", angle: "authority" },
        ],
      };
      const result = validateLandingOutput(data, "landing-headline", { roleName: "Product Manager" });
      expect(result.warnings.some((w) => w.includes("role"))).toBe(true);
    });

    test("returns error for unknown prompt type", () => {
      const result = validateLandingOutput({}, "unknown-type" as never);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Unknown"))).toBe(true);
    });
  });
});
