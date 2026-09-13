import { GreenMetricInputPanel } from "@/src/components/greenmetric/GreenMetricInputPanel";
import { ScenarioMethodologyReview } from "@/src/components/scenarios/ScenarioMethodologyReview";

export default async function GreenMetricPage({ searchParams }: { searchParams: Promise<{ scenarioId?: string | string[] }> }) {
  const value = (await searchParams).scenarioId;
  return <ScenarioMethodologyReview methodology="GREENMETRIC" scenarioId={typeof value === "string" ? value : undefined}><GreenMetricInputPanel /></ScenarioMethodologyReview>;
}
