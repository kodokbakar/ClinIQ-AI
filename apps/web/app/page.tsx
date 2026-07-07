const trustMetrics = [
  { value: "42d", label: "median draft intake" },
  { value: "8,7k", label: "catatan dirapikan tiap pekan" },
  { value: "24/7", label: "ruang kerja siap triase" },
];

const workflow = [
  {
    step: "01",
    title: "Dengar",
    body: "Tangkap konteks pasien, keluhan utama, dan tujuan kunjungan tanpa memaksa formulir kaku di awal.",
  },
  {
    step: "02",
    title: "Bentuk",
    body: "Ubah intake mentah menjadi catatan klinis terstruktur, sinyal prioritas, dan ringkasan yang mudah ditinjau.",
  },
  {
    step: "03",
    title: "Tinjau",
    body: "Dokter tetap memegang kendali melalui draft yang bisa diedit, petunjuk keyakinan, dan jejak perubahan yang jelas.",
  },
];

const queueItems = [
  { name: "Maya R.", status: "Kontrol ulang", tone: "Stabil", time: "09.20" },
  {
    name: "Ari P.",
    status: "Intake baru",
    tone: "Perlu tinjau",
    time: "09.34",
  },
  {
    name: "Nora S.",
    status: "Ringkasan siap",
    tone: "Risiko rendah",
    time: "09.48",
  },
];

const safetyItems = [
  "Output untuk pasien membutuhkan persetujuan manusia",
  "Draft AI menampilkan sinyal ketidakpastian secara jelas",
  "Catatan dibuat agar cepat dikoreksi, bukan langsung dipercaya mentah-mentah",
];

export default function Home() {
  return (
    <main className="relative isolate min-h-svh overflow-hidden px-5 py-5 sm:px-8 lg:px-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-24 -z-10 h-72 w-72 rounded-[38%_62%_57%_43%/43%_36%_64%_57%] bg-[var(--fig-soft)] opacity-35 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-28 top-1/3 -z-10 h-80 w-80 rounded-[58%_42%_38%_62%/48%_55%_45%_52%] bg-[var(--absinthe)] opacity-40 blur-3xl"
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex items-center justify-between gap-4 rounded-[2rem] px-1 py-2 sm:px-2">
          <a
            href="#top"
            className="focus-clay flex items-center gap-3 rounded-full"
            aria-label="Beranda clinIQ AI"
          >
            <span className="grid size-11 place-items-center rounded-[1.1rem] bg-[var(--ink)] text-sm font-black text-[var(--cream)] shadow-[7px_8px_18px_rgba(69,55,36,0.26)]">
              cQ
            </span>
            <span className="leading-none">
              <span className="block font-[var(--font-display)] text-xl font-semibold tracking-[-0.04em]">
                clinIQ AI
              </span>
              <span className="block text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
                clinical clayware
              </span>
            </span>
          </a>

          <nav
            aria-label="Navigasi utama"
            className="hidden items-center gap-2 rounded-full border border-[var(--line)] bg-[rgba(255,248,234,0.42)] p-1 shadow-[inset_3px_3px_9px_rgba(91,74,49,0.1),inset_-3px_-3px_9px_rgba(255,255,244,0.75)] md:flex"
          >
            {[
              ["Produk", "#produk"],
              ["Alur", "#alur"],
              ["Keamanan", "#keamanan"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="focus-clay rounded-full px-4 py-2 text-sm font-extrabold text-[var(--muted)] transition hover:text-[var(--ink)]"
              >
                {label}
              </a>
            ))}
          </nav>

          <a
            href="/login"
            className="focus-clay clay-button rounded-full bg-[var(--cream)] px-5 py-3 text-sm font-black text-[var(--ink)]"
          >
            Masuk
          </a>
        </header>

        <section
          id="top"
          className="grid items-stretch gap-6 lg:grid-cols-[1.05fr_0.95fr]"
        >
          <div className="clay-panel relative overflow-hidden rounded-[2.4rem] p-6 sm:p-8 lg:p-10">
            <div
              aria-hidden="true"
              className="absolute right-8 top-8 h-20 w-20 rounded-[2rem] bg-[var(--pollen-soft)] opacity-70 shadow-[inset_9px_10px_18px_rgba(106,82,37,0.14),inset_-8px_-8px_18px_rgba(255,250,223,0.9)]"
            />

            <div className="relative max-w-3xl">
              <p className="mb-6 inline-flex rounded-full bg-[rgba(154,170,131,0.34)] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[var(--absinthe-deep)] shadow-[inset_4px_4px_10px_rgba(80,97,71,0.12),inset_-4px_-4px_10px_rgba(255,255,237,0.8)]">
                AI intake untuk klinik yang lebih tenang
              </p>

              <h1 className="font-[var(--font-display)] text-5xl font-semibold leading-[0.92] tracking-[-0.07em] text-[var(--ink)] sm:text-6xl lg:text-7xl">
                Catatan klinis yang tidak terasa seperti tumpukan administrasi.
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
                clinIQ AI membantu mengubah intake pasien yang berantakan
                menjadi catatan terstruktur, sinyal triase, dan ringkasan
                kunjungan yang siap ditinjau tim klinik.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/register"
                  className="focus-clay clay-button inline-flex items-center justify-center rounded-full bg-[var(--fig)] px-7 py-4 text-base font-black text-[var(--cream)]"
                >
                  Mulai bentuk catatan
                </a>
                <a
                  href="#alur"
                  className="focus-clay clay-button inline-flex items-center justify-center rounded-full bg-[var(--cream)] px-7 py-4 text-base font-black text-[var(--ink)]"
                >
                  Lihat alur kerja
                </a>
              </div>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {trustMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="clay-inset rounded-[1.7rem] px-5 py-4"
                >
                  <strong className="block font-[var(--font-display)] text-3xl font-semibold tracking-[-0.05em]">
                    {metric.value}
                  </strong>
                  <span className="mt-1 block text-sm font-bold text-[var(--muted)]">
                    {metric.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <aside
            id="produk"
            aria-label="Pratinjau produk"
            className="clay-panel relative overflow-hidden rounded-[2.4rem] p-5 sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted)]">
                  meja kerja klinik
                </p>
                <h2 className="font-[var(--font-display)] text-3xl font-semibold tracking-[-0.05em]">
                  Intake pagi
                </h2>
              </div>
              <div className="clay-inset rounded-full px-4 py-2 text-sm font-black text-[var(--absinthe-deep)]">
                12 terbuka
              </div>
            </div>

            <div className="rounded-[2rem] bg-[var(--ink)] p-4 text-[var(--cream)] shadow-[14px_18px_35px_rgba(49,39,26,0.28)]">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-extrabold text-[rgba(255,248,234,0.7)]">
                  Fokus yang disarankan
                </p>
                <span className="rounded-full bg-[rgba(234,219,168,0.16)] px-3 py-1 text-xs font-black text-[var(--pollen-soft)]">
                  tinjau
                </span>
              </div>

              <p className="mt-5 font-[var(--font-display)] text-3xl font-semibold leading-tight tracking-[-0.05em]">
                “Batuk menetap, demam ringan, riwayat perjalanan baru-baru ini.”
              </p>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {["Vital", "Riwayat", "Sinyal"].map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-[rgba(255,248,234,0.1)] px-3 py-2 text-center text-xs font-black text-[rgba(255,248,234,0.82)]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {queueItems.map((item) => (
                <article
                  key={item.name}
                  className="clay-inset flex items-center justify-between gap-4 rounded-[1.6rem] p-4"
                >
                  <div>
                    <h3 className="font-black">{item.name}</h3>
                    <p className="text-sm font-bold text-[var(--muted)]">
                      {item.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-[var(--fig)]">
                      {item.tone}
                    </p>
                    <time className="text-xs font-bold text-[var(--muted)]">
                      {item.time}
                    </time>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </section>

        <section
          id="alur"
          className="grid gap-5 rounded-[2.2rem] lg:grid-cols-[0.8fr_1.2fr]"
        >
          <div className="clay-panel rounded-[2.2rem] p-6 sm:p-8">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[var(--fig)]">
              alur kerja
            </p>
            <h2 className="font-[var(--font-display)] text-4xl font-semibold leading-none tracking-[-0.06em] sm:text-5xl">
              Tiga langkah lembut untuk kunjungan yang lebih tajam.
            </h2>
            <p className="mt-5 text-lg leading-8 text-[var(--muted)]">
              AI dibuat terlihat, tetapi tidak mendominasi. Tim klinik tetap
              mengedit, menyetujui, dan mengambil keputusan.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {workflow.map((item) => (
              <article
                key={item.step}
                className="clay-panel rounded-[2rem] p-6 transition hover:-translate-y-1"
              >
                <span className="clay-inset mb-7 grid size-14 place-items-center rounded-[1.25rem] font-[var(--font-display)] text-2xl font-semibold text-[var(--fig)]">
                  {item.step}
                </span>
                <h3 className="font-[var(--font-display)] text-3xl font-semibold tracking-[-0.05em]">
                  {item.title}
                </h3>
                <p className="mt-3 leading-7 text-[var(--muted)]">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="keamanan"
          className="clay-panel grid gap-6 rounded-[2.4rem] p-6 sm:p-8 lg:grid-cols-[1fr_0.8fr]"
        >
          <div>
            <p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[var(--absinthe-deep)]">
              keamanan desain
            </p>
            <h2 className="font-[var(--font-display)] text-4xl font-semibold leading-none tracking-[-0.06em] sm:text-5xl">
              Antarmuka hangat. Batas klinis tetap serius.
            </h2>
          </div>

          <div className="grid gap-3">
            {safetyItems.map((item) => (
              <div
                key={item}
                className="clay-inset flex items-start gap-3 rounded-[1.4rem] p-4"
              >
                <span className="mt-1 size-3 rounded-full bg-[var(--pollen)] shadow-[0_0_0_5px_rgba(198,164,81,0.18)]" />
                <p className="font-extrabold leading-6 text-[var(--ink)]">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </section>

        <footer className="flex flex-col justify-between gap-4 pb-6 pt-2 text-sm font-bold text-[var(--muted)] sm:flex-row">
          <p>
            © 2026 clinIQ AI. Dibangun untuk operasional klinik yang lebih
            tenang.
          </p>
          <div className="flex gap-4">
            <a className="focus-clay rounded-full" href="/login">
              Masuk
            </a>
            <a className="focus-clay rounded-full" href="/register">
              Daftar
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
