"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Lee la preferencia guardada o la del sistema operativo
    const saved = localStorage.getItem("agecare-theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (saved === "dark" || (!saved && systemPrefersDark)) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    } else {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    }
  }, []);

  const toggle = () => {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("agecare-theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("agecare-theme", "dark");
      setIsDark(true);
    }
  };

  return (
    <button
      onClick={toggle}
      type="button"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer"
      style={{
        backgroundColor: "var(--panel)",
        borderColor: "var(--line)",
        color: "var(--ink)"
      }}
      aria-label="Cambiar tema visual"
    >
      {isDark ? "☀️ Claro" : "🌙 Oscuro"}
    </button>
  );
}