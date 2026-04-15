"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/today", label: "📋 Today" },
  { href: "/calendar", label: "📅 Calendar" },
  { href: "/planner", label: "⚙️ Settings" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentItem = NAV_ITEMS.find((item) => pathname === item.href) || NAV_ITEMS[0];

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
        {/* Desktop: single dropdown trigger */}
        <div className="nav-dropdown-wrapper" ref={dropdownRef}>
          <button
            className="nav-link nav-dropdown-trigger"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            {currentItem.label} <span className="nav-dropdown-arrow">{dropdownOpen ? "▲" : "▼"}</span>
          </button>

          {dropdownOpen && (
            <div className="nav-dropdown-menu">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-dropdown-item ${pathname === item.href ? "active" : ""}`}
                  onClick={() => { setDropdownOpen(false); setMenuOpen(false); }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Mobile: show all links directly */}
        <div className="nav-mobile-links">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${pathname === item.href ? "active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>

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
