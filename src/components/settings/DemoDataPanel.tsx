"use client";

import { useAppLanguage } from "@/src/contexts/AppLanguageContext";
import { useInstitutionData } from "@/src/contexts/InstitutionDataContext";

export function DemoDataPanel() {
  const { language } = useAppLanguage();
  const {
    institutionDataSnapshot,
    activateDemoInstitution,
    deactivateDemoInstitution,
  } = useInstitutionData();
  const active = Boolean(institutionDataSnapshot.demoProfile);
  const copy = language === "tr" ? {
    title: "Sunum için Demo Üniversitesi",
    description: "THE, QS ve UI GreenMetric için sabit, sentetik ve doğrulanabilir bir kurumsal veri profili yükler. Mevcut kurumsal veriniz ve normal senaryo değişiklikleriniz demo kapatıldığında geri yüklenir.",
    badge: "Sentetik veri · v1",
    activate: "Demo Veriyi Yükle",
    deactivate: "Demoyu Kapat ve Önceki Veriyi Geri Yükle",
    activateConfirm: "Demo Üniversitesi verisi geçici olarak etkinleştirilecek. Mevcut kurumsal veriler ve normal senaryo değişiklikleri korunacak ve demo kapatıldığında geri yüklenecek. Devam edilsin mi?",
    deactivateConfirm: "Demo modu kapatılıp önceki kurumsal veriler ve normal senaryo değişiklikleri geri yüklensin mi?",
  } : {
    title: "Demo University for presentations",
    description: "Loads a fixed, synthetic, and verifiable institutional profile for THE, QS, and UI GreenMetric. Your current institutional data and normal scenario changes are restored when demo mode is closed.",
    badge: "Synthetic data · v1",
    activate: "Load Demo Data",
    deactivate: "Close Demo and Restore Previous Data",
    activateConfirm: "Demo University data will be enabled temporarily. Current institutional data and normal scenario changes will be preserved and restored when demo mode is closed. Continue?",
    deactivateConfirm: "Close demo mode and restore the previous institutional data and normal scenario changes?",
  };

  const toggle = () => {
    if (!window.confirm(active ? copy.deactivateConfirm : copy.activateConfirm)) return;
    if (active) deactivateDemoInstitution();
    else activateDemoInstitution();
    window.location.reload();
  };

  return <section className="rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-violet-950">{copy.title}</h2>
          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">{copy.badge}</span>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-violet-900">{copy.description}</p>
      </div>
      <button type="button" onClick={toggle} className="shrink-0 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800">
        {active ? copy.deactivate : copy.activate}
      </button>
    </div>
  </section>;
}
