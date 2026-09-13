# Uni-Predictor Web

Uni-Predictor Web; üniversite sıralama metodolojilerindeki kurumsal girdilerin skor ve tahmini sıralama bandı üzerindeki etkisini incelemek için geliştirilmiş web tabanlı bir simülasyon sistemidir.

Desteklenen metodolojiler:

- Times Higher Education (THE)
- QS
- UI GreenMetric 2026

> [!IMPORTANT]
> Bu proje THE, QS veya UI GreenMetric tarafından sağlanan resmî bir sıralama aracı değildir. Üretilen skorlar ve sıralama bantları simülasyon, senaryo analizi ve repository'de bulunan yayımlanmış geçmiş verilerle yaklaşık kalibrasyon amacı taşır. Kesin veya resmî sıralama sonucu olarak yorumlanmamalıdır.
> > Repository herhangi bir üniversiteye ait özel veya gizli kurumsal veri içermez. Kullanıcı tarafından girilen kurumsal veriler kaynak koda dahil edilmez.

## Özellikler

- Kurumsal verilerin metodoloji ve veri yılı bazında girilmesi
- THE, QS ve UI GreenMetric senaryo simülasyonları
- Mevcut ve önerilen skor, alt skor/gösterge ve tahmini rank-band karşılaştırmaları
- Metodolojiden bağımsız normal senaryo state'leri
- Hedef skor için değiştirilebilir parametre ve kısıt tabanlı Öneri Motoru
- Ortak kurumsal parametrelerin metodolojilere ayrı ayrı yansıtıldığı Çapraz Analiz
- Kayıtlı senaryoların listelenmesi, açılması, yeniden adlandırılması, silinmesi ve karşılaştırılması
- Kayıtlı metodoloji senaryosu, senaryo karşılaştırması, öneri planı ve Çapraz Analiz PDF raporları
- Türkçe ve İngilizce arayüz
- Gerçek kullanıcı verisinden ayrı, deterministik ve sentetik Demo Üniversitesi profili

## Teknoloji yığını

Teknolojiler doğrudan [`package.json`](package.json) bağımlılıklarına dayanır:

- Next.js 16 App Router
- React 19
- TypeScript 5
- Tailwind CSS 4
- Recharts 3
- Vitest 4
- ESLint 9 ve `eslint-config-next`
- Repository içindeki düşük seviyeli PDF üreticileri; haricî PDF paketi kullanılmaz

## Kurulum ve çalıştırma

Gereksinimler: Node.js ve npm. Repository belirli bir Node sürümünü `engines` alanıyla sabitlemez.

```bash
npm install
npm run dev
```

Uygulama geliştirme modunda varsayılan olarak [http://localhost:3000](http://localhost:3000) adresinde açılır.

Production build ve yerel production sunucusu:

```bash
npm run build
npm run start
```

Kalite kontrolleri:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Proje için zorunlu bir `.env` değişkeni bulunmaz. Temel hesaplama, grafik, scenario ve paketlenmiş rank-reference akışları runtime internet bağlantısı gerektirmez.

İsteğe bağlı `NEXT_PUBLIC_RANKING_DATA_MANIFEST_URL`, Ayarlar ekranındaki THE/QS reference dataset güncelleme denetimini etkinleştirir. Değişken tanımlı değilse uygulama paketlenmiş yerel datasetlerle çalışmaya devam eder. Secret değerleri `NEXT_PUBLIC_` değişkenlerinde saklamayın.

### Build ve deployment notu

[`next.config.ts`](next.config.ts) bir `output: "export"` ayarı içermez; proje şu anda Next.js'in normal production build/start akışını kullanır. Repository'de platforma özel deployment yapılandırması bulunmadığından belirli bir hosting sağlayıcısı varsayılmaz.

## Route'lar

| Route | İşlev |
| --- | --- |
| `/` | Ana sayfa ve modül özeti |
| `/data-entry` | Kurumsal Veri Girişi |
| `/the` | THE simülasyonu |
| `/qs` | QS simülasyonu |
| `/greenmetric` | UI GreenMetric simülasyonu |
| `/recommendations` | Öneri Motoru |
| `/cross-analysis` | Çapraz Analiz |
| `/scenario-comparison` | Kayıtlı Senaryolar ve PDF işlemleri |
| `/settings` | Veri, referans dataset ve uygulama ayarları |

`/settings/users`, eski bağlantılar için `/settings` sayfasına yönlendiren uyumluluk route'udur.

## Ana modüller

### Kurumsal Veri Girişi

THE, QS ve UI GreenMetric için kullanılan kurumsal baseline verileri [`InstitutionDataContext`](src/contexts/InstitutionDataContext.tsx) üzerinden yönetilir. Kullanıcı girdileri tarayıcının `localStorage` alanında tutulur; projede cloud/backend persistence bulunmaz.

### THE

Kurumsal girdiler THE input modeline çevrilir, ham göstergeler ve kategori skorları hesaplanır, ardından repository'deki referans dağılımıyla tahmini rank band üretilir. Canlı simülasyon motoru [`src/lib/the/stochastic/run-the-stochastic-simulation.ts`](src/lib/the/stochastic/run-the-stochastic-simulation.ts) içindedir.

### QS

Kurumsal FTE ve diğer girdilerden ham oranlar oluşturulur; mevcut QS hesaplama ve kalibrasyon katmanı weighted indicator sonuçlarını ve tahmini rank bandı üretir. Ana akış [`src/lib/calculations/qs`](src/lib/calculations/qs) ve [`src/lib/qs/estimate-qs-rank.ts`](src/lib/qs/estimate-qs-rank.ts) altındadır.

### UI GreenMetric 2026

Aktif yapı yedi kategori, 60 gösterge ve toplam 10.000 azami puandan oluşur:

| Kod | Kategori | Gösterge | Azami puan |
| --- | --- | ---: | ---: |
| SI | Yerleşim ve Altyapı | 8 | 1.100 |
| EC | Enerji ve İklim Değişikliği | 10 | 2.000 |
| WS | Atık | 6 | 1.700 |
| WR | Su | 6 | 1.100 |
| TR | Ulaşım | 8 | 1.700 |
| ED | Eğitim ve Araştırma | 10 | 1.300 |
| GD | Yönetişim ve Dijitalleşme | 12 | 1.100 |

Kategori ve indicator metadata'sı [`src/config/greenmetric.categories.ts`](src/config/greenmetric.categories.ts) ve [`src/config/greenmetric.metrics.ts`](src/config/greenmetric.metrics.ts), hesaplama motoru ise [`src/lib/calculations/ui-greenmetric`](src/lib/calculations/ui-greenmetric) altındadır.

### Senaryolar

Normal methodology senaryosu şu modeli izler:

```text
kurumsal baseline + ilgili metodolojinin override'ları → aynı calculator ile yeniden hesaplama
```

THE, QS ve UI GreenMetric normal scenario state'leri birbirinden bağımsızdır. Bir metodolojide yapılan değişiklik diğer metodolojinin scenario state'ini değiştirmez. Kayıtlı scenario snapshot'ları ayrıca [`SavedScenariosContext`](src/contexts/SavedScenariosContext.tsx) tarafından yönetilir.

### Öneri Motoru

Kullanıcı hedef skoru, değerlendirilecek/değiştirilebilecek parametreleri ve isteğe bağlı değer veya aralık kısıtlarını belirler. Öneriler methodology adapter'ları üzerinden mevcut calculator ile doğrulanır. UI GreenMetric önerileri bir sonraki gerçek indicator puan eşiğine ulaşan adayları değerlendirir; genel bir yüzde artışı formülü kullanmaz.

Kaynak: [`src/lib/recommendation-engine`](src/lib/recommendation-engine).

### Çapraz Analiz

Çapraz Analiz ortak bir global skor üretmez ve THE, QS ile GreenMetric skorlarını toplamaz. Her metodoloji kendi ölçeği, calculator'ı ve rank estimator'ı ile ayrı sonuç verir.

Ortak parametre tanımları [`src/lib/cross-analysis/registry.ts`](src/lib/cross-analysis/registry.ts), baseline projection ve orchestration ise [`src/lib/cross-analysis`](src/lib/cross-analysis) altındadır. Registry'deki bir parametre en az iki metodolojiyle gerçek semantik eşlemeye sahip olmalıdır.

FTE ve kişi sayısı (headcount) aynı veri değildir. Repository FTE alanlarını GreenMetric headcount alanlarına otomatik dönüştürmez. Bu nedenle bir FTE değişikliği THE ve QS'yi etkilerken UI GreenMetric için `affected=false` olması geçerli bir sonuç olabilir.

### PDF raporları

PDF akışı aktif veya kaydedilmiş sonuç snapshot'larını kullanır; PDF içinde ayrı methodology score hesabı yapılmaz. Desteklenen raporlar:

- tek kayıtlı metodoloji senaryosu
- aynı metodolojiye ait kayıtlı scenario karşılaştırması
- UI GreenMetric scenario raporu
- tek kayıtlı Çapraz Analiz raporu
- Öneri Motoru plan raporu

Kaynak: [`src/lib/scenarios`](src/lib/scenarios) ve [`src/lib/recommendation-engine/recommendation-report.ts`](src/lib/recommendation-engine/recommendation-report.ts).

## Veri akışı

Ana methodology akışı:

```text
InstitutionData baseline
→ methodology input mapping
→ derived/raw değerler
→ methodology calculator
→ score ve alt sonuçlar
→ methodology rank estimator
→ UI / saved snapshot / PDF
```

Çapraz Analiz akışı:

```text
InstitutionData snapshot
+ Cross Analysis override
→ methodology-specific projected inputs
→ mevcut THE / QS / UI GreenMetric calculator'ları
→ ayrı score ve rank sonuçları
→ CrossAnalysisResult
→ UI / saved snapshot / PDF
```

Daha ayrıntılı teknik açıklama için [`docs/architecture.md`](docs/architecture.md) belgesine bakın.

## Demo ve veri politikası

`Ayarlar → Veri ve Depolama` bölümündeki Demo Üniversitesi profili:

- deterministiktir ve rastgele değer üretmez;
- açıkça `synthetic-demo` metadata'sı taşır;
- gerçek bir üniversitenin kurumsal veri kopyası değildir;
- THE, QS ve UI GreenMetric akışlarını göstermek için tasarlanmıştır;
- kullanıcı onayıyla etkinleşir ve kapatıldığında önceki yerel kurumsal/scenario verisini geri yükler.

Repository, rank tahmini ve metodoloji referansı için yayımlanmış historical/public datasetler içerir. Bunlar kullanıcıya ait kurum içi veri değildir ve aktif kurumun gerçek operasyonel verisi olarak ele alınmaz. Kullanıcının girdiği kurumsal değerler source code'a yazılmaz; tarayıcı tarafında saklanır.

## Persistence

Tarayıcı `localStorage` alanında yüksek seviyede şu veriler tutulur:

- kurumsal veri ve aktif veri yılları
- methodology scenario override'ları
- kayıtlı methodology ve Çapraz Analiz snapshot'ları
- uygulama dili ve ayarları
- kullanıcı tarafından etkinleştirilen yerel reference dataset tercihleri

Ayarlar ekranı yerel yedek dışa/içe aktarma ve veri gruplarını temizleme işlemleri sunar. Otomatik cloud senkronizasyonu yoktur.

## Proje dizini

```text
app/                         Next.js App Router sayfaları ve layout
src/components/              Modül ve ortak React bileşenleri
src/contexts/                InstitutionData, scenario, saved scenario ve dil state'i
src/config/                  Methodology metadata, input ve calibration ayarları
src/lib/calculations/        THE, QS ve UI GreenMetric hesaplama katmanları
src/lib/cross-analysis/      Registry, projection, state ve orchestration
src/lib/recommendation-engine/ Öneri hesaplama ve doğrulama katmanı
src/lib/rankings/            Ortak reference dataset çözümleme ve rank araçları
src/lib/scenarios/           Snapshot persistence/presentation ve PDF üretimi
src/data/                    Paketlenmiş reference, historical ve demo verileri
src/tests/                   Modül ve entegrasyon testleri
docs/                        Metodoloji ve mimari teknik notları
scripts/                     Dataset import, rapor ve tanı scriptleri
```

## Test kapsamı

`npm test`, Vitest ile tüm test suite'ini çalıştırır. Testler şu başlıca alanları kapsar:

- THE, QS ve UI GreenMetric calculation/validation
- chart ve result presentation modelleri
- methodology state isolation ve reset
- Cross Analysis registry, projection, direct-calculator invariant, save ve PDF
- recommendation adapter ve threshold davranışı
- saved scenario migration/persistence
- demo institution
- i18n ve navigation yapısı

## Bilinen sınırlamalar

- Rank sonuçları yaklaşık tahminlerdir; kesin veya resmî sıra değildir.
- QS reputation/bibliometric göstergelerinin bazıları yalnız kurumsal sayımlardan üretilemez. Kamuya açık raw→score normalizasyonu bulunmayan bir ham değer değiştiğinde ilgili indicator skoru güvenli biçimde sabit tutulabilir ve sonuç `raw-analysis-only` olarak işaretlenebilir.
- THE için zorunlu veri veya gerekli dış/bibliometrik girdiler eksikse skor/rank uydurulmaz.
- UI GreenMetric 2026 simülasyonu, rank kalibrasyonu için paketlenmiş 2025 historical ranking dağılımını kullanır. Bu, 2026 resmî sıralaması değildir.
- FTE ve headcount semantikleri ayrıdır; aralarında otomatik dönüşüm yoktur.
- Cross Analysis yalnız registry'de en az iki metodolojiyle semantik olarak eşlenen parametreleri içerir ve ortak/global score üretmez.
- Veriler yalnız tarayıcıda tutulduğu için farklı cihazlar arasında otomatik paylaşılmaz.

## Geliştirme notu

Değişiklik göndermeden önce en az şu kontrolleri çalıştırın:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Repository'de `LICENSE` dosyası bulunmadığından README içinde bir lisans adı beyan edilmemiştir.
