/**
 * Tests for JSON-LD structured data generation
 */

import {
  generateCourseSchema,
  generateOrganizationSchema,
  generateFAQSchema,
  generateDefaultFAQSchema,
  generateBreadcrumbSchema,
  generateCompanyRoleBreadcrumbs,
  generateCompanyBreadcrumbs,
  serializeJsonLd,
} from "../structured-data";
import type { CompanyData, CompanyRole } from "@/lib/routing/types";

describe("generateCourseSchema", () => {
  const mockCompany: CompanyData = {
    name: "Google",
    slug: "google",
    category: "Technology",
    interview_volume: 1000,
    roles: [],
  };

  const mockRole: CompanyRole = {
    name: "Software Engineer",
    slug: "software-engineer",
    volume: 500,
  };

  test("generates valid Course schema", () => {
    const schema = generateCourseSchema(mockCompany, mockRole, "/google/software-engineer");

    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("Course");
    expect(schema.name).toBe("Google Software Engineer Interview Prep");
    expect(schema.description).toContain("Google");
    expect(schema.description).toContain("Software Engineer");
  });

  test("includes provider organization", () => {
    const schema = generateCourseSchema(mockCompany, mockRole, "/google/software-engineer");

    expect(schema.provider).toBeDefined();
    expect(schema.provider["@type"]).toBe("Organization");
    expect(schema.provider.name).toBe("JobWiz");
  });

  test("generates courseCode from slugs", () => {
    const schema = generateCourseSchema(mockCompany, mockRole, "/google/software-engineer");

    expect(schema.courseCode).toBe("GOOGLE-SOFTWARE-ENGINEER");
  });

  test("includes educationalLevel", () => {
    const schema = generateCourseSchema(mockCompany, mockRole, "/google/software-engineer");

    expect(schema.educationalLevel).toBe("Professional");
  });

  test("includes about array", () => {
    const schema = generateCourseSchema(mockCompany, mockRole, "/google/software-engineer");

    expect(Array.isArray(schema.about)).toBe(true);
    expect(schema.about?.some((item) => item.includes("Google"))).toBe(true);
    expect(schema.about?.some((item) => item.includes("Software Engineer"))).toBe(true);
  });

  test("includes teaches array", () => {
    const schema = generateCourseSchema(mockCompany, mockRole, "/google/software-engineer");

    expect(Array.isArray(schema.teaches)).toBe(true);
    expect(schema.teaches?.length).toBeGreaterThan(0);
  });

  test("includes URL", () => {
    const schema = generateCourseSchema(mockCompany, mockRole, "/google/software-engineer");

    expect(schema.url).toContain("/google/software-engineer");
  });
});

describe("generateOrganizationSchema", () => {
  test("generates valid Organization schema", () => {
    const schema = generateOrganizationSchema();

    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("Organization");
    expect(schema.name).toBe("JobWiz");
  });

  test("includes URL", () => {
    const schema = generateOrganizationSchema();

    expect(schema.url).toMatch(/^https?:\/\//);
  });

  test("includes logo", () => {
    const schema = generateOrganizationSchema();

    expect(schema.logo).toContain("logo.png");
  });

  test("includes description", () => {
    const schema = generateOrganizationSchema();

    expect(schema.description).toBeDefined();
    expect(schema.description?.length).toBeGreaterThan(0);
  });

  test("includes sameAs social links", () => {
    const schema = generateOrganizationSchema();

    expect(Array.isArray(schema.sameAs)).toBe(true);
    expect(schema.sameAs?.length).toBeGreaterThan(0);
  });
});

describe("generateFAQSchema", () => {
  test("generates valid FAQPage schema", () => {
    const questions = [
      { question: "What is this?", answer: "A test" },
      { question: "How does it work?", answer: "Like this" },
    ];
    const schema = generateFAQSchema(questions);

    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("FAQPage");
    expect(schema.mainEntity).toHaveLength(2);
  });

  test("formats questions correctly", () => {
    const questions = [
      { question: "Test question?", answer: "Test answer" },
    ];
    const schema = generateFAQSchema(questions);

    expect(schema.mainEntity[0]["@type"]).toBe("Question");
    expect(schema.mainEntity[0].name).toBe("Test question?");
    expect(schema.mainEntity[0].acceptedAnswer["@type"]).toBe("Answer");
    expect(schema.mainEntity[0].acceptedAnswer.text).toBe("Test answer");
  });

  test("handles empty questions array", () => {
    const schema = generateFAQSchema([]);

    expect(schema.mainEntity).toHaveLength(0);
  });
});

describe("generateDefaultFAQSchema", () => {
  const mockCompany: CompanyData = {
    name: "Meta",
    slug: "meta",
    category: "Technology",
    interview_volume: 700,
    roles: [],
  };

  const mockRole: CompanyRole = {
    name: "Product Manager",
    slug: "product-manager",
    volume: 300,
  };

  test("generates FAQ with 3 default questions", () => {
    const schema = generateDefaultFAQSchema(mockCompany, mockRole);

    expect(schema.mainEntity).toHaveLength(3);
  });

  test("includes company name in questions", () => {
    const schema = generateDefaultFAQSchema(mockCompany, mockRole);

    const questionsText = schema.mainEntity.map((q) => q.name).join(" ");
    expect(questionsText).toContain("Meta");
  });

  test("includes role name in questions", () => {
    const schema = generateDefaultFAQSchema(mockCompany, mockRole);

    const questionsText = schema.mainEntity.map((q) => q.name).join(" ");
    expect(questionsText).toContain("Product Manager");
  });

  test("includes company name in answers", () => {
    const schema = generateDefaultFAQSchema(mockCompany, mockRole);

    const answersText = schema.mainEntity.map((q) => q.acceptedAnswer.text).join(" ");
    expect(answersText).toContain("Meta");
  });
});

describe("generateBreadcrumbSchema", () => {
  test("generates valid BreadcrumbList schema", () => {
    const items = [
      { name: "Home", url: "/" },
      { name: "Company" },
    ];
    const schema = generateBreadcrumbSchema(items);

    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("BreadcrumbList");
    expect(schema.itemListElement).toHaveLength(2);
  });

  test("assigns correct positions", () => {
    const items = [
      { name: "Home", url: "/" },
      { name: "Company", url: "/company" },
      { name: "Role" },
    ];
    const schema = generateBreadcrumbSchema(items);

    expect(schema.itemListElement[0].position).toBe(1);
    expect(schema.itemListElement[1].position).toBe(2);
    expect(schema.itemListElement[2].position).toBe(3);
  });

  test("includes item URL when provided", () => {
    const items = [
      { name: "Home", url: "/" },
      { name: "Final" },
    ];
    const schema = generateBreadcrumbSchema(items);

    expect(schema.itemListElement[0].item).toContain("/");
    expect(schema.itemListElement[1].item).toBeUndefined();
  });

  test("formats as ListItem", () => {
    const items = [{ name: "Test" }];
    const schema = generateBreadcrumbSchema(items);

    expect(schema.itemListElement[0]["@type"]).toBe("ListItem");
    expect(schema.itemListElement[0].name).toBe("Test");
  });
});

describe("generateCompanyRoleBreadcrumbs", () => {
  const mockCompany: CompanyData = {
    name: "Apple",
    slug: "apple",
    category: "Technology",
    interview_volume: 600,
    roles: [],
  };

  const mockRole: CompanyRole = {
    name: "Data Scientist",
    slug: "data-scientist",
    volume: 200,
  };

  test("generates 3-level breadcrumb", () => {
    const schema = generateCompanyRoleBreadcrumbs(mockCompany, mockRole);

    expect(schema.itemListElement).toHaveLength(3);
  });

  test("includes Home at position 1", () => {
    const schema = generateCompanyRoleBreadcrumbs(mockCompany, mockRole);

    expect(schema.itemListElement[0].name).toBe("Home");
    expect(schema.itemListElement[0].position).toBe(1);
  });

  test("includes company at position 2 with URL", () => {
    const schema = generateCompanyRoleBreadcrumbs(mockCompany, mockRole);

    expect(schema.itemListElement[1].name).toBe("Apple");
    expect(schema.itemListElement[1].position).toBe(2);
    expect(schema.itemListElement[1].item).toContain("/apple");
  });

  test("includes role at position 3 without URL", () => {
    const schema = generateCompanyRoleBreadcrumbs(mockCompany, mockRole);

    expect(schema.itemListElement[2].name).toBe("Data Scientist");
    expect(schema.itemListElement[2].position).toBe(3);
    expect(schema.itemListElement[2].item).toBeUndefined();
  });
});

describe("generateCompanyBreadcrumbs", () => {
  const mockCompany: CompanyData = {
    name: "Microsoft",
    slug: "microsoft",
    category: "Technology",
    interview_volume: 900,
    roles: [],
  };

  test("generates 2-level breadcrumb", () => {
    const schema = generateCompanyBreadcrumbs(mockCompany);

    expect(schema.itemListElement).toHaveLength(2);
  });

  test("includes Home at position 1", () => {
    const schema = generateCompanyBreadcrumbs(mockCompany);

    expect(schema.itemListElement[0].name).toBe("Home");
    expect(schema.itemListElement[0].position).toBe(1);
  });

  test("includes company at position 2 without URL (current page)", () => {
    const schema = generateCompanyBreadcrumbs(mockCompany);

    expect(schema.itemListElement[1].name).toBe("Microsoft");
    expect(schema.itemListElement[1].position).toBe(2);
    expect(schema.itemListElement[1].item).toBeUndefined();
  });
});

describe("serializeJsonLd", () => {
  test("serializes object to JSON string", () => {
    const data = { "@type": "Test", name: "Example" };
    const result = serializeJsonLd(data);

    expect(typeof result).toBe("string");
    expect(JSON.parse(result)).toEqual(data);
  });

  test("handles nested objects", () => {
    const data = {
      "@type": "Course",
      provider: {
        "@type": "Organization",
        name: "JobWiz",
      },
    };
    const result = serializeJsonLd(data);
    const parsed = JSON.parse(result);

    expect(parsed.provider.name).toBe("JobWiz");
  });

  test("handles arrays", () => {
    const data = {
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "Q1" },
        { "@type": "Question", name: "Q2" },
      ],
    };
    const result = serializeJsonLd(data);
    const parsed = JSON.parse(result);

    expect(parsed.mainEntity).toHaveLength(2);
  });
});
