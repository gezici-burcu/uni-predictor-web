import {en} from "./dictionaries/en";
import {tr} from "./dictionaries/tr";
import {recommendationTranslations} from "./recommendation";
import {recommendationUiTranslations} from "./recommendation-ui";
import {theUiTranslations} from "./the-ui";
import {qsUiTranslations} from "./qs-ui";
import {qsResultsUiTranslations} from "./qs-results-ui";
import {greenMetricUiTranslations} from "./greenmetric-ui";
import {greenMetricInstitutionUiTranslations} from "./greenmetric-institution-ui";
import {recommendationSummaryTranslations} from "./recommendation-summary";
import {qsEmploymentUiTranslations} from "./qs-employment-ui";
import type {AppLanguage} from "./types";
import {settingsUiTranslations} from "./settings-ui";
import {crossAnalysisUiTranslations} from "./cross-analysis-ui";
type Dictionary=typeof tr;
export function getTranslation(language:AppLanguage,key:string){
  if(key.startsWith("crossAnalysisUi.")){const item=key.slice(16) as keyof typeof crossAnalysisUiTranslations.tr;return crossAnalysisUiTranslations[language][item]??missingTranslation(language,key)}
  if(key.startsWith("settingsUi.")){const item=key.slice(11) as keyof typeof settingsUiTranslations.tr;return settingsUiTranslations[language][item]??missingTranslation(language,key)}
  if(key.startsWith("qsEmploymentUi.")){const item=key.slice(15) as keyof typeof qsEmploymentUiTranslations.tr;return qsEmploymentUiTranslations[language][item]??missingTranslation(language,key)}
  if(key.startsWith("recommendationUi.")){const item=key.slice(17) as keyof typeof recommendationUiTranslations.tr;return recommendationUiTranslations[language][item]??missingTranslation(language,key)}
  if(key.startsWith("theUi.")){const item=key.slice(6) as keyof typeof theUiTranslations.tr;return theUiTranslations[language][item]??missingTranslation(language,key)}
  if(key.startsWith("qsUi.")){const item=key.slice(5) as keyof typeof qsUiTranslations.tr;return qsUiTranslations[language][item]??missingTranslation(language,key)}
  if(key.startsWith("qsResultsUi.")){const item=key.slice(12) as keyof typeof qsResultsUiTranslations.tr;return qsResultsUiTranslations[language][item]??missingTranslation(language,key)}
  if(key.startsWith("greenMetricUi.")){const item=key.slice(14) as keyof typeof greenMetricUiTranslations.tr;return greenMetricUiTranslations[language][item]??missingTranslation(language,key)}
  if(key.startsWith("greenMetricInstitutionUi.")){const item=key.slice(25) as keyof typeof greenMetricInstitutionUiTranslations.tr;return greenMetricInstitutionUiTranslations[language][item]??missingTranslation(language,key)}
  if(key.startsWith("recommendationSummary.")){const item=key.slice(22) as keyof typeof recommendationSummaryTranslations.tr;return recommendationSummaryTranslations[language][item]??missingTranslation(language,key)}
  if(key.startsWith("recommendation.")){const item=key.slice(15) as keyof typeof recommendationTranslations.tr;return recommendationTranslations[language][item]??missingTranslation(language,key)}
  let value:unknown=language==="tr"?tr:en;
  for(const part of key.split("."))value=(value as Record<string,unknown>)?.[part];
  return typeof value==="string"?value:missingTranslation(language,key);
}
function missingTranslation(language:AppLanguage,key:string){
  if(process.env.NODE_ENV!=="production")console.warn(`[i18n] Missing ${language} translation: ${key}`);
  return language==="tr"?"Çeviri bulunamadı":"Translation unavailable";
}
export type {Dictionary};
