import type { ReactNode } from "react";

export const SIMULATOR_PAGE_CLASS_NAME = "xl:relative xl:left-1/2 xl:w-[calc(100vw-2rem)] xl:max-w-[1880px] xl:-translate-x-1/2";
export const SIMULATOR_GRID_CLASS_NAME = "grid items-start gap-4 xl:grid-cols-[minmax(360px,400px)_minmax(0,1fr)] xl:items-stretch 2xl:grid-cols-[400px_minmax(0,1fr)]";
export const SIMULATOR_ASIDE_CLASS_NAME = "w-full min-w-0 xl:max-w-[400px]";

export function SimulatorLayout({ parameterPanel, dashboard }: { parameterPanel: ReactNode; dashboard: ReactNode }) {
  return <div className={SIMULATOR_PAGE_CLASS_NAME}><div className={SIMULATOR_GRID_CLASS_NAME}>{parameterPanel}{dashboard}</div></div>;
}
