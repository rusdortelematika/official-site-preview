import type { createDepthRenderer, Point3 } from './depthRenderer';
import { vehicleMeshes, type RoadModels } from "./roadModels";

type Point = readonly [x: number, y: number, z?: number];
type Screen = readonly [x: number, y: number];
type Project = (point: Point) => Screen;

interface SceneOptions {
  renderer?: ReturnType<typeof createDepthRenderer>;
  models?: RoadModels;
  modelOpacity?: number;
  layout?: { left: number; top: number; width: number };
}

const desktopView = { width: 1440, height: 800, contentWidth: 1360, overlap: 18 };

export const gantryLabel = 'РусДор Телематика';

const roadLimit = 175;
const roadStart = -1900;
const standardRoadEnd = 1900;

function roadCurve(x: number) {
  return 0.00015 * x * x - 0.000000022 * x * x * x;
}

function roadCurveForAspect(aspect: number) {
  const blend = Math.min(1, Math.max(0, (aspect - 2.15) / 1.35));
  if (!blend) return roadCurve;

  // Keep the initial pass on the original bend before extending the distant road.
  const join = 640;
  const transition = 230;
  const slope = 0.0003 * join - 0.000000066 * join * join;
  const joinY = roadCurve(join);
  return (x: number) => {
    const baseline = roadCurve(x);
    if (x <= join) return baseline;
    const distance = x - join;
    const t = Math.min(1, distance / transition);
    // Continue along the tangent so the distant road leaves through the top of wide screens.
    const smooth = t * t * (3 - 2 * t);
    const extension = joinY + slope * distance;
    return baseline + (extension - baseline) * blend * smooth;
  };
}

function createDrawing(ctx: CanvasRenderingContext2D, project: Project,
  deckCurve: (x: number) => number, roadEnd: number) {
  function face(points: readonly Point[], color: string | CanvasGradient) {
    ctx.beginPath();
    ctx.moveTo(...project(points[0]));
    for (const point of points.slice(1)) ctx.lineTo(...project(point));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function roadBand(left: number, right: number, color: string | CanvasGradient, start = roadStart, end = roadEnd,
    leftHeight = 0, rightHeight = leftHeight) {
    const near: Point[] = [];
    const far: Point[] = [];
    const count = Math.ceil((end - start) / 32);
    for (let i = 0; i <= count; i++) {
      const x = start + i / count * (end - start);
      const curve = deckCurve(x);
      near.push([x, curve + left, leftHeight]);
      far.push([x, curve + right, rightHeight]);
    }
    face([...near, ...far.reverse()], color);
  }

  return { project, face, roadBand, roadEnd };
}

type Drawing = ReturnType<typeof createDrawing>;

function drawRoad(ctx: CanvasRenderingContext2D, d: Drawing, width: number, height: number, modelOpacity: number) {
  const { roadBand, face, roadEnd } = d;
  const asphalt = ctx.createLinearGradient(width * .18, height * .82, width * .88, height * .18);
  asphalt.addColorStop(0, '#2c3c50');
  asphalt.addColorStop(.52, '#35485e');
  asphalt.addColorStop(1, '#293b51');

  roadBand(-roadLimit, roadLimit, '#728597');
  roadBand(-162, 162, asphalt);
  roadBand(-157, -154, '#f2f8fb');
  roadBand(154, 157, '#f2f8fb');
  roadBand(-4, 4, '#24374e');
  roadBand(-5.7, -3.7, '#9ebacc');
  roadBand(3.7, 5.7, '#9ebacc');

  for (let x = roadStart + 30; x < roadEnd - 30; x += 84) {
    roadBand(-79, -76, '#d7e5ee', x, x + 36);
    roadBand(76, 79, '#d7e5ee', x, x + 36);
  }

  // Reveal the truss and pier shadows together with the models.
  if (modelOpacity > 0) {
    ctx.save();
    ctx.globalAlpha *= modelOpacity;
    face([[12, -roadLimit], [41, -roadLimit], [75, roadLimit], [49, roadLimit]], '#1224382d');
    face([[29, -roadLimit], [37, -roadLimit], [68, roadLimit], [62, roadLimit]], '#12243824');
    ctx.restore();
  }

  const curbHeight = 4;
  const curbOuter = roadLimit + 1;
  const curbInner = 168;
  for (const side of [-1, 1]) {
    const outer = side * curbOuter;
    const inner = side * curbInner;
    const visibleEdge = Math.max(inner, outer);
    roadBand(visibleEdge, visibleEdge, '#8a9daf', roadStart, roadEnd, 0, curbHeight);
    roadBand(Math.min(inner, outer), visibleEdge, '#c2cfdc', roadStart, roadEnd, curbHeight);
    roadBand(Math.min(side * 163, inner), Math.max(side * 163, inner), '#1c9aea');
  }
}

function drawGantryLabel(ctx: CanvasRenderingContext2D, project: Project) {
  const anchor: Point3 = [4 - 1.012 * 34, 0, 5.60 * 24];
  const [sx, sy] = project(anchor);
  const [tx, ty] = project([anchor[0], 1, anchor[2]]);
  const [vx, vy] = project([anchor[0], 0, anchor[2] - 1]);
  ctx.save();
  ctx.transform(tx - sx, ty - sy, vx - sx, vy - sy, sx, sy);
  ctx.fillStyle = '#f3fbff';
  ctx.font = '600 9px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(gantryLabel, 0, .5, 130);
  ctx.restore();
}

function drawVehicleShadow(ctx: CanvasRenderingContext2D, d: Drawing,
  x: number, y: number, heading: number, length: number, width: number) {
  const cos = Math.cos(heading), sin = Math.sin(heading);
  ctx.save();
  const [px, py] = d.project([x, y]);
  const [ax, ay] = d.project([x + cos, y + sin]);
  const [bx, by] = d.project([x - sin, y + cos]);
  ctx.transform(ax - px, ay - py, bx - px, by - py, px, py);
  ctx.scale(length * .58, width * .75);
  const shadow = ctx.createRadialGradient(0, 0, .25, 0, 0, 1);
  shadow.addColorStop(0, '#0715239c');
  shadow.addColorStop(1, '#07152300');
  ctx.fillStyle = shadow;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  { renderer, models, modelOpacity = 1, layout }: SceneOptions = {},
) {
  const narrow = width <= 650;
  const layoutScale = layout ? layout.width / desktopView.contentWidth : 1;
  const scale = layout
    ? Math.min(desktopView.width / 1020, desktopView.height / 660) * layoutScale
    : Math.min(width / (narrow ? 555 : 1020), height / (narrow ? 550 : 660));
  // Keep the near road aligned with the content below as the viewport grows.
  const originX = layout
    ? layout.left + (desktopView.width * .51 - (desktopView.width - desktopView.contentWidth) / 2) * layoutScale
    : width * .51;
  const originY = layout
    ? layout.top - (desktopView.height * .4 - desktopView.overlap) * layoutScale
    : height * (narrow ? .575 : .60);
  const project: Project = ([x, y, z = 0]) => [
    originX + scale * (.71 * x + .71 * y),
    originY + scale * (-.45 * x + .45 * y - .83 * z),
  ];
  const deckCurve = roadCurveForAspect(width / height);
  const roadEnd = Math.max(standardRoadEnd, Math.ceil((width - originX) / (.71 * scale) + 2 * roadLimit));
  const d = createDrawing(ctx, project, deckCurve, roadEnd);
  ctx.clearRect(0, 0, width, height);
  drawRoad(ctx, d, width, height, renderer && models ? modelOpacity : 0);
  if (!renderer || !models) return true;

  const { frame, car, truck, truckTexture } = models;
  const distance = narrow ? 345 : 490;
  const truckX = distance * (1 - 2 * progress);
  const carX = distance * (-.87 + 1.91 * progress);
  const truckY = roadCurve(truckX) - 115;
  const carY = deckCurve(carX) + 41;
  const heading = (x: number) => Math.atan((deckCurve(x + 1) - deckCurve(x - 1)) / 2);
  const truckHeading = heading(truckX) + Math.PI;
  const carHeading = heading(carX);
  const rendered = renderer.draw(ctx.canvas.width, ctx.canvas.height, width, height, project, [-.5893, .5893, .639], [
    { parts: frame },
    ...vehicleMeshes(truck, truckX, truckY, truckHeading, distance * 2 * progress, truckTexture),
    ...vehicleMeshes(car, carX, carY, carHeading, distance * 1.91 * progress),
  ]);
  if (!rendered) return false;
  ctx.save();
  ctx.globalAlpha *= modelOpacity;
  drawVehicleShadow(ctx, d, carX, carY, carHeading, 85, 42);
  ctx.drawImage(renderer.canvas, 0, 0, width, height);
  drawGantryLabel(ctx,project);
  ctx.restore();
  return true;
}
