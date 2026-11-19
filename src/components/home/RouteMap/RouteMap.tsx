import { useEffect, useRef, useState } from "preact/hooks";
import type { AddLayerObject, Map as MapLibreMap, Popup, StyleSpecification } from "maplibre-gl";
import type { FeatureCollection, LineString, MultiLineString, Position } from "geojson";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import routeIcon from "../../../assets/icons/home/route.svg?url";
import zoomInIcon from "../../../assets/pages/home/map/zoom-in.svg?url";
import gantryIcon from "../../../assets/pages/home/map/gantry.svg?url";
import styles from "./RouteMap.module.css";

type Locale = "ru" | "en";
type Label = Record<Locale, string>;
type RouteData = FeatureCollection<LineString | MultiLineString, { id: string; label: Label; color?: string }>;
type Gantry = { id: string; coordinates: [number, number]; label: Label; test?: boolean };

interface RouteMapProps {
  locale?: Locale;
  dataBaseUrl?: string;
}

const minZoom = 8;
const maxZoom = 16;
const copy = {
  ru: {
    title: "Карта Южно-Лыткаринской автодороги",
    road: "Южно-Лыткаринская\nавтодорога",
    alternatives: "Альтернативный\nмаршрут",
    distance: "45 км",
    controls: "Масштаб карты",
    zoomIn: "Увеличить масштаб",
    zoomOut: "Уменьшить масштаб",
    loading: "Загружаем карту…",
    error: "Не удалось загрузить карту.",
    retry: "Попробовать снова",
    test: "Тестовые координаты рамки",
    close: "Закрыть",
    wheel: "Удерживайте Ctrl и прокручивайте для изменения масштаба",
    macWheel: "Удерживайте ⌘ и прокручивайте для изменения масштаба",
    touch: "Перемещайте карту двумя пальцами",
  },
  en: {
    title: "South Lytkarino Motorway map",
    road: "South Lytkarino\nMotorway",
    alternatives: "Alternative\nroute",
    distance: "45 km",
    controls: "Map zoom",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    loading: "Loading the map…",
    error: "Unable to load the map.",
    retry: "Try again",
    test: "Test gantry coordinates",
    close: "Close",
    wheel: "Use Ctrl + scroll to zoom the map",
    macWheel: "Use ⌘ + scroll to zoom the map",
    touch: "Use two fingers to move the map",
  },
};

export default function RouteMap({ locale = "ru", dataBaseUrl = `${import.meta.env.BASE_URL}data/map` }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const fitRef = useRef<((alternatives: boolean, animate?: boolean) => void) | undefined>(undefined);
  const alternativesRef = useRef(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [zoom, setZoom] = useState(10);
  const [attempt, setAttempt] = useState(0);
  const text = copy[locale];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const controller = new AbortController();
    const { signal } = controller;
    let map: MapLibreMap | undefined;
    let observer: ResizeObserver | undefined;
    let failed = false;
    let ready = false;
    setStatus("loading");

    const fail = () => {
      if (signal.aborted || failed) return;
      failed = true;
      observer?.disconnect();
      popupRef.current?.remove();
      map?.remove();
      map = undefined;
      mapRef.current = null;
      fitRef.current = undefined;
      setStatus("error");
    };

    void (async () => {
      try {
        const readJson = async (url: string) => {
          const response = await fetch(url, { signal, cache: url.startsWith(dataBaseUrl) ? "no-store" : "default" });
          if (!response.ok) throw new Error(`Map request failed (${response.status})`);
          return response.json();
        };
        const [lib, rawStyle, rawRoad, rawAlternatives, rawGantries] = await Promise.all([
          import("maplibre-gl"),
          readJson("https://tiles.openfreemap.org/styles/bright"),
          readJson(`${dataBaseUrl}/road.geojson`),
          readJson(`${dataBaseUrl}/alternatives.geojson`),
          readJson(`${dataBaseUrl}/gantries.json`),
        ]);
        if (signal.aborted) return;

        const validCoordinate = (point: Position): boolean => Array.isArray(point) && point.length === 2
          && point.every(Number.isFinite) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 85;
        const validateRoutes = (data: RouteData): RouteData => {
          if (data?.type !== "FeatureCollection" || !Array.isArray(data.features) || !data.features.length) {
            throw new Error("Invalid route collection");
          }
          for (const feature of data.features) {
            if (feature.type !== "Feature" || !["LineString", "MultiLineString"].includes(feature.geometry?.type)) {
              throw new Error("Invalid route geometry");
            }
            const lines = feature.geometry.type === "LineString" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
            if (!lines.length || lines.some(line => line.length < 2 || !line.every(validCoordinate))) {
              throw new Error("Invalid route coordinates");
            }
          }
          return data;
        };
        const road = validateRoutes(rawRoad);
        const alternatives = validateRoutes(rawAlternatives);
        const gantries = rawGantries as { version: number; items: Gantry[] };
        if (gantries?.version !== 1 || !Array.isArray(gantries.items)
          || gantries.items.some(item => !item?.id || !validCoordinate(item.coordinates)
            || !item.label?.ru || !item.label?.en)) throw new Error("Invalid gantry data");

        const style = rawStyle as StyleSpecification;
        for (const layer of style.layers) {
          if (layer.type !== "symbol" || !JSON.stringify(layer.layout?.["text-field"] ?? "").includes("name")) continue;
          layer.layout = {
            ...layer.layout,
            "text-field": locale === "ru"
              ? ["coalesce", ["get", "name:ru"], ["get", "name:nonlatin"], ["get", "name"]]
              : ["coalesce", ["get", "name:en"], ["get", "name_en"], ["get", "name:latin"], ["get", "name"]],
          };
        }

        const getBounds = (includeAlternatives: boolean) => {
          const bounds = new lib.LngLatBounds();
          for (const feature of [...road.features, ...(includeAlternatives ? alternatives.features : [])]) {
            const points = feature.geometry.type === "LineString" ? feature.geometry.coordinates : feature.geometry.coordinates.flat();
            for (const point of points) bounds.extend([point[0], point[1]]);
          }
          return bounds;
        };
        const padding = (includeAlternatives: boolean) => window.innerWidth < 768
          ? { top: 228, right: 80, bottom: 48, left: 28 }
          : { top: 48, right: 104, bottom: 48, left: includeAlternatives ? Math.min(536, container.clientWidth * 0.42) : 48 };
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        lib.setWorkerUrl(workerUrl);
        map = new lib.Map({
          container,
          style,
          bounds: getBounds(alternativesRef.current),
          fitBoundsOptions: { padding: padding(alternativesRef.current), maxZoom: 11 },
          minZoom,
          maxZoom,
          cooperativeGestures: true,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          renderWorldCopies: false,
          pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
          canvasContextAttributes: { antialias: true },
          attributionControl: { compact: false },
          locale: {
            "Map.Title": text.title,
            "Popup.Close": text.close,
            "CooperativeGesturesHandler.WindowsHelpText": text.wheel,
            "CooperativeGesturesHandler.MacHelpText": text.macWheel,
            "CooperativeGesturesHandler.MobileHelpText": text.touch,
          },
        });
        const currentMap = map;
        currentMap.touchZoomRotate.disableRotation();
        mapRef.current = currentMap;
        fitRef.current = (includeAlternatives, animate = true) => {
          currentMap.fitBounds(getBounds(includeAlternatives), {
            padding: padding(includeAlternatives),
            maxZoom: 11,
            duration: animate && !reducedMotion.matches ? 450 : 0,
          });
        };
        currentMap.on("error", () => { if (!ready) fail(); });
        currentMap.on("zoom", () => setZoom(currentMap.getZoom()));
        currentMap.on("load", () => {
          if (signal.aborted || failed) return;
          const colors = getComputedStyle(container);
          const primary = colors.getPropertyValue("--color-rdt-action").trim();
          const white = colors.getPropertyValue("--color-rdt-white").trim();
          currentMap.addSource("yula", { type: "geojson", data: road });
          currentMap.addSource("alternatives", { type: "geojson", data: alternatives });
          const layers: AddLayerObject[] = [
            {
              id: "alternative-outline", type: "line", source: "alternatives",
              layout: { visibility: alternativesRef.current ? "visible" : "none", "line-join": "round", "line-cap": "round" },
              paint: { "line-color": white, "line-width": 8 },
            },
            {
              id: "alternative-line", type: "line", source: "alternatives",
              layout: { visibility: alternativesRef.current ? "visible" : "none", "line-join": "round", "line-cap": "round" },
              paint: { "line-color": ["coalesce", ["get", "color"], "#278876"], "line-width": 4 },
            },
            {
              id: "yula-outline", type: "line", source: "yula",
              layout: { "line-join": "round", "line-cap": "round" },
              paint: { "line-color": white, "line-width": 10 },
            },
            {
              id: "yula-line", type: "line", source: "yula",
              layout: { "line-join": "round", "line-cap": "round" },
              paint: { "line-color": primary, "line-width": 5 },
            },
          ];
          for (const layer of layers) currentMap.addLayer(layer);

          for (const gantry of gantries.items) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = styles.gantry;
            button.dataset.gantryId = gantry.id;
            button.setAttribute("aria-label", gantry.label[locale]);
            button.setAttribute("aria-haspopup", "dialog");
            const icon = document.createElement("img");
            icon.src = gantryIcon;
            icon.alt = "";
            icon.width = 24;
            icon.height = 24;
            button.append(icon);
            button.addEventListener("click", event => {
              event.stopPropagation();
              popupRef.current?.remove();
              const content = document.createElement("div");
              const heading = document.createElement("h3");
              heading.className = styles.popupTitle;
              heading.textContent = gantry.label[locale];
              const coordinates = document.createElement("p");
              coordinates.className = styles.popupCoordinates;
              coordinates.textContent = `${gantry.coordinates[1].toFixed(6)}, ${gantry.coordinates[0].toFixed(6)}`;
              content.append(heading, coordinates);
              if (gantry.test) {
                const hint = document.createElement("p");
                hint.className = styles.popupHint;
                hint.textContent = text.test;
                content.append(hint);
              }
              const popup = new lib.Popup({ offset: 24, maxWidth: "280px", focusAfterOpen: true })
                .setLngLat(gantry.coordinates).setDOMContent(content).addTo(currentMap);
              popup.on("close", () => { if (button.isConnected) button.focus({ preventScroll: true }); });
              popupRef.current = popup;
            });
            new lib.Marker({ element: button, anchor: "center" }).setLngLat(gantry.coordinates).addTo(currentMap);
          }
          currentMap.once("idle", () => {
            if (signal.aborted || failed) return;
            ready = true;
            setZoom(currentMap.getZoom());
            setStatus("ready");
          });
          observer = new ResizeObserver(() => {
            currentMap.resize();
            fitRef.current?.(alternativesRef.current, false);
          });
          observer.observe(container);
        });
      } catch {
        fail();
      }
    })();

    return () => {
      controller.abort();
      observer?.disconnect();
      popupRef.current?.remove();
      popupRef.current = null;
      map?.remove();
      mapRef.current = null;
      fitRef.current = undefined;
    };
  }, [locale, dataBaseUrl, attempt]);

  const selectRoute = (includeAlternatives: boolean) => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    alternativesRef.current = includeAlternatives;
    setShowAlternatives(includeAlternatives);
    popupRef.current?.remove();
    for (const id of ["alternative-outline", "alternative-line"]) {
      map.setLayoutProperty(id, "visibility", includeAlternatives ? "visible" : "none");
    }
    fitRef.current?.(includeAlternatives);
  };
  const changeZoom = (value: number) => {
    mapRef.current?.setZoom(Math.max(minZoom, Math.min(maxZoom, value)));
  };

  return (
    <section class={styles.section} id="road-map" aria-labelledby="road-map-title" data-map-status={status}>
      <h2 id="road-map-title" class="sr-only">{text.title}</h2>
      <div class={styles.frame}>
        <div ref={containerRef} class={styles.canvas} data-ready={status === "ready" ? "" : undefined} />
        {status !== "ready" && (
          <div class={styles.status} role={status === "error" ? "alert" : "status"}>
            <p>{status === "error" ? text.error : text.loading}</p>
            {status === "error" && <button type="button" onClick={() => setAttempt(value => value + 1)}>{text.retry}</button>}
          </div>
        )}
        <div class={styles.panel}>
          <button type="button" class={styles.roadButton} disabled={status !== "ready"} aria-pressed={!showAlternatives} onClick={() => selectRoute(false)}>
            {text.road}
          </button>
          <p class={styles.distance}>{text.distance}</p>
          <button type="button" class={styles.alternativeButton} disabled={status !== "ready"} aria-pressed={showAlternatives} onClick={() => selectRoute(!showAlternatives)}>
            {text.alternatives}
          </button>
          <span class={styles.routeIcon} aria-hidden="true"><img src={routeIcon} width="61.2503" height="64.2946" alt="" /></span>
        </div>
        <div class={styles.zoom} role="group" aria-label={text.controls}>
          <button class={`${styles.zoomButton} ${styles.zoomIn}`} type="button" aria-label={text.zoomIn} disabled={status !== "ready" || zoom >= maxZoom} onClick={() => changeZoom(zoom + 1)}>
            <img src={zoomInIcon} width="72" height="72" alt="" />
          </button>
          <input class={styles.zoomRange} type="range" min={minZoom} max={maxZoom} step="0.01" value={zoom} disabled={status !== "ready"} aria-label={text.controls} aria-orientation="vertical" onInput={event => changeZoom(Number(event.currentTarget.value))} />
          <button class={`${styles.zoomButton} ${styles.zoomOut}`} type="button" aria-label={text.zoomOut} disabled={status !== "ready" || zoom <= minZoom} onClick={() => changeZoom(zoom - 1)}><span aria-hidden="true" /></button>
        </div>
      </div>
    </section>
  );
}
