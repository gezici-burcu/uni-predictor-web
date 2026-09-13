import type { AppLanguage } from "./types";

const englishByTurkish: Record<string, string> = {
  "Öneri oluşturmak için en az bir parametre seçin.": "Select at least one parameter to generate a recommendation.",
  "Hedef skor boş bırakılamaz.": "Target score is required.",
  "Hedef skor mevcut skorunuzdan yüksek olmalıdır.": "Target score must be higher than the current score.",
  "Tek değer girilmelidir.": "Enter a fixed value.",
  "Negatif değer girilemez.": "Negative values are not allowed.",
  "Değer, parametrenin izin verilen sınırları dışındadır.": "The value is outside the parameter's allowed limits.",
  "Minimum ve maksimum birlikte girilmelidir.": "Enter both minimum and maximum values.",
  "Minimum değer maksimum değerden büyük olamaz.": "Minimum value cannot exceed maximum value.",
  "Aralık, parametrenin izin verilen sınırları dışındadır.": "The range is outside the parameter's allowed limits.",
  "Kişi sayısı tam sayı olmalıdır.": "Headcount must be a whole number.",
  "Geçerli bir sayı girilmelidir.": "Enter a valid number.",
  "Mezun anketine katılan kişi sayısı, toplam mezun sayısından büyük olamaz.": "The number of graduate survey respondents cannot exceed the total number of graduates.",
  "İstihdam edilen ve işsiz mezunların toplamı, mezun anketine katılan kişi sayısından büyük olamaz.": "The total of employed and unemployed graduates cannot exceed the number of graduate survey respondents.",
  "Aralık mevcut değeri içermelidir.": "The range must include the current value.",
};

export function translateRecommendationValidationMessage(language: AppLanguage, message: string) {
  if (language === "tr") return message;
  const maximumMatch = message.match(/^Hedef skor (.+) değerini geçemez\.$/);
  if (maximumMatch) return `Target score cannot exceed ${maximumMatch[1]}.`;
  const respondentMatch = message.match(/^(.+), mezun anketine katılan kişi sayısından büyük olamaz\.$/);
  if (respondentMatch) return `${respondentMatch[1]} cannot exceed the number of graduate survey respondents.`;
  return englishByTurkish[message] ?? message;
}

export function translateRecommendationValidationErrors(
  language: AppLanguage,
  errors: Record<string, string>,
) {
  return Object.fromEntries(Object.entries(errors).map(([key, message]) => [
    key,
    translateRecommendationValidationMessage(language, message),
  ]));
}
