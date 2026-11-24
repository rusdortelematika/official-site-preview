import { useEffect, useRef, useState } from "preact/hooks";
import type { AddLayerObject, GeoJSONSource, Map as MapLibreMap, Popup, StyleSpecification } from "maplibre-gl";
import type { FeatureCollection, LineString, MultiLineString, Point, Position } from "geojson";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import routeIcon from "../../../assets/icons/home/route.svg?url";
import gantryIcon from "../../../assets/pages/home/map/gantry.svg?url";
import styles from "./RouteMap.module.css";

type Locale = "ru" | "en";
type Label = Record<Locale, string>;
type RouteData = FeatureCollection<LineString | MultiLineString, { id: string; label: Label }>;
type Gantry = {
  id: string;
  coordinates: [number, number];
  label: Label;
  section: Label;
  carriageway: "outer" | "inner";
  picket: string;
  kilometer: string;
  note?: Label;
};

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
    selected: "Выбранный маршрут",
    onRoute: "На выбранном маршруте",
    chooseRoute: "Выберите разные пункты в тарифах",
    controls: "Масштаб карты",
    zoomIn: "Увеличить масштаб",
    zoomOut: "Уменьшить масштаб",
    loading: "Загружаем карту…",
    error: "Не удалось загрузить карту.",
    retry: "Попробовать снова",
    outer: "Внешнее направление",
    inner: "Внутреннее направление",
    kilometer: "Км",
    picket: "ПК",
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
    selected: "Selected route",
    onRoute: "On the selected route",
    chooseRoute: "Choose different stops in the toll calculator",
    controls: "Map zoom",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    loading: "Loading the map…",
    error: "Unable to load the map.",
    retry: "Try again",
    outer: "Outer carriageway",
    inner: "Inner carriageway",
    kilometer: "Km",
    picket: "Station",
    close: "Close",
    wheel: "Use Ctrl + scroll to zoom the map",
    macWheel: "Use ⌘ + scroll to zoom the map",
    touch: "Use two fingers to move the map",
  },
};

type TariffRoute = { from: string; to: string; fromLabel: string; toLabel: string };
type TariffStops = {
  version: number;
  roadStart: Position;
  roadEnd: Position;
  stops: { id: string; coordinates: Position }[];
};

function buildTariffPath(road: RouteData, stops: TariffStops) {
  const validPoint = (point: Position) => Array.isArray(point) && point.length === 2
    && point.every(Number.isFinite) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 85;
  if (stops?.version !== 1 || !validPoint(stops.roadStart) || !validPoint(stops.roadEnd)
    || !Array.isArray(stops.stops) || stops.stops.length < 2
    || stops.stops.some(stop => !stop?.id || !validPoint(stop.coordinates))
    || new Set(stops.stops.map(stop => stop.id)).size !== stops.stops.length) {
    throw new Error("Invalid tariff stops");
  }

  // Order the existing road fragments without drawing any connections outside the toll road.
  const graph = new Map<string, { point: Position; edges: Map<string, number> }>();
  const distance = (a: Position, b: Position) => Math.hypot(
    (a[0] - b[0]) * Math.cos((a[1] + b[1]) * Math.PI / 360), a[1] - b[1],
  );
  for (const feature of road.features) {
    const lines = feature.geometry.type === "LineString" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    for (const line of lines) {
      for (const point of line) {
        const key = point.join(",");
        if (!graph.has(key)) graph.set(key, { point, edges: new Map() });
      }
      for (let i = 1; i < line.length; i++) {
        const a = line[i - 1], b = line[i];
        const weight = distance(a, b);
        graph.get(a.join(","))!.edges.set(b.join(","), weight);
        graph.get(b.join(","))!.edges.set(a.join(","), weight);
      }
    }
  }
  const nearest = (point: Position, points: Position[]) => points.reduce((best, candidate, index) =>
    distance(point, candidate) < distance(point, points[best]) ? index : best, 0);
  const points = [...graph.values()].map(node => node.point);
  if (!points.length) throw new Error("Missing toll road geometry");
  const start = points[nearest(stops.roadStart, points)].join(",");
  const end = points[nearest(stops.roadEnd, points)].join(",");
  const findPath = (fromKey: string, toKey: string) => {
    const pending = new Set(graph.keys());
    const costs = new Map<string, number>([[fromKey, 0]]);
    const previous = new Map<string, string>();
    while (pending.size) {
      let next: string | undefined;
      let cost = Infinity;
      for (const key of pending) {
        const candidate = costs.get(key) ?? Infinity;
        if (candidate < cost) { next = key; cost = candidate; }
      }
      if (!next || next === toKey) break;
      pending.delete(next);
      for (const [neighbor, weight] of graph.get(next)!.edges) {
        if (pending.has(neighbor) && cost + weight < (costs.get(neighbor) ?? Infinity)) {
          costs.set(neighbor, cost + weight);
          previous.set(neighbor, next);
        }
      }
    }
    if (fromKey === toKey || !previous.has(toKey)) throw new Error("Disconnected toll road endpoints");
    const path = [graph.get(toKey)!.point];
    for (let key = toKey; key !== fromKey;) {
      key = previous.get(key)!;
      path.push(graph.get(key)!.point);
    }
    return path.reverse();
  };
  const path = findPath(start, end);
  // The other western endpoint belongs to the opposite carriageway of the same road.
  const reverseStart = [...graph].filter(([key, node]) => key !== start && node.edges.size === 1
    && distance(node.point, stops.roadStart) < 0.002)
    .sort((a, b) => distance(a[1].point, stops.roadStart) - distance(b[1].point, stops.roadStart))[0]?.[0];
  const reversePath = reverseStart ? findPath(reverseStart, end) : path;

  const mapStops = (points: Position[]) => {
    const indices = new Map<string, number>();
    let previousIndex = -1;
    for (const stop of stops.stops) {
      const index = nearest(stop.coordinates, points);
      if (index <= previousIndex) throw new Error("Tariff stops must follow the toll road order");
      indices.set(stop.id, index);
      previousIndex = index;
    }
    return indices;
  };
  return { path, indices: mapStops(path), reversePath, reverseIndices: mapStops(reversePath) };
}

function getSelectedTariffRoute(tariffPath: ReturnType<typeof buildTariffPath>, selection: TariffRoute | null, gantries: Gantry[]) {
  const from = selection ? tariffPath.indices.get(selection.from) : undefined;
  const to = selection ? tariffPath.indices.get(selection.to) : undefined;
  const gantryIds = new Set<string>();
  if (from === undefined || to === undefined || from === to) return { coordinates: [], gantryIds };

  const forward = from < to;
  const path = forward ? tariffPath.path : tariffPath.reversePath;
  const indices = forward ? tariffPath.indices : tariffPath.reverseIndices;
  const first = indices.get(selection!.from)!;
  const last = indices.get(selection!.to)!;
  const lower = Math.min(first, last), upper = Math.max(first, last);
  const coordinates = path.slice(lower, upper + 1);
  if (!forward) coordinates.reverse();

  // Compare positions along the full carriageway, so gates before/after the route stay inactive.
  // The supplied GPS coordinates remain unchanged, including points beside the road deck.
  for (const gantry of gantries) {
    if (gantry.carriageway !== (forward ? "outer" : "inner")) continue;
    const longitudeScale = Math.cos(gantry.coordinates[1] * Math.PI / 180);
    let closestDistance = Infinity;
    let position = 0;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      const x = (a[0] - gantry.coordinates[0]) * longitudeScale;
      const y = a[1] - gantry.coordinates[1];
      const dx = (b[0] - a[0]) * longitudeScale, dy = b[1] - a[1];
      const lengthSquared = dx * dx + dy * dy;
      const fraction = lengthSquared ? Math.max(0, Math.min(1, -(x * dx + y * dy) / lengthSquared)) : 0;
      const distanceSquared = (x + fraction * dx) ** 2 + (y + fraction * dy) ** 2;
      if (distanceSquared < closestDistance) {
        closestDistance = distanceSquared;
        position = i - 1 + fraction;
      }
    }
    if (position >= lower && position <= upper) gantryIds.add(gantry.id);
  }
  return { coordinates, gantryIds };
}

export default function RouteMap({ locale = "ru", dataBaseUrl = `${import.meta.env.BASE_URL}data/map` }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const fitRef = useRef<((alternatives: boolean, animate?: boolean, selected?: boolean) => void) | undefined>(undefined);
  const updateSelectedRef = useRef<((animate?: boolean) => void) | undefined>(undefined);
  const selectedRouteRef = useRef<TariffRoute | null>(null);
  const selectedDataRef = useRef<FeatureCollection<LineString>>({ type: "FeatureCollection", features: [] });
  const showSelectedRef = useRef(true);
  const [selectedRoute, setSelectedRoute] = useState<TariffRoute | null>(null);
  const [showSelected, setShowSelected] = useState(true);
  const [routeAvailable, setRouteAvailable] = useState(false);
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
    setRouteAvailable(false);
    selectedDataRef.current = { type: "FeatureCollection", features: [] };

    const readTariffRoute = () => {
      // Read the current DOM values as well as listening for updates: the map hydrates lazily.
      const data = document.getElementById("tariffs")?.dataset;
      const route = data?.routeFrom && data.routeTo && data.routeFromLabel && data.routeToLabel
        ? { from: data.routeFrom, to: data.routeTo, fromLabel: data.routeFromLabel, toLabel: data.routeToLabel }
        : null;
      selectedRouteRef.current = route;
      setSelectedRoute(route);
      popupRef.current?.remove();
      updateSelectedRef.current?.();
    };
    readTariffRoute();
    document.addEventListener("rdt:tariff-route-change", readTariffRoute);

    const fail = () => {
      if (signal.aborted || failed) return;
      failed = true;
      observer?.disconnect();
      popupRef.current?.remove();
      map?.remove();
      map = undefined;
      mapRef.current = null;
      fitRef.current = undefined;
      updateSelectedRef.current = undefined;
      setStatus("error");
    };

    void (async () => {
      try {
        const readJson = async (url: string) => {
          const response = await fetch(url, { signal, cache: url.startsWith(dataBaseUrl) ? "no-store" : "default" });
          if (!response.ok) throw new Error(`Map request failed (${response.status})`);
          return response.json();
        };
        const [lib, rawStyle, rawRoad, rawAlternatives, rawGantries, rawTariffStops] = await Promise.all([
          import("maplibre-gl"),
          readJson("https://tiles.openfreemap.org/styles/bright"),
          readJson(`${dataBaseUrl}/road.geojson`),
          readJson(`${dataBaseUrl}/alternatives.geojson`),
          readJson(`${dataBaseUrl}/gantries.json`),
          readJson(`${dataBaseUrl}/tariff-stops.json`),
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
        const tariffPath = buildTariffPath(road, rawTariffStops as TariffStops);
        const gantries = rawGantries as { version: number; items: Gantry[] };
        if (gantries?.version !== 1 || !Array.isArray(gantries.items)
          || new Set(gantries.items.map(item => item?.id)).size !== gantries.items.length
          || gantries.items.some(item => !item?.id || !validCoordinate(item.coordinates)
            || !item.label?.ru || !item.label?.en || !item.section?.ru || !item.section?.en
            || !["outer", "inner"].includes(item.carriageway)
            || typeof item.picket !== "string" || typeof item.kilometer !== "string"
            || (item.note && (!item.note.ru || !item.note.en)))) throw new Error("Invalid gantry data");

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

        const getBounds = (includeAlternatives: boolean, selected = false) => {
          const bounds = new lib.LngLatBounds();
          const routes = selected && selectedDataRef.current.features.length ? selectedDataRef.current.features : road.features;
          for (const feature of [...routes, ...(includeAlternatives ? alternatives.features : [])]) {
            const points = feature.geometry.type === "LineString" ? feature.geometry.coordinates : feature.geometry.coordinates.flat();
            for (const point of points) bounds.extend([point[0], point[1]]);
          }
          return bounds;
        };
        const padding = () => container.clientWidth < 960
          ? { top: (panelRef.current?.offsetTop ?? 16) + (panelRef.current?.offsetHeight ?? 248) + 24, right: 72, bottom: 32, left: 24 }
          : { top: 32, right: 80, bottom: 32, left: (panelRef.current?.offsetWidth ?? 472) + 56 };
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        lib.setWorkerUrl(workerUrl);
        map = new lib.Map({
          container,
          style,
          bounds: getBounds(alternativesRef.current),
          fitBoundsOptions: { padding: padding(), maxZoom: 11 },
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
        fitRef.current = (includeAlternatives, animate = true, selected = false) => {
          currentMap.fitBounds(getBounds(includeAlternatives, selected), {
            padding: padding(),
            maxZoom: selected ? 12 : 11,
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
          currentMap.addSource("tariff-route", { type: "geojson", data: selectedDataRef.current });
          currentMap.addSource("tariff-endpoints", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          const selectedColor = colors.getPropertyValue("--color-rdt-payment").trim();
          const alternativeColor = colors.getPropertyValue("--color-rdt-muted").trim();
          const layers: AddLayerObject[] = [
            {
              id: "alternative-outline", type: "line", source: "alternatives",
              layout: { visibility: alternativesRef.current ? "visible" : "none", "line-join": "round", "line-cap": "round" },
              paint: { "line-color": white, "line-width": 8 },
            },
            {
              id: "alternative-line", type: "line", source: "alternatives",
              layout: { visibility: alternativesRef.current ? "visible" : "none", "line-join": "round", "line-cap": "round" },
              paint: { "line-color": alternativeColor, "line-width": 4 },
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
            {
              id: "tariff-route-outline", type: "line", source: "tariff-route",
              layout: { "line-join": "round", "line-cap": "round" },
              paint: { "line-color": white, "line-width": 12 },
            },
            {
              id: "tariff-route-line", type: "line", source: "tariff-route",
              layout: { "line-join": "round", "line-cap": "round" },
              paint: { "line-color": selectedColor, "line-width": 7 },
            },
            {
              id: "tariff-route-endpoints", type: "circle", source: "tariff-endpoints",
              paint: { "circle-color": white, "circle-radius": 6, "circle-stroke-color": selectedColor, "circle-stroke-width": 3 },
            },
          ];
          for (const layer of layers) currentMap.addLayer(layer);

          const gantryButtons: { element: HTMLButtonElement; gantries: Gantry[] }[] = [];
          let passedGantryIds = new Set<string>();
          let selectedRouteVisible = false;
          updateSelectedRef.current = (animate = true) => {
            const selection = selectedRouteRef.current;
            const selected = getSelectedTariffRoute(tariffPath, selection, gantries.items);
            const { coordinates } = selected;
            selectedRouteVisible = showSelectedRef.current && coordinates.length > 1;
            passedGantryIds = selectedRouteVisible ? selected.gantryIds : new Set<string>();
            for (const marker of gantryButtons) {
              const active = marker.gantries.filter(gantry => passedGantryIds.has(gantry.id));
              const visible = selectedRouteVisible ? active : marker.gantries;
              marker.element.hidden = visible.length === 0;
              const label = visible.map(gantry => gantry.label[locale]).join(", ");
              marker.element.setAttribute("aria-label", label);
              marker.element.title = label;
              marker.element.dataset.onRoute = active.length ? "true" : "false";
              marker.element.dataset.onRouteIds = active.map(gantry => gantry.id).join(",");
              if (active.length) marker.element.setAttribute("aria-description", text.onRoute);
              else marker.element.removeAttribute("aria-description");
            }
            const route: FeatureCollection<LineString> = {
              type: "FeatureCollection",
              features: coordinates.length > 1 ? [{ type: "Feature", properties: { from: selection!.from, to: selection!.to }, geometry: { type: "LineString", coordinates } }] : [],
            };
            const endpoints: FeatureCollection<Point> = {
              type: "FeatureCollection",
              features: coordinates.length > 1 ? [coordinates[0], coordinates[coordinates.length - 1]].map((point, index) => ({
                type: "Feature", properties: { label: index === 0 ? selection!.fromLabel : selection!.toLabel }, geometry: { type: "Point", coordinates: point },
              })) : [],
            };
            selectedDataRef.current = route;
            currentMap.getSource<GeoJSONSource>("tariff-route")?.setData(route);
            currentMap.getSource<GeoJSONSource>("tariff-endpoints")?.setData(endpoints);
            setRouteAvailable(route.features.length > 0);
            for (const id of ["tariff-route-outline", "tariff-route-line", "tariff-route-endpoints"]) {
              currentMap.setLayoutProperty(id, "visibility", showSelectedRef.current ? "visible" : "none");
            }
            if (showSelectedRef.current) fitRef.current?.(alternativesRef.current, animate, route.features.length > 0);
          };

          // One marker for identical supplied positions (RVP-11 / RVP-12 share PK 210+00).
          const gantryGroups = new Map<string, Gantry[]>();
          for (const gantry of gantries.items) {
            const key = gantry.coordinates.join(",");
            const group = gantryGroups.get(key) ?? [];
            group.push(gantry);
            gantryGroups.set(key, group);
          }
          for (const group of gantryGroups.values()) {
            const position = group[0].coordinates;
            const button = document.createElement("button");
            button.type = "button";
            button.className = styles.gantry;
            button.dataset.gantryId = group[0].id;
            button.dataset.gantryIds = group.map(item => item.id).join(",");
            button.setAttribute("aria-label", group.map(item => item.label[locale]).join(", "));
            button.setAttribute("aria-haspopup", "dialog");
            button.title = group.map(item => item.label[locale]).join(", ");
            gantryButtons.push({ element: button, gantries: group });
            const icon = document.createElement("img");
            icon.src = gantryIcon;
            icon.alt = "";
            icon.width = 14;
            icon.height = 14;
            button.append(icon);
            button.addEventListener("click", event => {
              event.stopPropagation();
              popupRef.current?.remove();
              // Only include visible gantries, including overlapping ones at overview zoom.
              const center = currentMap.project(position);
              const nearby = gantries.items.filter(item => {
                if (selectedRouteVisible && !passedGantryIds.has(item.id)) return false;
                const point = currentMap.project(item.coordinates);
                return Math.hypot(point.x - center.x, point.y - center.y) <= 16;
              });
              const visibleItems = nearby.length ? nearby : group.filter(item => !selectedRouteVisible || passedGantryIds.has(item.id));
              const content = document.createElement("div");
              const heading = document.createElement("h3");
              heading.className = styles.popupTitle;
              heading.textContent = visibleItems.map(item => item.label[locale]).join(" · ");
              content.append(heading);
              const details = document.createElement("div");
              details.className = styles.popupItems;
              for (const gantry of visibleItems) {
                const item = document.createElement("article");
                item.className = styles.popupItem;
                item.dataset.onRoute = passedGantryIds.has(gantry.id) ? "true" : "false";
                if (visibleItems.length > 1) {
                  const title = document.createElement("h4");
                  title.className = styles.popupItemTitle;
                  title.textContent = gantry.label[locale];
                  item.append(title);
                }
                const section = document.createElement("p");
                section.className = styles.popupSection;
                section.textContent = gantry.section[locale];
                const metadata = document.createElement("p");
                metadata.className = styles.popupMetadata;
                metadata.textContent = `${text[gantry.carriageway]} · ${text.kilometer} ${gantry.kilometer} · ${text.picket} ${gantry.picket}`;
                const coordinates = document.createElement("p");
                coordinates.className = styles.popupCoordinates;
                coordinates.textContent = `${gantry.coordinates[1].toFixed(6)}, ${gantry.coordinates[0].toFixed(6)}`;
                item.append(section, metadata, coordinates);
                if (gantry.note) {
                  const note = document.createElement("p");
                  note.className = styles.popupNote;
                  note.textContent = gantry.note[locale];
                  item.append(note);
                }
                details.append(item);
              }
              content.append(details);
              const popup = new lib.Popup({ offset: 14, maxWidth: "300px", focusAfterOpen: true })
                .setLngLat(position).setDOMContent(content).addTo(currentMap);
              popup.on("close", () => { if (button.isConnected) button.focus({ preventScroll: true }); });
              popupRef.current = popup;
            });
            new lib.Marker({ element: button, anchor: "center" }).setLngLat(position).addTo(currentMap);
          }
          updateSelectedRef.current(false);
          currentMap.once("idle", () => {
            if (signal.aborted || failed) return;
            ready = true;
            setZoom(currentMap.getZoom());
            setStatus("ready");
          });
          observer = new ResizeObserver(() => {
            currentMap.resize();
            fitRef.current?.(alternativesRef.current, false, showSelectedRef.current);
          });
          observer.observe(container);
        });
      } catch {
        fail();
      }
    })();

    return () => {
      controller.abort();
      document.removeEventListener("rdt:tariff-route-change", readTariffRoute);
      observer?.disconnect();
      popupRef.current?.remove();
      popupRef.current = null;
      map?.remove();
      mapRef.current = null;
      fitRef.current = undefined;
      updateSelectedRef.current = undefined;
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
  const toggleSelectedRoute = () => {
    if (status !== "ready" || !routeAvailable) return;
    const show = !showSelectedRef.current;
    showSelectedRef.current = show;
    setShowSelected(show);
    popupRef.current?.remove();
    updateSelectedRef.current?.();
    if (!show) fitRef.current?.(alternativesRef.current);
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
        <div ref={panelRef} class={styles.panel}>
          <button type="button" class={styles.roadButton} disabled={status !== "ready"} aria-pressed={!showAlternatives} onClick={() => selectRoute(false)}>
            {text.road}
          </button>
          <p class={styles.distance}>{text.distance}</p>
          <button type="button" class={styles.alternativeButton} disabled={status !== "ready"} aria-pressed={showAlternatives} onClick={() => selectRoute(!showAlternatives)}>
            {text.alternatives}
          </button>
          <span class={styles.routeIcon} aria-hidden="true"><img src={routeIcon} width="61.2503" height="64.2946" alt="" /></span>
          <button
            type="button"
            class={styles.selectedButton}
            disabled={status !== "ready" || !routeAvailable}
            aria-pressed={showSelected && routeAvailable}
            onClick={toggleSelectedRoute}
          >
            <span>{text.selected}</span>
            <span class={styles.selectedStops}>{routeAvailable && selectedRoute ? `${selectedRoute.fromLabel} → ${selectedRoute.toLabel}` : text.chooseRoute}</span>
          </button>
        </div>
        <div class={styles.zoom} role="group" aria-label={text.controls}>
          <button class={`${styles.zoomButton} ${styles.zoomIn}`} type="button" aria-label={text.zoomIn} disabled={status !== "ready" || zoom >= maxZoom} onClick={() => changeZoom(zoom + 1)}>
            <span aria-hidden="true" />
          </button>
          <input class={styles.zoomRange} type="range" min={minZoom} max={maxZoom} step="0.01" value={zoom} disabled={status !== "ready"} aria-label={text.controls} aria-orientation="vertical" onInput={event => changeZoom(Number(event.currentTarget.value))} />
          <button class={styles.zoomButton} type="button" aria-label={text.zoomOut} disabled={status !== "ready" || zoom <= minZoom} onClick={() => changeZoom(zoom - 1)}><span aria-hidden="true" /></button>
        </div>
      </div>
    </section>
  );
}
