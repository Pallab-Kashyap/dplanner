import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/today");

  return (
    <main className="hero">
      <div style={{ fontSize: "4rem", marginBottom: "0.5rem" }}>✏️</div>
      <h1>DPlaner</h1>
      <p className="subtitle">
        Plan every day, every hour. Track your progress with a hand-drawn planner
        that feels like a notebook — not a spreadsheet.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", alignItems: "center" }}>
        <Link href="/login" className="sketchy-btn" style={{ textDecoration: "none", fontSize: "1.5rem" }}>
          ✨ Get Started
        </Link>
        <span className="text-muted" style={{ fontSize: "0.95rem" }}>
          Free forever · Sign in with Google
        </span>
      </div>

      <div
        style={{
          marginTop: "3rem",
          display: "flex",
          gap: "2rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {[
          { icon: "📋", title: "Timetable", desc: "Block your hours, repeat weekly" },
          { icon: "📌", title: "Kanban Todos", desc: "Drag tasks between columns" },
          { icon: "📊", title: "Analytics", desc: "Track weekly & monthly progress" },
          { icon: "🟩", title: "Activity Map", desc: "GitHub-style completion heatmap" },
        ].map((f) => (
          <div
            key={f.title}
            className="sketchy-card"
            style={{ width: 200, textAlign: "center" }}
          >
            <div style={{ fontSize: "2rem" }}>{f.icon}</div>
            <h3 style={{ fontSize: "1.4rem", margin: "0.3rem 0" }}>{f.title}</h3>
            <p className="text-muted" style={{ fontSize: "0.95rem", margin: 0 }}>
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
