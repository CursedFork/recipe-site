/* ---------------------------------------------------------------------------
   The theme toggle. One of the four React islands.

   It is only the button. The thing that actually prevents the dark mode flash
   on load is the inline script in BaseLayout.astro, which runs before first
   paint. This component just flips the attribute that script set and stores
   the choice.

   Two details worth knowing, because both are easy to get wrong:

   1. Astro server-renders this component to HTML at build time, so the button
      is in the page markup before any JavaScript runs. But the server has no
      idea which theme the visitor chose, so it always renders the light-mode
      state. The icons are therefore switched by CSS off the html attribute,
      which the inline script has already set, so the right icon shows at first
      paint. Only the label needs correcting after hydration, which useEffect
      does in a millisecond.

   2. The click handler reads the current theme from the DOM rather than from
      React state. If a returning dark-mode visitor clicked before the effect
      had run, state would still say "light" and the toggle would send them to
      dark again. Reading the DOM makes that impossible.
   --------------------------------------------------------------------------- */

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export default function ThemeToggle() {
  // Matches what the server renders. Corrected on mount, see note 1 above.
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  function toggle() {
    const next: Theme = readTheme() === "dark" ? "light" : "dark";

    if (next === "dark") {
      document.documentElement.dataset.theme = "dark";
    } else {
      delete document.documentElement.dataset.theme;
    }

    // Keep the browser chrome colour in step. Same two values as the inline
    // script in BaseLayout, which is --bg from tokens.css.
    const meta = document.getElementById("theme-color");
    if (meta) {
      meta.setAttribute("content", next === "dark" ? "#1C1A18" : "#F7F3EC");
    }

    // Writes are wrapped too, not just reads: localStorage throws on write
    // when a private browsing mode has given us a zero-size quota.
    try {
      localStorage.setItem("theme", next);
    } catch (error) {
      /* The choice will not survive a reload. The site still works. */
    }

    setTheme(next);
  }

  // Both are required and neither replaces the other: the label is what a
  // screen reader reads out, the tooltip is what a sighted mouse user sees.
  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      onClick={toggle}
      aria-label={label}
      data-tooltip={label}
      data-tooltip-align="end"
    >
      {/* Both icons ship. CSS shows whichever matches the html attribute, so
          the correct one is visible at first paint without waiting for React.
          aria-hidden because the button's own label already says everything. */}
      <svg className="theme-toggle__sun" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="4.25" stroke="currentColor" strokeWidth="1.75" />
        <path
          d="M12 2.5v2.25M12 19.25v2.25M2.5 12h2.25M19.25 12h2.25M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
      <svg className="theme-toggle__moon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M20 14.1A8.2 8.2 0 1 1 9.9 4a6.6 6.6 0 0 0 10.1 10.1Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
