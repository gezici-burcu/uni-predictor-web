import { CrossAnalysisPage } from "@/src/components/cross-analysis/CrossAnalysisPage";

export default async function CrossAnalysisRoute({
  searchParams,
}: {
  searchParams: Promise<{ savedAnalysisId?: string | string[] }>;
}) {
  const value = (await searchParams).savedAnalysisId;
  return <CrossAnalysisPage savedAnalysisId={typeof value === "string" ? value : undefined} />;
}
