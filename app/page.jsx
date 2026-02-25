"use client";

import React, { useMemo, useState } from "react";

const LUXURY_BENCHMARK = 6.2; // you already use this reference score :contentReference[oaicite:4]{index=4}

/** ---------- small helpers ---------- **/
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

function splitParagraphs(text) {
  return (text || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function avgSentenceLength(text) {
  const sents = splitSentences(text);
  if (!sents.length) return 0;
  const totalWords = sents.reduce((sum, s) => sum + words(s).length, 0);
  return totalWords / sents.length;
}

function longestParagraphWords(text) {
  const paras = splitParagraphs(text);
  if (!paras.length) return 0;
  return Math.max(...paras.map((p) => words(p).length));
}

function hasBullets(text) {
  return /(^|\n)\s*[-•]/.test(text || "");
}

function hasHeadings(text) {
  const t = text || "";
  // super lightweight: lines that look like headings or labels
  return /(^|\n)\s*(key facts|highlights|at a glance|overview|details|included|inclusions)\s*[:\-]/i.test(
    t
  );
}

/** ---------- “signals” (non-technical, heuristic) ---------- **/
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
  return /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/i.test(
    text || ""
  );
}
function hasDateSignal(text) {
  return hasYear(text) || hasMonth(text);
}
function hasLocationSignal(text) {
  const t = (text || "").toLowerCase();
  // very light: common location prepositions
  return (
    t.includes(" in ") ||
    t.includes(" at ") ||
    t.includes(" on ") ||
    t.includes(" near ") ||
    t.includes(" within ")
  );
}
function hasWhatItIsSignal(text) {
  const t = (text || "").toLowerCase();
  return [
    "hotel",
    "resort",
    "villa",
    "villas",
    "lodge",
    "retreat",
    "finca",
    "estate",
    "private island",
  ].some((k) => t.includes(k));
}
function hasBestForSignal(text) {
  const t = (text || "").toLowerCase();
  return ["best for", "ideal for", "perfect for", "suited to", "designed for"].some(
    (k) => t.includes(k)
  );
}
function hasWhoSignal(text) {
  // heuristic: “Son Bunyola”, “Virgin Limited Edition”, etc. (two Capitalised words)
  return /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/.test(text || "");
}
function hasWhySignal(text) {
  const t = (text || "").toLowerCase();
  return [
    "because",
    "to mark",
    "to celebrate",
    "to meet demand",
    "in response",
    "driven by",
    "as travellers",
    "so guests can",
    "so that",
    "to help",
  ].some((k) => t.includes(k));
}
function hasSoWhatSignal(text) {
  const t = (text || "").toLowerCase();
  return ["so that", "so guests", "meaning", "which means", "this means", "allows guests"].some(
    (k) => t.includes(k)
  );
}

function containsPrestigeWords(text) {
  const lower = (text || "").toLowerCase();
  const risky = [
    "world-class",
    "iconic",
    "renowned",
    "unrivalled",
    "award-winning",
    "number one",
    "no. 1",
    "ultimate",
    "once-in-a-lifetime",
    "best",
    "most luxurious",
  ];
  return risky.some((x) => lower.includes(x));
}

function getBand(score) {
  if (score <= 3) return "Hard to Extract";
  if (score <= 6) return "Extractable with Gaps";
  if (score <= 8) return "Strong Foundation";
  return "Recommendation-Ready";
}

/** ---------- what AI will repeat (fact-y lines) ---------- **/
function extractRepeatables(text) {
  const sents = splitSentences(text);
  const scored = sents.map((s) => {
    let score = 0;
    if (hasNumber(s) || hasCurrency(s)) score += 3;
    if (hasDateSignal(s)) score += 2;
    if (hasLocationSignal(s)) score += 1;
    if (hasWhatItIsSignal(s)) score += 1;
    if (s.length >= 45 && s.length <= 180) score += 1; // quotable-ish range
    return { s, score };
  });

  const picks = scored
    .sort((a, b) => b.score - a.score)
    .filter((x) => x.score >= 3)
    .slice(0, 6)
    .map((x) => x.s);

  return picks.length ? picks : sents.slice(0, 2);
}

/** ---------- “gaps” as {issue, why} (no rewrite suggestions) ---------- **/
function gap(issue, why) {
  return { issue, why };
}

function buildLeadGaps(lead) {
  const items = [];

  if (!hasWhoSignal(lead)) {
    items.push(
      gap(
        "The ‘who’ isn’t clearly named early.",
        "If the main name isn’t obvious in the first paragraph, AI may describe you in generic terms or confuse you with a similar brand."
      )
    );
  }
  if (!hasWhatItIsSignal(lead)) {
    items.push(
      gap(
        "It isn’t obvious what the thing is (hotel / resort / villa / lodge).",
        "AI relies on categories to match people’s questions. If the category isn’t explicit, recommendations become less accurate."
      )
    );
  }
  if (!hasLocationSignal(lead)) {
    items.push(
      gap(
        "The ‘where’ isn’t clearly stated.",
        "Location is one of the biggest filters in travel recommendations. If it’s unclear, AI often drops it or guesses."
      )
    );
  }
  if (!hasDateSignal(lead)) {
    items.push(
      gap(
        "The timing isn’t clear (date / month / year).",
        "Without timing, AI may treat the information as outdated or evergreen, which reduces trust and precision."
      )
    );
  }
  if (!hasWhySignal(lead)) {
    items.push(
      gap(
        "The ‘why now?’ isn’t clear.",
        "If the reason isn’t explicit, AI may remove it in summaries — the story can lose urgency and specificity."
      )
    );
  }
  if (!hasSoWhatSignal(lead)) {
    items.push(
      gap(
        "The ‘so what?’ (what changes for the guest) isn’t explicit.",
        "When outcomes aren’t stated plainly, AI fills the gap with generic benefit language, which weakens differentiation."
      )
    );
  }

  return items.slice(0, 6);
}

function buildTrustGaps(text) {
  const items = [];
  const t = (text || "").trim();

  if (!hasDateSignal(t)) {
    items.push(
      gap(
        "No clear recency marker (date/month/year).",
        "AI repeats dated facts more confidently. Without a time anchor, it’s more likely to summarise vaguely."
      )
    );
  }
  if (!hasNumber(t) && !hasCurrency(t)) {
    items.push(
      gap(
        "Few measurable details (numbers, timings, size, duration, ‘from’ price).",
        "Specific numbers are ‘safe’ for AI to repeat. Without them, summaries become softer and less quotable."
      )
    );
  }
  if (hasMonth(t) && !hasYear(t)) {
    items.push(
      gap(
        "A month/season is mentioned without a year.",
        "This makes summaries less reliable because AI can’t tell which year the information applies to."
      )
    );
  }
  if (containsPrestigeWords(t)) {
    items.push(
      gap(
        "Prestige words appear without something checkable next to them.",
        "Humans understand ‘iconic’ and ‘world-class’ as tone. AI treats them like claims — and may drop them or replace them with generic phrases."
      )
    );
  }

  return items.slice(0, 6);
}

function buildClarityGaps(text) {
  const items = [];
  const avgLen = avgSentenceLength(text);
  const longestPara = longestParagraphWords(text);

  if (longestPara >= 120) {
    items.push(
      gap(
        "Some paragraphs are very long.",
        "When facts sit inside long blocks, AI often compresses or skips details — especially on mobile-style summaries."
      )
    );
  }
  if (avgLen >= 24) {
    items.push(
      gap(
        "Many sentences are long.",
        "Long sentences increase paraphrasing. Paraphrasing is where meaning can get softened or slightly changed."
      )
    );
  }
  if (!hasBullets(text) && !hasHeadings(text)) {
    items.push(
      gap(
        "Key details aren’t clearly separated on the page.",
        "AI is more accurate when it can ‘spot’ distinct fact areas. Without separation, it tends to summarise more loosely."
      )
    );
  }

  return items.slice(0, 6);
}

function scoreOverall(text) {
  // keep your original “editorial score” structure but remove rewrite-ish language
  let clarity = 0;
  if (hasWhatItIsSignal(text)) clarity += 1.5;
  if (hasLocationSignal(text)) clarity += 1.5;
  if (hasBestForSignal(text)) clarity += 1;
  clarity = clamp(clarity, 0, 4);

  let verifiability = 0;
  if (hasNumber(text) || hasCurrency(text)) verifiability += 1;
  if (hasDateSignal(text)) verifiability += 1;
  if (
    text.toLowerCase().includes("minimum") ||
    text.toLowerCase().includes("subject to availability") ||
    text.toLowerCase().includes("available")
  ) {
    verifiability += 1;
  }
  verifiability = clamp(verifiability, 0, 3);

  let structure = 0;
  if (hasBullets(text) || hasHeadings(text)) structure += 1;
  if (!containsPrestigeWords(text)) structure += 1;
  if (splitSentences(text).length >= 3) structure += 1;
  structure = clamp(structure, 0, 3);

  const overall = Math.round((clarity + verifiability + structure) * 10) / 10;
  return overall;
}

/** ---------- UI ---------- **/
export default function Page() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState(null);

  const runAudit = () => {
    const text = (input || "").trim();
    if (!text) {
      setResults(null);
      return;
    }

    const overall = scoreOverall(text);
    const band = getBand(overall);

    // neutral rationale (no “tighten”, “add”, “rewrite”)
    let rationale = "";
    if (band === "Hard to Extract") {
      rationale =
        "AI would struggle to summarise this accurately because the essential facts aren’t clear or checkable early on.";
    } else if (band === "Extractable with Gaps") {
      rationale =
        "AI can summarise parts of this, but some key details are missing or easy to blur into generic language.";
    } else if (band === "Strong Foundation") {
      rationale =
        "AI can reuse several details confidently, but a few gaps may cause it to generalise or drop specifics.";
    } else {
      rationale =
        "This contains clear, reusable facts. AI is more likely to repeat the key details accurately.";
    }

    const lead = firstNWords(text, 95);

    const leadChecks = {
      who: hasWhoSignal(lead),
      what: hasWhatItIsSignal(lead),
      where: hasLocationSignal(lead),
      when: hasDateSignal(lead),
      why: hasWhySignal(lead),
      soWhat: hasSoWhatSignal(lead),
    };

    const repeatables = extractRepeatables(text).slice(0, 6);

    const leadGaps = buildLeadGaps(lead);
    const trustGaps = buildTrustGaps(text);
    const clarityGaps = buildClarityGaps(text);

    const stats = {
      wordCount: words(text).length,
      avgSentenceWords: Math.round(avgSentenceLength(text) * 10) / 10,
      longestParagraphWords: longestParagraphWords(text),
      bulletsPresent: hasBullets(text),
      headingsPresent: hasHeadings(text),
    };

    setResults({
      overall,
      band,
      rationale,
      lead,
      leadChecks,
      repeatables,
      leadGaps,
      trustGaps,
      clarityGaps,
      stats,
    });
  };

  const delta = useMemo(() => {
    if (!results) return null;
    const d = Math.round((results.overall - LUXURY_BENCHMARK) * 10) / 10;
    return (d >= 0 ? "+" : "") + d;
  }, [results]);

  const answerStyle = { color: "var(--ivory)" };
  const answerBoxStyle = {
    background: "var(--panel2)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: 16,
  };

  const renderGaps = (items) => (
    <div style={answerBoxStyle}>
      {items.length ? (
        <ul style={{ ...answerStyle, margin: 0, paddingLeft: 18 }}>
          {items.map((g, i) => (
            <li key={i} style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600 }}>{g.issue}</div>
              <div className="muted" style={{ marginTop: 4 }}>
                {g.why}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="muted">No major gaps detected in this section.</div>
      )}
    </div>
  );

  return (
    <div className="container">
      <div>
        <h1 className="h1">Answer Engine Readiness Score</h1>
        <p className="sub">A quick copy hygiene check for AI extractability.</p>
      </div>

      <div className="card">
        <textarea
          className="textarea"
          placeholder="Paste your copy here… (press release lead, pitch intro, web copy, etc.)"
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
          {/* Score */}
          <h2 className="section-title">AI Readiness</h2>
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

          {/* 1) The Lead */}
          <h2 className="section-title" style={{ marginTop: 28 }}>
            The Lead (what AI grabs first)
          </h2>
          <p className="muted" style={{ marginTop: -6 }}>
            We check the first 75–100 words because AI usually pulls the headline facts from
            the opening.
          </p>

          <div style={answerBoxStyle}>
            <p style={{ ...answerStyle, marginTop: 0 }}>{results.lead}</p>

            <div className="row" style={{ marginTop: 10 }}>
              {[
                ["Who", results.leadChecks.who],
                ["What", results.leadChecks.what],
                ["Where", results.leadChecks.where],
                ["When", results.leadChecks.when],
                ["Why", results.leadChecks.why],
                ["So what", results.leadChecks.soWhat],
              ].map(([label, ok]) => (
                <span
                  key={label}
                  className="score-band"
                  style={{ background: ok ? "var(--gold-soft)" : "transparent" }}
                >
                  {ok ? `✓ ${label}` : `□ ${label}`}
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>{renderGaps(results.leadGaps)}</div>

          {/* 2) Trust signals */}
          <h2 className="section-title" style={{ marginTop: 28 }}>
            Trust signals (what AI repeats)
          </h2>
          <p className="muted" style={{ marginTop: -6 }}>
            AI repeats dates, numbers, names, and specific details more reliably than
            atmospheric language.
          </p>

          <div style={answerBoxStyle}>
            <div className="muted" style={{ marginBottom: 10 }}>
              Facts AI can lift cleanly from your draft:
            </div>
            <ul style={{ ...answerStyle, margin: 0, paddingLeft: 18 }}>
              {results.repeatables.map((s, i) => (
                <li key={i} style={{ marginBottom: 8 }}>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: 14 }}>{renderGaps(results.trustGaps)}</div>

          {/* 3) Clarity */}
          <h2 className="section-title" style={{ marginTop: 28 }}>
            Clarity (how easily AI picks out facts)
          </h2>
          <p className="muted" style={{ marginTop: -6 }}>
            This isn’t about tone. It’s about whether key details are easy to spot and
            repeat accurately.
          </p>

          <div style={answerBoxStyle}>
            <ul style={{ ...answerStyle, margin: 0, paddingLeft: 18 }}>
              <li style={{ marginBottom: 8 }}>Word count: {results.stats.wordCount}</li>
              <li style={{ marginBottom: 8 }}>
                Average sentence length: {results.stats.avgSentenceWords} words
              </li>
              <li style={{ marginBottom: 8 }}>
                Longest paragraph: {results.stats.longestParagraphWords} words
              </li>
              <li style={{ marginBottom: 8 }}>
                Bullets present: {results.stats.bulletsPresent ? "Yes" : "No"}
              </li>
              <li style={{ marginBottom: 8 }}>
                Headings/labels present: {results.stats.headingsPresent ? "Yes" : "No"}
              </li>
            </ul>
          </div>

          <div style={{ marginTop: 14 }}>{renderGaps(results.clarityGaps)}</div>

          {/* 4) Summary */}
          <h2 className="section-title" style={{ marginTop: 28 }}>
            What’s missing for accurate recommendations
          </h2>
          <p className="muted" style={{ marginTop: -6 }}>
            This is a summary of the gaps above. No rewrite suggestions — just what’s missing
            and why AI tends to blur it.
          </p>

          <div style={answerBoxStyle}>
            <ul style={{ ...answerStyle, margin: 0, paddingLeft: 18 }}>
              {[...results.leadGaps, ...results.trustGaps, ...results.clarityGaps]
                .slice(0, 6)
                .map((g, i) => (
                  <li key={i} style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 600 }}>{g.issue}</div>
                    <div className="muted" style={{ marginTop: 4 }}>
                      {g.why}
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
