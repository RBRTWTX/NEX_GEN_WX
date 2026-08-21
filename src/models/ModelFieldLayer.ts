import {
  MercatorCoordinate,
  type CustomLayerInterface,
  type CustomRenderMethodInput,
  type Map as MapLibreMap,
} from 'maplibre-gl';
import type { ModelFieldGrid, ModelFieldId } from './model-types';
import { hrrrGridLonLat } from './hrrr-projection';
import { MODEL_FIELD_LAYER_ID } from './model-layer-ids';

type Gl = WebGLRenderingContext | WebGL2RenderingContext;

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const TRANSPARENT: Rgba = { r: 0, g: 0, b: 0, a: 0 };

const reflectivityStops: Array<[number, Rgba]> = [
  [5, { r: 0.18, g: 0.66, b: 0.22, a: 0.72 }],
  [20, { r: 0.20, g: 0.93, b: 0.34, a: 0.86 }],
  [30, { r: 0.98, g: 0.91, b: 0.05, a: 0.91 }],
  [40, { r: 1.00, g: 0.50, b: 0.02, a: 0.94 }],
  [50, { r: 0.94, g: 0.09, b: 0.06, a: 0.96 }],
  [60, { r: 0.58, g: 0.00, b: 0.38, a: 0.98 }],
  [70, { r: 1.00, g: 0.20, b: 0.86, a: 1.00 }],
  [80, { r: 1.00, g: 1.00, b: 1.00, a: 1.00 }],
];

const temperatureStops: Array<[number, Rgba]> = [
  [-40, { r: 0.88, g: 0.40, b: 0.86, a: 1 }],
  [-10, { r: 0.43, g: 0.18, b: 0.82, a: 1 }],
  [10, { r: 0.10, g: 0.39, b: 0.86, a: 1 }],
  [32, { r: 0.00, g: 0.72, b: 0.89, a: 1 }],
  [50, { r: 0.13, g: 0.67, b: 0.38, a: 1 }],
  [70, { r: 0.80, g: 0.92, b: 0.16, a: 1 }],
  [85, { r: 1.00, g: 0.64, b: 0.06, a: 1 }],
  [100, { r: 0.95, g: 0.16, b: 0.12, a: 1 }],
  [115, { r: 0.91, g: 0.00, b: 0.58, a: 1 }],
];

const dewpointStops: Array<[number, Rgba]> = [
  [-10, { r: 0.48, g: 0.29, b: 0.13, a: 1 }],
  [20, { r: 0.72, g: 0.55, b: 0.31, a: 1 }],
  [40, { r: 0.91, g: 0.87, b: 0.39, a: 1 }],
  [55, { r: 0.35, g: 0.78, b: 0.36, a: 1 }],
  [65, { r: 0.00, g: 0.71, b: 0.62, a: 1 }],
  [75, { r: 0.15, g: 0.51, b: 0.78, a: 1 }],
  [80, { r: 0.48, g: 0.29, b: 0.77, a: 1 }],
];

const relativeHumidityStops: Array<[number, Rgba]> = [
  [10, { r: 0.65, g: 0.29, b: 0.16, a: 1 }],
  [20, { r: 0.86, g: 0.55, b: 0.25, a: 1 }],
  [30, { r: 0.93, g: 0.83, b: 0.36, a: 1 }],
  [50, { r: 0.47, g: 0.78, b: 0.36, a: 1 }],
  [70, { r: 0.20, g: 0.72, b: 0.65, a: 1 }],
  [85, { r: 0.24, g: 0.56, b: 0.82, a: 1 }],
  [100, { r: 0.44, g: 0.30, b: 0.78, a: 1 }],
];

const windGustStops: Array<[number, Rgba]> = [
  [0, { r: 0.29, g: 0.42, b: 0.54, a: 0.72 }],
  [15, { r: 0.24, g: 0.69, b: 0.41, a: 0.84 }],
  [25, { r: 0.84, g: 0.86, b: 0.26, a: 0.90 }],
  [35, { r: 0.95, g: 0.64, b: 0.23, a: 0.94 }],
  [50, { r: 0.91, g: 0.29, b: 0.25, a: 0.97 }],
  [65, { r: 0.76, g: 0.24, b: 0.60, a: 0.99 }],
  [80, { r: 0.48, g: 0.31, b: 0.71, a: 1 }],
];

function interpolateColor(value: number, stops: Array<[number, Rgba]>): Rgba {
  if (value <= stops[0][0]) return stops[0][1];
  if (value >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];
  for (let index = 1; index < stops.length; index += 1) {
    const [highValue, high] = stops[index];
    if (value > highValue) continue;
    const [lowValue, low] = stops[index - 1];
    const ratio = (value - lowValue) / Math.max(0.0001, highValue - lowValue);
    return {
      r: low.r + (high.r - low.r) * ratio,
      g: low.g + (high.g - low.g) * ratio,
      b: low.b + (high.b - low.b) * ratio,
      a: low.a + (high.a - low.a) * ratio,
    };
  }
  return stops[stops.length - 1][1];
}

function fieldColor(field: ModelFieldId, value: number | null, opacity: number): Rgba {
  if (value == null || !Number.isFinite(value)) return TRANSPARENT;

  let color: Rgba;
  switch (field) {
    case 'composite-reflectivity':
      if (value < 5) return TRANSPARENT;
      color = interpolateColor(value, reflectivityStops);
      break;
    case 'temperature-2m':
      color = interpolateColor(value, temperatureStops);
      break;
    case 'dewpoint-2m':
      color = interpolateColor(value, dewpointStops);
      break;
    case 'relative-humidity-2m':
      color = interpolateColor(value, relativeHumidityStops);
      break;
    case 'wind-gust-surface':
      color = interpolateColor(value, windGustStops);
      break;
    default:
      color = TRANSPARENT;
  }
  return { ...color, a: color.a * opacity };
}

function shader(gl: Gl, type: number, source: string): WebGLShader {
  const result = gl.createShader(type);
  if (!result) throw new Error('Unable to allocate model field shader.');
  gl.shaderSource(result, source);
  gl.compileShader(result);
  if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(result) || 'unknown shader error';
    gl.deleteShader(result);
    throw new Error(`Model field shader failed: ${message}`);
  }
  return result;
}

export class ModelFieldLayer implements CustomLayerInterface {
  readonly id = MODEL_FIELD_LAYER_ID;
  readonly type = 'custom' as const;
  readonly renderingMode = '2d' as const;

  private map: MapLibreMap | null = null;
  private gl: Gl | null = null;
  private program: WebGLProgram | null = null;
  private vertexBuffer: WebGLBuffer | null = null;
  private indexBuffer: WebGLBuffer | null = null;
  private positionLocation = -1;
  private colorLocation = -1;
  private matrixLocation: WebGLUniformLocation | null = null;
  private vertexData = new Float32Array();
  private indexData = new Uint16Array();
  private indexCount = 0;

  setField(grid: ModelFieldGrid, opacity: number): void {
    const width = grid.iIndices.length;
    const height = grid.jIndices.length;
    const vertexCount = width * height;
    if (vertexCount <= 0 || vertexCount > 65_535) {
      throw new Error(`Model field mesh has an unsupported vertex count: ${vertexCount}.`);
    }

    const vertices = new Float32Array(vertexCount * 6);
    let offset = 0;
    for (let jIndex = 0; jIndex < height; jIndex += 1) {
      const j = grid.jIndices[jIndex];
      for (let iIndex = 0; iIndex < width; iIndex += 1) {
        const i = grid.iIndices[iIndex];
        const value = grid.values[jIndex * width + iIndex] ?? null;
        const [longitude, latitude] = hrrrGridLonLat(i, j);
        const mercator = MercatorCoordinate.fromLngLat({ lng: longitude, lat: latitude });
        const color = fieldColor(grid.field, value, opacity);
        vertices[offset++] = mercator.x;
        vertices[offset++] = mercator.y;
        vertices[offset++] = color.r;
        vertices[offset++] = color.g;
        vertices[offset++] = color.b;
        vertices[offset++] = color.a;
      }
    }

    const indices: number[] = [];
    for (let row = 0; row < height - 1; row += 1) {
      for (let column = 0; column < width - 1; column += 1) {
        const a = row * width + column;
        const b = a + 1;
        const c = a + width;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    this.vertexData = vertices;
    this.indexData = new Uint16Array(indices);
    this.indexCount = this.indexData.length;
    this.upload();
    this.map?.triggerRepaint();
  }

  clear(): void {
    this.vertexData = new Float32Array();
    this.indexData = new Uint16Array();
    this.indexCount = 0;
    this.upload();
    this.map?.triggerRepaint();
  }

  onAdd(map: MapLibreMap, gl: Gl): void {
    this.map = map;
    this.gl = gl;
    const webgl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
    const vertexSource = webgl2
      ? `#version 300 es
precision highp float;
uniform mat4 u_matrix;
in vec2 a_pos;
in vec4 a_color;
out vec4 v_color;
void main() {
  gl_Position = u_matrix * vec4(a_pos, 0.0, 1.0);
  v_color = a_color;
}`
      : `precision highp float;
uniform mat4 u_matrix;
attribute vec2 a_pos;
attribute vec4 a_color;
varying vec4 v_color;
void main() {
  gl_Position = u_matrix * vec4(a_pos, 0.0, 1.0);
  v_color = a_color;
}`;
    const fragmentSource = webgl2
      ? `#version 300 es
precision mediump float;
in vec4 v_color;
out vec4 outColor;
void main() {
  outColor = v_color;
}`
      : `precision mediump float;
varying vec4 v_color;
void main() {
  gl_FragColor = v_color;
}`;

    const vertexShader = shader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = shader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!program) throw new Error('Unable to allocate model field WebGL program.');
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || 'unknown link error';
      gl.deleteProgram(program);
      throw new Error(`Model field WebGL program failed: ${message}`);
    }

    this.program = program;
    this.vertexBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();
    this.positionLocation = gl.getAttribLocation(program, 'a_pos');
    this.colorLocation = gl.getAttribLocation(program, 'a_color');
    this.matrixLocation = gl.getUniformLocation(program, 'u_matrix');
    this.upload();
  }

  render(gl: Gl, options: CustomRenderMethodInput): void {
    if (!this.program || !this.vertexBuffer || !this.indexBuffer || !this.indexCount) return;
    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.matrixLocation, false, options.defaultProjectionData.mainMatrix);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(this.colorLocation);
    gl.vertexAttribPointer(this.colorLocation, 4, gl.FLOAT, false, 24, 8);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
  }

  onRemove(_map: MapLibreMap, gl: Gl): void {
    if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
    if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer);
    if (this.program) gl.deleteProgram(this.program);
    this.map = null;
    this.gl = null;
    this.program = null;
    this.vertexBuffer = null;
    this.indexBuffer = null;
    this.matrixLocation = null;
  }

  private upload(): void {
    const gl = this.gl;
    if (!gl || !this.vertexBuffer || !this.indexBuffer) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indexData, gl.STATIC_DRAW);
  }
}
