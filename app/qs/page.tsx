import { QsInputPanel } from "@/src/components/qs/QsInputPanel";
import { ScenarioMethodologyReview } from "@/src/components/scenarios/ScenarioMethodologyReview";

export default async function QsPage({ searchParams }: { searchParams: Promise<{ scenarioId?: string | string[] }> }) {
  const value = (await searchParams).scenarioId;
  return <ScenarioMethodologyReview methodology="QS" scenarioId={typeof value === "string" ? value : undefined}><QsInputPanel /></ScenarioMethodologyReview>;
}
