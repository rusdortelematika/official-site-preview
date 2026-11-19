const viewSize = 384;
const center = viewSize / 2;
const outerRadius = 143;
const innerRadius = 100;
const innerEdge = innerRadius - 2;
const logoDiameter = 2 * innerEdge;
const outerBandWidth = 6.644;
const outerEdge = outerRadius + outerBandWidth;
const laneCenter = (outerRadius + innerRadius) / 2;
const tau = Math.PI * 2;
const loopSeconds = 5.8;
const angularSpeed = tau / loopSeconds;
const driftAngle = 20 * Math.PI / 180;
const carSize = 46;
export const roadLoaderLogoWidth = `${logoDiameter / viewSize * 100}%`;

const wrap = (value: number, limit: number) => ((value % limit) + limit) % limit;

function trackPoint(angle: number, radius = laneCenter): [number, number] {
  return [center + Math.cos(angle) * radius, center + Math.sin(angle) * radius];
}

function carAt(time: number) {
  const angle = 0.84 + time * angularSpeed;
  const [x, y] = trackPoint(angle);
  const tangent = angle + Math.PI / 2;
  return { x, y, angle, tangent, heading: tangent + driftAngle };
}

function rearWheel(car: ReturnType<typeof carAt>, side: number): [number, number] {
  const cos = Math.cos(car.heading);
  const sin = Math.sin(car.heading);
  const halfAxle = side * 8.1;
  return [car.x - cos * 11.5 - sin * halfAxle, car.y - sin * 11.5 + cos * halfAxle];
}

export function mountRoadLoader(
  canvas: HTMLCanvasElement,
  carUrl: string,
  onPauseChange: (paused: boolean) => void
) {
  const roadCanvas = document.createElement('canvas');
  const smoke = document.createElement('canvas');
  smoke.width = smoke.height = 64;
  const target = canvas.getContext('2d');
  const backdrop = roadCanvas.getContext('2d');
  const smokeContext = smoke.getContext('2d');
  if (!target || !backdrop || !smokeContext) return;

  const ctx = target;
  const road = backdrop;
  const ink = smokeContext;
  const vehicleImage = new Image();

  function ring(outside: number, inside: number, color: string) {
    road.beginPath();
    road.arc(center, center, outside, 0, tau);
    road.moveTo(center + inside, center);
    road.arc(center, center, inside, 0, tau);
    road.fillStyle = color;
    road.fill('evenodd');
  }

  function edge(radius: number, width: number, color: string) {
    road.beginPath();
    road.arc(center, center, radius, 0, tau);
    road.lineWidth = width;
    road.strokeStyle = color;
    road.stroke();
  }

  function paintRoad() {
    const scale = roadCanvas.width / viewSize;
    road.setTransform(scale, 0, 0, scale, 0, 0);
    road.clearRect(0, 0, viewSize, viewSize);
    road.save();
    road.shadowColor = 'rgba(29, 45, 77, .21)';
    road.shadowBlur = 10 * scale;
    road.shadowOffsetY = 2 * scale;
    ring(outerEdge, innerEdge, '#1D2D4D');
    road.restore();
    ring(outerRadius, innerEdge, '#8CA3BD');
    ring(outerRadius, innerRadius, '#2D425B');
    ring(outerEdge, outerRadius, '#245DAA');
    edge(outerRadius - 4.8, 1.1, '#C8D9E9');
    edge(innerRadius + 4.8, 1.1, '#C8D9E9');

    const startAngle = 2.35;
    const rowWidth = 0.036;
    const dashStart = startAngle + 2 * rowWidth + .025;
    const dashEnd = startAngle + tau - .025;
    const dashPeriod = laneCenter * (dashEnd - dashStart) / 40;
    road.save();
    road.beginPath();
    road.arc(center, center, laneCenter, dashStart, dashEnd);
    road.setLineDash([dashPeriod * .52, dashPeriod * .48]);
    road.lineWidth = 1.4;
    road.strokeStyle = '#A9BED2';
    road.stroke();
    road.restore();

    const run = (outerRadius - innerRadius - 12) / 6;
    for (let row = 0; row < 2; row += 1) {
      for (let tile = 0; tile < 6; tile += 1) {
        if ((row + tile) % 2 !== 0) continue;
        const angle = startAngle + row * rowWidth;
        const near = innerRadius + 6 + tile * run;
        const far = near + run;
        road.beginPath();
        road.moveTo(...trackPoint(angle, near));
        road.lineTo(...trackPoint(angle, far));
        road.lineTo(...trackPoint(angle + rowWidth, far));
        road.lineTo(...trackPoint(angle + rowWidth, near));
        road.closePath();
        road.fillStyle = '#CBDDED';
        road.fill();
      }
    }
  }

  function paintSkids(time: number) {
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      for (let i = 0; i < 18; i += 1) {
        const age = 0.015 + i * 0.035;
        ctx.beginPath();
        ctx.moveTo(...rearWheel(carAt(time - age), side));
        ctx.lineTo(...rearWheel(carAt(time - age - 0.035), side));
        ctx.strokeStyle = `rgba(12, 24, 40, ${0.38 * (1 - i / 18)})`;
        ctx.stroke();
      }
    }
  }

  const fog = ink.createRadialGradient(32, 32, 0, 32, 32, 29);
  fog.addColorStop(0, 'rgba(230, 240, 249, .88)');
  fog.addColorStop(.56, 'rgba(230, 240, 249, .29)');
  fog.addColorStop(1, 'rgba(230, 240, 249, 0)');
  ink.fillStyle = fog;
  ink.fillRect(0, 0, 64, 64);

  const emissionsPerLap = 180;
  const smokeInterval = loopSeconds / emissionsPerLap;
  const smokeLife = 0.45;

  function randomFor(index: number, salt: number) {
    const value = Math.sin((index + 1) * 12.9898 + salt * 7.869) * 43758.5453;
    return value - Math.floor(value);
  }

  function paintSmoke(time: number) {
    for (const side of [-1, 1]) {
      const offset = side === 1 ? smokeInterval / 2 : 0;
      const last = Math.floor((time - offset) / smokeInterval);
      for (let i = Math.ceil(smokeLife / smokeInterval); i >= 0; i -= 1) {
        const index = last - i;
        const born = index * smokeInterval + offset;
        const age = time - born;
        const life = age / smokeLife;
        if (life < 0 || life >= 1) continue;

        const seed = wrap(index, emissionsPerLap);
        const car = carAt(born);
        const [x, y] = rearWheel(car, side);
        const outward = 4 + randomFor(seed, side) * 13;
        const momentum = 22 + randomFor(seed, side + 4) * 12;
        const px = x + age * (Math.cos(car.angle) * outward + Math.cos(car.tangent) * momentum);
        const py = y + age * (Math.sin(car.angle) * outward + Math.sin(car.tangent) * momentum);
        const radius = 2.4 + life * (5.5 + randomFor(seed, side + 6) * 3.5);
        const fadeIn = Math.min(life * 7, 1);
        ctx.globalAlpha = .77 * fadeIn * (1 - life) ** 1.45;
        ctx.drawImage(smoke, px - radius, py - radius, radius * 2, radius * 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  function paintCar(car: ReturnType<typeof carAt>) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.heading);
    ctx.beginPath();
    ctx.ellipse(0, 0, 17.5, 10, 0, 0, tau);
    ctx.fillStyle = 'rgba(15, 29, 47, .44)';
    ctx.fill();
    ctx.drawImage(vehicleImage, -carSize / 2, -carSize / 2, carSize, carSize);
    ctx.restore();
  }

  let time = 0;
  let previousFrame: number | undefined;
  let animation = 0;

  function paintScene() {
    const scale = canvas.width / viewSize;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, viewSize, viewSize);
    ctx.drawImage(roadCanvas, 0, 0, viewSize, viewSize);
    if (vehicleImage.naturalWidth) {
      paintSkids(time);
      paintSmoke(time);
      paintCar(carAt(time));
    }
  }

  function resize() {
    const cssWidth = canvas.getBoundingClientRect().width;
    const pixels = Math.max(1, Math.round(cssWidth * Math.min(window.devicePixelRatio || 1, 2.5)));
    if (roadCanvas.width !== pixels || roadCanvas.height !== pixels) {
      canvas.width = canvas.height = pixels;
      roadCanvas.width = roadCanvas.height = pixels;
      paintRoad();
    }
    paintScene();
  }

  function tick(now: number) {
    if (previousFrame !== undefined) {
      time = wrap(time + (now - previousFrame) / 1000, loopSeconds);
    }
    previousFrame = now;
    paintScene();
    animation = requestAnimationFrame(tick);
  }

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motion.matches;

  function stopAnimation() {
    cancelAnimationFrame(animation);
    animation = 0;
    previousFrame = undefined;
  }

  function syncAnimation() {
    if (paused || document.hidden || !vehicleImage.naturalWidth) {
      stopAnimation();
    } else if (!animation) {
      animation = requestAnimationFrame(tick);
    }
  }

  function setPaused(next: boolean) {
    paused = next;
    onPauseChange(paused);
    syncAnimation();
  }

  function onMotionChange(event: MediaQueryListEvent) {
    setPaused(event.matches);
  }

  function onImageLoad() {
    paintScene();
    syncAnimation();
  }

  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(canvas);
  window.addEventListener('resize', resize);
  motion.addEventListener('change', onMotionChange);
  document.addEventListener('visibilitychange', syncAnimation);
  vehicleImage.addEventListener('load', onImageLoad);
  vehicleImage.src = carUrl;
  resize();
  setPaused(paused);

  return {
    toggle() {
      setPaused(!paused);
    },
    dispose() {
      stopAnimation();
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      motion.removeEventListener('change', onMotionChange);
      document.removeEventListener('visibilitychange', syncAnimation);
      vehicleImage.removeEventListener('load', onImageLoad);
    }
  };
}
