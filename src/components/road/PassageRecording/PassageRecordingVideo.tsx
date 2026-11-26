import { useEffect, useRef, useState } from "preact/hooks";
import transponderVideo from "../../../assets/pages/road/passage-recording/transponder.mp4?url";
import plateVideo from "../../../assets/pages/road/passage-recording/number-plate.mp4?url";
import transponderPoster from "../../../assets/pages/road/passage-recording/transponder-poster.jpg";
import platePoster from "../../../assets/pages/road/passage-recording/number-plate-poster.jpg";
import playIcon from "../../../assets/pages/road/passage-recording/play.svg?url";
import pauseIcon from "../../../assets/pages/road/passage-recording/pause.svg?url";
import styles from "./PassageRecording.module.css";

type Mode = "transponder" | "plate";
type Locale = "ru" | "en";
const clips = [
  { mode: "transponder", src: transponderVideo, poster: transponderPoster.src },
  { mode: "plate", src: plateVideo, poster: platePoster.src },
] as const;
const copy = {
  ru: {
    play: "Воспроизвести видео", pause: "Приостановить видео", error: "Не удалось загрузить видео.",
    transponder: "Рамка считывает транспондер проезжающего автомобиля",
    plate: "Камера распознаёт госномер проезжающего автомобиля",
  },
  en: {
    play: "Play video", pause: "Pause video", error: "Unable to load the video.",
    transponder: "The gantry reads the passing car’s transponder",
    plate: "The camera recognises the passing car’s number plate",
  },
};

function waitForMedia(video: HTMLVideoElement, event: string, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener(event, done);
      video.removeEventListener("error", failed);
      signal.removeEventListener("abort", aborted);
    };
    const done = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error("Unable to load video")); };
    const aborted = () => { cleanup(); reject(new DOMException("Aborted", "AbortError")); };
    if (signal.aborted) return aborted();
    if (video.error) return failed();
    video.addEventListener(event, done, { once: true });
    video.addEventListener("error", failed, { once: true });
    signal.addEventListener("abort", aborted, { once: true });
  });
}

export default function PassageRecordingVideo({ mode, locale }: { mode: Mode; locale: Locale }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const videos = useRef<Partial<Record<Mode, HTMLVideoElement>>>({});
  const shownRef = useRef<Mode>(mode);
  const pausedRef = useRef(false);
  const syncRef = useRef<() => void>(() => {});
  const [shown, setShown] = useState<Mode>(mode);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState(false);
  const text = copy[locale];

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let disposed = false;
    const sync = () => {
      if (disposed) return;
      for (const clip of clips) {
        const video = videos.current[clip.mode];
        if (!video) continue;
        if (clip.mode !== shownRef.current || !visible || document.hidden || pausedRef.current) {
          video.pause();
          continue;
        }
        video.muted = true;
        void video.play().catch(() => {
          if (!disposed && clip.mode === shownRef.current && visible && !document.hidden && !pausedRef.current) {
            pausedRef.current = true;
            setPaused(true);
          }
        });
      }
    };
    syncRef.current = sync;
    const onMotionChange = () => {
      pausedRef.current = motion.matches;
      setPaused(motion.matches);
      sync();
    };
    onMotionChange();
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }, { threshold: 0.05 });
    observer.observe(stage);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", onMotionChange);
    return () => {
      disposed = true;
      Object.values(videos.current).forEach((video) => video?.pause());
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", onMotionChange);
      syncRef.current = () => {};
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    if (mode === shownRef.current) return;
    const incoming = videos.current[mode];
    if (!incoming) return;
    void (async () => {
      try {
        // Keep the current frame visible until the other clip has decoded its
        // matching frame. Neither video element nor its poster is recreated.
        if (incoming.readyState < 2) await waitForMedia(incoming, "loadeddata", controller.signal);
        if (controller.signal.aborted) return;
        const outgoing = videos.current[shownRef.current];
        const time = outgoing?.currentTime ?? 0;
        const target = Number.isFinite(incoming.duration) && incoming.duration > 0 ? time % incoming.duration : time;
        if (Math.abs(incoming.currentTime - target) > 1 / 120) {
          const seeked = waitForMedia(incoming, "seeked", controller.signal);
          incoming.currentTime = target;
          await seeked;
        }
        if (controller.signal.aborted) return;
        shownRef.current = mode;
        setShown(mode);
        syncRef.current();
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    })();
    return () => controller.abort();
  }, [mode]);

  return (
    <div class={styles.player} data-passage-video={shown}>
      <div class={styles.playerStage} ref={stageRef} role="img" aria-label={text[shown]}>
        <div class={styles.videoCanvas}>
          {clips.map((clip) => (
            <video
              key={clip.mode}
              ref={(video) => { if (video) videos.current[clip.mode] = video; }}
              class={`${styles.clip}${clip.mode === "plate" ? ` ${styles.plateClip}` : ""}`}
              data-clip={clip.mode}
              data-active={shown === clip.mode}
              src={clip.src}
              poster={clip.poster}
              width="2048"
              height="1536"
              muted loop playsInline preload="auto" aria-hidden="true"
              onLoadedData={() => syncRef.current()}
            />
          ))}
        </div>
      </div>
      {error && <p class={styles.videoError} role="status">{text.error}</p>}
      <button
        class={styles.videoControl}
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
