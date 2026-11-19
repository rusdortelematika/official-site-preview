import modelUrl from "../../../assets/pages/home/free-flow/road-models.json?url";
import type { MeshInstance, MeshPart, Point3 } from "./depthRenderer";

type Vehicle = {
  vertices: string;
  body: string;
  uv?: string;
  texture?: string;
  wheels: { position: number; radius: number; indices: string }[];
};

type ModelData = {
  frame: MeshPart[];
  car: Vehicle;
  truck: Vehicle;
};

function prepare({ vertices, body, wheels, uv }: Vehicle, unlit = false) {
  return {
    body: { vertices, indices: body, uv },
    wheels: wheels.map(({ position, radius, indices }) => ({
      position,
      radius,
      packed: { vertices, indices, uv },
    })),
    unlit,
  };
}

export async function loadRoadModels(signal: AbortSignal) {
  const response = await fetch(modelUrl, { signal });
  if (!response.ok) throw new Error(`Unable to load road models (${response.status})`);

  const data: ModelData = await response.json();
  let truckTexture: HTMLImageElement | undefined;
  if (data.truck.texture) {
    const image = new Image();
    image.src = data.truck.texture;
    truckTexture = await image.decode().then(() => image, () => undefined);
  }

  signal.throwIfAborted();
  return {
    frame: data.frame,
    car: prepare(data.car),
    truck: prepare(data.truck, true),
    truckTexture,
  };
}

export type RoadModels = Awaited<ReturnType<typeof loadRoadModels>>;

export function vehicleMeshes(
  vehicle: ReturnType<typeof prepare>,
  x: number,
  y: number,
  heading: number,
  travel: number,
  texture?: HTMLImageElement,
): MeshInstance[] {
  const cos = Math.cos(heading);
  const sin = Math.sin(heading);
  const pose = ([along, across, height]: Point3): Point3 => [
    x + cos * along - sin * across,
    y + sin * along + cos * across,
    height,
  ];

  return [
    { packed: vehicle.body, pose, unlit: vehicle.unlit, texture },
    ...vehicle.wheels.map(({ packed, position, radius }) => {
      const angle = -travel / radius;
      const wheelCos = Math.cos(angle);
      const wheelSin = Math.sin(angle);

      return {
        packed,
        unlit: vehicle.unlit,
        texture,
        pose: ([x, y, z]: Point3) => {
          const along = x - position;
          const height = z - radius;
          return pose([
            position + along * wheelCos - height * wheelSin,
            y,
            radius + along * wheelSin + height * wheelCos,
          ]);
        },
      };
    }),
  ];
}
