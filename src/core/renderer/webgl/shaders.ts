// ── WebGL Shaders ──────────────────────────────────────────────────────────
// GLSL shader sources for the chart WebGL renderer.
// All shaders work in pixel (CSS) coordinates — the vertex shader converts
// to clip space via a uniform resolution vector.

// ────────────────────────────────────────────────────────────────────────────
// RECT SHADER — instanced quads for candlestick bodies, volume bars, etc.
// Each instance: position (x,y), size (w,h), color (rgba).
// ────────────────────────────────────────────────────────────────────────────
export const RECT_VERT = /* glsl */ `#version 300 es
precision highp float;

// Per-vertex: unit quad (0,0)→(1,1)
layout(location = 0) in vec2 a_position;

// Per-instance
layout(location = 1) in vec4 a_rect;   // x, y, w, h (CSS pixels)
layout(location = 2) in vec4 a_color;  // r, g, b, a (0–1)

uniform vec2 u_resolution;             // viewport size in CSS pixels

out vec4 v_color;

void main() {
  vec2 pos = a_rect.xy + a_position * a_rect.zw;
  // Convert CSS pixels → clip space: [0, width] → [-1, 1]
  vec2 clip = (pos / u_resolution) * 2.0 - 1.0;
  clip.y = -clip.y; // flip Y (canvas convention: top=0)
  gl_Position = vec4(clip, 0.0, 1.0);
  v_color = a_color;
}
`;

export const RECT_FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec4 v_color;
out vec4 fragColor;

void main() {
  fragColor = v_color;
}
`;

// ────────────────────────────────────────────────────────────────────────────
// LINE SHADER — thick lines rendered as triangle-strip quads.
// Each segment: two endpoints + width + color. Expanded to a quad on GPU.
// ────────────────────────────────────────────────────────────────────────────
export const LINE_VERT = /* glsl */ `#version 300 es
precision highp float;

// Per-instance: line segment
layout(location = 0) in vec2 a_p0;      // start point (CSS px)
layout(location = 1) in vec2 a_p1;      // end point (CSS px)
layout(location = 2) in float a_width;  // line width (CSS px)
layout(location = 3) in vec4 a_color;   // rgba (0–1)
layout(location = 4) in float a_vertex; // vertex index 0–3 (quad corners)

uniform vec2 u_resolution;

out vec4 v_color;

void main() {
  vec2 dir = a_p1 - a_p0;
  float len = length(dir);
  vec2 norm = len > 0.001 ? vec2(-dir.y, dir.x) / len : vec2(0.0, 1.0);
  float hw = a_width * 0.5;

  // Quad corners: 0=p0-n, 1=p0+n, 2=p1-n, 3=p1+n
  int vi = int(a_vertex);
  vec2 base = (vi < 2) ? a_p0 : a_p1;
  float side = (vi == 0 || vi == 2) ? -1.0 : 1.0;
  vec2 pos = base + norm * hw * side;

  vec2 clip = (pos / u_resolution) * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);
  v_color = a_color;
}
`;

export const LINE_FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec4 v_color;
out vec4 fragColor;

void main() {
  fragColor = v_color;
}
`;

// ────────────────────────────────────────────────────────────────────────────
// TEXT SHADER — textured quads for text rendered via offscreen Canvas 2D.
// Maps a region of the text atlas texture to a screen quad.
// ────────────────────────────────────────────────────────────────────────────
export const TEXT_VERT = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_position; // unit quad vertex
layout(location = 1) in vec4 a_rect;     // screen rect: x, y, w, h
layout(location = 2) in vec4 a_uv;       // texture rect: u0, v0, u1, v1

uniform vec2 u_resolution;

out vec2 v_uv;

void main() {
  vec2 pos = a_rect.xy + a_position * a_rect.zw;
  vec2 clip = (pos / u_resolution) * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);

  // Interpolate UV
  v_uv = mix(a_uv.xy, a_uv.zw, a_position);
}
`;

export const TEXT_FRAG = /* glsl */ `#version 300 es
precision highp float;

uniform sampler2D u_texture;

in vec2 v_uv;
out vec4 fragColor;

void main() {
  fragColor = texture(u_texture, v_uv);
}
`;

// ────────────────────────────────────────────────────────────────────────────
// CANDLESTICK SHADER — one draw call for ALL candles.
// Per-instance: raw OHLC prices. Vertex shader computes pixel positions.
// 12 vertices per instance: 6 for body (quad), 6 for wick (thin quad).
// ────────────────────────────────────────────────────────────────────────────
export const CANDLE_VERT = /* glsl */ `#version 300 es
precision highp float;

// Per-instance: raw OHLC data
layout(location = 0) in float a_open;
layout(location = 1) in float a_high;
layout(location = 2) in float a_low;
layout(location = 3) in float a_close;
layout(location = 4) in float a_barIndex; // relative bar index (float)

// Uniforms
uniform vec2 u_resolution;    // viewport CSS pixels
uniform float u_chartHeight;  // chart area height
uniform float u_priceMin;     // visible price range min
uniform float u_priceRange;   // max - min
uniform float u_barSpacing;   // pixels per bar
uniform float u_offsetX;      // scroll offset
uniform float u_bodyWidth;    // candle body width (pixels)
uniform vec4 u_bullColor;     // bull body RGBA
uniform vec4 u_bearColor;     // bear body RGBA
uniform vec4 u_bullWickColor; // bull wick RGBA
uniform vec4 u_bearWickColor; // bear wick RGBA

out vec4 v_color;

// 12 vertices per candle:
//  0-5:  body quad (two triangles)
//  6-11: wick quad (two triangles, 1px wide)

float priceToY(float price) {
  return u_chartHeight * (1.0 - (price - u_priceMin) / u_priceRange);
}

void main() {
  int vid = gl_VertexID % 12;
  bool isWick = vid >= 6;
  int quadVid = isWick ? vid - 6 : vid;

  float centerX = a_barIndex * u_barSpacing + u_offsetX + u_barSpacing * 0.5;

  bool isBull = a_close >= a_open;
  float bodyTop = priceToY(isBull ? a_close : a_open);
  float bodyBot = priceToY(isBull ? a_open : a_close);
  // Ensure min 1px body
  if (bodyBot - bodyTop < 1.0) bodyBot = bodyTop + 1.0;

  float highY = priceToY(a_high);
  float lowY  = priceToY(a_low);

  float hw = isWick ? 0.5 : u_bodyWidth * 0.5;
  float top = isWick ? highY : bodyTop;
  float bot = isWick ? lowY : bodyBot;

  // Quad: 6 verts (2 tris) — TL, TR, BL, TR, BR, BL
  vec2 pos;
  float left = floor(centerX - hw + 0.5);
  float right = left + (isWick ? 1.0 : u_bodyWidth);
  float topy = top;
  float boty = bot;

  if (quadVid == 0)      pos = vec2(left,  topy);  // TL
  else if (quadVid == 1) pos = vec2(right, topy);  // TR
  else if (quadVid == 2) pos = vec2(left,  boty);  // BL
  else if (quadVid == 3) pos = vec2(right, topy);  // TR
  else if (quadVid == 4) pos = vec2(right, boty);  // BR
  else                   pos = vec2(left,  boty);  // BL

  vec2 clip = (pos / u_resolution) * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);

  if (isWick) {
    v_color = isBull ? u_bullWickColor : u_bearWickColor;
  } else {
    v_color = isBull ? u_bullColor : u_bearColor;
  }
}
`;

export const CANDLE_FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec4 v_color;
out vec4 fragColor;

void main() {
  fragColor = v_color;
}
`;

// ────────────────────────────────────────────────────────────────────────────
// VOLUME BAR SHADER — one draw call for ALL volume bars.
// Per-instance: volume + isBull flag. Vertex shader computes pixel positions.
// 6 vertices per instance (one quad).
// ────────────────────────────────────────────────────────────────────────────
export const VOLUME_VERT = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in float a_volume;
layout(location = 1) in float a_isBull;   // 1.0 = bull, 0.0 = bear
layout(location = 2) in float a_barIndex;

uniform vec2 u_resolution;
uniform float u_chartHeight;
uniform float u_maxVolume;
uniform float u_barSpacing;
uniform float u_offsetX;
uniform float u_bodyWidth;
uniform float u_volumeZoneHeight;
uniform vec4 u_bullColor;
uniform vec4 u_bearColor;

out vec4 v_color;

void main() {
  int vid = gl_VertexID % 6;

  float centerX = a_barIndex * u_barSpacing + u_offsetX + u_barSpacing * 0.5;
  float hw = u_bodyWidth * 0.5;
  float left = floor(centerX - hw + 0.5);
  float right = left + u_bodyWidth;

  float barH = (a_volume / u_maxVolume) * u_volumeZoneHeight;
  float top = u_chartHeight - barH;
  float bot = u_chartHeight;

  vec2 pos;
  if (vid == 0)      pos = vec2(left,  top);
  else if (vid == 1) pos = vec2(right, top);
  else if (vid == 2) pos = vec2(left,  bot);
  else if (vid == 3) pos = vec2(right, top);
  else if (vid == 4) pos = vec2(right, bot);
  else               pos = vec2(left,  bot);

  vec2 clip = (pos / u_resolution) * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);

  v_color = a_isBull > 0.5 ? u_bullColor : u_bearColor;
}
`;

export const VOLUME_FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec4 v_color;
out vec4 fragColor;

void main() {
  fragColor = v_color;
}
`;

// ────────────────────────────────────────────────────────────────────────────
// GRADIENT RECT SHADER — for area chart fills with vertical gradients.
// Each instance: rect + top color + bottom color.
// ────────────────────────────────────────────────────────────────────────────
export const GRADIENT_RECT_VERT = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_position;   // unit quad
layout(location = 1) in vec4 a_rect;       // x, y, w, h
layout(location = 2) in vec4 a_colorTop;   // top color
layout(location = 3) in vec4 a_colorBot;   // bottom color

uniform vec2 u_resolution;

out vec4 v_color;

void main() {
  vec2 pos = a_rect.xy + a_position * a_rect.zw;
  vec2 clip = (pos / u_resolution) * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);
  v_color = mix(a_colorTop, a_colorBot, a_position.y);
}
`;

export const GRADIENT_RECT_FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec4 v_color;
out vec4 fragColor;

void main() {
  fragColor = v_color;
}
`;
