import { useEffect, useRef, useState } from "preact/hooks";
import roadVideo from "../../../assets/pages/road/hero/road-drive.mp4?url";
import roadPoster from "../../../assets/pages/road/hero/road-drive-poster.png";
import playIcon from "../../../assets/pages/road/passage-recording/play.svg?url";
import pauseIcon from "../../../assets/pages/road/passage-recording/pause.svg?url";
import RoadNavigation from "../RoadNavigation/RoadNavigation";
import styles from "./RoadHero.module.css";

const copy = {
  ru: {
    title: "Южно-Лыткаринская Автодорога",
    description: "Автомобиль проезжает под рамкой Южно-Лыткаринской автодороги",
    play: "Воспроизвести видео о дороге",
    pause: "Приостановить видео о дороге",
  },
  en: {
    title: "South Lytkarino Motorway",
    description: "A car drives beneath a gantry on the South Lytkarino Motorway",
    play: "Play the motorway video",
    pause: "Pause the motorway video",
  },
};

export default function RoadHero({ locale = "ru" }: { locale?: "ru" | "en" }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pausedRef = useRef(false);
  const syncRef = useRef<() => void>(() => {});
  const [paused, setPaused] = useState(false);
  const text = copy[locale];

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let disposed = false;

    const sync = () => {
      if (disposed) return;
      if (!visible || document.hidden || pausedRef.current) {
        video.pause();
        return;
      }
      video.muted = true;
      void video.play().catch(() => {
        if (!disposed && visible && !document.hidden && !pausedRef.current) {
          pausedRef.current = true;
          setPaused(true);
        }
      });
    };
    syncRef.current = sync;
    const onMotionChange = () => {
      pausedRef.current = reducedMotion.matches;
      setPaused(reducedMotion.matches);
      sync();
    };
    onMotionChange();
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }, { threshold: 0.05 });
    intersection.observe(video);
    document.addEventListener("visibilitychange", sync);
    reducedMotion.addEventListener("change", onMotionChange);

    return () => {
      disposed = true;
      video.pause();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reducedMotion.removeEventListener("change", onMotionChange);
      syncRef.current = () => {};
    };
  }, []);

  return (
    <section class={styles.section} id="road-hero" aria-labelledby="road-hero-title">
      <h1 class={styles.heading} id="road-hero-title">{text.title}</h1>
      <div class={styles.media}>
        <div class={styles.stage} role="img" aria-label={text.description}>
          <video
            ref={videoRef}
            class={styles.video}
            src={roadVideo}
            poster={roadPoster.src}
            width="2560"
            height="1440"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
          />
        </div>
        <RoadNavigation locale={locale} />
        <button
          class={styles.control}
          type="button"
          aria-label={paused ? text.play : text.pause}
          aria-pressed={paused}
          onClick={() => {
            pausedRef.current = !pausedRef.current;
            setPaused(pausedRef.current);
            syncRef.current();
          }}
        >
          <img src={paused ? playIcon : pauseIcon} width="24" height="24" alt="" />
        </button>
      </div>
    </section>
  );
}
