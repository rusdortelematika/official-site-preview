import { useEffect, useRef, useState } from "preact/hooks";
import transponderVideo from "../../../assets/pages/road/payment-methods/transponder.mp4?url";
import plateVideo from "../../../assets/pages/road/payment-methods/number-plate.mp4?url";
import transponderPoster from "../../../assets/pages/road/payment-methods/transponder-poster.jpg";
import platePoster from "../../../assets/pages/road/payment-methods/number-plate-poster.jpg";
import playIcon from "../../../assets/pages/road/payment-methods/play.svg?url";
import pauseIcon from "../../../assets/pages/road/payment-methods/pause.svg?url";
import styles from "./PaymentVideo.module.css";

const copy = {
  ru: {
    play: "Воспроизвести видео",
    pause: "Приостановить видео",
    transponder: "Автомобиль проезжает под рамкой, которая считывает транспондер на лобовом стекле",
    plate: "Автомобиль проезжает под рамкой, камера распознаёт его государственный номер",
  },
  en: {
    play: "Play video",
    pause: "Pause video",
    transponder: "A car passes under a gantry that reads the transponder on its windscreen",
    plate: "A car passes under a gantry and a camera recognises its number plate",
  },
};

interface Props {
  mode: "transponder" | "plate";
  locale: "ru" | "en";
}

export default function PaymentVideo({ mode, locale }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pausedRef = useRef(false);
  const syncRef = useRef<() => void>(() => {});
  const [paused, setPaused] = useState(false);
  const text = copy[locale];
  const poster = mode === "transponder" ? transponderPoster : platePoster;

  useEffect(() => {
    const stage = stageRef.current;
    const video = videoRef.current;
    if (!stage || !video) return;

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
    intersection.observe(stage);
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
  }, [mode, locale]);

  return (
    <div class={styles.media} data-payment-video={mode}>
      <div class={styles.stage} ref={stageRef} role="img" aria-label={text[mode]}>
        <video
          ref={videoRef}
          class={styles.video}
          src={mode === "transponder" ? transponderVideo : plateVideo}
          poster={poster.src}
          width="1024"
          height="768"
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
        />
      </div>
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
        <img src={paused ? playIcon : pauseIcon} width="18" height="18" alt="" />
      </button>
    </div>
  );
}
