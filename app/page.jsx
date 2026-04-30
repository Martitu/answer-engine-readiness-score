"use client";

import React, { useMemo, useState } from "react";

const CTA_URL = "https://martawarren.com/ai-search-brand-visibility/";

const CONTENT_TYPES = [
  "Homepage intro",
  "About page",
  "Product or service page",
  "Press release",
  "Media kit / boilerplate",
  "Campaign landing page",
  "Offer or package page",
  "Article or blog post",
  "FAQ / help content",
  "Location or destination page",
  "Case study",
  "Other web or PR copy",
];

const WEIGHTS = {
  bluf: 0.2,
  entity: 0.2,
  proof: 0.2,
  fit: 0.2,
  structure: 0.1,
  risk: 0.1,
};

const CATEGORY_LABELS = {
  bluf: "BLUF / Lead Extractability",
  entity: "Entity & Specificity",
  proof: "Proof & Trust Signals",
  fit: "Recommendation Fit",
  structure: "Structure & Reuse",
  risk: "Risk & Consistency",
};

const VAGUE_TERMS = [
  "world-class",
  "iconic",
  "unforgettable",
  "unique",
  "elevated",
  "bespoke",
  "immersive",
  "seamless",
  "innovative",
  "leading",
  "trusted",
  "best-in-class",
  "cutting-edge",
];

const SUPERLATIVE_TERMS = [
  "best",
  "first",
  "only",
  "most",
  "leading",
  "world-class",
  "award-winning",
  "number one",
  "unrivalled",
  "ultimate",
];

const SUSTAINABILITY_TERMS = [
  "sustainable",
  "eco-friendly",
  "green",
  "net zero",
  "carbon neutral",
  "ethical",
];

const HEALTH_TERMS = [
  "wellness",
  "healing",
  "therapeutic",
  "cure",
  "treats",
  "improves health",
  "mental health",
];

const CATEGORY_TERMS = [
  "agency",
  "studio",
  "platform",
  "software",
  "service",
  "product",
  "company",
  "brand",
  "organisation",
  "charity",
  "non-profit",
  "consultancy",
  "clinic",
  "school",
  "university",
  "hotel",
  "restaurant",
  "destination",
  "event",
  "campaign",
  "course",
  "membership",
  "tool",
  "app",
  "firm",
  "practice",
];

const CTA_TERMS = [
  "book",
  "buy",
  "enquire",
  "enquiry",
  "contact",
  "subscribe",
  "download",
  "register",
  "request",
  "apply",
  "call",
  "email",
  "learn more",
];

const CONTENT_TYPE_GUIDANCE = {
  "Homepage intro": "Prioritise a direct opening, entity clarity, recommendation fit and concrete specifics.",
  "About page": "Prioritise entity clarity, credibility, proof signals and naming consistency.",
  "Product or service page": "Prioritise practical details, proof, fit, clear outcomes and CTA clarity.",
  "Press release": "Prioritise the news hook, who/what/where/when, named people, recency and boilerplate clarity.",
  "Media kit / boilerplate": "Prioritise reusable entity facts, proof, consistency and source-ready detail.",
  "Campaign landing page": "Prioritise offer clarity, audience fit, proof, CTA clarity and practical details.",
  "Offer or package page": "Prioritise inclusions, dates or terms, proof, audience fit and CTA clarity.",
  "Article or blog post": "Prioritise a clear lead, structure, extractable facts, proof and takeaways.",
  "FAQ / help content": "Prioritise direct answers, structure, extractability and clarity.",
  "Location or destination page": "Prioritise place clarity, practical details, fit, specificity and proof.",
  "Case study": "Prioritise problem, solution, result, measurable proof and credibility.",
  "Other web or PR copy": "Use the default scoring model.",
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function words(text) {
  return (text || "").trim().match(/\b[\w'-]+\b/g) || [];
}

function firstNWords(text, n) {
  return words(text).slice(0, n).join(" ");
}

function splitSentences(text) {
  return (text || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function paragraphs(text) {
  return (text || "")
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function includesAny(text, terms) {
  const lower = (text || "").toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function matchedTerms(text, terms) {
  const lower = (text || "").toLowerCase();
  return terms.filter((term) => lower.includes(term));
}

function countMatches(text, regex) {
  return (text.match(regex) || []).length;
}

function hasNumber(text) {
  return /\b\d+(?:[,.]\d+)?%?\b/.test(text || "");
}

function hasYear(text) {
  return /\b(19|20)\d{2}\b/.test(text || "");
}

function hasMonth(text) {
  return /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i.test(
    text || ""
  );
}

function hasDateSignal(text) {
  return hasYear(text) || hasMonth(text);
}

function hasLocationSignal(text) {
  return /\b(in|at|near|from|across|based in|located in|serving)\s+[A-Z][A-Za-z'-]+/.test(text || "");
}

function hasNamedEntity(text) {
  return /\b[A-Z][A-Za-z0-9&.'-]+(?:\s+[A-Z][A-Za-z0-9&.'-]+){0,4}\b/.test(text || "");
}

function concreteDetailCount(text) {
  return (
    countMatches(text, /\b\d+(?:[,.]\d+)?%?\b/g) +
    countMatches(text, /\b[A-Z][A-Za-z0-9&.'-]+(?:\s+[A-Z][A-Za-z0-9&.'-]+){1,3}\b/g) +
    countMatches(text, /\b(service|product|platform|programme|package|feature|includes|offers|based in|founded|launched|certified|partner|client|customer)\b/gi)
  );
}

function hasProofSignal(text) {
  return (
    hasNumber(text) ||
    hasDateSignal(text) ||
    /\b(award|awards|recognised|ranking|ranked|certified|certification|published|featured|review|reviews|rating|case study|results|data|survey|research|client|customer|partner|collaborator|expert|professor|doctor|founder|director|named by|according to)\b/i.test(
      text || ""
    )
  );
}

function hasNamedProof(text) {
  return /\b(award|certification|published|featured|review|rating|case study|client|partner|collaborator|expert|source|according to)\b/i.test(
    text || ""
  ) && hasNamedEntity(text);
}

function hasAudienceSignal(text) {
  return /\b(for|helps|serves|designed for|built for|ideal for|best for|made for|supports|aimed at|created for)\b/i.test(
    text || ""
  );
}

function hasProblemOrNeed(text) {
  return /\b(need|needs|problem|challenge|goal|outcome|occasion|desire|helps|so that|because|without|when|looking for|want to|struggle|improve|reduce|increase|clarify)\b/i.test(
    text || ""
  );
}

function hasStructureSignal(text) {
  return (
    /(^|\n)\s*[-*\u2022]\s+/.test(text || "") ||
    /\b(key facts|at a glance|faq|frequently asked|highlights|inclusions|included|how it works|what you get|results|takeaways)\b/i.test(
      text || ""
    ) ||
    countMatches(text, /\n[A-Z][^\n]{2,60}\n/g) >= 1
  );
}

function hasQuestionStructure(text) {
  return /\?/.test(text || "") || /\b(Q:|Question:|FAQ)\b/i.test(text || "");
}

function ambiguousPronouns(text) {
  return splitSentences(text).filter((sentence) =>
    /^(this|it|here|our latest|the experience|the offer)\b/i.test(sentence)
  );
}

function scoreBand(score) {
  if (score >= 8) return "Strong";
  if (score >= 6) return "Needs work";
  return "Weak";
}

function checklistStatus(condition, unclear = false, notRelevant = false) {
  if (notRelevant) return "Not relevant";
  if (condition) return "Present";
  if (unclear) return "Unclear";
  return "Missing";
}

function contentRequirements(contentType) {
  const lower = contentType.toLowerCase();
  return {
    needsCta: /product|service|campaign|offer|package|landing/.test(lower),
    needsTerms: /offer|package|campaign/.test(lower),
    needsDates: /press release|offer|package|campaign|article|blog/.test(lower),
    needsLocation: /location|destination|press release|homepage/.test(lower),
    needsCaseResult: /case study/.test(lower),
    needsBoilerplate: /press release|media kit|boilerplate/.test(lower),
    needsFaq: /faq|help/.test(lower),
  };
}

function makeItem(key, score, rationale, missing, fix) {
  return {
    key,
    label: CATEGORY_LABELS[key],
    score: round1(clamp(score, 0, 10)),
    rationale,
    missing,
    fix,
    band: scoreBand(score),
  };
}

function auditCopy({ contentType, audience, copy }) {
  const text = copy.trim();
  const req = contentRequirements(contentType);
  const lead = firstNWords(text, 80);
  const allWords = words(text);
  const allSentences = splitSentences(text);
  const allParagraphs = paragraphs(text);
  const lower = text.toLowerCase();
  const vagueTerms = matchedTerms(text, VAGUE_TERMS);
  const vagueWithoutProof = vagueTerms.filter(() => !hasProofSignal(text));
  const riskyTerms = matchedTerms(text, SUPERLATIVE_TERMS);
  const sustainabilityClaim = includesAny(text, SUSTAINABILITY_TERMS);
  const healthClaim = includesAny(text, HEALTH_TERMS);
  const namedEntity = hasNamedEntity(text);
  const categoryClear = includesAny(text, CATEGORY_TERMS);
  const locationClear = hasLocationSignal(text);
  const detailCount = concreteDetailCount(text);
  const proofSignal = hasProofSignal(text);
  const namedProof = hasNamedProof(text);
  const audienceInCopy = hasAudienceSignal(text);
  const audienceProvided = Boolean(audience.trim());
  const problemNeed = hasProblemOrNeed(text);
  const ctaPresent = includesAny(text, CTA_TERMS);
  const structureSignal = hasStructureSignal(text);
  const questionStructure = hasQuestionStructure(text);
  const avgSentenceWords = allWords.length / Math.max(allSentences.length, 1);
  const leadChecks = {
    entity: namedEntity || categoryClear,
    location: !req.needsLocation || hasLocationSignal(lead),
    audience: hasAudienceSignal(lead) || audienceProvided,
    why: hasProblemOrNeed(lead),
    differentiator: detailCount >= 3 || proofSignal,
    proof: hasProofSignal(lead),
    vague: includesAny(lead, VAGUE_TERMS) && !hasProofSignal(lead),
  };

  const blufHits = Object.values({
    entity: leadChecks.entity,
    location: leadChecks.location,
    audience: leadChecks.audience,
    why: leadChecks.why,
    differentiator: leadChecks.differentiator,
    proof: leadChecks.proof,
  }).filter(Boolean).length;
  let blufScore = blufHits * 1.45;
  if (leadChecks.vague) blufScore -= 1.2;
  if (lead.length < 80) blufScore -= 0.8;
  const blufStatus =
    blufScore >= 7.5 ? "Pass" : blufScore >= 4.5 ? "Needs work" : "Missing";

  const entityScore =
    (namedEntity ? 2 : 0) +
    (categoryClear ? 1.8 : 0) +
    (locationClear || !req.needsLocation ? 1.2 : 0) +
    (detailCount >= 4 ? 2 : detailCount >= 2 ? 1 : 0) +
    (hasDateSignal(text) ? 1 : 0) +
    (vagueWithoutProof.length ? -1.4 : 1);

  const proofScore =
    (proofSignal ? 2.5 : 0) +
    (namedProof ? 2 : 0) +
    (hasNumber(text) ? 1.5 : 0) +
    (hasDateSignal(text) ? 1 : 0) +
    (/\b(certified|certification|award|ranking|review|rating|case study|result|data|source|according to)\b/i.test(text)
      ? 1.5
      : 0) -
    (lower.includes("award-winning") && !namedProof ? 1 : 0) -
    (sustainabilityClaim && !/\b(certified|certification|b corp|leed|iso|green key|science based|measured|audited)\b/i.test(text)
      ? 1
      : 0);

  const fitScore =
    (audienceProvided ? 1.5 : 0) +
    (audienceInCopy ? 2 : 0) +
    (problemNeed ? 2 : 0) +
    (detailCount >= 3 ? 1.3 : 0) +
    (/\b(choose|because|instead of|alternative|compared with|for teams|for people|for organisations|for buyers|for journalists|for investors|for customers|for users)\b/i.test(
      text
    )
      ? 1.4
      : 0) +
    (ctaPresent || !req.needsCta ? 1 : 0);

  const structureScore =
    (allParagraphs.length >= 2 ? 1.5 : 0) +
    (avgSentenceWords <= 24 ? 1.4 : avgSentenceWords <= 34 ? 0.8 : 0) +
    (structureSignal ? 2.2 : 0) +
    (questionStructure || !req.needsFaq ? 1 : 0) +
    (ctaPresent || !req.needsCta ? 1 : 0) +
    (leadChecks.entity ? 1 : 0) +
    (allWords.length <= 900 ? 0.8 : 0);

  const riskIssues = buildRiskIssues({
    text,
    req,
    riskyTerms,
    sustainabilityClaim,
    healthClaim,
    vagueWithoutProof,
  });
  const riskScore = 10 - Math.min(7, riskIssues.length * 1.5) - (ambiguousPronouns(text).length ? 1 : 0);

  const categories = [
    makeItem(
      "bluf",
      blufScore,
      blufStatus === "Pass"
        ? "The opening gives AI a reasonably clear extractable lead."
        : "The opening does not yet give AI a complete bottom-line answer.",
      missingList([
        !leadChecks.entity && "Clear who or what the copy is about",
        !leadChecks.location && "Location or market context, if relevant",
        !leadChecks.audience && "Who it is for",
        !leadChecks.why && "Why it matters",
        !leadChecks.differentiator && "One concrete differentiator",
        !leadChecks.proof && "Proof or credibility in the opening",
        leadChecks.vague && "Less reliance on unsupported marketing language",
      ]),
      "Add only the missing facts to the opening: who or what, for whom, where if relevant, why it matters and one proof-backed detail."
    ),
    makeItem(
      "entity",
      entityScore,
      namedEntity && categoryClear
        ? "The copy gives AI a usable entity and category signal."
        : "The entity or category is not specific enough for confident reuse.",
      missingList([
        !namedEntity && "Brand, organisation, product, service, place or offer name",
        !categoryClear && "Plain category label",
        req.needsLocation && !locationClear && "Clear location or market",
        detailCount < 3 && "Concrete details such as names, numbers, features or inclusions",
        vagueWithoutProof.length > 0 && `Concrete backing for: ${vagueWithoutProof.slice(0, 4).join(", ")}`,
      ]),
      "Replace or support broad adjectives with concrete nouns, names, figures, locations, inclusions or practical details."
    ),
    makeItem(
      "proof",
      proofScore,
      proofSignal
        ? "Some trust signals are present, but they may need stronger naming or context."
        : "The copy gives AI very little evidence to trust the claims.",
      missingList([
        !hasNumber(text) && "Measurable fact or result",
        !hasDateSignal(text) && "Year, launch date or recency marker",
        !namedProof && "Named award, source, publication, expert, client, partner or collaborator",
        sustainabilityClaim && "Named sustainability proof or certification",
        lower.includes("award-winning") && !namedProof && "Name and year for the award",
      ]),
      "Add one named proof point that already exists, such as a source, result, credential, client example, certification or dated recognition."
    ),
    makeItem(
      "fit",
      fitScore,
      audienceProvided || audienceInCopy
        ? "The copy gives some context about who this is for."
        : "AI may struggle to know when to recommend this because the audience or use case is unclear.",
      missingList([
        !audienceProvided && !audienceInCopy && "Intended audience",
        !problemNeed && "Problem, need, occasion or reason to choose it",
        detailCount < 3 && "Specific fit signals that distinguish it from alternatives",
        req.needsCta && !ctaPresent && "Clear next action",
      ]),
      "Clarify the intended reader or buyer and the situation where this offer, organisation or content is most relevant."
    ),
    makeItem(
      "structure",
      structureScore,
      structureSignal
        ? "The copy has some scannable structure that AI can reuse."
        : "Important facts may be too buried for easy extraction.",
      missingList([
        allParagraphs.length < 2 && "Shorter paragraphs",
        !structureSignal && "Clear headings, bullets or a Key Facts block",
        req.needsFaq && !questionStructure && "Direct FAQ-style answers",
        req.needsCta && !ctaPresent && "Clear CTA",
        avgSentenceWords > 34 && "Shorter sentences",
      ]),
      "Add a small structure aid, such as Key Facts, 3-5 micro-FAQs, clearer headings or shorter paragraphs."
    ),
    makeItem(
      "risk",
      riskScore,
      riskIssues.length
        ? "Some claims or details may need clarification or proof."
        : "No obvious unsupported or confusing claims were flagged by this check.",
      missingList(riskIssues),
      "Clarify unsupported claims, vague references, dates, terms or eligibility details before relying on them in AI-facing copy."
    ),
  ];

  const overall = round1(
    categories.reduce((total, category) => total + category.score * WEIGHTS[category.key], 0)
  );

  const understood = buildUnderstood({ text, contentType, audience, req });
  const mayMiss = buildMayMiss({ categories, req, audience, text });
  const proofChecklist = buildProofChecklist({ text, req, sustainabilityClaim });
  const minimalFixes = buildMinimalFixes({ categories, proofChecklist, req });
  const nextAsset = suggestNextAsset({ categories, req, contentType });

  return {
    contentType,
    audience,
    overall,
    rationale: overallRationale(overall, categories),
    categories,
    blufStatus,
    blufExplanation:
      blufStatus === "Pass"
        ? "The first 40-80 words contain enough direct information for a usable AI summary."
        : blufStatus === "Needs work"
        ? "The opening contains some useful signals, but key context is missing or buried."
        : "The opening does not clearly state the core answer AI needs to extract.",
    understood,
    mayMiss,
    proofChecklist,
    riskIssues,
    minimalFixes,
    nextAsset,
  };
}

function missingList(items) {
  const filtered = items.filter(Boolean);
  return filtered.length ? filtered : ["Nothing obvious from this check."];
}

function buildRiskIssues({ text, req, riskyTerms, sustainabilityClaim, healthClaim, vagueWithoutProof }) {
  const issues = [];
  const lower = text.toLowerCase();
  if (riskyTerms.length) {
    issues.push(`Unsupported superlative or high-claim wording may need proof: ${[...new Set(riskyTerms)].slice(0, 5).join(", ")}.`);
  }
  if (vagueWithoutProof.length) {
    issues.push(`Vague descriptors need concrete detail: ${[...new Set(vagueWithoutProof)].slice(0, 5).join(", ")}.`);
  }
  if (sustainabilityClaim && !/\b(certified|certification|b corp|leed|iso|green key|science based|audited|measured)\b/i.test(text)) {
    issues.push("Sustainability or eco claim appears without a named action, certification or proof point.");
  }
  if (healthClaim && !/\b(study|clinical|qualified|certified|doctor|therapist|evidence|source)\b/i.test(text)) {
    issues.push("Health or wellness outcome claim appears without supporting evidence or qualification.");
  }
  if (req.needsTerms && !/\b(terms|available|availability|from|until|valid|includes|excludes|eligib|minimum|price|pricing|dates?)\b/i.test(text)) {
    issues.push("Offer terms, dates, availability or inclusions are not clear.");
  }
  if (req.needsDates && !hasDateSignal(text)) {
    issues.push("Date or recency reference may be needed for this content type.");
  }
  if (lower.includes("award-winning") && !/\b(award-winning\s+[A-Z]|winner of|awarded by|award[s]?\s+\d{4})\b/.test(text)) {
    issues.push("Award-winning claim needs the award name and year.");
  }
  ambiguousPronouns(text)
    .slice(0, 2)
    .forEach((sentence) => issues.push(`Unclear reference: "${sentence}"`));
  return [...new Set(issues)].slice(0, 7);
}

function buildUnderstood({ text, contentType, audience, req }) {
  const items = [];
  const firstSentence = splitSentences(text)[0];
  if (firstSentence) items.push(`Opening claim: ${firstSentence}`);
  if (audience.trim()) items.push(`Audience/context provided: ${audience.trim()}`);
  if (hasNamedEntity(text)) items.push("A named entity appears in the copy.");
  if (includesAny(text, CATEGORY_TERMS)) items.push("The copy includes at least one category or offer signal.");
  if (hasLocationSignal(text)) items.push("Location or market context appears to be present.");
  if (hasProofSignal(text)) items.push("Some proof, date, number or credibility signal appears to be present.");
  if (req.needsCta && includesAny(text, CTA_TERMS)) items.push("A next action appears to be present.");
  if (items.length === 0) items.push(`This is ${contentType.toLowerCase()}, but the core entity and offer are not yet clear from the copy.`);
  return items.slice(0, 6);
}

function buildMayMiss({ categories, req, audience, text }) {
  const items = [];
  categories.forEach((category) => {
    if (category.score < 7) items.push(`${category.label}: ${category.missing[0]}`);
  });
  if (!audience.trim() && !hasAudienceSignal(text)) items.push("The intended audience or recommendation context.");
  if (req.needsLocation && !hasLocationSignal(text)) items.push("Location or market context.");
  if (req.needsCta && !includesAny(text, CTA_TERMS)) items.push("What the reader should do next.");
  return [...new Set(items)].slice(0, 6);
}

function buildProofChecklist({ text, req, sustainabilityClaim }) {
  return [
    {
      label: "Named award or recognition",
      status: checklistStatus(/\b(award|awards|recognised|recognition|ranking|ranked)\b/i.test(text), /\baward-winning\b/i.test(text)),
    },
    {
      label: "Year or recency marker",
      status: checklistStatus(hasDateSignal(text), false, !req.needsDates && !/\b(launch|launched|award|opened|published|released|updated)\b/i.test(text)),
    },
    {
      label: "Named source or third-party validation",
      status: checklistStatus(/\b(according to|featured in|published by|reviewed by|rated by|certified by|source)\b/i.test(text)),
    },
    {
      label: "Named expert, client, partner or collaborator",
      status: checklistStatus(/\b(expert|client|customer|partner|collaborator|founder|director|professor|doctor)\b/i.test(text) && hasNamedEntity(text)),
    },
    {
      label: "Measurable fact or result",
      status: checklistStatus(hasNumber(text)),
    },
    {
      label: "Clear location, category or offer detail",
      status: checklistStatus(hasLocationSignal(text) || includesAny(text, CATEGORY_TERMS)),
    },
    {
      label: "Relevant dates, terms or availability",
      status: checklistStatus(
        /\b(available|availability|valid|from|until|dates?|terms|includes|excludes|eligib|minimum|price|pricing)\b/i.test(text),
        false,
        !req.needsTerms
      ),
    },
    {
      label: "Claim-specific proof where needed",
      status: checklistStatus(!sustainabilityClaim || /\b(certified|certification|b corp|leed|iso|green key|audited|measured)\b/i.test(text), sustainabilityClaim),
    },
  ];
}

function buildMinimalFixes({ categories, proofChecklist, req }) {
  const fixes = [];
  categories
    .filter((category) => category.score < 7)
    .sort((a, b) => a.score - b.score)
    .forEach((category) => fixes.push(category.fix));
  if (proofChecklist.some((item) => item.status === "Missing")) {
    fixes.push("Add one named proof point that is already true and verifiable.");
  }
  if (req.needsTerms) fixes.push("Add dates, terms, inclusions or availability if this is an offer.");
  return [...new Set(fixes)].slice(0, 5);
}

function suggestNextAsset({ categories, req, contentType }) {
  const weakest = [...categories].sort((a, b) => a.score - b.score)[0]?.key;
  if (weakest === "proof") return "Proof bar";
  if (weakest === "structure" && req.needsFaq) return "FAQ answer";
  if (weakest === "structure") return "Key Facts block";
  if (weakest === "fit") return "Comparison-friendly section";
  if (req.needsTerms) return "Offer details block";
  if (req.needsBoilerplate) return "Clearer boilerplate";
  if (contentType === "Case study") return "Short case study";
  if (contentType === "Location or destination page") return "Destination/location guide";
  return "Micro-FAQ section";
}

function overallRationale(score, categories) {
  const weakest = [...categories].sort((a, b) => a.score - b.score)[0];
  if (score >= 8) {
    return "Your copy gives AI a strong foundation to understand, trust and recommend it, with only small gaps to tidy.";
  }
  if (score >= 6) {
    return `Your copy is clear in places, but AI may struggle where ${weakest.label.toLowerCase()} is weak or incomplete.`;
  }
  return `AI may struggle to extract and recommend this confidently because ${weakest.label.toLowerCase()} needs clearer facts or proof.`;
}

function buildReport(results) {
  if (!results) return "";
  const categoryLines = results.categories
    .map(
      (category) =>
        `${category.label}: ${category.score}/10\nRationale: ${category.rationale}\nMissing or unclear: ${category.missing.join("; ")}\nPractical fix: ${category.fix}`
    )
    .join("\n\n");
  const checklist = results.proofChecklist
    .map((item) => `- ${item.label}: ${item.status}`)
    .join("\n");
  return `AI Recommendation Readiness Report

Content type: ${results.contentType}
Audience/context: ${results.audience || "Not provided"}
Original score: ${results.overall}/10
Rationale: ${results.rationale}

Category scores
${categoryLines}

BLUF status: ${results.blufStatus}
${results.blufExplanation}

What AI is likely to understand
${results.understood.map((item) => `- ${item}`).join("\n")}

What AI may miss
${results.mayMiss.map((item) => `- ${item}`).join("\n")}

Missing proof checklist
${checklist}

Claims or details that may need clarification or proof
${results.riskIssues.length ? results.riskIssues.map((item) => `- ${item}`).join("\n") : "- No obvious issues flagged."}

Minimal fix list
${results.minimalFixes.map((item) => `- ${item}`).join("\n")}

Suggested next content asset
${results.nextAsset}

Want a deeper review? A full AI Visibility Diagnostic looks beyond one piece of copy to assess whether your brand is being found, understood and recommended across AI answers.
Book an AI Visibility Diagnostic: ${CTA_URL}

Created by Marta Warren - Brand Visibility in AI Search. Give your beautiful stories findable facts.`;
}

export default function Page() {
  const [contentType, setContentType] = useState("");
  const [audience, setAudience] = useState("");
  const [copy, setCopy] = useState("");
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const report = useMemo(() => buildReport(results), [results]);
  const wordCount = words(copy).length;

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(""), 2200);
  }

  function runAudit() {
    if (!contentType) {
      setError("Choose what type of copy this is.");
      setResults(null);
      return;
    }
    if (!copy.trim()) {
      setError("Paste the copy you want to check.");
      setResults(null);
      return;
    }
    setError("");
    setResults(auditCopy({ contentType, audience, copy }));
  }

  async function copyReport() {
    if (!report) return;
    await navigator.clipboard.writeText(report);
    showToast("Report copied.");
  }

  function downloadReport() {
    if (!report) return;
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ai-recommendation-readiness-report.txt";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Report downloaded.");
  }

  return (
    <main className="app-shell">
      <section className="topbar" aria-label="App header">
        <div>
          <p className="eyebrow">Answer Engine Readiness</p>
          <h1>See whether your copy gives AI enough to understand, trust and recommend you.</h1>
          <p className="subhead">
            Paste web, PR or brand copy to see whether it is clear, specific, verifiable and easy for AI assistants to extract.
          </p>
        </div>
        <div className="score-pill" aria-live="polite">
          <span>{results ? results.overall : "--"}</span>
          <span>AI Recommendation Readiness</span>
        </div>
      </section>

      <section className="workspace">
        <div className="input-panel">
          <div className="panel-heading">
            <div>
              <h2>Run a mini-audit</h2>
              <p>Score one piece of copy. The tool flags gaps; it does not rewrite your voice.</p>
            </div>
          </div>

          <label className="field-label" htmlFor="content-type">
            What type of copy is this?
          </label>
          <select
            id="content-type"
            className="select"
            value={contentType}
            onChange={(event) => setContentType(event.target.value)}
            required
          >
            <option value="">Select content type</option>
            {CONTENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <label className="field-label" htmlFor="audience">
            Who is this copy for?
          </label>
          <p className="helper">
            Optional, but useful. Helps assess whether the copy gives AI enough context to recommend it to the right audience.
          </p>
          <input
            id="audience"
            className="input"
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            placeholder="Example: potential customers, journalists, investors, travellers, local residents or business buyers"
          />

          <label className="field-label" htmlFor="copy">
            Paste your copy
          </label>
          <p className="helper">
            Paste the copy you want to check. This works best for web, PR and brand copy that needs to be clear, specific and easy to extract.
          </p>
          <textarea
            id="copy"
            className="textarea"
            value={copy}
            onChange={(event) => setCopy(event.target.value)}
            placeholder="Paste homepage, About page, product, service, campaign, PR or boilerplate copy..."
          />

          <div className="input-tools">
            <div className="metric">
              <span>{wordCount}</span>
              <small>words</small>
            </div>
            <button className="secondary-button" type="button" onClick={() => setCopy("")}>
              Clear copy
            </button>
            <button className="primary-button" type="button" onClick={runAudit}>
              Run diagnostic
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </div>

        <aside className="insight-panel" aria-label="Readiness overview">
          <img src="/readiness-visual.png" alt="" className="visual" />
          <div className="gauge-wrap">
            <div className="gauge" style={{ "--score": results ? results.overall * 10 : 0 }}>
              <span>{results ? results.overall : "--"}</span>
            </div>
            <div>
              <h2>{results ? scoreBand(results.overall) : "Ready when you are"}</h2>
              <p>{results ? results.rationale : "Choose a content type, paste your copy and get a practical AI-readiness diagnosis."}</p>
            </div>
          </div>
          <div className="benchmarks">
            <span>
              <b>8+</b> strong
            </span>
            <span>
              <b>6-7.9</b> needs work
            </span>
            <span>
              <b>&lt;6</b> weak
            </span>
          </div>
          {contentType && <p className="type-note">{CONTENT_TYPE_GUIDANCE[contentType]}</p>}
        </aside>
      </section>

      {results && (
        <section className="results-grid" aria-live="polite">
          <article className="result-card hero-result">
            <div>
              <p className="eyebrow">Overall Score</p>
              <h2>{results.overall}/10</h2>
              <p>{results.rationale}</p>
            </div>
            <div className={`status-chip ${results.blufStatus.toLowerCase().replace(" ", "-")}`}>
              BLUF status: {results.blufStatus}
            </div>
          </article>

          <article className="result-card wide-card">
            <div className="card-title">
              <h2>Category scores</h2>
              <div className="button-row">
                <button className="secondary-button" type="button" onClick={copyReport}>
                  Copy report
                </button>
                <button className="secondary-button" type="button" onClick={downloadReport}>
                  Download
                </button>
              </div>
            </div>
            <div className="category-grid">
              {results.categories.map((category) => (
                <section className="category-card" key={category.key}>
                  <div className="category-top">
                    <h3>{category.label}</h3>
                    <span className={`mini-score ${category.band.toLowerCase().replace(" ", "-")}`}>{category.score}/10</span>
                  </div>
                  <p>{category.rationale}</p>
                  <h4>Missing or unclear</h4>
                  <ul>
                    {category.missing.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <h4>Practical fix</h4>
                  <p>{category.fix}</p>
                </section>
              ))}
            </div>
          </article>

          <article className="result-card">
            <h2>BLUF status</h2>
            <p className={`status-line ${results.blufStatus.toLowerCase().replace(" ", "-")}`}>{results.blufStatus}</p>
            <p>{results.blufExplanation}</p>
            <p className="muted">This only scores the existing opening. It does not generate a new BLUF.</p>
          </article>

          <AuditList title="What AI is likely to understand" items={results.understood} />
          <AuditList title="What AI may miss" items={results.mayMiss} />

          <article className="result-card wide-card">
            <h2>Missing proof checklist</h2>
            <div className="checklist">
              {results.proofChecklist.map((item) => (
                <div className={`check-row ${item.status.toLowerCase().replace(" ", "-")}`} key={item.label}>
                  <span>{item.label}</span>
                  <b>{item.status}</b>
                </div>
              ))}
            </div>
          </article>

          <AuditList
            title="Claims or details that may need clarification or proof"
            items={results.riskIssues.length ? results.riskIssues : ["No obvious issues flagged by this check."]}
          />
          <AuditList title="Minimal Fix List" items={results.minimalFixes} ordered />

          <article className="result-card">
            <h2>Suggested next content asset</h2>
            <p className="asset-name">{results.nextAsset}</p>
            <p className="muted">This is the smallest supporting asset likely to improve AI-readiness.</p>
          </article>

          <article className="result-card wide-card cta">
            <div>
              <h2>Want a deeper review?</h2>
              <p>
                A full AI Visibility Diagnostic looks beyond one piece of copy to assess whether your brand is being found, understood and recommended across AI answers.
              </p>
            </div>
            <a className="primary-button link-button" href={CTA_URL} target="_blank" rel="noreferrer">
              Book an AI Visibility Diagnostic
            </a>
          </article>
        </section>
      )}

      <footer>
        Created by Marta Warren - Brand Visibility in AI Search. Give your beautiful stories findable facts.
      </footer>

      <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>
    </main>
  );
}

function AuditList({ title, items, ordered = false }) {
  const ListTag = ordered ? "ol" : "ul";
  return (
    <article className="result-card">
      <h2>{title}</h2>
      <ListTag className="audit-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ListTag>
    </article>
  );
}
