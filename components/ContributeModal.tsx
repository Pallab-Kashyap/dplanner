"use client";

import { useState } from "react";

interface ContributeModalProps {
  onClose: () => void;
}

const FEEDBACK_EMOJIS = [
  { emoji: "😍", label: "Love it" },
  { emoji: "😊", label: "Good" },
  { emoji: "😐", label: "Okay" },
  { emoji: "😕", label: "Meh" },
  { emoji: "😢", label: "Bad" },
];

export default function ContributeModal({ onClose }: ContributeModalProps) {
  const [suggestion, setSuggestion] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestion: suggestion.trim(), rating: selectedEmoji }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSubmitted(true);
      setTimeout(onClose, 1500);
    } catch {
      setError("Failed to send. Please try again.");
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360, textAlign: "center", padding: "1.5rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🎉</div>
          <h2 style={{ fontSize: "1.6rem" }}>Thank you!</h2>
          <p className="text-muted">Your feedback means a lot ✨</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <h2 style={{ fontSize: "1.6rem", marginBottom: "0.3rem" }}>💡 Contribute</h2>
        <p className="text-muted" style={{ marginBottom: "0.8rem", fontSize: "0.9rem" }}>
          Help us make DPlaner better!
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          <textarea
            className="sketchy-textarea"
            placeholder="Suggest a feature, report a bug, or ask a question..."
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            style={{ minHeight: 80 }}
          />

          <div>
            <p style={{ fontFamily: "var(--font-hand)", fontSize: "1rem", marginBottom: "0.3rem" }}>
              How&apos;s your experience?
            </p>
            <div style={{ display: "flex", gap: "0.3rem", justifyContent: "center", flexWrap: "wrap" }}>
              {FEEDBACK_EMOJIS.map((fb, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedEmoji(i)}
                  title={fb.label}
                  style={{
                    fontSize: "1.8rem",
                    background: selectedEmoji === i ? "var(--accent-light)" : "none",
                    border: selectedEmoji === i ? "2px solid var(--accent)" : "2px solid transparent",
                    borderRadius: "10px",
                    padding: "0.2rem 0.4rem",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    transform: selectedEmoji === i ? "scale(1.15)" : "scale(1)",
                  }}
                >
                  {fb.emoji}
                </button>
              ))}
            </div>
          </div>

          {error && <p style={{ color: "var(--failed)", margin: 0, fontSize: "0.9rem" }}>{error}</p>}

          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
            <button className="sketchy-btn sketchy-btn-outline" onClick={onClose} disabled={saving} style={{ padding: "0.3rem 0.8rem", fontSize: "1.1rem" }}>Cancel</button>
            <button
              className="sketchy-btn"
              onClick={handleSubmit}
              disabled={saving || (!suggestion.trim() && selectedEmoji === null)}
              style={{ opacity: (saving || (!suggestion.trim() && selectedEmoji === null)) ? 0.5 : 1, padding: "0.3rem 0.8rem", fontSize: "1.1rem" }}
            >
              {saving ? "Sending..." : "Send 💌"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
