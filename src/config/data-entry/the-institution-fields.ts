import type { TheInstitutionData } from "@/src/data/data-entry/the-institution-data";
export type TheInstitutionFieldKey=keyof TheInstitutionData;
export interface TheInstitutionFieldDefinition{id:TheInstitutionFieldKey;label:{tr:string;en:string};unit:{tr:string;en:string};required:boolean;affectsCalculation:boolean;inputType:"integer"|"currency";minimum:number;step:number;calculationMetricId?:string;sourceType?:"source-reported-income"}
const field=(id:TheInstitutionFieldKey,tr:string,en:string,required:boolean,calculationMetricId?:string,inputType:"integer"|"currency"="integer"):TheInstitutionFieldDefinition=>({id,label:{tr,en},unit:inputType==="currency"?{tr:"Kaynak sistemde bildirilen para birimi",en:"Currency reported in the source system"}:{tr:"FTE / adet",en:"FTE / count"},required,affectsCalculation:required,inputType,minimum:0,step:1,calculationMetricId,...(inputType==="currency"?{sourceType:"source-reported-income" as const}:{})});
/** Source-table order is intentional and is also the form's DOM/render order. */
export const THE_INSTITUTION_DATA_FIELDS=[
field("academicStaffFte","Akademik Personel Sayısı (FTE)","Number of Academic Staff (FTE)",true,"the.common.academicStaffFte"),
field("internationalAcademicStaffFte","Uluslararası/Yurt Dışı Kökenli Akademik Personel Sayısı (FTE)","Number of Academic Staff of International/Overseas Origin (FTE)",false),
field("femaleAcademicStaffFte","Kadın Akademik Personel Sayısı (FTE)","Number of Female Academic Staff (FTE)",false),
field("researchStaffFte","Araştırma Personeli Sayısı (FTE)","Number of Research Staff (FTE)",true,"the.researchEnvironment.academicResearchStaffFte"),
field("studentsFte","Öğrenci Sayısı (FTE)","Number of Students (FTE)",true,"the.common.studentsFte"),
field("internationalStudentsFte","Uluslararası/Yurt Dışı Kökenli Öğrenci Sayısı (FTE)","Number of Students of International/Overseas Origin (FTE)",false),
field("femaleStudentsFte","Kadın Öğrenci Sayısı (FTE)","Number of Female Students (FTE)",false),
field("bachelorsStudentsFte","Lisans Öğrencisi Sayısı (FTE)","Number of Bachelor's Students (FTE)",false),
field("mastersStudentsFte","Yüksek Lisans Öğrencisi Sayısı (FTE)","Number of Master's Students (FTE)",false),
field("doctorateStudentsFte","Doktora Öğrencisi Sayısı (FTE)","Number of Doctorate Students (FTE)",false),
field("undergraduateDegreesAwarded","Verilen Lisans Derecesi Sayısı","Number of Undergraduate Degrees Awarded",true,"the.teaching.bachelorGraduates"),
field("doctoratesAwarded","Verilen Doktora Derecesi Sayısı","Number of Doctorates Awarded",true,"the.teaching.doctorateGraduates"),
field("institutionalIncome","Kurumsal Gelir","Institutional Income",true,"the.teaching.institutionalIncomePpp","currency"),
field("researchIncome","Araştırma Geliri","Research Income",false,undefined,"currency"),
field("industryCommerceResearchIncome","Sanayi ve Ticaret Kaynaklı Araştırma Geliri","Research Income from Industry and Commerce",false,undefined,"currency"),
] as const satisfies readonly TheInstitutionFieldDefinition[];
export const THE_INSTITUTION_FIELDS=THE_INSTITUTION_DATA_FIELDS;
export const THE_INSTITUTION_REQUIRED_FIELDS=THE_INSTITUTION_DATA_FIELDS.filter(item=>item.required);
export const THE_INSTITUTION_OPTIONAL_FIELDS=THE_INSTITUTION_DATA_FIELDS.filter(item=>!item.required);
export function createTheCalculationOverrides(values:TheInstitutionData){return Object.fromEntries(THE_INSTITUTION_DATA_FIELDS.flatMap(item=>item.affectsCalculation&&item.calculationMetricId&&values[item.id]!==null?[[item.calculationMetricId,values[item.id]]]:[])) as Record<string,number>}
