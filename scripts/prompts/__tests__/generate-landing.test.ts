import {
  generateMockLandingCopy,
  validateLandingOutput,
} from "../generate-landing";

describe("generate-landing", () => {
  describe("generateMockLandingCopy", () => {
    const googlePmPosition = {
      company_slug: "google",
      company_name: "Google",
      role_slug: "pm",
      role_name: "Product Manager",
      industry: "Technology",
    };

    const amazonSwePosition = {
      company_slug: "amazon",
      company_name: "Amazon",
      role_slug: "swe",
      role_name: "Software Engineer",
      industry: "E-commerce",
    };

    describe("headlines", () => {
      test("generates at least 3 headline variations", () => {
        const output = generateMockLandingCopy(googlePmPosition);
        expect(output.headlines.length).toBeGreaterThanOrEqual(3);
      });

      test("each headline has required fields", () => {
        const output = generateMockLandingCopy(googlePmPosition);
        for (const h of output.headlines) {
          expect(h.id).toBeTruthy();
          expect(h.headline).toBeTruthy();
          expect(h.subheadline).toBeTruthy();
          expect(h.angle).toBeTruthy();
        }
      });

      test("headlines mention company name", () => {
        const output = generateMockLandingCopy(googlePmPosition);
        const mentionsCompany = output.headlines.some(
          (h) =>
            h.headline.includes("Google") || h.subheadline.includes("Google")
        );
        expect(mentionsCompany).toBe(true);
      });

      test("headlines have valid angles", () => {
        const validAngles = ["insider", "transformation", "fear", "authority", "specificity"];
        const output = generateMockLandingCopy(googlePmPosition);
        for (const h of output.headlines) {
          expect(validAngles).toContain(h.angle);
        }
      });

      test("headlines are under 12 words", () => {
        const output = generateMockLandingCopy(googlePmPosition);
        for (const h of output.headlines) {
          const wordCount = h.headline.split(/\s+/).length;
          expect(wordCount).toBeLessThanOrEqual(12);
        }
      });

      test("subheadlines are under 25 words", () => {
        const output = generateMockLandingCopy(googlePmPosition);
        for (const h of output.headlines) {
          const wordCount = h.subheadline.split(/\s+/).length;
          expect(wordCount).toBeLessThanOrEqual(25);
        }
      });
    });

    describe("learn_bullets", () => {
      test("generates 4-6 learn bullets", () => {
        const output = generateMockLandingCopy(googlePmPosition);
        expect(output.learn_bullets.length).toBeGreaterThanOrEqual(4);
        expect(output.learn_bullets.length).toBeLessThanOrEqual(6);
      });

      test("each bullet has required fields", () => {
        const output = generateMockLandingCopy(googlePmPosition);
        for (const bullet of output.learn_bullets) {
          expect(bullet.id).toBeTruthy();
          expect(bullet.text).toBeTruthy();
          expect(bullet.icon_suggestion).toBeTruthy();
        }
      });

      test("bullets have valid icon suggestions", () => {
        const validIcons = ["brain", "target", "shield", "clock", "star", "check", "play", "users", "chart"];
        const output = generateMockLandingCopy(googlePmPosition);
        for (const bullet of output.learn_bullets) {
          expect(validIcons).toContain(bullet.icon_suggestion);
        }
      });
    });

    describe("included_bullets", () => {
      test("generates 4-6 included bullets", () => {
        const output = generateMockLandingCopy(googlePmPosition);
        expect(output.included_bullets.length).toBeGreaterThanOrEqual(4);
        expect(output.included_bullets.length).toBeLessThanOrEqual(6);
      });

      test("each bullet has required fields", () => {
        const output = generateMockLandingCopy(googlePmPosition);
        for (const bullet of output.included_bullets) {
          expect(bullet.id).toBeTruthy();
          expect(bullet.text).toBeTruthy();
          // quantity is optional
        }
      });

      test("some bullets have quantity", () => {
        const output = generateMockLandingCopy(googlePmPosition);
        const withQuantity = output.included_bullets.filter((b) => b.quantity);
        expect(withQuantity.length).toBeGreaterThan(0);
      });
    });

    describe("primary_cta", () => {
      test("generates at least 3 CTA variations", () => {
        const output = generateMockLandingCopy(googlePmPosition);
        expect(output.primary_cta.length).toBeGreaterThanOrEqual(3);
      });

      test("each CTA has required fields", () => {
        const output = generateMockLandingCopy(googlePmPosition);
        for (const cta of output.primary_cta) {
          expect(cta.id).toBeTruthy();
          expect(cta.button_text).toBeTruthy();
          expect(cta.urgency_type).toBeTruthy();
        }
      });

      test("CTAs have valid urgency types", () => {
        const validTypes = ["none", "time", "value", "social"];
        const output = generateMockLandingCopy(googlePmPosition);
        for (const cta of output.primary_cta) {
          expect(validTypes).toContain(cta.urgency_type);
        }
      });

      test("button text is 2-5 words", () => {
        const output = generateMockLandingCopy(googlePmPosition);
        for (const cta of output.primary_cta) {
          const wordCount = cta.button_text.split(/\s+/).length;
          expect(wordCount).toBeGreaterThanOrEqual(2);
          expect(wordCount).toBeLessThanOrEqual(5);
        }
      });
    });

    describe("secondary_cta", () => {
      test("generates at least 2 secondary CTAs", () => {
        const output = generateMockLandingCopy(googlePmPosition);
        expect(output.secondary_cta.length).toBeGreaterThanOrEqual(2);
      });

      test("each CTA has required fields", () => {
        const output = generateMockLandingCopy(googlePmPosition);
        for (const cta of output.secondary_cta) {
          expect(cta.id).toBeTruthy();
          expect(cta.button_text).toBeTruthy();
        }
      });
    });

    describe("meta", () => {
      test("meta_title is under 60 characters", () => {
        const output = generateMockLandingCopy(googlePmPosition);
        expect(output.meta_title.length).toBeLessThanOrEqual(60);
      });

      test("meta_description is under 160 characters", () => {
        const output = generateMockLandingCopy(googlePmPosition);
        expect(output.meta_description.length).toBeLessThanOrEqual(160);
      });

      test("og_title is under 60 characters", () => {
        const output = generateMockLandingCopy(googlePmPosition);
        expect(output.og_title.length).toBeLessThanOrEqual(60);
      });

      test("og_description is under 200 characters", () => {
        const output = generateMockLandingCopy(googlePmPosition);
        expect(output.og_description.length).toBeLessThanOrEqual(200);
      });

      test("includes 5-10 keywords", () => {
        const output = generateMockLandingCopy(googlePmPosition);
        expect(output.keywords.length).toBeGreaterThanOrEqual(5);
        expect(output.keywords.length).toBeLessThanOrEqual(10);
      });

      test("meta mentions company name", () => {
        const output = generateMockLandingCopy(googlePmPosition);
        expect(output.meta_title.toLowerCase()).toContain("google");
        expect(output.meta_description.toLowerCase()).toContain("google");
      });

      test("meta mentions role", () => {
        const output = generateMockLandingCopy(googlePmPosition);
        const hasRole =
          output.meta_title.toLowerCase().includes("pm") ||
          output.meta_title.toLowerCase().includes("product manager");
        expect(hasRole).toBe(true);
      });
    });

    describe("company-specific content", () => {
      test("Google content is different from Amazon content", () => {
        const googleOutput = generateMockLandingCopy(googlePmPosition);
        const amazonOutput = generateMockLandingCopy(amazonSwePosition);

        // Headlines should be different
        expect(googleOutput.headlines[0]?.headline).not.toBe(
          amazonOutput.headlines[0]?.headline
        );

        // Meta should be different
        expect(googleOutput.meta_title).not.toBe(amazonOutput.meta_title);

        // Keywords should reference different companies
        expect(googleOutput.keywords.some((k) => k.includes("google"))).toBe(true);
        expect(amazonOutput.keywords.some((k) => k.includes("amazon"))).toBe(true);
      });
    });
  });

  describe("validateLandingOutput", () => {
    const validOutput = {
      headlines: [
        {
          id: "h1",
          headline: "What Google interviewers look for",
          subheadline: "Get insider knowledge",
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
          headline: "Don't make these mistakes",
          subheadline: "Common pitfalls to avoid",
          angle: "fear",
        },
      ],
      learn_bullets: [
        { id: "l1", text: "What interviewers evaluate", icon_suggestion: "target" },
        { id: "l2", text: "How to structure answers", icon_suggestion: "brain" },
        { id: "l3", text: "Common mistakes to avoid", icon_suggestion: "shield" },
        { id: "l4", text: "Culture fit signals", icon_suggestion: "users" },
      ],
      included_bullets: [
        { id: "i1", text: "Full interview guide", quantity: "5 modules" },
        { id: "i2", text: "Practice questions", quantity: "50+ questions" },
        { id: "i3", text: "Preparation checklists", quantity: "8 checklists" },
        { id: "i4", text: "Culture breakdown", quantity: null },
      ],
      primary_cta: [
        {
          id: "p1",
          button_text: "Start Preparing Now",
          supporting_text: "Instant access",
          urgency_type: "none",
        },
        {
          id: "p2",
          button_text: "Get Interview Ready",
          supporting_text: null,
          urgency_type: "time",
        },
        {
          id: "p3",
          button_text: "Unlock Full Access",
          supporting_text: "Lifetime access",
          urgency_type: "value",
        },
      ],
      secondary_cta: [
        { id: "s1", button_text: "Preview Free Content", supporting_text: null },
        { id: "s2", button_text: "See What's Included", supporting_text: null },
      ],
      meta_title: "Google PM Interview Prep | JobWiz",
      meta_description: "Prepare for your Google PM interview with insider strategies.",
      og_title: "Google PM Interview Guide",
      og_description: "Everything you need for your Google Product Manager interview.",
      keywords: [
        "google pm interview",
        "google product manager",
        "pm interview prep",
        "google interview",
        "pm interview guide",
      ],
    };

    test("valid output passes validation", () => {
      const result = validateLandingOutput(validOutput);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("detects missing headlines", () => {
      const invalid = { ...validOutput, headlines: [] };
      const result = validateLandingOutput(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("headlines"))).toBe(true);
    });

    test("detects too few learn bullets", () => {
      const invalid = {
        ...validOutput,
        learn_bullets: [
          { id: "l1", text: "Only one", icon_suggestion: "target" },
        ],
      };
      const result = validateLandingOutput(invalid);
      expect(result.valid).toBe(false);
    });

    test("detects too many included bullets", () => {
      const invalid = {
        ...validOutput,
        included_bullets: [
          { id: "i1", text: "One", quantity: null },
          { id: "i2", text: "Two", quantity: null },
          { id: "i3", text: "Three", quantity: null },
          { id: "i4", text: "Four", quantity: null },
          { id: "i5", text: "Five", quantity: null },
          { id: "i6", text: "Six", quantity: null },
          { id: "i7", text: "Seven - too many", quantity: null },
        ],
      };
      const result = validateLandingOutput(invalid);
      expect(result.valid).toBe(false);
    });

    test("detects invalid angle", () => {
      const invalid = {
        ...validOutput,
        headlines: [
          { id: "h1", headline: "Test", subheadline: "Test", angle: "invalid" },
          { id: "h2", headline: "Test", subheadline: "Test", angle: "insider" },
          { id: "h3", headline: "Test", subheadline: "Test", angle: "fear" },
        ],
      };
      const result = validateLandingOutput(invalid);
      expect(result.valid).toBe(false);
    });

    test("detects invalid icon suggestion", () => {
      const invalid = {
        ...validOutput,
        learn_bullets: [
          { id: "l1", text: "Test", icon_suggestion: "invalid_icon" },
          { id: "l2", text: "Test", icon_suggestion: "brain" },
          { id: "l3", text: "Test", icon_suggestion: "target" },
          { id: "l4", text: "Test", icon_suggestion: "shield" },
        ],
      };
      const result = validateLandingOutput(invalid);
      expect(result.valid).toBe(false);
    });

    test("detects invalid urgency type", () => {
      const invalid = {
        ...validOutput,
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
      };
      const result = validateLandingOutput(invalid);
      expect(result.valid).toBe(false);
    });

    test("detects duplicate IDs", () => {
      const invalid = {
        ...validOutput,
        headlines: [
          {
            id: "same-id",
            headline: "First",
            subheadline: "Test",
            angle: "insider",
          },
          {
            id: "same-id",
            headline: "Second",
            subheadline: "Test",
            angle: "fear",
          },
          {
            id: "h3",
            headline: "Third",
            subheadline: "Test",
            angle: "authority",
          },
        ],
      };
      const result = validateLandingOutput(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Duplicate"))).toBe(true);
    });

    test("detects meta_title over 60 chars", () => {
      const invalid = {
        ...validOutput,
        meta_title: "A".repeat(61),
      };
      const result = validateLandingOutput(invalid);
      expect(result.valid).toBe(false);
    });

    test("detects meta_description over 160 chars", () => {
      const invalid = {
        ...validOutput,
        meta_description: "A".repeat(161),
      };
      const result = validateLandingOutput(invalid);
      expect(result.valid).toBe(false);
    });

    test("detects too few keywords", () => {
      const invalid = {
        ...validOutput,
        keywords: ["one", "two"],
      };
      const result = validateLandingOutput(invalid);
      expect(result.valid).toBe(false);
    });

    test("detects too many keywords", () => {
      const invalid = {
        ...validOutput,
        keywords: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"],
      };
      const result = validateLandingOutput(invalid);
      expect(result.valid).toBe(false);
    });
  });
});
