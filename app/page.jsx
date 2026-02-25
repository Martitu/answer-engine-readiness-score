"use client";
import React, { useMemo, useState } from "react";

const LUXURY_BENCHMARK = 6.2;
const CTA_URL = "https://martawarren.com/ai-search-brand-visibility/";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function words(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean);
}

function firstNWords(text, n) {
  const w = words(text);
  return w.slice(0, n).join(" ");
}

function splitSentences(text) {
  return (text || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function hasNumber(text) {
  return /\d/.test(text || "");
}

function hasCurrency(text) {
  return /[€$£]\s?\d/.test(text || "");
}

function hasYear(text) {
  return /\b(19|20)\d{2}\b/.test(text || "");
}

function hasMonth(text) {
  return /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/i.test(text || "");
}

function hasDateSignal(text) {
  return hasYear(text) || hasMonth(text);
}

function hasCTA(text) {
  const t = (text || "").toLowerCase();
  return ["book", "enquir", "enquiries", "email", "call", "phone", "dm", "link in bio", "website"].some((k) =>
    t.includes(k)
  );
}

function hasLocationSignal(text) {
  const t = (text || "").toLowerCase();
  // lightweight heuristic; luxury copy often uses "in/at/on/near"
  return t.includes(" in ") || t.includes(" at ") || t.includes(" on ") || t.includes(" near ") || t.includes(" within ");
}

function hasWhatItIsSignal(text) {
  const t = (text || "").toLowerCase();
  return ["hotel", "resort", "villa", "villas", "lodge", "retreat", "finca", "estate", "private island"].some((k) =>
    t.includes(k)
  );
}

function hasBestForSignal(text) {
  const t = (text || "").toLowerCase();
  return ["best for", "ideal for", "perfect for", "suited to", "designed for"].some((k) => t.includes(k));
}

function hasStructureSignal(text) {
  const t = (text || "").toLowerCase();
  return /(^|\n)\s*[-•]/.test(text || "") || ["key facts", "highlights", "at a glance", "included", "inclusions"].some((k) => t.includes(k));
}

function containsSuperlatives(lower) {
  const risky = [
    "world-class",
    "best",
    "most luxurious",
    "iconic",
    "renowned",
    "unrivalled",
    "award-winning",
    "number one",
    "no. 1",
    "ultimate",
    "once-in-a-lifetime",
  ];
  return risky.some((x) => lower.includes(x));
}

function getBand(score) {
  if (score <= 3) return "Hard to Extract";
  if (score <= 6) return "Extractable with Gaps";
  if (score <= 8) return "Strong Foundation";
  return "Recommendation-Ready";
}

function extractRepeatables(text) {
  const sents = splitSentences(text);

  const scored = sents.map((s) => {
    let score = 0;
    if (hasNumber(s) || hasCurrency(s)) score += 3;
    if (hasDateSignal(s)) score += 2;
    if (hasLocationSignal(s)) score += 1;
    if (hasWhatItIsSignal(s)) score += 1;
    if (s.length >= 45 && s.length <= 180) score += 1; // quotable range
    return { s, score };
  });

  const picks = scored
    .sort((a, b) => b.score - a.score)
    .filter((x) => x.score >= 3)
    .slice(0, 6)
    .map((x) => x.s);

  if (picks.length === 0) return sents.slice(0, 2);
  return picks;
}

function buildHesitations(text) {
  const t = (text || "").trim();
  const lower = t.toLowerCase();
  const items = [];

  // Essentials
  if (!hasWhatItIsSignal(t)) items.push("The category isn’t explicit (hotel / resort / villa / lodge).");
  if (!hasLocationSignal(t)) items.push("The destination isn’t stated clearly (place + region/country).");
  if (!hasBestForSignal(t)) items.push("‘Who it’s for’ isn’t explicit (occasion / traveller type).");
  if (!hasCTA(t)) items.push("The booking action isn’t explicit (link / email / phone / enquiry channel).");

  // Proof/constraints
  if (!hasNumber(t)) items.push("No measurable detail (dates, ‘from’ price, duration, capacity, distance, etc.).");
  if (hasMonth(t) && !hasYear(t)) items.push("Dates/months appear without a year (makes summaries less reliable).");
  if (lower.includes("available") && !(hasDateSignal(t) || lower.includes("subject to availability") || lower.includes("minimum"))) {
    items.push("Availability is mentioned without clear constraints (dates / minimum stay / subject to availability).");
  }
  if (containsSuperlatives(lower)) items.push("Some superlatives read like claims unless anchored with a specific detail.");

  return items.slice(0, 7);
}

function buildProofMissing(text) {
  const t = (text || "").trim();
  const lower = t.toLowerCase();
  const items = [];

  // Proof types (light-touch, content-only)
  if (!hasDateSignal(t)) items.push("A recency marker (month/year, launch date, reopening date, seasonal window).");
  if (!hasNumber(t) && !hasCurrency(t)) items.push("One quantifiable proof point (price from / capacity / distance / duration / estate size / number of rooms).");

  // When months exist but no year
  if (hasMonth(t) && !hasYear(t)) items.push("Year attached to any month/season reference (e.g., ‘March 2026’).");

  // Claimy language
  if (containsSuperlatives(lower)) items.push("A supporting detail for any superlative (or soften the phrasing).");

  // Booking confidence
  if (lower.includes("from") && !hasCurrency(t)) items.push("Clarify ‘from’ pricing with currency and what it refers to (if mentioned).");

  return items.slice(0, 6);
}

function buildConsistencyRisks(text) {
  const lower = (text || "").toLowerCase();
  const risks = [];

  // Simple mismatch heuristics (no invented facts)
  const hasThreeDays = lower.includes("three days");
  const hasThreeNights = lower.includes("three-night") || lower.includes("three night");
  if (hasThreeDays && hasThreeNights) risks.push("Duration wording looks inconsistent (‘three days’ vs ‘three nights’). Align to one.");

  const hasForTwo = lower.includes("for two");
  const hasPerGuest = lower.includes("for each guest") || lower.includes("per guest");
  if (hasForTwo && hasPerGuest) risks.push("Scope wording may conflict (‘for two’ vs ‘per guest’). Clarify what applies per booking vs per guest.");

  // Date formatting (light)
  if (/\b\d+(st|nd|rd|th)\b/i.test(lower)) risks.push("Date formatting: AI summarises better with ‘6 March 2026’ (no ‘6th’).");

  // Naming consistency – if many capitals & variants
  if (lower.includes("tramuntana") && (lower.includes("mountains") && lower.includes("mountain range"))) {
    risks.push("Place naming appears in multiple forms (e.g., ‘Mountains’ vs ‘mountain range’). Choose one canonical phrasing.");
  }

  return risks.slice(0, 6);
}

function buildQuickWins(text) {
  const t = (text || "").trim();
  const lower = t.toLowerCase();
  const wins = [];

  if (!hasBestForSignal(t)) wins.push("Add one plain ‘Best for…’ line near the top (occasion / traveller type).");
  if (!hasNumber(t)) wins.push("Add one measurable detail (date, duration, capacity, distance, or ‘from’ price).");
  if (hasMonth(t) && !hasYear(t)) wins.push("Attach a year to any month/season reference (e.g., ‘March 2026’).");
  if (!hasCTA(t)) wins.push("Add a clear booking action (link / email / phone / enquiry channel).");
  if (containsSuperlatives(lower)) wins.push("Soften unsupported superlatives (or anchor them with a specific detail).");
  if (!hasStructureSignal(t)) wins.push("Add a short ‘Key facts’ block (5–7 bullets) so AI can extract essentials quickly.");

  return wins.slice(0, 5);
}

export default function Page() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState(null);

  const runAudit = () => {
    const text = (input || "").trim();
    if (!text) {
      setResults(null);
      return;
    }

    // --- Editorial scoring (0–10) ---
    // 1) Clarity (0–4)
    let clarity = 0;
    if (hasWhatItIsSignal(text)) clarity += 1.5;
    if (hasLocationSignal(text)) clarity += 1.5;
    if (hasBestForSignal(text)) clarity += 1;
    clarity = clamp(clarity, 0, 4);

    // 2) Verifiability (0–3)
    let verifiability = 0;
    if (hasNumber(text) || hasCurrency(text)) verifiability += 1;
    if (hasDateSignal(text)) verifiability += 1;
    if (text.toLowerCase().includes("minimum") || text.toLowerCase().includes("subject to availability") || text.toLowerCase().includes("available")) {
      verifiability += 1;
    }
    verifiability = clamp(verifiability, 0, 3);

    // 3) Structure (0–3)
    let structure = 0;
    if (hasStructureSignal(text)) structure += 1;
    if (!containsSuperlatives(text.toLowerCase())) structure += 1;
    if (splitSentences(text).length >= 3) structure += 1;
    structure = clamp(structure, 0, 3);

    const overall = Math.round((clarity + verifiability + structure) * 10) / 10;
    const band = getBand(overall);

    let rationale;
    if (band === "Hard to Extract") {
      rationale =
        "Atmospheric, but unclear on specifics. Without a defined proposition and at least one measurable detail, AI assistants struggle to summarise this confidently.";
    } else if (band === "Extractable with Gaps") {
      rationale =
        "The fundamentals are present, but AI would still have to infer key details. Tighten the opening and add one verifiable proof point to increase recommendation confidence.";
    } else if (band === "Strong Foundation") {
      rationale =
        "Clear proposition and supporting detail make this reasonably safe for AI extraction. A little more structure and one extra proof point would strengthen reuse.";
    } else {
      rationale =
        "Clear, structured and supported by verifiable detail. This is close to recommendation-ready for AI summaries.";
    }

    // Lead (first ~100 words)
    const lead = firstNWords(text, 95);
    const leadChecks = {
      whatItIs: hasWhatItIsSignal(lead),
      where: hasLocationSignal(lead),
      bestFor: hasBestForSignal(lead),
      proof: hasNumber(lead) || hasCurrency(lead) || hasDateSignal(lead),
    };

    const repeatables = extractRepeatables(text).slice(0, 6);
    const hesitations = buildHesitations(text);
    const proofMissing = buildProofMissing(text);
    const consistencyRisks = buildConsistencyRisks(text);
    const quickWins = buildQuickWins(text);

    const structureChecks = [
      {
        label: "Key facts block",
        ok: text.toLowerCase().includes("key facts") || text.toLowerCase().includes("at a glance") || text.toLowerCase().includes("highlights"),
        hint: "Add 5–7 bullets with defensible facts (what/where/dates/inclusions/constraints).",
      },
      {
        label: "Scannable sections / bullets",
        ok: /(^|\n)\s*[-•]/.test(text) || splitSentences(text).length >= 4,
        hint: "Break dense paragraphs into short sections or bullets where the facts live.",
      },
      {
        label: "Guest-intent Q&A",
        ok: text.toLowerCase().includes("faq") || /\bq:\b/i.test(text) || text.includes("?"),
        hint: "Add 3–5 micro-FAQs (where, what’s included, when available, how to book).",
      },
    ];

    setResults({
      overall,
      band,
      rationale,
      lead,
      leadChecks,
      repeatables,
      hesitations,
      proofMissing,
      structureChecks,
      consistencyRisks,
      quickWins,
    });
  };

  const delta = useMemo(() => {
    if (!results) return null;
    const d = Math.round((results.overall - LUXURY_BENCHMARK) * 10) / 10;
    return (d >= 0 ? "+" : "") + d;
  }, [results]);

  // Styles: make "answers" pop vs muted UI
  const answerStyle = { color: "var(--ivory)" };
  const answerBoxStyle = {
    background: "var(--panel2)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: 16,
  };

  return (
    <div className="container">
      <div>
        <h1 className="h1">Answer Engine Readiness Score</h1>
        <p className="sub">A quick copy hygiene check for AI extractability (luxury hospitality edition).</p>
      </div>

      <div className="card">
        <textarea
          className="textarea"
          placeholder="Paste your press release, property page, or social caption here…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn primary" onClick={runAudit}>
            Run Score
          </button>
        </div>
      </div>

      {results && (
        <div className="card">
          {/* 1) Score */}
          <h2 className="section-title">Answer Engine Readiness</h2>
          <div style={answerBoxStyle}>
            <div className="score" style={answerStyle}>
              <span style={{ color: "var(--gold)" }}>{results.overall}</span>/10
            </div>
            <div className="score-band">{results.band}</div>
            <p className="muted" style={{ marginTop: 10 }}>
              {results.rationale}
            </p>
            <p className="muted" style={{ marginTop: 10 }}>
              Luxury benchmark reference: {LUXURY_BENCHMARK}/10 ({delta})
            </p>
          </div>

          {/* 2) Lead extractability */}
          <h2 className="section-title" style={{ marginTop: 28 }}>
            Lead Extractability
          </h2>
          <p className="muted" style={{ marginTop: -6 }}>
            AI tools lean heavily on opening lines. If the “what / where / who it’s for” isn’t clear early, you’re less likely to be quoted or recommended.
          </p>

          <div style={answerBoxStyle}>
            <p style={{ ...answerStyle, marginTop: 0 }}>{results.lead}</p>
            <div className="row" style={{ marginTop: 10 }}>
              <span className="score-band" style={{ background: results.leadChecks.whatItIs ? "var(--gold-soft)" : "transparent" }}>
                {results.leadChecks.whatItIs ? "✓ What it is" : "□ What it is"}
              </span>
              <span className="score-band" style={{ background: results.leadChecks.where ? "var(--gold-soft)" : "transparent" }}>
                {results.leadChecks.where ? "✓ Where it is" : "□ Where it is"}
              </span>
              <span className="score-band" style={{ background: results.leadChecks.bestFor ? "var(--gold-soft)" : "transparent" }}>
                {results.leadChecks.bestFor ? "✓ Who it’s for" : "□ Who it’s for"}
              </span>
              <span className="score-band" style={{ background: results.leadChecks.proof ? "var(--gold-soft)" : "transparent" }}>
                {results.leadChecks.proof ? "✓ Proof point" : "□ Proof point"}
              </span>
            </div>
          </div>

          {/* 3) What AI will repeat */}
          <h2 className="section-title" style={{ marginTop: 28 }}>
            What AI Is Likely to Repeat
          </h2>
          <p className="muted" style={{ marginTop: -6 }}>
            These are the most quotable, defensible lines in your draft — the parts an assistant can reuse with minimal risk.
          </p>

          <div style={answerBoxStyle}>
            <ul style={{ ...answerStyle, margin: 0, paddingLeft: 18 }}>
              {results.repeatables.length ? (
                results.repeatables.map((s, i) => <li key={i} style={{ marginBottom: 8 }}>{s}</li>)
              ) : (
                <li>Add one measurable detail (dates/price/duration) and a clearer proposition — then rerun.</li>
              )}
            </ul>
          </div>

          {/* 4) What's vague / missing */}
          <h2 className="section-title" style={{ marginTop: 28 }}>
            What’s Vague / Missing
          </h2>

          <div style={answerBoxStyle}>
            <ul style={{ ...answerStyle, margin: 0, paddingLeft: 18 }}>
              {results.hesitations.length ? results.hesitations.map((h, i) => <li key={i} style={{ marginBottom: 8 }}>{h}</li>) : <li>No major gaps detected.</li>}
            </ul>
          </div>

          {/* 5) What proof is missing */}
          <h2 className="section-title" style={{ marginTop: 28 }}>
            What Proof Is Missing
          </h2>
          <p className="muted" style={{ marginTop: -6 }}>
            This isn’t about “adding marketing claims.” It’s about adding one or two details that make a summary trustworthy.
          </p>

          <div style={answerBoxStyle}>
            <ul style={{ ...answerStyle, margin: 0, paddingLeft: 18 }}>
              {results.proofMissing.length ? results.proofMissing.map((p, i) => <li key={i} style={{ marginBottom: 8 }}>{p}</li>) : <li>Nothing obvious flagged here.</li>}
            </ul>
          </div>

          {/* 6) Structure & reuse */}
          <h2 className="section-title" style={{ marginTop: 28 }}>
            Structure & Reuse Check
          </h2>

          <div style={answerBoxStyle}>
            <ul style={{ ...answerStyle, margin: 0, paddingLeft: 18 }}>
              {results.structureChecks.map((c, i) => (
                <li key={i} style={{ marginBottom: 10 }}>
                  <strong>{c.label}:</strong> {c.ok ? "Yes" : "No"}
                  {!c.ok && <div className="muted" style={{ marginTop: 4 }}>{c.hint}</div>}
                </li>
              ))}
            </ul>
          </div>

          {/* 7) Consistency risks */}
          <h2 className="section-title" style={{ marginTop: 28 }}>
            Consistency Risks
          </h2>

          <div style={answerBoxStyle}>
            <ul style={{ ...answerStyle, margin: 0, paddingLeft: 18 }}>
              {results.consistencyRisks.length ? (
                results.consistencyRisks.map((r, i) => <li key={i} style={{ marginBottom: 8 }}>{r}</li>)
              ) : (
                <li>No obvious consistency issues flagged.</li>
              )}
            </ul>
          </div>

          {/* 8) Quick wins */}
          <h2 className="section-title" style={{ marginTop: 28 }}>
            Quick Wins (Copy Hygiene)
          </h2>
          <p className="muted" style={{ marginTop: -6 }}>
            Light-touch tweaks to improve extractability. Strategic repositioning is a separate exercise.
          </p>

          <div style={answerBoxStyle}>
            <ul style={{ ...answerStyle, margin: 0, paddingLeft: 18 }}>
              {results.quickWins.length ? results.quickWins.map((q, i) => <li key={i} style={{ marginBottom: 8 }}>{q}</li>) : <li>No obvious quick wins detected.</li>}
            </ul>
          </div>

          {/* 9) CTA differentiation */}
          <div className="cta" style={{ marginTop: 24 }}>
            <p className="muted" style={{ marginTop: 0 }}>
              This checks copy hygiene. A full audit benchmarks how your brand appears across real AI prompts — and where competitors outperform you.
            </p>
            <div className="row" style={{ marginTop: 10 }}>
              <a href={CTA_URL} target="_blank" rel="noreferrer">
                <button className="btn primary">Request Full Benchmark Audit</button>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Footer (always visible) */}
      <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>
        Created by Marta Warren | AI-Ready Copy &amp; Content for Luxury Lifestyle Brands
      </p>
    </div>
  );
}
