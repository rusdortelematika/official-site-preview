import { useEffect, useRef, useState } from "preact/hooks";
import carUrl from "../../../assets/components/road-loader/car-top.webp?url";
import brandMark from "../../../assets/images/brand/rdt-header-mark.svg?url";
import styles from "./RoadLoader.module.css";
import { mountRoadLoader, roadLoaderLogoWidth } from "./roadScene";

const copy = {
  ru: { loading: "Загрузка", pause: "Пауза", resume: "Продолжить" },
  en: { loading: "Loading", pause: "Pause", resume: "Resume" },
};

export interface RoadLoaderProps {
  size?: number | string;
  locale?: keyof typeof copy;
  label?: string;
  showControls?: boolean;
  className?: string;
}

export default function RoadLoader({
  size = 384,
  locale = "ru",
  label,
  showControls = false,
  className,
}: RoadLoaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toggleRef = useRef<(() => void) | null>(null);
  const [paused, setPaused] = useState(false);
  const text = copy[locale];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const playback = mountRoadLoader(canvas, carUrl, setPaused);
    if (!playback) return;

    toggleRef.current = playback.toggle;
    return () => {
      toggleRef.current = null;
      playback.dispose();
    };
  }, []);

  return (
    <div
      class={className ? `${styles.loader} ${className}` : styles.loader}
      lang={locale}
      style={{
        "--road-loader-size": typeof size === "number" ? `${size}px` : size,
        "--road-loader-logo-width": roadLoaderLogoWidth,
      }}
    >
      <div class={styles.stage}>
        <canvas ref={canvasRef} aria-hidden="true" />
        <img class={styles.logo} src={brandMark} width="48" height="48" alt="" />
      </div>
      <span class={styles.status} role="status">{label ?? text.loading}</span>
      {showControls && (
        <button
          class={styles.button}
          type="button"
          data-paused={paused ? "true" : undefined}
          onClick={() => toggleRef.current?.()}
        >
          <span class={styles.buttonIcon} aria-hidden="true" />
          {paused ? text.resume : text.pause}
        </button>
      )}
    </div>
  );
}
