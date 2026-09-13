import {describe,expect,it} from "vitest";
import {calculateCandidateChangeCost,createStableRecommendationStateKey,generateMetricCandidates,runRecommendationEngine,validateMetricRelations} from "./core";
import type {RecommendationAdapter,RecommendationMetricDefinition} from "./types";
const metric=(overrides:Partial<RecommendationMetricDefinition>={}):RecommendationMetricDefinition=>({metricId:"staff",engineField:"staff",parameterKind:"institutionalInput",isEditableInput:true,isRecommendationCandidate:true,label:"Staff",categoryId:"test",kind:"headcount",direction:"increase-only",effort:"low",risk:"low",confidence:"high",controllability:"high",evidenceRequired:false,affectsTotalScore:true,defaultLocked:false,technicalMinimum:0,technicalMaximum:200,step:1,...overrides});
describe("recommendation candidate generation",()=>{
 it("applies six-month, one, three and five year headcount limits",()=>{expect(generateMetricCandidates({currentValue:100,metricDefinition:metric(),planningHorizon:"6-months"}).at(-1)?.value).toBe(103);expect(generateMetricCandidates({currentValue:100,metricDefinition:metric(),planningHorizon:1}).at(-1)?.value).toBe(105);expect(generateMetricCandidates({currentValue:100,metricDefinition:metric(),planningHorizon:3}).at(-1)?.value).toBe(115);expect(generateMetricCandidates({currentValue:100,metricDefinition:metric(),planningHorizon:5}).at(-1)?.value).toBe(125)});
 it("does not create candidates for locked metrics",()=>expect(generateMetricCandidates({currentValue:100,metricDefinition:metric({direction:"locked",defaultLocked:true}),planningHorizon:5})).toEqual([]));
 it("keeps relations valid",()=>expect(validateMetricRelations("the",{"the.common.studentsFte":100,"the.internationalOutlook.internationalStudentsFte":101}).valid).toBe(false));
 it("creates deterministic keys and positive costs",()=>{expect(createStableRecommendationStateKey({b:2,a:1},["b","a"])).toBe(createStableRecommendationStateKey({a:1,b:2},["a","b"]));expect(calculateCandidateChangeCost(.5,metric())).toBe(.5)});
});
describe("beam search",()=>{const adapter:RecommendationAdapter={id:"the",scoreMinimum:0,scoreMaximum:100,initialValues:{staff:100,output:10},definitions:[metric(),metric({metricId:"output",engineField:"output",label:"Output",kind:"output-count",technicalMaximum:20})],calculate:values=>({score:(values.staff as number)/10+(values.output as number)}),getDisplayedScore:result=>(result as {score:number}).score,getCategoryScores:result=>({test:(result as {score:number}).score})};it("is deterministic, immutable and verifies a reachable plan",()=>{const original={...adapter.initialValues};const first=runRecommendationEngine({adapter,targetScore:21,planningHorizon:3});const second=runRecommendationEngine({adapter,targetScore:21,planningHorizon:3});expect(first.primaryPlan?.verified).toBe(true);expect(first.primaryPlan?.recommendedScore).toBe(second.primaryPlan?.recommendedScore);expect(adapter.initialValues).toEqual(original);expect(new Set(first.primaryPlan?.changes.map(change=>change.metricId)).size).toBe(first.primaryPlan?.changes.length)});it("does not fabricate a plan for an unreachable target by default",()=>{const result=runRecommendationEngine({adapter,targetScore:100,planningHorizon:1});expect(result.reachability.reachable).toBe(false);expect(result.primaryPlan).toBeNull()});it("returns a verified positive best-effort plan when the THE adapter requests one",()=>{const result=runRecommendationEngine({adapter:{...adapter,returnBestEffortPlan:true},targetScore:100,planningHorizon:1});expect(result.reachability.reachable).toBe(false);expect(result.primaryPlan?.reachedTarget).toBe(false);expect(result.primaryPlan?.recommendedScore).toBeGreaterThan(result.currentScore);expect(result.primaryPlan?.changes.length).toBeGreaterThan(0)})});
describe("recommendation constraints",()=>{const adapter:RecommendationAdapter={id:"the",scoreMinimum:0,scoreMaximum:100,initialValues:{staff:100},definitions:[metric()],calculate:values=>({score:(values.staff as number)/10}),getDisplayedScore:result=>(result as {score:number}).score,getCategoryScores:result=>({test:(result as {score:number}).score})};it("uses copied exact inputs and keeps range constraints on generated targets",()=>{const result=runRecommendationEngine({adapter,targetScore:15,planningHorizon:5,initialValues:{...adapter.initialValues,staff:120},constraints:[{metricId:"staff",minimumValue:120,maximumValue:160}],preferredMetricIds:["staff"]});expect(adapter.initialValues.staff).toBe(100);expect(result.primaryPlan?.changes[0]?.currentValue).toBe(120);expect(Number(result.primaryPlan?.changes[0]?.recommendedValue)).toBeLessThanOrEqual(160)})});

describe("three score contexts",()=>{const adapter:RecommendationAdapter={id:"the",scoreMinimum:0,scoreMaximum:100,initialValues:{staff:100,output:10},definitions:[metric(),metric({metricId:"output",engineField:"output",label:"Output",kind:"output-count",technicalMaximum:20})],returnBestEffortPlan:true,calculate:values=>({score:(values.staff as number)/10+(values.output as number)}),getDisplayedScore:result=>(result as {score:number}).score,getCategoryScores:result=>({test:(result as {score:number}).score})};it("keeps institutional, constrained and cumulative recommendation scores distinct",()=>{const result=runRecommendationEngine({adapter,baselineValues:{staff:100,output:10},initialValues:{staff:80,output:10},lockedMetricIds:["staff"],targetScore:30,planningHorizon:5});expect(result.currentScore).toBe(20);expect(result.constrainedStartScore).toBe(18);expect(result.primaryPlan?.currentScore).toBe(20);expect(result.primaryPlan?.constrainedStartScore).toBe(18);const scores=result.primaryPlan?.changes.map(change=>change.scoreAfterChange)??[];expect(scores.every((score,index)=>index===0?score>18:score>scores[index-1])).toBe(true);expect(result.primaryPlan?.recommendedScore).toBe(scores.at(-1));expect(result.primaryPlan?.changes.every(change=>change.incrementalScoreImpact>0.0001)).toBe(true);expect(result.primaryPlan?.changes.map(change=>change.metricId)).not.toContain("staff")})});

describe("unavailable score handling", () => {
  it("returns a controlled result when the constrained starting score is unavailable", () => {
    const adapter: RecommendationAdapter = {
      id: "qs",
      scoreMinimum: 0,
      scoreMaximum: 100,
      initialValues: { staff: 100 },
      definitions: [metric()],
      calculate: (values) => ({
        score: Number(values.staff) === 120 ? null : Number(values.staff) / 10,
      }),
      getDisplayedScore: (calculation) => (calculation as { score: number | null }).score,
      getCategoryScores: () => ({}),
    };

    const result = runRecommendationEngine({
      adapter,
      baselineValues: { staff: 100 },
      initialValues: { staff: 120 },
      targetScore: 20,
      planningHorizon: "6-months",
    });

    expect(result.calculationAvailability).toBe("score-unavailable");
    expect(result.calculationUnavailableReason).toBe("constrained-score-unavailable");
    expect(result.primaryPlan).toBeNull();
    expect(result.evaluationCount).toBe(0);
  });
});

describe("QS score-impact policy", () => {
  const qsMetric = (
    metricId: string,
    overrides: Partial<RecommendationMetricDefinition> = {},
  ): RecommendationMetricDefinition => metric({
    metricId,
    engineField: metricId,
    label: metricId,
    eligibleForNumericRecommendation: true,
    recommendationStatus: "eligible",
    ...overrides,
  });

  it("does not add changes whose visible QS impact is 0.00", () => {
    const adapter: RecommendationAdapter = {
      id: "qs",
      scoreMinimum: 0,
      scoreMaximum: 100,
      initialValues: { tiny: 100 },
      definitions: [qsMetric("tiny")],
      returnBestEffortPlan: true,
      minimumDisplayedScoreImpact: 0.01,
      calculate: (values) => ({ score: 10 + (Number(values.tiny) - 100) * 0.001 }),
      getDisplayedScore: (result) => (result as { score: number }).score,
      getCategoryScores: () => ({}),
    };

    const result = runRecommendationEngine({
      adapter,
      targetScore: 20,
      planningHorizon: "6-months",
    });

    expect(result.primaryPlan).toBeNull();
  });

  it("keeps the smallest combination that retains at least 90% of the strongest QS gain", () => {
    const adapter: RecommendationAdapter = {
      id: "qs",
      scoreMinimum: 0,
      scoreMaximum: 100,
      initialValues: { strongA: 100, strongB: 100, weak: 100 },
      definitions: [qsMetric("strongA"), qsMetric("strongB"), qsMetric("weak")],
      returnBestEffortPlan: true,
      minimumDisplayedScoreImpact: 0.02,
      maximumRecommendedChanges: 3,
      bestEffortScoreRetentionRatio: 0.9,
      calculate: (values) => ({
        score: 10 +
          (Number(values.strongA) - 100) / 6 +
          (Number(values.strongB) - 100) / 6 +
          (Number(values.weak) - 100) / 60,
      }),
      getDisplayedScore: (result) => (result as { score: number }).score,
      getCategoryScores: () => ({}),
    };

    const result = runRecommendationEngine({
      adapter,
      targetScore: 20,
      planningHorizon: "6-months",
    });

    expect(result.primaryPlan?.changes.map((change) => change.metricId).toSorted())
      .toEqual(["strongA", "strongB"]);
    expect(result.primaryPlan?.changes).toHaveLength(2);
  });

  it("excludes an unverified QS parameter even if it is accidentally marked as a candidate", () => {
    const adapter: RecommendationAdapter = {
      id: "qs",
      scoreMinimum: 0,
      scoreMaximum: 100,
      initialValues: { employment: 100 },
      definitions: [qsMetric("employment", {
        eligibleForNumericRecommendation: false,
        recommendationStatus: "calibration-required",
      })],
      returnBestEffortPlan: true,
      calculate: (values) => ({ score: Number(values.employment) }),
      getDisplayedScore: (result) => (result as { score: number }).score,
      getCategoryScores: () => ({}),
    };

    const result = runRecommendationEngine({
      adapter,
      targetScore: 200,
      planningHorizon: "6-months",
    });

    expect(result.primaryPlan).toBeNull();
    expect(result.evaluationCount).toBe(0);
  });
});
