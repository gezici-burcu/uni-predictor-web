import { TheInputPanel } from "@/src/components/the/TheInputPanel";
import { ScenarioMethodologyReview } from "@/src/components/scenarios/ScenarioMethodologyReview";

export default async function ThePage({ searchParams }: { searchParams: Promise<{ scenarioId?: string | string[] }> }) {
  const value = (await searchParams).scenarioId;
  return <ScenarioMethodologyReview methodology="THE" scenarioId={typeof value === "string" ? value : undefined}><TheInputPanel /></ScenarioMethodologyReview>;
}
