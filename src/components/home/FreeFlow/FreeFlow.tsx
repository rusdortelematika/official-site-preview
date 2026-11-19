import { useLayoutEffect, useRef, useState } from "preact/hooks";
import type { TransitionBeforeSwapEvent } from "astro:transitions/client";
import routePin from "../../../assets/icons/home/map-pin.svg?url";
import desktopScene from "../../../assets/pages/home/free-flow/scene-desktop.webp";
import wideScene from "../../../assets/pages/home/free-flow/scene-wide.webp";
import { createDepthRenderer } from "./depthRenderer";
import { drawScene, gantryLabel } from "./drawScene";
import { loadRoadModels, type RoadModels } from "./roadModels";
import styles from "./FreeFlow.module.css";

const copy = {
  ru: {
    description: "Масштабный инфраструктурный проект Московской области, в рамках которого построена современная скоростная магистраль протяжённостью 45 км, соединяющая Варшавское шоссе с федеральной трассой М-12 «Восток».",
    metrics: [
      { value: "45 км", label: "Протяжённость", headline: "45 км" },
      { value: "4–6", label: "Полос движения", headline: "От 4 до 6 полос" },
      { value: "<40 000", label: "Автомобилей в сутки", headline: "<40 000 автомобилей" },
      { value: "2,5×", label: "Сокращение времени пути", headline: "2,5× сокращение времени пути" },
    ],
    routeLabel: "Маршрут",
    route: "Солнцево → Железнодорожный",
    scene: `Машины проезжают под дорожной рамкой «${gantryLabel}»`,
  },
  en: {
    description: "A major project to improve the Moscow Region’s road network by building a modern motorway from Solntsevo through Butovo, Vidnoye, Lytkarino and Tomilino to Kraskovo, also known as the South Lytkarino Motorway.",
    metrics: [
      { value: "45 km", label: "Length", headline: "45 km" },
      { value: "4–6", label: "Lanes", headline: "4 to 6 lanes" },
      { value: "<40,000", label: "Vehicles per day", headline: "<40,000 vehicles per day" },
      { value: "2.5×", label: "Reduction in travel time", headline: "2.5× shorter travel time" },
    ],
    routeLabel: "Route",
    route: "Solntsevo → Zheleznodorozhny",
    scene: "A car and a truck pass under a RusDor Telematika gantry",
  },
};

export default function FreeFlow({ locale: initialLocale }: { locale: "ru" | "en" }) {
  const [locale, setLocale] = useState(initialLocale);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const text = copy[locale];

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!stage || !canvas || !context) return;

    const loadController = new AbortController();
    const { signal } = loadController;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let renderer: ReturnType<typeof createDepthRenderer>;
    let visible = true;
    let disposed = false;
    let pendingFrame = 0;
    let models: RoadModels | undefined;
    let modelsLoadedAt = 0;
    let languageScroll: { left: number; top: number } | undefined;

    const disableModels = () => {
      loadController.abort();
      models = undefined;
      renderer?.canvas.removeEventListener("webglcontextlost", onContextLost);
      renderer?.dispose();
      renderer = undefined;
    };

    const paint = (time: number) => {
      pendingFrame = 0;
      if (disposed) return;

      const { clientWidth: width, clientHeight: height } = stage;
      if (!width || !height) return;
      const density = Math.min(2, window.devicePixelRatio || 1, Math.sqrt(3_000_000 / (width * height)));
      const bitmapWidth = Math.max(1, Math.round(width * density));
      const bitmapHeight = Math.max(1, Math.round(height * density));
      if (canvas.width !== bitmapWidth) canvas.width = bitmapWidth;
      if (canvas.height !== bitmapHeight) canvas.height = bitmapHeight;

      const bounds = stage.getBoundingClientRect();
      const { top } = bounds;
      const tariffs = document.getElementById("tariffs")?.getBoundingClientRect();
      const layout = tariffs && tariffs.top > top && tariffs.top < bounds.bottom
        ? { left: tariffs.left - bounds.left, top: tariffs.top - top, width: tariffs.width }
        : undefined;
      const viewportHeight = window.innerHeight;
      const start = Math.min(top + window.scrollY, viewportHeight);
      const distance = Math.min(height, viewportHeight * 0.7);
      // Continue the truck beyond the initial pass until it exits behind the next section.
      const progress = reducedMotion.matches ? 0.26 : Math.min(2, Math.max(0, (start - top) / distance));
      const opacity = reducedMotion.matches ? 1 : Math.min(1, Math.max(0, (time - modelsLoadedAt) / 200));
      context.setTransform(bitmapWidth / width, 0, 0, bitmapHeight / height, 0, 0);

      try {
        if (!drawScene(context, width, height, progress, { renderer, models, modelOpacity: opacity, layout })) {
          disableModels();
          drawScene(context, width, height, progress, { layout });
        }
      } catch {
        disableModels();
        drawScene(context, width, height, progress, { layout });
      }

      stage.dataset.ready = renderer && models ? "models" : "road";
      if (models && opacity < 1) schedule();
    };

    const schedule = () => {
      if (disposed || !visible || pendingFrame) return;
      pendingFrame = requestAnimationFrame(paint);
    };

    const onContextLost = () => {
      disableModels();
      schedule();
    };
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule();
    }, { rootMargin: "140px 0px" });
    const resize = new ResizeObserver(schedule);
    const observeLayout = () => {
      resize.disconnect();
      resize.observe(stage);
      const tariffs = document.getElementById("tariffs");
      if (tariffs) resize.observe(tariffs);
    };
    const onScroll = () => {
      if (!reducedMotion.matches) schedule();
    };
    const onBeforeSwap = (event: TransitionBeforeSwapEvent) => {
      const homePaths = [import.meta.env.BASE_URL, `${import.meta.env.BASE_URL}en/`];
      const changingLanguage = event.navigationType !== "traverse"
        && event.from.pathname !== event.to.pathname
        && homePaths.includes(event.from.pathname)
        && homePaths.includes(event.to.pathname);
      languageScroll = changingLanguage ? { left: window.scrollX, top: window.scrollY } : undefined;
    };
    const onAfterSwap = () => {
      setLocale(document.documentElement.lang === "en" ? "en" : "ru");
      observeLayout();
      if (languageScroll) {
        const root = document.documentElement;
        const scrollBehavior = root.style.scrollBehavior;
        root.style.scrollBehavior = "auto";
        window.scrollTo({ ...languageScroll, behavior: "auto" });
        root.style.scrollBehavior = scrollBehavior;
        languageScroll = undefined;
      }
      schedule();
    };

    intersection.observe(stage);
    observeLayout();
    window.addEventListener("scroll", onScroll, { passive: true });
    reducedMotion.addEventListener("change", schedule);
    document.addEventListener("astro:before-swap", onBeforeSwap);
    document.addEventListener("astro:after-swap", onAfterSwap);

    // Paint the road at its final scale before downloading or preparing the models.
    paint(performance.now());
    try {
      renderer = createDepthRenderer();
    } catch {
      // The 2D road remains available when WebGL cannot be initialized.
    }
    if (renderer) {
      renderer.canvas.addEventListener("webglcontextlost", onContextLost);
      void loadRoadModels(signal).then((data) => {
        if (signal.aborted || disposed) return;
        models = data;
        modelsLoadedAt = performance.now();
        schedule();
      }).catch(() => {
        if (!signal.aborted) disableModels();
      });
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(pendingFrame);
      intersection.disconnect();
      resize.disconnect();
      window.removeEventListener("scroll", onScroll);
      reducedMotion.removeEventListener("change", schedule);
      document.removeEventListener("astro:before-swap", onBeforeSwap);
      document.removeEventListener("astro:after-swap", onAfterSwap);
      disableModels();
    };
  }, []);

  return (
    <section id="free-flow" class={styles.hero} aria-labelledby="free-flow-title">
      <div class={styles.intro}>
        <h1 id="free-flow-title" class={styles.heading}>
          {locale === "ru" ? (
            <>
              <span>Ю</span>жно-<span>Л</span>ыткаринская<br />
              <span>А</span>втодорога
            </>
          ) : (
            <>South Lytkarino<br />Motorway</>
          )}
        </h1>
        <p class={styles.description}>{text.description}</p>
      </div>

      <div class={styles.panel}>
        <div ref={stageRef} class={styles.stage} role="img" aria-label={text.scene}>
          <noscript>
            <picture class={styles.still}>
              <source media="(min-width: 1280px) and (min-aspect-ratio: 21/9)" srcSet={wideScene.src} />
              <img src={desktopScene.src} width={desktopScene.width} height={desktopScene.height} alt="" decoding="async" />
            </picture>
          </noscript>
          <canvas ref={canvasRef} aria-hidden="true" />
        </div>

        <div class={styles.details}>
          <ul class={styles.metrics} role="list">
            {text.metrics.map(({ value, label, headline }) => (
              <li class={styles.metric} key={label}>
                <span class={styles.headline}>{headline}</span>
                <span class={styles.value}>{value}</span>
                <span class={styles.label}>{label}</span>
              </li>
            ))}
          </ul>
          <p class={styles.route}>
            <img src={routePin} width="22" height="22" alt="" />
            <span><span class={styles.routeLabel}>{text.routeLabel}: </span>{text.route}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
