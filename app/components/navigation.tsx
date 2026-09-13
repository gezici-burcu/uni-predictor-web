"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";

export const navigationItems = [
  { href: "/the", key: "navigation.the" },
  { href: "/qs", key: "navigation.qs" },
  { href: "/greenmetric", key: "navigation.uiGreenMetric", green: true },
  { href: "/cross-analysis", key: "navigation.crossAnalysis" },
  { href: "/data-entry", key: "navigation.institutionalDataEntry" },
  { href: "/scenario-comparison", key: "navigation.scenarioComparison" },
  { href: "/recommendations", key: "navigation.recommendationEngine" },
] as const;

const NAVIGATION_ICON_PATHS: Record<string, React.ReactNode> = {
  "/the": <><path d="M4 19V9m5 10V5m5 14v-7m5 7V3"/><path d="M2 19h20"/></>,
  "/qs": <><path d="m4 15 5-5 4 4 7-8"/><path d="M14 6h6v6"/></>,
  "/greenmetric": <><path d="M12 21c5-3 8-7 8-12-5 0-8 2-8 7"/><path d="M12 21C7 18 4 14 4 9c5 0 8 2 8 7v5Z"/></>,
  "/cross-analysis": <><circle cx="8" cy="8" r="4"/><circle cx="16" cy="16" r="4"/><path d="m11 11 2 2"/></>,
  "/data-entry": <><path d="M5 3h14v18H5z"/><path d="M8 7h8M8 11h8M8 15h4"/></>,
  "/scenario-comparison": <><path d="M4 5h16v5H4zM4 14h7v5H4zM14 14h6v5h-6z"/></>,
  "/recommendations": <><path d="M9 18h6M10 22h4"/><path d="M8.5 14.5A7 7 0 1 1 15.5 14.5L14 17h-4l-1.5-2.5Z"/></>,
};

function NavigationIcon({ href }: { href: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{NAVIGATION_ICON_PATHS[href]}</svg>;
}

export function Navigation() {
  const pathname = usePathname();
  const { t, language } = useAppLanguage();
  return <nav className="app-navigation -mx-1 overflow-x-auto pb-3" aria-label="Main navigation">
    <div className="flex min-w-max gap-1.5">{navigationItems.map((item) => {
      const active = pathname === item.href;
      const green = "green" in item && item.green;
      return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`nav-item inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold whitespace-nowrap ${active ? (green ? "is-active is-green" : "is-active") : ""}`}>
        <NavigationIcon href={item.href}/><span>{item.href === "/scenario-comparison" ? (language === "tr" ? "Senaryolar" : "Scenarios") : t(item.key)}</span>
      </Link>;
    })}</div>
  </nav>;
}
