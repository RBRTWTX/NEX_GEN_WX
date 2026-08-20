const EARTH_RADIUS_M = 6_371_229;
const STANDARD_PARALLEL_DEG = 38.5;
const CENTRAL_LONGITUDE_DEG = -97.5;
const FIRST_LATITUDE_DEG = 21.138123;
const FIRST_LONGITUDE_DEG = -122.719528;
const GRID_SPACING_M = 3000;

const radians = (degrees: number) => degrees * Math.PI / 180;
const degrees = (value: number) => value * 180 / Math.PI;

const phi1 = radians(STANDARD_PARALLEL_DEG);
const lambda0 = radians(CENTRAL_LONGITUDE_DEG);
const n = Math.sin(phi1);
const f = Math.cos(phi1) * Math.pow(Math.tan(Math.PI / 4 + phi1 / 2), n) / n;

function forward(latitudeDeg: number, longitudeDeg: number): [number, number] {
  const phi = radians(latitudeDeg);
  const lambda = radians(longitudeDeg);
  const rho = EARTH_RADIUS_M * f / Math.pow(Math.tan(Math.PI / 4 + phi / 2), n);
  const theta = n * (lambda - lambda0);
  return [rho * Math.sin(theta), -rho * Math.cos(theta)];
}

const [firstX, firstY] = forward(FIRST_LATITUDE_DEG, FIRST_LONGITUDE_DEG);

export function hrrrGridLonLat(i: number, j: number): [number, number] {
  const x = firstX + i * GRID_SPACING_M;
  const y = firstY + j * GRID_SPACING_M;
  const rho = Math.hypot(x, y);
  const theta = Math.atan2(x, -y);
  const phi = 2 * Math.atan(Math.pow(EARTH_RADIUS_M * f / rho, 1 / n)) - Math.PI / 2;
  const lambda = lambda0 + theta / n;
  return [degrees(lambda), degrees(phi)];
}

export const HRRR_GRID = {
  nx: 1799,
  ny: 1059,
  spacingMeters: GRID_SPACING_M,
  firstLatitude: FIRST_LATITUDE_DEG,
  firstLongitude: FIRST_LONGITUDE_DEG,
  centralLongitude: CENTRAL_LONGITUDE_DEG,
  standardParallel: STANDARD_PARALLEL_DEG,
} as const;
