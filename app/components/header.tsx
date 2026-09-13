"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { LanguageSwitcher } from "@/src/components/layout/LanguageSwitcher";
import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import { useInstitutionData } from "@/src/contexts/InstitutionDataContext";
import {
  getReferenceHeaderStatus,
  subscribeReferenceHeaderStatus,
} from "@/src/lib/rankings/reference-update-status";
import { Navigation } from "./navigation";

const HEADER_VISUAL_BARS = [32, 50, 42, 68, 58, 82, 72] as const;

function SettingsIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19 15.5l1.5 1.5-3 3-1.5-1.5a8 8 0 0 1-2 .8V21h-4v-1.7a8 8 0 0 1-2-.8L6.5 20l-3-3L5 15.5a8 8 0 0 1-.8-2H2.5v-4h1.7A8 8 0 0 1 5 7.5L3.5 6l3-3L8 4.5a8 8 0 0 1 2-.8V2h4v1.7a8 8 0 0 1 2 .8L17.5 3l3 3L19 7.5a8 8 0 0 1 .8 2h1.7v4h-1.7a8 8 0 0 1-.8 2Z"/></svg>;
}

function BrandMark() {
  return <span aria-hidden="true" className="brand-mark flex size-11 shrink-0 items-center justify-center rounded-2xl text-white sm:size-12">
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M7 12.2V17c2.8 2 7.2 2 10 0v-4.8"/><path d="M21 9v6"/>
    </svg>
  </span>;
}

function HeaderVisual() {
  return <div aria-hidden="true" className="header-visual hidden items-end gap-1.5 lg:flex">
    {HEADER_VISUAL_BARS.map((height, index) => <span key={height} style={{ height }} className={index > 4 ? "is-accent" : undefined}/>) }
  </div>;
}

export function Header() {
  const { t, language } = useAppLanguage();
  const { institutionDataSnapshot } = useInstitutionData();
  const status = useSyncExternalStore(
    subscribeReferenceHeaderStatus,
    getReferenceHeaderStatus,
    () => "bundled" as const,
  );
  const key = status === "current"
    ? "dataCurrent"
    : status === "update-available"
      ? "updateAvailable"
      : status === "unavailable"
        ? "updateUnavailable"
        : status === "local-current"
          ? "localDataCurrent"
          : "bundledData";
  const demo = institutionDataSnapshot.demoProfile;

  return <header className="app-header sticky top-0 z-40">
    <div className="app-header-glow" aria-hidden="true" />
    <div className="relative mx-auto max-w-[1680px] px-3 sm:px-5 lg:px-8">
      <div className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:py-5">
        <Link href="/scenario-comparison" className="flex min-w-0 items-center gap-3 rounded-2xl focus-visible:outline-none">
          <BrandMark />
          <div className="min-w-0">
            <p className="truncate text-base font-bold tracking-tight text-white sm:text-xl">{t("header.title")}</p>
            <p className="hidden text-[11px] font-medium tracking-wide text-slate-300 sm:block">{language === "tr" ? "Sıralama analizi ve karar destek platformu" : "Ranking analysis and decision support platform"}</p>
            {demo ? <p className="mt-1 text-xs font-semibold text-violet-700">
              <span className="rounded-full bg-violet-100 px-2 py-1">{language === "tr" ? "Demo Veri" : "Demo Data"}</span>
              <span className="ml-1">{language === "tr" ? demo.displayName : demo.displayNameEn}</span>
            </p> : null}
          </div>
        </Link>
        <HeaderVisual />
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <LanguageSwitcher/>
          <Link href="/settings" aria-label={t("header.openSettings")} className="header-control inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-semibold"><SettingsIcon/><span>{t("common.settings")}</span></Link>
          <span className="header-control inline-flex h-9 items-center gap-2 rounded-xl px-3 text-[11px] font-semibold"><span aria-hidden="true" className={`status-pulse size-2 rounded-full ${status === "update-available" ? "bg-amber-400" : status === "unavailable" ? "bg-red-400" : "bg-emerald-400"}`}/>{t(`header.${key}`)}</span>
        </div>
      </div>
      <Navigation/>
    </div>
  </header>;
}
