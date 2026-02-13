"use client";
import React, { useMemo, useState } from "react";

const LUXURY_BENCHMARK = 6.2;
const CTA_URL = "https://martawarren.com/ai-search-brand-visibility/";

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function scoreDimension(text, keywords) {
  if (!text) return 0;
  const lower = text.toLowerCase();
  let score = 0;
  for (const word of keywords) if (lower.includes(word)) score += 2;
  return clamp(score, 0, 10);
}

export default function Page() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState(null);

  const runAudit = () => {
    const clarity = scoreDimension(input, ["located", "is", "offers", "ideal for", "features"]);
    const proofSpecificity = scoreDimension(input, ["hotel","resort","villa","suite","spa","restaurant","destination"]);
    const questionAlignment = scoreDimension(input, ["best for","who","what","where","how","why"]);
    const verifiableDetail = scoreDimension(input, ["rooms","dates","price","km","minutes","award","year"]);
    const durability = scoreDimension(input, ["faq","guide","itinerary","comparison","experience"]);

    const overallRaw = (clarity + proofSpecificity + questionAlignment + verifiableDetail + durability) / 5;
    const overall = Math.round(overallRaw * 10) / 10;
    const performanceLabel = overall >= LUXURY_BENCHMARK ? "Above Luxury Benchmark" : "Below Luxury Benchmark";

    const recommendations = [];
    if (clarity < 6) recommendations.push("Lead with a clear ‘what it is / who it’s for / where it is’ sentence.");
    if (proofSpecificity < 6) recommendations.push("Add explicit property names, destinations, room types, and categories.");
    if (questionAlignment < 6) recommendations.push("Frame at least one traveler-style question and answer it directly.");
    if (verifiableDetail < 6) recommendations.push("Include specific numbers, dates, distances, or differentiators.");
    if (durability < 6) recommendations.push("Translate this into a durable asset: FAQ, micro-guide, or comparison page.");

    setResults({ overall, performanceLabel, clarity, proofSpecificity, questionAlignment, verifiableDetail, durability, recommendations });
  };

  const delta = useMemo(() => {
    if (!results) return null;
    const d = Math.round((results.overall - LUXURY_BENCHMARK) * 10) / 10;
    return (d >= 0 ? "+" : "") + d;
  }, [results]);

  const exportReport = () => {
    if (!results) return;
    const content =
`Answer Engine Readiness Score — Report

Overall: ${results.overall}/10
Luxury category average: ${LUXURY_BENCHMARK}/10 (${delta})

Clarity: ${results.clarity}/10
Proof & Specificity: ${results.proofSpecificity}/10
Question Alignment: ${results.questionAlignment}/10
Verifiable Detail: ${results.verifiableDetail}/10
Durability & Translation Potential: ${results.durability}/10

Recommendations:
- ${results.recommendations.join("\n- ")}
`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Answer_Engine_Readiness_Score_Report.txt";
    link.click();
  };

  return (
    <div className="container">
      <div>
        <h1 className="h1">Answer Engine Readiness Score</h1>
        <p className="sub">Paste any draft. Receive a readiness score and strategic refinements.</p>
      </div>

      <div className="card">
        <textarea className="textarea"
          placeholder="Paste your press release, property page, or social caption here..."
          value={input} onChange={(e) => setInput(e.target.value)} />
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn btnGold" onClick={runAudit}>Run Score</button>
        </div>
      </div>

      {results && (
        <div className="card">
          <div className="kpi">
            <div className="kpiTop">
              <div>
                <div className="small">Overall Readiness Score</div>
                <div className="score">
                  <span style={{ color: "var(--gold)" }}>{results.overall}</span>/10{" "}
                  <span className="badge">{results.performanceLabel}</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="small">Luxury Category Benchmark</div>
                <div style={{ fontWeight: 650 }}>
                  {LUXURY_BENCHMARK}/10 <span className="small">({delta})</span>
                </div>
              </div>
            </div>

            <hr className="hr" />
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div><strong>Clarity:</strong> {results.clarity}/10</div>
              <div><strong>Proof & Specificity:</strong> {results.proofSpecificity}/10</div>
              <div><strong>Question Alignment:</strong> {results.questionAlignment}/10</div>
              <div><strong>Verifiable Detail:</strong> {results.verifiableDetail}/10</div>
              <div><strong>Durability & Translation Potential:</strong> {results.durability}/10</div>
            </div>
          </div>

          <h2 className="h2">Recommendations</h2>
          <ul className="ul">
            {results.recommendations.map((r, i) => <li key={i}>{r}</li>)}
          </ul>

          <div className="kpi" style={{ marginTop: 14 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>Request Full Benchmark Audit</h3>
            <p className="small" style={{ marginTop: 6 }}>
              Get a full visibility benchmark across priority prompts and AI surfaces, plus a prioritized action plan.
            </p>
            <div className="row">
              <a href={CTA_URL} target="_blank" rel="noreferrer">
                <button className="btn btnGold">Request Full Benchmark Audit</button>
              </a>
              <button className="btn" onClick={exportReport}>Export Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
