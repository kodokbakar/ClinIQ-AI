🩺 ClinIQ-AI: Gamifikasi Edukasi Medis & Clinical Vignettes Nusantara
📖 Ringkasan Proyek
ClinIQ-AI adalah sebuah web game interaktif yang menguji ketajaman penalaran medis pemain melalui kuis tebak diagnosis penyakit. Terinspirasi dari mekanik Wordle, pemain harus menegakkan diagnosis berdasarkan maksimal 5 petunjuk (clues) yang terbuka secara bertahap.

Berbeda dengan aplikasi edukasi kesehatan konvensional, ClinIQ-AI memadukan teka-teki medis profesional dengan pendekatan sosial dan kearifan lokal. Produk ini dirancang sebagai sebuah solusi kreatif untuk menjawab fenomena ketergantungan digital dan dilema produktivitas pada peran Gen Z di Indonesia. Alih-alih menghabiskan waktu layar (screen time) untuk konsumsi konten yang pasif, ClinIQ-AI mengubah interaksi digital tersebut menjadi aktivitas asah otak yang produktif, kompetitif, dan penuh dengan wawasan kesehatan yang dibalut persona lokal.

✨ Fitur Utama
Sistem Petunjuk Bertahap (Progressive Clinical Vignettes)
Alih-alih memberikan deskripsi acak, sistem menyajikan petunjuk dalam bentuk studi kasus pasien yang runtut (Clinical Vignettes). Pemain akan memecahkan teka-teki layaknya seorang dokter yang sedang melakukan observasi mendalam:

Petunjuk Awal (1-2): Membuka profil demografi pasien, riwayat tindakan medis, dan keluhan utama (anamnesis).

Petunjuk Pertengahan (3-4): Mengungkap data objektif secara spesifik, seperti hasil tes laboratorium (urinalysis, kultur bakteri), atau karakteristik patogen.

Petunjuk Akhir (5): Mengungkap kesimpulan epidemiologi atau riwayat pengobatan sebelumnya yang sangat mengerucutkan kemungkinan diagnosis.

Pengacakan Kasus Unik (High Replayability)
Sistem dirancang agar pemain tidak dapat menghafal kasus. Setiap penyakit memiliki banyak variasi skenario kasus di database. Algoritma akan memastikan bahwa jika seorang pengguna sudah pernah memecahkan variasi kasus A, ia tidak akan pernah mendapatkan kasus A tersebut lagi di masa depan. Ia mungkin akan menebak penyakit yang sama di lain hari, tetapi dengan variasi skenario klinis yang sepenuhnya berbeda. Namun, variasi kasus A tersebut tetap tersedia di dalam pool (kolam acak) untuk ditebak oleh pengguna lain yang belum pernah mendapatkannya.

Integrasi Data Medis Dinamis (WHO ICD Excel Chunking)
Bank data penyakit yang menjadi jawaban kuis tidak ditulis secara manual, melainkan disuplai langsung melalui proses chunking dari file Excel/CSV resmi ICD (International Classification of Diseases) rilisan WHO. Data ini kemudian di-seeding ke dalam tabel diseases. Pendekatan ini menjamin akurasi medis tingkat tinggi dan bersifat dinamis; jika WHO merilis pembaruan data penyakit terbaru, administrator hanya perlu mengganti file Excel dan melakukan seeding ulang ke database tanpa perlu merombak kode aplikasi.

Penjelasan AI Berbasis Kearifan Lokal (Smart AI Caching & Fallback)
Jika setelah 5 petunjuk pemain masih belum bisa menjawab dengan benar, maka sistem akan langsung mengeluarkan output penjelasan diagnosis penyakit dari AI. Uniknya, AI ini dipersonalisasi untuk menjelaskan penyakit tersebut dalam konteks kebiasaan masyarakat Indonesia (seperti kebiasaan jajan, telat makan, atau pengobatan tradisional).

Alur Simpan Database (Zero-Token Architecture): Setiap penjelasan yang di-generate langsung oleh AI akan otomatis disimpan ke dalam database secara permanen. Jika ada pemain lain yang kebetulan mendapatkan soal penyakit yang sama, sistem akan mencari dan mengambil penjelasan tersebut lewat database terlebih dahulu tanpa harus memanggil API AI terus-menerus. Hal ini menekan penggunaan token API eksternal menjadi nol untuk penyakit yang sudah terdata.

Sirkel Kompetitif (Multiplayer Groups)
Pemain dapat membuat atau bergabung ke dalam grup eksklusif dengan kapasitas maksimal 5 orang. Fitur ini dirancang khusus untuk memicu persaingan sehat antar-lingkaran pertemanan dekat tanpa memerlukan fitur chat real-time yang memberatkan server.

Papan Peringkat Instan (Redis Leaderboards)
ClinIQ-AI menggunakan teknologi Redis (Sorted Sets) untuk menangani kalkulasi dan pemeringkatan skor dalam hitungan milidetik. Terdapat dua jenis klasemen:

Global Leaderboard: Adu rekor dengan seluruh pemain secara nasional.

Group Leaderboard: Klasemen internal untuk memantau siapa "Dokter Terbaik" di dalam satu sirkel grup.

🛑 Batasan Sistem & Efisiensi (System Constraints & Optimization)
Untuk memastikan performa backend tetap cepat dan menjaga biaya operasional (API & Server) agar tidak membengkak, sistem ClinIQ-AI menerapkan batasan dan optimasi ketat berikut:

Optimasi Database (Pencegahan N+1 Queries): Sistem secara aktif menghindari masalah N+1 queries saat memuat relasi data yang kompleks (misalnya: menarik data disease beserta quiz variants, 5 tingkatan clue, dan daftar anggota grup). Backend mengimplementasikan pola Eager Loading (menggunakan SQL JOIN yang efisien) serta Data Batching (seperti menggunakan pola DataLoader atau WHERE IN pada ORM), sehingga pengambilan data berelasi hanya membutuhkan 1 hingga 2 eksekusi query saja, bukan query berulang di dalam looping.

Limitasi Pemicu AI (On-Demand Generation): AI tidak akan terus-menerus bekerja meng-generate kasus di latar belakang. Pemanggilan API AI bersifat reaktif (lazy-load) dan hanya terpicu jika kondisi sangat membutuhkan (misalnya, saat sistem kehabisan variasi kasus unik untuk pemain tertentu, atau saat penjelasan penyakit belum ada di database).

Pencegahan Duplikasi Kasus (Idempotent Generation): AI dijamin tidak akan pernah meng-generate kasus atau penjelasan yang sama persis dua kali. Sebelum menembak ke API provider, backend akan melakukan validasi ke tabel PostgreSQL. Jika kasus atau penjelasan untuk parameter penyakit tersebut sudah ada, sistem akan memblokir permintaan ke AI dan menggunakan data dari database lokal.

🛠️ Arsitektur & Teknologi (Tech Stack)
Frontend: Membangun antarmuka responsive yang memberikan pengalaman layaknya membaca rekam medis elektronik (EMR) yang disederhanakan.

Backend: Mengelola alur logika vignette dinamis per user, validasi batas anggota grup (maksimal 5), proses parsing/chunking data Excel ICD WHO, injeksi prompt AI lokal, dan interaksi database (dengan optimasi anti N+1).

Relational Database (PostgreSQL): Berfungsi sebagai Source of Truth (SOT) untuk menyimpan data pengguna, rekam jejak tebakan (QUIZ_ATTEMPTS), bank penyakit dinamis, hierarki clue, dan cache teks AI.

In-Memory Store (Redis): Mengambil alih beban agregasi skor dari PostgreSQL agar halaman leaderboard tetap super cepat meski diakses ribuan pengguna bersamaan.

Generative AI (9Router / OpenAI-Compatible API): Menggunakan infrastruktur router AI untuk menghasilkan teks penjelasan penyakit. Dikonfigurasi khusus dengan instruksi sistem agar gaya bahasanya menghibur, relevan dengan budaya Indonesia, namun tetap akurat secara medis.

## 6. Environment Configuration

Refer to [CONFIG.md](CONFIG.md) for the complete list of environment variables.


🎯 Dampak & Metrik Kesuksesan
Proyek ini bertujuan untuk membuktikan bahwa edukasi literasi kesehatan dapat disampaikan dengan tingkat engagement yang sangat tinggi. Indikator kesuksesan diukur dari tingginya Quiz Completion Rate, persentase partisipasi fitur grup, efisiensi kinerja server tanpa N+1 queries, serta efisiensi anggaran operasional (Cost Savings) yang dicapai melalui sistem AI Cache yang ketat dan pembaruan data backend yang dinamis.
