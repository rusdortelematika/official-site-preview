import { useLayoutEffect, useRef } from "preact/hooks";
import styles from "./RoadSideTrack.module.css";

export default function RoadSideTrack() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const carRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const scene = sceneRef.current;
    const car = carRef.current;
    if (!scene || !car) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
    let frame: number | undefined;
    let previousHeight: number | undefined;
    let previousScroll: number | undefined;
    let previousPosition: number | undefined;
    let disposed = false;

    const update = () => {
      frame = undefined;
      if (disposed) return;

      const viewport = window.innerHeight;
      const height = Math.max(viewport, document.body.getBoundingClientRect().height);
      const carHeight = car.offsetHeight;
      const range = Math.max(0, height - viewport);
      const scrolled = clamp(window.scrollY, 0, range);

      if (height !== previousHeight) {
        scene.style.setProperty("--side-road-height", `${height}px`);
        previousHeight = height;
      }
      if (scrolled !== previousScroll) {
        scene.style.setProperty("--side-road-scroll", `${-scrolled}px`);
        previousScroll = scrolled;
      }

      if (motion.matches) {
        previousPosition = undefined;
        scene.removeAttribute("data-scroll-active");
        scene.style.removeProperty("--side-road-car-y");
      } else {
        const progress = range ? scrolled / range : 0;
        const viewportY = viewport * (0.20 + 0.56 * progress);
        const position = clamp(scrolled + viewportY - carHeight / 2, 0, Math.max(0, height - carHeight));
        const rounded = Math.round(position * 10) / 10;
        if (rounded !== previousPosition) {
          scene.style.setProperty("--side-road-car-y", `${rounded}px`);
          previousPosition = rounded;
        }
        scene.setAttribute("data-scroll-active", "");
      }
      scene.setAttribute("data-ready", "");
    };

    const schedule = () => {
      if (!disposed && frame === undefined) frame = requestAnimationFrame(update);
    };
    const resize = new ResizeObserver(schedule);
    const observePage = () => {
      resize.disconnect();
      resize.observe(document.body);
      resize.observe(car);
      schedule();
    };

    update();
    observePage();
    motion.addEventListener("change", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("pageshow", schedule);
    document.addEventListener("astro:after-swap", observePage);

    return () => {
      disposed = true;
      resize.disconnect();
      motion.removeEventListener("change", schedule);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pageshow", schedule);
      document.removeEventListener("astro:after-swap", observePage);
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={sceneRef} class={styles.viewport} data-road-side-track aria-hidden="true">
      <div class={styles.track}>
        <div class={styles.stream} />
        <div class={styles.surface} />
        <div class={styles.grove} />
        <div class={styles.guardrail} />
        <div class={styles.lamp} />
        <div class={styles.marker} />
        <div ref={carRef} class={styles.car} data-road-side-car />
        <div class={styles.gantry} />
      </div>
    </div>
  );
}
