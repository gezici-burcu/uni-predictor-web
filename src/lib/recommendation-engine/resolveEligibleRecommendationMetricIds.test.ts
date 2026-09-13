import {describe,expect,it} from "vitest";
import {resolveEligibleRecommendationMetricIds} from "./resolveEligibleRecommendationMetricIds";
const input={allEligibleMetricIds:["a","b","c"],selectedMetricIds:[],lockedMetricIds:["c"]};
describe("resolveEligibleRecommendationMetricIds",()=>{
  it("returns every unlocked metric for all-eligible with no selection",()=>expect(resolveEligibleRecommendationMetricIds({...input,scopeMode:"all-eligible"})).toEqual(["a","b"]));
  it("returns every unlocked metric for exclude-selected with no selection",()=>expect(resolveEligibleRecommendationMetricIds({...input,scopeMode:"exclude-selected"})).toEqual(["a","b"]));
  it("requires explicit selections only in only-selected",()=>expect(resolveEligibleRecommendationMetricIds({...input,scopeMode:"only-selected"})).toEqual([]));
  it("keeps locks authoritative in every mode",()=>expect(resolveEligibleRecommendationMetricIds({...input,scopeMode:"only-selected",selectedMetricIds:["a","c"]})).toEqual(["a"]));
  it("excludes selected metrics without affecting the remaining set",()=>expect(resolveEligibleRecommendationMetricIds({...input,scopeMode:"exclude-selected",selectedMetricIds:["b"]})).toEqual(["a"]));
});
