"use client";
import React, { useMemo, useState } from "react";

const LUXURY_BENCHMARK = 6.2;
const CTA_URL = "https://martawarren.com/ai-search-brand-visibility/";

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function containsNumber(text) {
  return /\d/.test(text);
}

function containsQuestion(text) {
  return text.includes("?") || text.toLowerCase().includes("best for");
}

function detectPropertyType(text) {
  const types = ["hotel", "resort", "villa", "lodge", "retreat", "island"];
  return types.some(t => text.toLowerCase().includes(t));
}

function detectLocation(text) {
  return text.toLowerCase().includes("in ");
}

export default function Page() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState(null);

  const runAudit = () => {
    const lower = input.toLowerCase();

    const clarity = clamp(lower.includes("is") ? 6 : 2, 0, 10);
    const proof = clamp(detectPropertyType(input) ? 8 : 3, 0, 10);
    const question = clamp(containsQuestion(input) ? 8 : 2, 0, 10);
    const verifiable = clamp(containsNumber(input) ? 8 : 3, 0, 10);
    const durability = clamp(lower.includes("faq") || lower.includes("guide") ? 8 : 5, 0, 10);

    const overall = Math.round(((clarity + proof + question + verifiable + durability) / 5) * 10) / 10;

    const strongest = [
      { label: "Clarity", value: clarity },
      { label: "Proof & Specificity", value: proof },
      { label: "Question Alignment", value: question },
      { label: "Verifiable Detail", value: verifiable },
      { label: "Durability", value: durability }
    ].sort((a, b) => b.value - a.value)[0];

    const weakest = [
      { label: "Clarity", value: clarity },
      { label: "Proof & Specificity", value: proof },
      { label: "Question Alignment", value: question },
      { label: "Verifiable Detail", value: verifiable },
      { label: "Durability", value: durability }
    ].sort((a, b) => a.value - b.value)[0];

    const checklist = {
      location: detectLocation(input),
      propertyType: detectPropertyType(input),
      question: containsQuestion(input),
      numbers: containsNumber(input),
    };

    setResults({
      overall,
      clarity,
      proof,
      question,
      verifiable,
      durability,
      strongest,
      weakest,
      checklist
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
        <p className="sub">Luxury hospitality edition</p>
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

          <div className="kpi">
            <div className="kpiTop">
              <div>
                <div className="small">Overall Readiness</div>
                <div className="score">
                  <span style={{ color: "var(--gold)" }}>{results.overall}</span>/10
                </div>
              </div>
              <div>
                <div className="small">Luxury Benchmark</div>
                <div>{LUXURY_BENCHMARK}/10 ({delta})</div>
              </div>
            </div>
          </div>

          <h2 className="h2">Executive Summary</h2>
          <ul className="ul">
            <li><strong>Strongest Signal:</strong> {results.strongest.label}</li>
            <li><strong>Biggest Visibility Risk:</strong> {results.weakest.label}</li>
            <li><strong>Fastest Lift:</strong> Add one structured “Best for…” sentence and one quantifiable proof point.</li>
          </ul>

          <h2 className="h2">Missing Proof Checklist</h2>
          <ul className="ul">
            <li>{results.checklist.location ? "✓" : "□"} Destination explicitly named</li>
            <li>{results.checklist.propertyType ? "✓" : "□"} Property category defined</li>
            <li>{results.checklist.question ? "✓" : "□"} Traveler-style question answered</li>
            <li>{results.checklist.numbers ? "✓" : "□"} Quantifiable detail included</li>
          </ul>

          <h2 className="h2">AI-Ready Structured Version</h2>
          <div className="kpi">
            <p className="small">
              What it is: <br/>
              Where: <br/>
              Best for: <br/>
              Signature differentiator: <br/>
              Verifiable proof points:
            </p>
          </div>

          <div className="kpi" style={{ marginTop: 16 }}>
            <h3 style={{ margin: 0 }}>Request Full Benchmark Audit</h3>
            <p className="small">
              Get a full visibility benchmark across priority prompts and AI surfaces.
            </p>
            <a href={CTA_URL} target="_blank" rel="noreferrer">
              <button className="btn btnGold">Request Full Benchmark Audit</button>
            </a>
          </div>

        </div>
      )}
    </div>
  );
}
