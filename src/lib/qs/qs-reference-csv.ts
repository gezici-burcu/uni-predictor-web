import { QS_INDICATOR_ORDER } from "@/src/config/qs.calculation";
import { normalizeQsRankBand } from "@/src/lib/qs/qs-rank-band";
import { validateQsReferenceDataset, type QsReferenceInput } from "@/src/lib/qs/qs-reference-validator";
import type { QsIndicatorCode } from "@/src/types/qs";
import type { QsReferenceDataset } from "@/src/types/qs-reference";

const BASE_HEADERS=["institutionId","institutionName","country","methodologyYear","rank","rankBand","overallScore"] as const;
const SOURCE_HEADERS=["sourceName","sourceReference","accessedAt","methodologyYearVerified"] as const;
export const QS_REFERENCE_CSV_HEADERS=[...BASE_HEADERS,...QS_INDICATOR_ORDER,...SOURCE_HEADERS] as const;

export function parseQsCsvMatrix(text:string) {
  const rows:string[][]=[]; let row:string[]=[], cell="", quoted=false;
  for (let i=0;i<text.length;i++) {
    const char=text[i];
    if (char==='"') { if (quoted && text[i+1]==='"') {cell+='"';i++;} else quoted=!quoted; continue; }
    if (char===","&&!quoted) {row.push(cell);cell="";continue;}
    if ((char==="\n"||char==="\r")&&!quoted) {if(char==="\r"&&text[i+1]==="\n")i++;row.push(cell);if(row.some((v)=>v.trim()))rows.push(row);row=[];cell="";continue;}
    cell+=char;
  }
  if (quoted) return {rows,errors:["Kapanmamış CSV tırnağı"]};
  if (cell||row.length) {row.push(cell);if(row.some((v)=>v.trim()))rows.push(row);}
  return {rows,errors:[] as string[]};
}

function numberValue(raw:string,field:string,row:number,errors:string[]):number|null {
  const value=raw.trim(); if(!value)return null;
  if (value.includes(",")) {errors.push(`Satır ${row}: ${field} nokta ondalık ayırıcı kullanmalı`);return null;}
  const parsed=Number(value);
  if(!Number.isFinite(parsed)){errors.push(`Satır ${row}: ${field} geçerli sonlu sayı olmalı`);return null;}
  return parsed;
}

export interface QsReferenceCsvParseResult {records:QsReferenceInput[];errors:string[];warnings:string[]}
export function parseQsReferenceCsv(csvText:string):QsReferenceCsvParseResult {
  const matrix=parseQsCsvMatrix(csvText), errors=[...matrix.errors], warnings:string[]=[];
  if(!matrix.rows.length)return {records:[],errors,warnings};
  const headers=matrix.rows[0].map((h)=>h.trim()), duplicates=headers.filter((h,i)=>headers.indexOf(h)!==i);
  if(duplicates.length)errors.push(`Duplicate kolon: ${[...new Set(duplicates)].join(", ")}`);
  const known=new Set<string>(QS_REFERENCE_CSV_HEADERS);
  for(const header of headers)if(!known.has(header))warnings.push(`Bilinmeyen kolon: ${header}`);
  for(const required of QS_REFERENCE_CSV_HEADERS)if(!headers.includes(required))errors.push(`Eksik kolon: ${required}`);
  if(errors.length)return {records:[],errors,warnings};
  const records=matrix.rows.slice(1).map((cells,index)=>{
    const rowNumber=index+2, row=Object.fromEntries(headers.map((h,i)=>[h,cells[i]??""]));
    const methodologyYear=numberValue(row.methodologyYear,"methodologyYear",rowNumber,errors);
    const rank=numberValue(row.rank,"rank",rowNumber,errors), overallScore=numberValue(row.overallScore,"overallScore",rowNumber,errors);
    const indicatorScores:Partial<Record<QsIndicatorCode,number>>={};
    for(const code of QS_INDICATOR_ORDER){const score=numberValue(row[code],code,rowNumber,errors);if(score!==null)indicatorScores[code]=score;}
    const band=row.rankBand.trim(); if(band&&!normalizeQsRankBand(band))errors.push(`Satır ${rowNumber}: rankBand geçersiz`);
    const booleanText=row.methodologyYearVerified.trim().toLowerCase();
    if(!["true","false"].includes(booleanText))errors.push(`Satır ${rowNumber}: methodologyYearVerified true/false olmalı`);
    return {
      institutionId:row.institutionId.trim(),institutionName:row.institutionName.trim(),country:row.country.trim()||null,
      methodologyYear:methodologyYear??Number.NaN,rank,rankBand:band?normalizeQsRankBand(band)?.label??band:null,overallScore,
      indicatorScores,
      sourceMetadata:{sourceName:row.sourceName.trim(),sourceReference:row.sourceReference.trim()||null,accessedAt:row.accessedAt.trim()||null,methodologyYearVerified:booleanText==="true"},
    };
  });
  return {records,errors,warnings};
}

export function prepareQsReferenceDatasetImport(csvText:string):{
  success:boolean;dataset:QsReferenceDataset|null;errors:string[];warnings:string[];
} {
  const parsed=parseQsReferenceCsv(csvText);
  if(parsed.errors.length)return {success:false,dataset:null,errors:parsed.errors,warnings:parsed.warnings};
  const validation=validateQsReferenceDataset(parsed.records);
  if(validation.errors.length)return {success:false,dataset:null,errors:validation.errors,warnings:[...parsed.warnings,...validation.warnings]};
  const records=[...parsed.records].sort((a,b)=>{
    if(a.methodologyYear!==b.methodologyYear)return a.methodologyYear-b.methodologyYear;
    if(a.rank!==null||b.rank!==null)return (a.rank??Number.MAX_SAFE_INTEGER)-(b.rank??Number.MAX_SAFE_INTEGER);
    const aBand=a.rankBand?normalizeQsRankBand(a.rankBand)?.lowerBound??Number.MAX_SAFE_INTEGER:Number.MAX_SAFE_INTEGER;
    const bBand=b.rankBand?normalizeQsRankBand(b.rankBand)?.lowerBound??Number.MAX_SAFE_INTEGER:Number.MAX_SAFE_INTEGER;
    return aBand-bBand||a.institutionName.localeCompare(b.institutionName,"en");
  });
  return {success:true,dataset:{schemaVersion:1,records},errors:[],warnings:[...parsed.warnings,...validation.warnings]};
}
