"use client";
import React, { useMemo, useState } from "react";

const LUXURY_BENCHMARK = 6.2;
const CTA_URL = "https://martawarren.com/ai-search-brand-visibility/";

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
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
    .map(s => s.trim())
    .filter(Boolean);
}

function hasNumber(text) { return /\d/.test(text || ""); }
function hasCurrency(text) { return /[€$£]\s?\d/.test(text || ""); }
function hasYear(text) { return /\b(19|20)\d{2}\b/.test(text || ""); }
function hasMonth(text) { return /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/i.test(text || ""); }
function hasDateSignal(text) { return hasYear(text) || hasMonth(text); }

function hasCTA(text) {
  const t = (text || "").toLowerCase();
  return ["book", "enquir", "enquiries", "email", "call", "phone", "link", "website", "dm"].some(k => t.includes(k));
}
function hasLocationSignal(text) {
  const t = (text || "").toLowerCase();
  return t.includes(" in ") || t.includes(" near ") || t.includes(" on ") || t.includes(" at ") || t.includes("based in");
}
function hasWhatItIsSignal(text) {
  const t = (text || "").toLowerCase();
  return ["hotel", "resort", "villa", "villas", "lodge", "retreat", "finca", "estate", "private island"].some(k => t.includes(k));
}
function hasBestForSignal(text) {
  const t = (text || "").toLowerCase();
  return ["best for", "ideal for", "perfect for", "suited to", "designed for"].some(k => t.includes(k));
}
function hasStructureSignal(text) {
  const t = (text || "").toLowerCase();
  return /(^|\n)\s*[-•]/.test(text || "") ||
    ["key facts", "highlights", "at a glance", "included", "inclusions"].some(k => t.includes(k));
}

function extractRepeatables(text) {
  const sents = splitSentences(text);

  const scored = sents.map(s => {
    let score = 0;
    if (hasNumber(s) || hasCurrency(s)) score += 3;
    if (hasDateSignal(s)) score += 2;
    if (hasLocationSignal(s)) score += 1;
    if (hasWhatItIsSignal(s)) score += 1;
    if (s.length >= 45 && s.length <= 170) score += 1; // quotable
    return { s, score };
  });

  const picks = scored
    .sort((a, b) => b.score - a.score)
    .filter(x => x.score >= 3)
    .slice(0, 6)
    .map(x => x.s);

  // fallback: pick first two sentences if nothing qualifies
  if (picks.length === 0) return sents.slice(0, 2);
  return picks;
}

function findHesitations(text) {
  const t = (text || "").trim();
  const lower = t.toLowerCase();
  const items = [];

  // Missing basics
  if (!hasWhatItIsSignal(t)) items.push("The category isn’t explicit (hotel / resort / villa / lodge). AI assistants often skip or generalise without this.");
  if (!hasLocationSignal(t)) items.push("The destination isn’t stated clearly (place + country/region).");
  if (!hasBestForSignal(t)) items.push("‘Who it’s for’ isn’t explicit (occasion / traveller type).");
  if (!hasCTA(t)) items.push("Booking action isn’t explicit (link / email / phone / booking channel).");

  // Proof/constraints
  if (!hasNumber(t)) items.push("No measurable detail (dates, pricing ‘from’, duration, capacity, distance, etc.).");
  if (hasMonth(t) && !hasYear(t)) items.push("Months/dates appear without a year, which makes summaries less reliable.");
  if (lower.includes("available") && !(hasDateSignal(t) || lower.includes("subject to availability"))) {
    items.push("Availability is mentioned without clear constraints (dates/season/min nights/subject to availability).");
  }

  // Risky language (light-touch)
  if (containsSuperlatives(lower)) items.push("Some descriptive superlatives may read as ‘claims’ (AI prefers defensible phrasing or supporting detail).");

  return items.slice(0, 6);
}

function containsSuperlatives(lower) {
  const risky = [
    "world-class", "best", "most luxurious", "iconic", "renowned", "unrivalled", "award-winning",
    "number one", "no. 1", "ultimate", "unforgettable", "once-in-a-lifetime"
  ];
  return risky.some(x => lower.includes(x));
}

function structureCheck(text) {
  const t = (text || "").trim();
  const checks = [
    {
      label: "Key facts block",
      ok: (t.toLowerCase().includes("key facts") || t.toLowerCase().includes("at a glance") || t.toLowerCase().includes("highlights")),
      hint: "Add 5–8 bullets with the defensible facts (what/where/dates/inclusions/constraints)."
    },
    {
      label: "Scannable bullets or sections",
      ok: /(^|\n)\s*[-•]/.test(t) || splitSentences(t).length >= 4,
      hint: "Break dense paragraphs into short headings + bullets where the facts live."
    },
    {
      label: "Guest-intent Q&A",
      ok: t.toLowerCase().includes("faq") || /\bq:\b/i.test(t) || t.includes("?"),
      hint: "Add 3–6 micro-FAQs (where, what’s included, when available, how to book)."
    }
  ];
  return checks;
}

function getBand(score) {
  if (score <= 3) return "Hard to Extract";
  if (score <= 6) return "Extractable with Gaps";
  if (score <= 8) return "Strong Foundation";
  return "Recommendation-Ready";
}

function buildQuickWins(text) {
  const t = (text || "").trim();
  const lower = t.toLowerCase();
  const wins = [];

  if (!hasBestForSignal(t)) wins.push("Add one plain ‘Best for…’ line (occasion / traveller type) near the top.");
  if (!hasNumber(t)) wins.push("Add one measurable detail (date, duration, capacity, distance, or price ‘from’).");
  if (hasMonth(t) && !hasYear(t)) wins.push("Make the year explicit for any stated months/dates (e.g., ‘March 2026’).");
  if (!hasCTA(t)) wins.push("Add a clear booking action (link / email / phone / enquiry channel).");
  if (containsSuperlatives(lower)) wins.push("Soften unsupported superlatives (or anchor them with a specific, defensible detail).");
  if (!hasStructureSignal(t)) wins.push("Add a short ‘Key facts’ bullet list so AI can extract the essentials quickly.");

  // Keep max 5, and keep them “light-touch”
  return wins.slice(0, 5);
}

export default function Page() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState(null);

  const runAudit = () => {
    const text = (input || "").trim();

    // --- Editorial scoring (0–10) ---
    // Clarity (0–4)
    let clarity = 0;
    if (hasWhatItIsSignal(text)) clarity += 1.5;
    if (hasLocationSignal(text)) clarity += 1.5;
    if (hasBestForSignal(text)) clarity += 1;
    clarity = clamp(clarity, 0, 4);

    // Verifiability (0–3)
    let verifiability = 0;
    if (hasNumber(text) || hasCurrency(text)) verifiability += 1;
    if (hasDateSignal(text)) verifiability += 1;
    if (text.toLowerCase().includes("minimum") || text.toLowerCase().includes("subject to availability") || text.toLowerCase().includes("available")) verifiability += 1;
    verifiability = clamp(verifiability, 0, 3);

    // Extractable structure (0–3)
    let structure = 0;
    if (hasStructureSignal(text)) structure += 1;
    if (!containsSuperlatives(text.toLowerCase())) structure += 1; // fewer “claimy” phrases
    if (splitSentences(text).length >= 3) structure += 1; // at least some crisp statements
    structure = clamp(structure, 0, 3);

    const overall = Math.round((clarity + verifiability + structure) * 10) / 10;
    const band = getBand(overall);

    let rationale;
    if (band === "Hard to Extract") {
      rationale = "The opening is atmospheric but unclear on specifics. Without a defined proposition and at least one measurable detail, AI assistants struggle to summarise this confidently.";
    } else if (band === "Extractable with Gaps") {
      rationale = "The fundamentals are present, but AI would still have to infer key details. Tighten the opening and add one verifiable proof point to increase recommendation confidence.";
    } else if (band === "Strong Foundation") {
      rationale = "Clear proposition and supporting detail make this reasonably safe for AI extraction. A little more structure and one extra proof point would strengthen reuse.";
    } else {
      rationale = "Clear, structured, and supported by verifiable detail. This is close to recommendation-ready for AI summaries.";
    }

    const lead = firstNWords(text, 95);
    const leadChecks = {
      whatItIs: hasWhatItIsSignal(lead),
      where: hasLocationSignal(lead),
      bestFor: hasBestForSignal(lead),
      proof: hasNumber(lead) || hasCurrency(lead) || hasDateSignal(lead)
    };

    const repeatables = extractRepeatables(text).slice(0, 6);
    const hesitations = findHesitations(text);
    const structureChecks = structureCheck(text);
    const quickWins = buildQuickWins(text);

    setResults({
      overall,
      band,
      rationale,
      lead,
      leadChecks,
      repeatables,
      hesitations,
      structureChecks,
      quickWins
    });
  };

  const delta = useMemo(() => {
    if (!results) return null;
    const d = Math.round((results.overall - LUXURY_BENCHMARK) * 10) / 10;
    return (d >= 0 ? "+" : "") + d;
  }, [results]);

  return (
    <div className="container">
      <div>
        <h1 className="h1">Answer Engine Readiness Score</h1>
        <p className="sub">A quick copy hygiene check for AI extractability (luxury hospitality edition).</p>
      </div>

      <div className="card">
        <textarea
          className="textarea"
          placeholder="Paste your press release, property page, or social caption here..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn btnGold" onClick={runAudit}>
            Run Score
          </button>
        </div>
      </div>

      {results && (
        <div className="card">
          {/* 1) Score + band */}
          <h2 className="h2">Answer Engine Readiness Score</h2>
          <div className="kpi">
            <div className="score">
              <span style={{ color: "var(--gold)" }}>{results.overall}</span>/10
            </div>
            <div className="badge" style={{ marginTop: 8 }}>{results.band}</div>
            <p className="small" style={{ marginTop: 10 }}>{results.rationale}</p>
            <p className="small" style={{ marginTop: 10 }}>
              Luxury benchmark reference: {LUXURY_BENCHMARK}/10 ({delta})
            </p>
          </div>

          {/* 2) First 100 words */}
          <h2 className="h2">First 100 Words: Would AI “Get It”?</h2>
          <p className="small" style={{ marginTop: -6 }}>
            AI tools lean on opening lines to understand what something is. If the “what / where / who it’s for” isn’t clear upfront,
            you’re less likely to be quoted or recommended.
          </p>
          <div className="kpi">
            <p style={{ marginTop: 0 }}>{results.lead || "(No text detected.)"}</p>
            <div className="row" style={{ marginTop: 10 }}>
              <span className="badge">{results.leadChecks.whatItIs ? "✓ What it is" : "□ What it is (missing)"}</span>
              <span className="badge">{results.leadChecks.where ? "✓ Where it is" : "□ Where it is (missing)"}</span>
              <span className="badge">{results.leadChecks.bestFor ? "✓ Who it’s for" : "□ Who it’s for (missing)"}</span>
              <span className="badge">{results.leadChecks.proof ? "✓ Proof point" : "□ Proof point (missing)"}</span>
            </div>
          </div>

          {/* 3) What AI can repeat */}
          <h2 className="h2">What AI Can Confidently Repeat</h2>
          <p className="small" style={{ marginTop: -6 }}>
            These are statements an AI assistant could reuse with minimal risk, because they’re reasonably specific.
          </p>
          <div className="kpi">
            <ul className="ul">
              {results.repeatables.length ? results.repeatables.map((s, i) => (
                <li key={i}>{s}</li>
              )) : <li>Not enough defensible specifics yet — add one measurable detail (dates/price/duration) and a clearer proposition.</li>}
            </ul>
          </div>

          {/* 4) What makes AI hesitate */}
          <h2 className="h2">What Makes AI Hesitate</h2>
          <div className="kpi">
            <ul className="ul">
              {results.hesitations.length ? results.hesitations.map((h, i) => (
                <li key={i}>{h}</li>
              )) : <li>No major hesitation signals detected in this draft.</li>}
            </ul>
          </div>

          {/* 5) Structure & reuse */}
          <h2 className="h2">Structure & Reuse Check</h2>
          <div className="kpi">
            <ul className="ul">
              {results.structureChecks.map((c, i) => (
                <li key={i}>
                  <strong>{c.label}:</strong> {c.ok ? "Yes" : "No"}
                  {!c.ok && <span className="small"> — {c.hint}</span>}
                </li>
              ))}
            </ul>
          </div>

          {/* 6) Quick wins */}
          <h2 className="h2">Quick Wins (Copy Hygiene)</h2>
          <p className="small" style={{ marginTop: -6 }}>
            Light-touch adjustments to improve extractability. Strategic repositioning is a separate exercise.
          </p>
          <div className="kpi">
            <ul className="ul">
              {results.quickWins.length ? results.quickWins.map((q, i) => <li key={i}>{q}</li>) : <li>No obvious quick wins detected.</li>}
            </ul>
          </div>

          {/* 7) CTA differentiation */}
          <div className="kpi" style={{ marginTop: 16 }}>
            <p className="small" style={{ marginTop: 0 }}>
              This checks copy hygiene. A full audit benchmarks how your brand appears across real AI prompts — and where competitors outperform you.
            </p>
            <div className="row">
              <a href={CTA_URL} target="_blank" rel="noreferrer">
                <button className="btn btnGold">Request Full Benchmark Audit</button>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
