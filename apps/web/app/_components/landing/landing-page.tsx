"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const processWords =
  "Diagnosis yang baik tidak dimulai dari tebakan cepat. Ia dimulai dari kebiasaan membaca clue, membandingkan kemungkinan, lalu memeriksa kembali alasan di balik keputusan.".split(
    " ",
  );

const marqueeItems = [
  "Baca clue",
  "Susun hipotesis",
  "Pilih diagnosis",
  "Pelajari alasannya",
];

const studyModes = [
  {
    title: "Kasus harian",
    description:
      "Satu kasus terarah untuk menjaga kebiasaan belajar tetap konsisten.",
    accent: "orange",
  },
  {
    title: "Kasus acak",
    description:
      "Uji pola berpikir pada vignette dan penyakit yang berbeda-beda.",
    accent: "blue",
  },
  {
    title: "Grup belajar",
    description:
      "Bandingkan progres dan pertahankan ritme bersama rekan belajar.",
    accent: "lime",
  },
];

const reviewCards = [
  {
    key: "observe",
    title: "Amati tanpa tergesa.",
    copy: "Clue dibuka bertahap supaya perhatianmu tetap pada informasi yang benar-benar tersedia.",
    details: ["Demografi", "Keluhan utama", "Pemeriksaan", "Temuan penunjang"],
  },
  {
    key: "decide",
    title: "Uji satu diagnosis.",
    copy: "Pilih dugaan paling masuk akal, lalu lihat bagaimana jumlah clue memengaruhi skor dan keyakinan.",
    details: [
      "Hipotesis aktif",
      "Diagnosis banding",
      "Keputusan",
      "Skor kasus",
    ],
  },
  {
    key: "understand",
    title: "Pahami alasan klinisnya.",
    copy: "Penjelasan AI merangkum gambaran penyakit, diagnosis, tata laksana, dan poin belajar utama.",
    details: ["Overview", "Patofisiologi", "Diagnosis", "Tata laksana"],
  },
];

export function LandingPage() {
  const rootRef = useRef<HTMLElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  useGSAP(
    () => {
      if (process.env.NODE_ENV === "test") return;

      const reduceMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduceMotion) {
        gsap.set(
          [
            ".landing-nav",
            ".landing-hero__line > span",
            ".landing-hero__support",
            ".landing-hero__actions > *",
            ".landing-case-stage",
            ".landing-bento__card",
          ],
          { clearProps: "all" },
        );
        return;
      }

      const intro = gsap.timeline({
        defaults: {
          ease: "power4.out",
        },
      });

      intro
        .from(".landing-nav", {
          y: -28,
          opacity: 0,
          duration: 0.7,
        })
        .from(
          ".landing-hero__line > span",
          {
            yPercent: 115,
            rotate: 1.5,
            duration: 1.05,
            stagger: 0.1,
          },
          "-=0.38",
        )
        .from(
          ".landing-hero__support",
          {
            y: 24,
            opacity: 0,
            duration: 0.7,
          },
          "-=0.62",
        )
        .from(
          ".landing-hero__actions > *",
          {
            y: 18,
            opacity: 0,
            duration: 0.58,
            stagger: 0.08,
          },
          "-=0.48",
        )
        .from(
          ".landing-case-stage",
          {
            y: 64,
            rotate: 4,
            scale: 0.88,
            opacity: 0,
            duration: 1.05,
          },
          "-=0.92",
        );

      gsap.from(".landing-bento__card", {
        y: 72,
        scale: 0.93,
        opacity: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".landing-bento",
          start: "top 76%",
          once: true,
        },
      });

      gsap.fromTo(
        ".landing-manifesto__word",
        {
          opacity: 0.12,
        },
        {
          opacity: 1,
          stagger: 0.035,
          ease: "none",
          scrollTrigger: {
            trigger: ".landing-manifesto",
            start: "top 72%",
            end: "bottom 44%",
            scrub: 0.7,
          },
        },
      );

      const cards = gsap.utils.toArray<HTMLElement>(".landing-stack__card");

      cards.forEach((card, index) => {
        const nextCard = cards[index + 1];
        if (!nextCard) return;

        gsap.to(card, {
          scale: 0.93,
          y: -18,
          opacity: 0.5,
          ease: "none",
          scrollTrigger: {
            trigger: nextCard,
            start: "top 82%",
            end: "top 34%",
            scrub: true,
          },
        });
      });

      gsap.from(".landing-safety__item", {
        y: 36,
        opacity: 0,
        duration: 0.7,
        stagger: 0.09,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".landing-safety",
          start: "top 76%",
          once: true,
        },
      });
    },
    { scope: rootRef },
  );

  function closeMenu() {
    setIsMenuOpen(false);
  }

  return (
    <main
      ref={rootRef}
      className="landing-page w-full max-w-full"
      data-menu-open={isMenuOpen ? "true" : "false"}
    >
      <header className="landing-nav">
        <a
          href="#top"
          className="landing-brand"
          aria-label="Beranda clinIQ AI"
          onClick={closeMenu}
        >
          <span className="landing-brand__mark">cQ</span>
          <span className="landing-brand__word">
            clinIQ <strong>AI</strong>
          </span>
        </a>

        <nav className="landing-nav__links" aria-label="Navigasi utama">
          <a href="#cara-belajar">Cara belajar</a>
          <a href="#penjelasan-ai">Penjelasan AI</a>
          <a href="#keamanan">Keamanan</a>
        </nav>

        <div className="landing-nav__actions">
          <a href="/login" className="landing-nav__login">
            Masuk
          </a>
          <a href="/register" className="landing-button landing-button--nav">
            Mulai belajar
          </a>

          <button
            type="button"
            className="landing-menu-button"
            aria-label={isMenuOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={isMenuOpen}
            aria-controls="landing-mobile-menu"
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        </div>
      </header>

      <div
        id="landing-mobile-menu"
        className="landing-mobile-menu"
        aria-hidden={!isMenuOpen}
      >
        <nav aria-label="Navigasi seluler">
          <a href="#cara-belajar" onClick={closeMenu}>
            Cara belajar
          </a>
          <a href="#penjelasan-ai" onClick={closeMenu}>
            Penjelasan AI
          </a>
          <a href="#keamanan" onClick={closeMenu}>
            Keamanan
          </a>
          <a href="/login" onClick={closeMenu}>
            Masuk
          </a>
        </nav>

        <a
          href="/register"
          className="landing-button landing-button--mobile"
          onClick={closeMenu}
        >
          Buat akun belajar
        </a>
      </div>

      <section id="top" className="landing-hero">
        <div className="landing-hero__poster">
          <div className="landing-hero__copy">
            <p className="landing-hero__kicker">
              Belajar diagnosis dari petunjuk klinis
            </p>

            <h1
              className="landing-hero__title w-full max-w-[92rem]"
              aria-label="Baca gejalanya. Pahami alasannya."
            >
              <span className="landing-hero__line">
                <span>Baca gejalanya.</span>
              </span>
              <span className="landing-hero__line landing-hero__line--offset">
                <span>Pahami alasannya.</span>
              </span>
            </h1>

            <p className="landing-hero__support">
              clinIQ AI melatihmu membaca clue, menyusun hipotesis, memilih
              diagnosis, lalu meninjau penjelasan klinis yang membuat jawaban
              benar maupun salah tetap berguna.
            </p>

            <div className="landing-hero__actions">
              <a
                href="/register"
                className="landing-button landing-button--primary"
              >
                Mulai kasus pertama
                <span aria-hidden="true">↗</span>
              </a>
              <a
                href="#cara-belajar"
                className="landing-button landing-button--secondary"
              >
                Lihat cara belajar
              </a>
            </div>
          </div>

          <aside
            className="landing-case-stage"
            aria-label="Contoh kasus diagnosis"
          >
            <div
              className="landing-case-stage__image"
              role="img"
              aria-label="Ilustrasi meja belajar klinis"
            >
              <span>case / respiratory</span>
            </div>

            <div className="landing-case-stage__sheet">
              <div className="landing-case-stage__topline">
                <span>Clue terbuka</span>
                <strong>03 / 05</strong>
              </div>

              <p className="landing-case-stage__patient">
                Pasien 34 tahun datang dengan demam, batuk kering, dan napas
                terasa lebih pendek sejak tiga hari.
              </p>

              <div className="landing-case-stage__clues">
                <span>Demam 38,4°C</span>
                <span>Frekuensi napas meningkat</span>
                <span>Riwayat kontak serumah</span>
              </div>

              <div className="landing-case-stage__diagnosis">
                <span>Hipotesis aktif</span>
                <strong>Pneumonia komunitas</strong>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <div className="landing-marquee" aria-label="Alur belajar clinIQ AI">
        <div className="landing-marquee__track" aria-hidden="true">
          {[...marqueeItems, ...marqueeItems].map((item, index) => (
            <span key={`${item}-${index}`}>
              {item}
              <i />
            </span>
          ))}
        </div>
      </div>

      <section id="cara-belajar" className="landing-section landing-interest">
        <div className="landing-section__heading">
          <p>
            Belajar seperti sedang memecahkan kasus, bukan membaca ringkasan.
          </p>
          <h2>Satu ruang untuk mengamati, memutuskan, dan meninjau kembali.</h2>
        </div>

        <div className="landing-bento">
          <article className="landing-bento__card landing-bento__card--case">
            <div className="landing-bento__copy">
              <span className="landing-bento__signal">Clinical vignette</span>
              <h3>Informasi datang bertahap.</h3>
              <p>
                Setiap clue mengubah gambaran kasus. Kamu belajar menahan
                kesimpulan sampai bukti cukup kuat.
              </p>
            </div>

            <div className="landing-bento__case-visual">
              <div
                className="landing-bento__case-image"
                role="img"
                aria-label="Tekstur editorial pembelajaran klinis"
              />
              <div className="landing-bento__case-note">
                <span>Temuan berikutnya</span>
                <strong>Radang Saluran Bronkus</strong>
                <p>Apakah temuan ini memperkuat atau melemahkan hipotesismu?</p>
              </div>
            </div>
          </article>

          <article className="landing-bento__card landing-bento__card--explain">
            <span className="landing-bento__signal">AI explanation</span>
            <h3>Bukan sekadar benar atau salah.</h3>
            <p>
              Pelajari overview penyakit, patofisiologi, diagnosis, tata
              laksana, pencegahan, dan poin klinis penting.
            </p>

            <div className="landing-explanation-lines" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
          </article>

          <article className="landing-bento__card landing-bento__card--daily">
            <span className="landing-bento__signal">Daily practice</span>
            <strong className="landing-bento__number">1</strong>
            <p>Satu kasus sehari untuk menjaga pola pikir tetap aktif.</p>
          </article>

          <article className="landing-bento__card landing-bento__card--group">
            <span className="landing-bento__signal">Study circle</span>
            <div className="landing-bento__avatars" aria-hidden="true">
              <span>AR</span>
              <span>DN</span>
              <span>MK</span>
            </div>
            <p>
              Belajar bersama tanpa mengubah latihan menjadi kompetisi kosong.
            </p>
          </article>
        </div>
      </section>

      <section className="landing-manifesto landing-section">
        <p
          className="landing-manifesto__copy"
          aria-label={processWords.join(" ")}
        >
          <span aria-hidden="true">
            {processWords.map((word, index) => (
              <span
                className="landing-manifesto__word"
                key={`${word}-${index}`}
              >
                {word}{" "}
              </span>
            ))}
          </span>
        </p>
      </section>

      <section id="penjelasan-ai" className="landing-section landing-stack">
        <div className="landing-stack__intro">
          <p>
            Dari clue
            <span className="landing-inline-image" aria-hidden="true" />
            menjadi alasan yang bisa dipahami.
          </p>
          <h2>Belajar terjadi setelah keputusan dibuat.</h2>
        </div>

        <div className="landing-stack__cards">
          {reviewCards.map((card) => (
            <article
              key={card.key}
              className={`landing-stack__card landing-stack__card--${card.key}`}
            >
              <div>
                <span className="landing-stack__phase">
                  {card.key === "observe"
                    ? "Observe"
                    : card.key === "decide"
                      ? "Decide"
                      : "Review"}
                </span>
                <h3>{card.title}</h3>
                <p>{card.copy}</p>
              </div>

              <ul>
                {card.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-modes">
        <div className="landing-modes__heading">
          <h2>Pilih ritme yang membuatmu terus kembali.</h2>
          <p>
            Mulai kecil, jaga konsistensi, lalu gunakan riwayat latihan untuk
            melihat pola keputusanmu.
          </p>
        </div>

        <div className="landing-modes__grid">
          {studyModes.map((mode) => (
            <article
              key={mode.title}
              className={`landing-mode-card landing-mode-card--${mode.accent}`}
            >
              <span aria-hidden="true" />
              <h3>{mode.title}</h3>
              <p>{mode.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="keamanan" className="landing-section landing-safety">
        <div className="landing-safety__heading">
          <h2>AI menjelaskan. Kamu tetap menilai.</h2>
          <p>
            clinIQ AI adalah alat belajar. Bukan pengganti penilaian klinis,
            diagnosis profesional, atau keputusan terapi.
          </p>
        </div>

        <div className="landing-safety__list">
          <article className="landing-safety__item">
            <span>Human judgment</span>
            <strong>Keputusan tetap berada pada manusia.</strong>
          </article>
          <article className="landing-safety__item">
            <span>Visible reasoning</span>
            <strong>
              Penjelasan dibuat untuk ditinjau, bukan dipercaya mentah.
            </strong>
          </article>
          <article className="landing-safety__item">
            <span>Learning context</span>
            <strong>Seluruh pengalaman dirancang untuk pendidikan.</strong>
          </article>
        </div>
      </section>

      <section className="landing-action">
        <div className="landing-action__copy">
          <p>Kasus berikutnya sudah menunggu.</p>
          <h2>Latih naluri klinismu hari ini.</h2>
        </div>

        <a href="/register" className="landing-action__button">
          <span>Mulai belajar</span>
          <strong aria-hidden="true">↗</strong>
        </a>
      </section>

      <footer className="landing-footer">
        <a
          href="#top"
          className="landing-brand landing-brand--footer"
          aria-label="Kembali ke bagian atas"
        >
          <span className="landing-brand__mark">cQ</span>
          <span className="landing-brand__word">
            clinIQ <strong>AI</strong>
          </span>
        </a>

        <p>Ruang latihan diagnosis berbasis clue dan penjelasan AI.</p>

        <nav aria-label="Navigasi footer">
          <a href="/login">Masuk</a>
          <a href="/register">Daftar</a>
          <a href="#keamanan">Keamanan</a>
        </nav>

        <small>© 2026 clinIQ AI</small>
      </footer>
    </main>
  );
}
