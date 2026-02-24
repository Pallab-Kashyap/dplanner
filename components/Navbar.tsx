"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      <Link href="/today" className="logo" style={{ textDecoration: "none" }}>
        ✏️ DPlaner
      </Link>

      {/* Mobile hamburger */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Menu"
      >
        {menuOpen ? "✕" : "☰"}
      </button>

      <div className={`nav-links ${menuOpen ? "nav-open" : ""}`}>
        <Link href="/today" className={`nav-link ${pathname === "/today" ? "active" : ""}`} onClick={() => setMenuOpen(false)}>
          📋 Today
        </Link>
        <Link href="/calendar" className={`nav-link ${pathname === "/calendar" ? "active" : ""}`} onClick={() => setMenuOpen(false)}>
          📅 Calendar
        </Link>

        <ThemeToggle />

        {session?.user && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {session.user.image && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={session.user.image}
                alt=""
                width={32}
                height={32}
                referrerPolicy="no-referrer"
                style={{ borderRadius: "50%", border: "2px solid var(--border-sketch)" }}
              />
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              style={{
                background: "none",
                border: "2px solid var(--border-sketch)",
                borderRadius: "8px",
                padding: "0.2rem 0.6rem",
                cursor: "pointer",
                fontFamily: "var(--font-hand)",
                fontSize: "1.1rem",
                color: "var(--text-muted)",
              }}
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
