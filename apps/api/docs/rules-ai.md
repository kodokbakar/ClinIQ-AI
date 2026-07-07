# ClinIQ-AI - AI Interaction Rules & Guidelines

This document outlines the rules, prompt templates, and expected behavior for AI interactions within the ClinIQ-AI application, based on the project description and architectural discussions.

---

## 1. AI Explanation Generation (User-Facing)

**Goal:** Provide localized, medically accurate, and culturally relevant explanations for diseases when a user fails a quiz or reveals all clues.

### Prompt Template (System)

```
Anda adalah seorang dokter Indonesia yang ramah dan suka berbagi ilmu.
Tugas Anda adalah menjelaskan penyakit "{disease_name}" dalam bahasa
Indonesia yang santai, mudah dimengerti, dan relevan dengan budaya sehari-hari
masyarakat Indonesia.

Gaya bicara Anda: seperti dokter puskesmas yang sedang ngobrol santai
dengan pasien. Gunakan konteks lokal seperti "kebiasaan jajan",
"telat makan", "begadang", atau "pengobatan tradisional" sesuai relevansi.

Tetap akurat secara medis, tapi hindari jargon yang terlalu rumit.
Panjang penjelasan: maksimal 3-4 paragraf pendek.
```

### Rules

- **Localization ("Kearifan Lokal"):** AI must generate explanations tailored to Indonesian cultural contexts (e.g., "kebiasaan jajan", "telat makan", "pengobatan tradisional"). This persona must be strictly maintained.
- **Accuracy:** Explanations must be medically accurate and derived from reliable sources (implicitly, from the disease data sourced from WHO ICD).
- **On-Demand (Lazy-Load):** Explanations are only generated when needed (e.g., user fails a quiz, no existing cached explanation for the specific `(disease_id, locale_context)`).
- **Caching (Zero-Token Architecture):**
    - Before generating, always check the `AI_Explanations` database table using `(disease_id, locale_context)` as the unique key.
    - If an explanation exists for the given `(disease_id, locale_context)`, retrieve and return the cached version.
    - If not found, generate the explanation using the external AI API.
    - Immediately save the newly generated explanation to the `AI_Explanations` table with the correct `disease_id`, `locale_context`, and `ai_model_used`.
- **Idempotency:** The AI system (and caching logic) must guarantee that the *exact same* explanation for a given `(disease_id, locale_context)` is never generated or stored twice. The unique constraint `(disease_id, locale_context)` in the database enforces this.
- **`locale_context` values:** Use predefined, consistent identifiers for `locale_context` (e.g., `INDONESIA_GENERAL`, `INDONESIA_JAJAN`, `INDONESIA_TELAT_MAKAN`, `INDONESIA_TRADITIONAL_MEDICINE`).

### Example Output

```
Penyakit "Demam Tifoid" atau yang biasa kita kenal sebagai tifus,
sering banget ditemui di Indonesia. Biasanya penyakit ini muncul
karena kebiasaan jajan sembarangan di pinggir jalan. Kuman
Salmonella typhi masuk ke tubuh lewat makanan atau minuman yang
kurang bersih.

Gejalanya mirip-mirip tipes pada umumnya: demam naik turun,
terutama kalau sudah sore sampai malam. Lidah jadi putih
(tapi tepinya merah), perut kembung, dan kadang-kadang
susah BAB. Kalau sudah parah, bisa muncul bintik-bintik
merah di dada.

Yang penting, jangan langsung minum obat warung. Kalau
demam sudah lebih dari 7 hari, sebaiknya periksa ke
puskesmas atau dokter terdekat. Tifus bisa sembuh total
kalau ditangani dengan antibiotik yang tepat dan istirahat
yang cukup.
```

---

## 2. Quiz Vignette Generation (Admin/System Triggered)

**Goal:** Create diverse and unique clinical case scenarios (`QuizVignettes`) for diseases to ensure high replayability for users.

### Prompt Template (System)

```
Anda adalah seorang dokter spesialis pendidikan klinis yang
bertugas membuat soal ujian berbentuk vignette (skenario kasus).
Buatlah sebuah skenario kasus untuk penyakit "{disease_name}"
dengan varian "{variant_name}".

STRUKTUR VIGNETTE (5 clue bertahap):
1. Demografi & Keluhan Utama (1-2 kalimat)
2. Anamnesis & Riwayat (1-2 kalimat)
3. Pemeriksaan Fisik & Tanda Vital (1-2 kalimat)
4. Hasil Laboratorium / Penunjang (1-2 kalimat)
5. Epidemiologi / Kesimpulan (1 kalimat)

Kriteria:
- Varian "{variant_name}" harus terasa berbeda dari varian lain
  untuk penyakit yang sama.
- Setiap clue harus progresif — clue berikutnya semakin
  mengerucutkan diagnosis.
- Gunakan konteks Indonesia (nama pasien Indonesia, lokasi
  yang relevan, kebiasaan lokal).
- Output dalam bahasa Indonesia.
```

### Rules

- **Uniqueness per User:** The system ensures that a user will not receive the *exact same* vignette variant they have previously attempted. The AI must be capable of generating different scenarios for the same disease.
- **Idempotency:** Before generating a new vignette variant, the system must validate against the `QuizVignettes` table (using `(disease_id, variant_name)`). If a vignette with the same `disease_id` and `variant_name` already exists, the generation request should be blocked, and the existing variant used or a new, truly unique `variant_name` pursued.
- **On-Demand/Admin Triggered:** Vignette generation is not a continuous background process. It's triggered reactively when the system needs more unique cases for a user, or manually via admin action.
- **Variety:** The AI should prioritize creating distinct and varied scenarios (`variant_name`) for each disease to maximize replayability and educational value.
- **Consistency:** Generated vignettes must adhere to the 5-clue progressive structure.

### Example Vignette Output

```
Varian: "Kasus Anak Usia Sekolah"

CLUE 1 (Demografi & Keluhan Utama):
Seorang anak laki-laki, usia 8 tahun, siswa SD di daerah
Jakarta Selatan, datang dengan keluhan utama demam sejak
3 hari yang lalu. Ibu pasien mengatakan anaknya juga
mengeluh pusing dan badan terasa lemas.

CLUE 2 (Anamnesis & Riwayat):
Demam naik turun, tinggi pada malam hari (sampai 39,5°C).
Pasien tidak mau makan, mual-mual, dan mengeluh perut
bagian atas terasa tidak nyaman. Tidak ada anggota keluarga
lain yang sakit. Riwayat imunisasi: tidak lengkap.

CLUE 3 (Pemeriksaan Fisik):
Konjungtiva anemis (+), lidah tampak kotor dengan tepi
hiperemis ("strawberry tongue"). Teraba pembesaran kelenjar
getah bening di leher. Auskultasi abdomen: bising usus normal.

CLUE 4 (Laboratorium):
Darah tepi: Hb 10,2 g/dL, leukosit 4.500/mm³, trombosit
180.000/mm³. Serologi Widal: O titer 1/320, H titer 1/160.
IgM anti-Salmonella typhi: positif.

CLUE 5 (Epidemiologi):
Pasien tinggal di daerah padat penduduk dengan sanitasi
kurang baik. Sehari-hari jajan sembarangan di kantin
sekolah yang belum terjamin kebersihannya.
```

---

## 3. General AI Considerations

- **Cost Optimization:** Adhere strictly to the caching mechanism to minimize external AI API token usage.
- **Robustness:** Implement retry mechanisms and error handling for external AI API calls (see [9router-integration.md](9router-integration.md) for connection details).
- **Monitoring:** Track AI API usage, generation successes/failures, and cache hit rates.
