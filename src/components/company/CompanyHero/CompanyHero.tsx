import { useEffect, useRef, useState } from "preact/hooks";
import poster from "../../../assets/models/company/rdt-logo-poster.webp?url";
import styles from "./CompanyHero.module.css";

// The poster is rendered from this same assembled pose and camera framing.
const INITIAL_PHASE = .66;
const LOOP_SECONDS = 7;
const copy = {
  ru: { eyebrow: "О компании", title: ["Русдор", "Телематика"], description: "Цифровые решения для современной дорожной инфраструктуры.", logo: "Объёмный логотип Русдор Телематика. Циклическая 3D-анимация сборки логотипа." },
  en: { eyebrow: "About the company", title: ["Rusdor", "Telematika"], description: "Digital solutions for modern road infrastructure.", logo: "The three-dimensional Rusdor Telematika logo with a looping assembly animation." },
};

export default function CompanyHero({ locale = "ru" }: { locale?: "ru" | "en" }) {
  const sectionRef = useRef<HTMLElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const text = copy[locale];

  useEffect(() => {
    const section = sectionRef.current;
    const host = hostRef.current;
    if (!section || !host) return;
    let disposed = false;
    let engine: Awaited<ReturnType<typeof import("./logoScene").createLogoScene>> | undefined;
    let frame = 0;
    let previous: number | undefined;
    let elapsed = 0;
    let visible = true;
    const requestDraw = () => {
      if (!disposed && engine && visible && !document.hidden && !frame) frame = requestAnimationFrame(draw);
    };
    function draw(now: number) {
      frame = 0;
      if (previous !== undefined) elapsed += Math.min((now - previous) / 1000, .1);
      previous = now;
      const phase = (INITIAL_PHASE + elapsed / LOOP_SECONDS) % 1;
      engine?.render(phase);
      section.dataset.animationProgress = phase.toFixed(4);
      section.dataset.animationCycle = String(Math.floor(INITIAL_PHASE + elapsed / LOOP_SECONDS));
      requestDraw();
    }
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = undefined;
      requestDraw();
    };
    const resize = new ResizeObserver(() => { engine?.resize(); sync(); });
    resize.observe(host);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    intersection.observe(host);
    document.addEventListener("visibilitychange", sync);
    void import("./logoScene").then(async ({ createLogoScene }) => {
      if (disposed) return;
      const created = await createLogoScene(host);
      if (disposed) { created.dispose(); return; }
      engine = created;
      // Draw before replacing the matching poster: no SVG or empty canvas is
      // exposed during hydration, navigation or initial shader compilation.
      engine.render(INITIAL_PHASE);
      setReady(true);
      sync();
    }).catch(() => { if (!disposed) setReady(false); });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", sync);
      engine?.dispose();
    };
  }, []);

  return (
    <section class={styles.section} ref={sectionRef} id="company-intro" aria-labelledby="company-intro-title">
      <div class={styles.layout}>
        <div class={styles.content}>
          <p class={styles.eyebrow}>{text.eyebrow}</p>
          <h1 class={styles.title} id="company-intro-title">{text.title[0]}<br />{text.title[1]}</h1>
          <p class={styles.description}>{text.description}</p>
        </div>
        <div class={styles.scene} ref={hostRef} data-ready={ready ? "true" : undefined}>
          <div class={styles.visual} role="img" aria-label={text.logo}>
            <img class={styles.poster} src={poster} width="1600" height="1600" alt="" loading="eager" fetchpriority="high" decoding="sync" />
          </div>
        </div>
      </div>
    </section>
  );
}
