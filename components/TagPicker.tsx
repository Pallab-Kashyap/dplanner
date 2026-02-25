"use client";

import { useState, useEffect } from "react";

interface Tag {
  _id: string;
  name: string;
  color: string;
}

interface TagPickerProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
}

export default function TagPicker({ selectedTagIds, onChange }: TagPickerProps) {
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/tags");
        if (res.ok) {
          const data = await res.json();
          if (data.success) setTags(data.data);
        }
      } catch {}
    })();
  }, []);

  const toggle = (id: string) => {
    if (selectedTagIds.includes(id)) {
      onChange(selectedTagIds.filter((t) => t !== id));
    } else {
      onChange([...selectedTagIds, id]);
    }
  };

  if (tags.length === 0) return null;

  return (
    <div>
      <p style={{ fontFamily: "var(--font-hand)", fontSize: "1rem", marginBottom: "0.3rem" }}>Tags</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
        {tags.map((tag) => {
          const selected = selectedTagIds.includes(tag._id);
          return (
            <button
              key={tag._id}
              type="button"
              onClick={() => toggle(tag._id)}
              className="tag-pill"
              style={{
                borderColor: tag.color,
                background: selected ? tag.color + "22" : "transparent",
                color: selected ? tag.color : "var(--text-muted)",
                cursor: "pointer",
                fontWeight: selected ? 700 : 500,
                transition: "all 0.15s ease",
              }}
            >
              {tag.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
