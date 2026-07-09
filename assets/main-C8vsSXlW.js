var Te=Object.defineProperty;var Ve=(t,e,i)=>e in t?Te(t,e,{enumerable:!0,configurable:!0,writable:!0,value:i}):t[e]=i;var u=(t,e,i)=>Ve(t,typeof e!="symbol"?e+"":e,i);import{H as Ie,F as Ge,S as Ae}from"./index-B9lR8Pv4.js";import{r as l,j as s,R as je,a as ze}from"./index-DTcUf6xU.js";import{c as Me,u as Pe,m as We,a as Le,b as He,B as k,I as Ye,S as ge,d as pe,e as xe,f as ve,g as K,h as Oe,i as Je,j as Ke,k as _e,A as Ze,l as Xe,X as qe}from"./chat-ChnSect9.js";import{U as $e,c as Fe,m as et,a as tt}from"./chat-source-Cox4quUk.js";import"./highlight-DicOTBuZ.js";const st=`#version 300 es
precision mediump float;

layout(location = 0) in vec4 a_position;

uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_imageAspectRatio;
uniform float u_originX;
uniform float u_originY;
uniform float u_worldWidth;
uniform float u_worldHeight;
uniform float u_fit;
uniform float u_scale;
uniform float u_rotation;
uniform float u_offsetX;
uniform float u_offsetY;

out vec2 v_objectUV;
out vec2 v_objectBoxSize;
out vec2 v_responsiveUV;
out vec2 v_responsiveBoxGivenSize;
out vec2 v_patternUV;
out vec2 v_patternBoxSize;
out vec2 v_imageUV;

vec3 getBoxSize(float boxRatio, vec2 givenBoxSize) {
  vec2 box = vec2(0.);
  // fit = none
  box.x = boxRatio * min(givenBoxSize.x / boxRatio, givenBoxSize.y);
  float noFitBoxWidth = box.x;
  if (u_fit == 1.) { // fit = contain
    box.x = boxRatio * min(u_resolution.x / boxRatio, u_resolution.y);
  } else if (u_fit == 2.) { // fit = cover
    box.x = boxRatio * max(u_resolution.x / boxRatio, u_resolution.y);
  }
  box.y = box.x / boxRatio;
  return vec3(box, noFitBoxWidth);
}

void main() {
  gl_Position = a_position;

  vec2 uv = gl_Position.xy * .5;
  vec2 boxOrigin = vec2(.5 - u_originX, u_originY - .5);
  vec2 givenBoxSize = vec2(u_worldWidth, u_worldHeight);
  givenBoxSize = max(givenBoxSize, vec2(1.)) * u_pixelRatio;
  float r = u_rotation * 3.14159265358979323846 / 180.;
  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);


  // ===================================================

  float fixedRatio = 1.;
  vec2 fixedRatioBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );

  v_objectBoxSize = getBoxSize(fixedRatio, fixedRatioBoxGivenSize).xy;
  vec2 objectWorldScale = u_resolution.xy / v_objectBoxSize;

  v_objectUV = uv;
  v_objectUV *= objectWorldScale;
  v_objectUV += boxOrigin * (objectWorldScale - 1.);
  v_objectUV += graphicOffset;
  v_objectUV /= u_scale;
  v_objectUV = graphicRotation * v_objectUV;

  // ===================================================

  v_responsiveBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  float responsiveRatio = v_responsiveBoxGivenSize.x / v_responsiveBoxGivenSize.y;
  vec2 responsiveBoxSize = getBoxSize(responsiveRatio, v_responsiveBoxGivenSize).xy;
  vec2 responsiveBoxScale = u_resolution.xy / responsiveBoxSize;

  #ifdef ADD_HELPERS
  v_responsiveHelperBox = uv;
  v_responsiveHelperBox *= responsiveBoxScale;
  v_responsiveHelperBox += boxOrigin * (responsiveBoxScale - 1.);
  #endif

  v_responsiveUV = uv;
  v_responsiveUV *= responsiveBoxScale;
  v_responsiveUV += boxOrigin * (responsiveBoxScale - 1.);
  v_responsiveUV += graphicOffset;
  v_responsiveUV /= u_scale;
  v_responsiveUV.x *= responsiveRatio;
  v_responsiveUV = graphicRotation * v_responsiveUV;
  v_responsiveUV.x /= responsiveRatio;

  // ===================================================

  float patternBoxRatio = givenBoxSize.x / givenBoxSize.y;
  vec2 patternBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  patternBoxRatio = patternBoxGivenSize.x / patternBoxGivenSize.y;

  vec3 boxSizeData = getBoxSize(patternBoxRatio, patternBoxGivenSize);
  v_patternBoxSize = boxSizeData.xy;
  float patternBoxNoFitBoxWidth = boxSizeData.z;
  vec2 patternBoxScale = u_resolution.xy / v_patternBoxSize;

  v_patternUV = uv;
  v_patternUV += graphicOffset / patternBoxScale;
  v_patternUV += boxOrigin;
  v_patternUV -= boxOrigin / patternBoxScale;
  v_patternUV *= u_resolution.xy;
  v_patternUV /= u_pixelRatio;
  if (u_fit > 0.) {
    v_patternUV *= (patternBoxNoFitBoxWidth / v_patternBoxSize.x);
  }
  v_patternUV /= u_scale;
  v_patternUV = graphicRotation * v_patternUV;
  v_patternUV += boxOrigin / patternBoxScale;
  v_patternUV -= boxOrigin;
  // x100 is a default multiplier between vertex and fragmant shaders
  // we use it to avoid UV presision issues
  v_patternUV *= .01;

  // ===================================================

  vec2 imageBoxSize;
  if (u_fit == 1.) { // contain
    imageBoxSize.x = min(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else if (u_fit == 2.) { // cover
    imageBoxSize.x = max(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else {
    imageBoxSize.x = min(10.0, 10.0 / u_imageAspectRatio * u_imageAspectRatio);
  }
  imageBoxSize.y = imageBoxSize.x / u_imageAspectRatio;
  vec2 imageBoxScale = u_resolution.xy / imageBoxSize;

  v_imageUV = uv;
  v_imageUV *= imageBoxScale;
  v_imageUV += boxOrigin * (imageBoxScale - 1.);
  v_imageUV += graphicOffset;
  v_imageUV /= u_scale;
  v_imageUV.x *= u_imageAspectRatio;
  v_imageUV = graphicRotation * v_imageUV;
  v_imageUV.x /= u_imageAspectRatio;

  v_imageUV += .5;
  v_imageUV.y = 1. - v_imageUV.y;
}`,we=1920*1080*4;let it=class{constructor(e,i,r,a,n=0,o=0,c=2,h=we,f=[]){u(this,"parentElement");u(this,"canvasElement");u(this,"gl");u(this,"program",null);u(this,"uniformLocations",{});u(this,"fragmentShader");u(this,"rafId",null);u(this,"lastRenderTime",0);u(this,"currentFrame",0);u(this,"speed",0);u(this,"currentSpeed",0);u(this,"providedUniforms");u(this,"mipmaps",[]);u(this,"hasBeenDisposed",!1);u(this,"resolutionChanged",!0);u(this,"textures",new Map);u(this,"minPixelRatio");u(this,"maxPixelCount");u(this,"isSafari",ot());u(this,"uniformCache",{});u(this,"textureUnitMap",new Map);u(this,"ownerDocument");u(this,"initProgram",()=>{const e=rt(this.gl,st,this.fragmentShader);e&&(this.program=e)});u(this,"setupPositionAttribute",()=>{const e=this.gl.getAttribLocation(this.program,"a_position"),i=this.gl.createBuffer();this.gl.bindBuffer(this.gl.ARRAY_BUFFER,i);const r=[-1,-1,1,-1,-1,1,-1,1,1,-1,1,1];this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array(r),this.gl.STATIC_DRAW),this.gl.enableVertexAttribArray(e),this.gl.vertexAttribPointer(e,2,this.gl.FLOAT,!1,0,0)});u(this,"setupUniforms",()=>{const e={u_time:this.gl.getUniformLocation(this.program,"u_time"),u_pixelRatio:this.gl.getUniformLocation(this.program,"u_pixelRatio"),u_resolution:this.gl.getUniformLocation(this.program,"u_resolution")};Object.entries(this.providedUniforms).forEach(([i,r])=>{if(e[i]=this.gl.getUniformLocation(this.program,i),r instanceof HTMLImageElement){const a=`${i}AspectRatio`;e[a]=this.gl.getUniformLocation(this.program,a)}}),this.uniformLocations=e});u(this,"renderScale",1);u(this,"parentWidth",0);u(this,"parentHeight",0);u(this,"parentDevicePixelWidth",0);u(this,"parentDevicePixelHeight",0);u(this,"devicePixelsSupported",!1);u(this,"resizeObserver",null);u(this,"setupResizeObserver",()=>{this.resizeObserver=new ResizeObserver(([e])=>{var i;if(e!=null&&e.borderBoxSize[0]){const r=(i=e.devicePixelContentBoxSize)==null?void 0:i[0];r!==void 0&&(this.devicePixelsSupported=!0,this.parentDevicePixelWidth=r.inlineSize,this.parentDevicePixelHeight=r.blockSize),this.parentWidth=e.borderBoxSize[0].inlineSize,this.parentHeight=e.borderBoxSize[0].blockSize}this.handleResize()}),this.resizeObserver.observe(this.parentElement)});u(this,"handleVisualViewportChange",()=>{var e;(e=this.resizeObserver)==null||e.disconnect(),this.setupResizeObserver()});u(this,"handleResize",()=>{let e=0,i=0;const r=Math.max(1,window.devicePixelRatio),a=(visualViewport==null?void 0:visualViewport.scale)??1;if(this.devicePixelsSupported){const m=Math.max(1,this.minPixelRatio/r);e=this.parentDevicePixelWidth*m*a,i=this.parentDevicePixelHeight*m*a}else{let m=Math.max(r,this.minPixelRatio)*a;if(this.isSafari){const A=at(this.ownerDocument);m*=Math.max(1,A)}e=Math.round(this.parentWidth)*m,i=Math.round(this.parentHeight)*m}const n=Math.sqrt(this.maxPixelCount)/Math.sqrt(e*i),o=Math.min(1,n),c=Math.round(e*o),h=Math.round(i*o),f=c/Math.round(this.parentWidth);(this.canvasElement.width!==c||this.canvasElement.height!==h||this.renderScale!==f)&&(this.renderScale=f,this.canvasElement.width=c,this.canvasElement.height=h,this.resolutionChanged=!0,this.gl.viewport(0,0,this.gl.canvas.width,this.gl.canvas.height),this.render(performance.now()))});u(this,"render",e=>{if(this.hasBeenDisposed)return;if(this.program===null){console.warn("Tried to render before program or gl was initialized");return}const i=e-this.lastRenderTime;this.lastRenderTime=e,this.currentSpeed!==0&&(this.currentFrame+=i*this.currentSpeed),this.gl.clear(this.gl.COLOR_BUFFER_BIT),this.gl.useProgram(this.program),this.gl.uniform1f(this.uniformLocations.u_time,this.currentFrame*.001),this.resolutionChanged&&(this.gl.uniform2f(this.uniformLocations.u_resolution,this.gl.canvas.width,this.gl.canvas.height),this.gl.uniform1f(this.uniformLocations.u_pixelRatio,this.renderScale),this.resolutionChanged=!1),this.gl.drawArrays(this.gl.TRIANGLES,0,6),this.currentSpeed!==0?this.requestRender():this.rafId=null});u(this,"requestRender",()=>{this.rafId!==null&&cancelAnimationFrame(this.rafId),this.rafId=requestAnimationFrame(this.render)});u(this,"setTextureUniform",(e,i)=>{if(!i.complete||i.naturalWidth===0)throw new Error(`Paper Shaders: image for uniform ${e} must be fully loaded`);const r=this.textures.get(e);r&&this.gl.deleteTexture(r),this.textureUnitMap.has(e)||this.textureUnitMap.set(e,this.textureUnitMap.size);const a=this.textureUnitMap.get(e);this.gl.activeTexture(this.gl.TEXTURE0+a);const n=this.gl.createTexture();this.gl.bindTexture(this.gl.TEXTURE_2D,n),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_S,this.gl.CLAMP_TO_EDGE),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_T,this.gl.CLAMP_TO_EDGE),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MIN_FILTER,this.gl.LINEAR),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MAG_FILTER,this.gl.LINEAR),this.gl.texImage2D(this.gl.TEXTURE_2D,0,this.gl.RGBA,this.gl.RGBA,this.gl.UNSIGNED_BYTE,i),this.mipmaps.includes(e)&&(this.gl.generateMipmap(this.gl.TEXTURE_2D),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MIN_FILTER,this.gl.LINEAR_MIPMAP_LINEAR));const o=this.gl.getError();if(o!==this.gl.NO_ERROR||n===null){console.error("Paper Shaders: WebGL error when uploading texture:",o);return}this.textures.set(e,n);const c=this.uniformLocations[e];if(c){this.gl.uniform1i(c,a);const h=`${e}AspectRatio`,f=this.uniformLocations[h];if(f){const m=i.naturalWidth/i.naturalHeight;this.gl.uniform1f(f,m)}}});u(this,"areUniformValuesEqual",(e,i)=>e===i?!0:Array.isArray(e)&&Array.isArray(i)&&e.length===i.length?e.every((r,a)=>this.areUniformValuesEqual(r,i[a])):!1);u(this,"setUniformValues",e=>{this.gl.useProgram(this.program),Object.entries(e).forEach(([i,r])=>{let a=r;if(r instanceof HTMLImageElement&&(a=`${r.src.slice(0,200)}|${r.naturalWidth}x${r.naturalHeight}`),this.areUniformValuesEqual(this.uniformCache[i],a))return;this.uniformCache[i]=a;const n=this.uniformLocations[i];if(!n){console.warn(`Uniform location for ${i} not found`);return}if(r instanceof HTMLImageElement)this.setTextureUniform(i,r);else if(Array.isArray(r)){let o=null,c=null;if(r[0]!==void 0&&Array.isArray(r[0])){const h=r[0].length;if(r.every(f=>f.length===h))o=r.flat(),c=h;else{console.warn(`All child arrays must be the same length for ${i}`);return}}else o=r,c=o.length;switch(c){case 2:this.gl.uniform2fv(n,o);break;case 3:this.gl.uniform3fv(n,o);break;case 4:this.gl.uniform4fv(n,o);break;case 9:this.gl.uniformMatrix3fv(n,!1,o);break;case 16:this.gl.uniformMatrix4fv(n,!1,o);break;default:console.warn(`Unsupported uniform array length: ${c}`)}}else typeof r=="number"?this.gl.uniform1f(n,r):typeof r=="boolean"?this.gl.uniform1i(n,r?1:0):console.warn(`Unsupported uniform type for ${i}: ${typeof r}`)})});u(this,"getCurrentFrame",()=>this.currentFrame);u(this,"setFrame",e=>{this.currentFrame=e,this.lastRenderTime=performance.now(),this.render(performance.now())});u(this,"setSpeed",(e=1)=>{this.speed=e,this.setCurrentSpeed(this.ownerDocument.hidden?0:e)});u(this,"setCurrentSpeed",e=>{this.currentSpeed=e,this.rafId===null&&e!==0&&(this.lastRenderTime=performance.now(),this.rafId=requestAnimationFrame(this.render)),this.rafId!==null&&e===0&&(cancelAnimationFrame(this.rafId),this.rafId=null)});u(this,"setMaxPixelCount",(e=we)=>{this.maxPixelCount=e,this.handleResize()});u(this,"setMinPixelRatio",(e=2)=>{this.minPixelRatio=e,this.handleResize()});u(this,"setUniforms",e=>{this.setUniformValues(e),this.providedUniforms={...this.providedUniforms,...e},this.render(performance.now())});u(this,"handleDocumentVisibilityChange",()=>{this.setCurrentSpeed(this.ownerDocument.hidden?0:this.speed)});u(this,"dispose",()=>{this.hasBeenDisposed=!0,this.rafId!==null&&(cancelAnimationFrame(this.rafId),this.rafId=null),this.gl&&this.program&&(this.textures.forEach(e=>{this.gl.deleteTexture(e)}),this.textures.clear(),this.gl.deleteProgram(this.program),this.program=null,this.gl.bindBuffer(this.gl.ARRAY_BUFFER,null),this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER,null),this.gl.bindRenderbuffer(this.gl.RENDERBUFFER,null),this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null),this.gl.getError()),this.resizeObserver&&(this.resizeObserver.disconnect(),this.resizeObserver=null),visualViewport==null||visualViewport.removeEventListener("resize",this.handleVisualViewportChange),this.ownerDocument.removeEventListener("visibilitychange",this.handleDocumentVisibilityChange),this.uniformLocations={},this.canvasElement.remove(),delete this.parentElement.paperShaderMount});if((e==null?void 0:e.nodeType)===1)this.parentElement=e;else throw new Error("Paper Shaders: parent element must be an HTMLElement");if(this.ownerDocument=e.ownerDocument,!this.ownerDocument.querySelector("style[data-paper-shader]")){const x=this.ownerDocument.createElement("style");x.innerHTML=nt,x.setAttribute("data-paper-shader",""),this.ownerDocument.head.prepend(x)}const m=this.ownerDocument.createElement("canvas");this.canvasElement=m,this.parentElement.prepend(m),this.fragmentShader=i,this.providedUniforms=r,this.mipmaps=f,this.currentFrame=o,this.minPixelRatio=c,this.maxPixelCount=h;const A=m.getContext("webgl2",a);if(!A)throw new Error("Paper Shaders: WebGL is not supported in this browser");this.gl=A,this.initProgram(),this.setupPositionAttribute(),this.setupUniforms(),this.setUniformValues(this.providedUniforms),this.setupResizeObserver(),visualViewport==null||visualViewport.addEventListener("resize",this.handleVisualViewportChange),this.setSpeed(n),this.parentElement.setAttribute("data-paper-shader",""),this.parentElement.paperShaderMount=this,this.ownerDocument.addEventListener("visibilitychange",this.handleDocumentVisibilityChange)}};function Be(t,e,i){const r=t.createShader(e);return r?(t.shaderSource(r,i),t.compileShader(r),t.getShaderParameter(r,t.COMPILE_STATUS)?r:(console.error("An error occurred compiling the shaders: "+t.getShaderInfoLog(r)),t.deleteShader(r),null)):null}function rt(t,e,i){const r=t.getShaderPrecisionFormat(t.FRAGMENT_SHADER,t.MEDIUM_FLOAT),a=r?r.precision:null;a&&a<23&&(e=e.replace(/precision\s+(lowp|mediump)\s+float;/g,"precision highp float;"),i=i.replace(/precision\s+(lowp|mediump)\s+float/g,"precision highp float").replace(/\b(uniform|varying|attribute)\s+(lowp|mediump)\s+(\w+)/g,"$1 highp $3"));const n=Be(t,t.VERTEX_SHADER,e),o=Be(t,t.FRAGMENT_SHADER,i);if(!n||!o)return null;const c=t.createProgram();return c?(t.attachShader(c,n),t.attachShader(c,o),t.linkProgram(c),t.getProgramParameter(c,t.LINK_STATUS)?(t.detachShader(c,n),t.detachShader(c,o),t.deleteShader(n),t.deleteShader(o),c):(console.error("Unable to initialize the shader program: "+t.getProgramInfoLog(c)),t.deleteProgram(c),t.deleteShader(n),t.deleteShader(o),null)):null}const nt=`@layer paper-shaders {
  :where([data-paper-shader]) {
    isolation: isolate;
    position: relative;

    & canvas {
      contain: strict;
      display: block;
      position: absolute;
      inset: 0;
      z-index: -1;
      width: 100%;
      height: 100%;
      border-radius: inherit;
      corner-shape: inherit;
    }
  }
}`;function ot(){const t=navigator.userAgent.toLowerCase();return t.includes("safari")&&!t.includes("chrome")&&!t.includes("android")}function at(t){const e=(visualViewport==null?void 0:visualViewport.scale)??1,i=(visualViewport==null?void 0:visualViewport.width)??window.innerWidth,r=window.innerWidth-t.documentElement.clientWidth,a=e*i+r,n=outerWidth/a,o=Math.round(100*n);return o%5===0?o/100:o===33?1/3:o===67?2/3:o===133?4/3:n}const ct={fit:"contain",scale:1,rotation:0,offsetX:0,offsetY:0,originX:.5,originY:.5,worldWidth:0,worldHeight:0},lt={none:0,contain:1,cover:2},ut=`
#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846
`,dt=`
vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}
`,ht=`
  float hash11(float p) {
    p = fract(p * 0.3183099) + 0.1;
    p *= p + 19.19;
    return fract(p * p);
  }
`,ft=`
  float randomR(vec2 p) {
    vec2 uv = floor(p) / 100. + .5;
    return texture(u_noiseTexture, fract(uv)).r;
  }
`,mt=`
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
    -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
      dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`,Ee={maxColorCount:7},At=`#version 300 es
precision lowp float;

uniform mediump float u_time;
uniform mediump vec2 u_resolution;
uniform mediump float u_pixelRatio;

uniform sampler2D u_noiseTexture;

uniform vec4 u_colorBack;
uniform vec4 u_colors[${Ee.maxColorCount}];
uniform float u_colorsCount;
uniform float u_softness;
uniform float u_intensity;
uniform float u_noise;
uniform float u_shape;

uniform mediump float u_originX;
uniform mediump float u_originY;
uniform mediump float u_worldWidth;
uniform mediump float u_worldHeight;
uniform mediump float u_fit;

uniform mediump float u_scale;
uniform mediump float u_rotation;
uniform mediump float u_offsetX;
uniform mediump float u_offsetY;

in vec2 v_objectUV;
in vec2 v_patternUV;
in vec2 v_objectBoxSize;
in vec2 v_patternBoxSize;

out vec4 fragColor;

${ut}
${mt}
${dt}
${ft}

float valueNoiseR(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = randomR(i);
  float b = randomR(i + vec2(1.0, 0.0));
  float c = randomR(i + vec2(0.0, 1.0));
  float d = randomR(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}
vec4 fbmR(vec2 n0, vec2 n1, vec2 n2, vec2 n3) {
  float amplitude = 0.2;
  vec4 total = vec4(0.);
  for (int i = 0; i < 3; i++) {
    n0 = rotate(n0, 0.3);
    n1 = rotate(n1, 0.3);
    n2 = rotate(n2, 0.3);
    n3 = rotate(n3, 0.3);
    total.x += valueNoiseR(n0) * amplitude;
    total.y += valueNoiseR(n1) * amplitude;
    total.z += valueNoiseR(n2) * amplitude;
    total.z += valueNoiseR(n3) * amplitude;
    n0 *= 1.99;
    n1 *= 1.99;
    n2 *= 1.99;
    n3 *= 1.99;
    amplitude *= 0.6;
  }
  return total;
}

${ht}

vec2 truchet(vec2 uv, float idx){
  idx = fract(((idx - .5) * 2.));
  if (idx > 0.75) {
    uv = vec2(1.0) - uv;
  } else if (idx > 0.5) {
    uv = vec2(1.0 - uv.x, uv.y);
  } else if (idx > 0.25) {
    uv = 1.0 - vec2(1.0 - uv.x, uv.y);
  }
  return uv;
}

void main() {

  const float firstFrameOffset = 7.;
  float t = .1 * (u_time + firstFrameOffset);

  vec2 shape_uv = vec2(0.);
  vec2 grain_uv = vec2(0.);

  float r = u_rotation * PI / 180.;
  float cr = cos(r);
  float sr = sin(r);
  mat2 graphicRotation = mat2(cr, sr, -sr, cr);
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);

  if (u_shape > 3.5) {
    shape_uv = v_objectUV;
    grain_uv = shape_uv;

    // apply inverse transform to grain_uv so it respects the originXY
    grain_uv = transpose(graphicRotation) * grain_uv;
    grain_uv *= u_scale;
    grain_uv -= graphicOffset;
    grain_uv *= v_objectBoxSize;
    grain_uv *= .7;
  } else {
    shape_uv = .5 * v_patternUV;
    grain_uv = 100. * v_patternUV;

    // apply inverse transform to grain_uv so it respects the originXY
    grain_uv = transpose(graphicRotation) * grain_uv;
    grain_uv *= u_scale;
    if (u_fit > 0.) {
      vec2 givenBoxSize = vec2(u_worldWidth, u_worldHeight);
      givenBoxSize = max(givenBoxSize, vec2(1.)) * u_pixelRatio;
      float patternBoxRatio = givenBoxSize.x / givenBoxSize.y;
      vec2 patternBoxGivenSize = vec2(
      (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
      (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
      );
      patternBoxRatio = patternBoxGivenSize.x / patternBoxGivenSize.y;
      float patternBoxNoFitBoxWidth = patternBoxRatio * min(patternBoxGivenSize.x / patternBoxRatio, patternBoxGivenSize.y);
      grain_uv /= (patternBoxNoFitBoxWidth / v_patternBoxSize.x);
    }
    vec2 patternBoxScale = u_resolution.xy / v_patternBoxSize;
    grain_uv -= graphicOffset / patternBoxScale;
    grain_uv *= 1.6;
  }


  float shape = 0.;

  if (u_shape < 1.5) {
    // Sine wave

    float wave = cos(.5 * shape_uv.x - 4. * t) * sin(1.5 * shape_uv.x + 2. * t) * (.75 + .25 * cos(6. * t));
    shape = 1. - smoothstep(-1., 1., shape_uv.y + wave);

  } else if (u_shape < 2.5) {
    // Grid (dots)

    float stripeIdx = floor(2. * shape_uv.x / TWO_PI);
    float rand = hash11(stripeIdx * 100.);
    rand = sign(rand - .5) * pow(4. * abs(rand), .3);
    shape = sin(shape_uv.x) * cos(shape_uv.y - 5. * rand * t);
    shape = pow(abs(shape), 4.);

  } else if (u_shape < 3.5) {
    // Truchet pattern

    float n2 = valueNoiseR(shape_uv * .4 - 3.75 * t);
    shape_uv.x += 10.;
    shape_uv *= .6;

    vec2 tile = truchet(fract(shape_uv), randomR(floor(shape_uv)));

    float distance1 = length(tile);
    float distance2 = length(tile - vec2(1.));

    n2 -= .5;
    n2 *= .1;
    shape = smoothstep(.2, .55, distance1 + n2) * (1. - smoothstep(.45, .8, distance1 - n2));
    shape += smoothstep(.2, .55, distance2 + n2) * (1. - smoothstep(.45, .8, distance2 - n2));

    shape = pow(shape, 1.5);

  } else if (u_shape < 4.5) {
    // Corners

    shape_uv *= .6;
    vec2 outer = vec2(.5);

    vec2 bl = smoothstep(vec2(0.), outer, shape_uv + vec2(.1 + .1 * sin(3. * t), .2 - .1 * sin(5.25 * t)));
    vec2 tr = smoothstep(vec2(0.), outer, 1. - shape_uv);
    shape = 1. - bl.x * bl.y * tr.x * tr.y;

    shape_uv = -shape_uv;
    bl = smoothstep(vec2(0.), outer, shape_uv + vec2(.1 + .1 * sin(3. * t), .2 - .1 * cos(5.25 * t)));
    tr = smoothstep(vec2(0.), outer, 1. - shape_uv);
    shape -= bl.x * bl.y * tr.x * tr.y;

    shape = 1. - smoothstep(0., 1., shape);

  } else if (u_shape < 5.5) {
    // Ripple

    shape_uv *= 2.;
    float dist = length(.4 * shape_uv);
    float waves = sin(pow(dist, 1.2) * 5. - 3. * t) * .5 + .5;
    shape = waves;

  } else if (u_shape < 6.5) {
    // Blob

    t *= 2.;

    vec2 f1_traj = .25 * vec2(1.3 * sin(t), .2 + 1.3 * cos(.6 * t + 4.));
    vec2 f2_traj = .2 * vec2(1.2 * sin(-t), 1.3 * sin(1.6 * t));
    vec2 f3_traj = .25 * vec2(1.7 * cos(-.6 * t), cos(-1.6 * t));
    vec2 f4_traj = .3 * vec2(1.4 * cos(.8 * t), 1.2 * sin(-.6 * t - 3.));

    shape = .5 * pow(1. - clamp(0., 1., length(shape_uv + f1_traj)), 5.);
    shape += .5 * pow(1. - clamp(0., 1., length(shape_uv + f2_traj)), 5.);
    shape += .5 * pow(1. - clamp(0., 1., length(shape_uv + f3_traj)), 5.);
    shape += .5 * pow(1. - clamp(0., 1., length(shape_uv + f4_traj)), 5.);

    shape = smoothstep(.0, .9, shape);
    float edge = smoothstep(.25, .3, shape);
    shape = mix(.0, shape, edge);

  } else {
    // Sphere

    shape_uv *= 2.;
    float d = 1. - pow(length(shape_uv), 2.);
    vec3 pos = vec3(shape_uv, sqrt(max(d, 0.)));
    vec3 lightPos = normalize(vec3(cos(1.5 * t), .8, sin(1.25 * t)));
    shape = .5 + .5 * dot(lightPos, pos);
    shape *= step(0., d);
  }

  float baseNoise = snoise(grain_uv * .5);
  vec4 fbmVals = fbmR(
  .002 * grain_uv + 10.,
  .003 * grain_uv,
  .001 * grain_uv,
  rotate(.4 * grain_uv, 2.)
  );
  float grainDist = baseNoise * snoise(grain_uv * .2) - fbmVals.x - fbmVals.y;
  float rawNoise = .75 * baseNoise - fbmVals.w - fbmVals.z;
  float noise = clamp(rawNoise, 0., 1.);

  shape += u_intensity * 2. / u_colorsCount * (grainDist + .5);
  shape += u_noise * 10. / u_colorsCount * noise;

  float aa = fwidth(shape);

  shape = clamp(shape - .5 / u_colorsCount, 0., 1.);
  float totalShape = smoothstep(0., u_softness + 2. * aa, clamp(shape * u_colorsCount, 0., 1.));
  float mixer = shape * (u_colorsCount - 1.);

  int cntStop = int(u_colorsCount) - 1;
  vec4 gradient = u_colors[0];
  gradient.rgb *= gradient.a;
  for (int i = 1; i < ${Ee.maxColorCount}; i++) {
    if (i > cntStop) break;

    float localT = clamp(mixer - float(i - 1), 0., 1.);
    localT = smoothstep(.5 - .5 * u_softness - aa, .5 + .5 * u_softness + aa, localT);

    vec4 c = u_colors[i];
    c.rgb *= c.a;
    gradient = mix(gradient, c, localT);
  }

  vec3 color = gradient.rgb * totalShape;
  float opacity = gradient.a * totalShape;

  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  color = color + bgColor * (1.0 - opacity);
  opacity = opacity + u_colorBack.a * (1.0 - opacity);

  fragColor = vec4(color, opacity);
}
`,gt={wave:1,dots:2,truchet:3,corners:4,ripple:5,blob:6,sphere:7};function be(t){if(Array.isArray(t))return t.length===4?t:t.length===3?[...t,1]:re;if(typeof t!="string")return re;let e,i,r,a=1;if(t.startsWith("#"))[e,i,r,a]=pt(t);else if(t.startsWith("rgb"))[e,i,r,a]=xt(t);else if(t.startsWith("hsl"))[e,i,r,a]=wt(vt(t));else return console.error("Unsupported color format",t),re;return[_(e,0,1),_(i,0,1),_(r,0,1),_(a,0,1)]}function pt(t){t=t.replace(/^#/,""),t.length===3&&(t=t.split("").map(n=>n+n).join("")),t.length===6&&(t=t+"ff");const e=parseInt(t.slice(0,2),16)/255,i=parseInt(t.slice(2,4),16)/255,r=parseInt(t.slice(4,6),16)/255,a=parseInt(t.slice(6,8),16)/255;return[e,i,r,a]}function xt(t){const e=t.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+))?\s*\)$/i);return e?[parseInt(e[1]??"0")/255,parseInt(e[2]??"0")/255,parseInt(e[3]??"0")/255,e[4]===void 0?1:parseFloat(e[4])]:[0,0,0,1]}function vt(t){const e=t.match(/^hsla?\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(?:,\s*([0-9.]+))?\s*\)$/i);return e?[parseInt(e[1]??"0"),parseInt(e[2]??"0"),parseInt(e[3]??"0"),e[4]===void 0?1:parseFloat(e[4])]:[0,0,0,1]}function wt(t){const[e,i,r,a]=t,n=e/360,o=i/100,c=r/100;let h,f,m;if(i===0)h=f=m=c;else{const A=(B,M,v)=>(v<0&&(v+=1),v>1&&(v-=1),v<.16666666666666666?B+(M-B)*6*v:v<.5?M:v<.6666666666666666?B+(M-B)*(.6666666666666666-v)*6:B),x=c<.5?c*(1+o):c+o-c*o,C=2*c-x;h=A(C,x,n+1/3),f=A(C,x,n),m=A(C,x,n-1/3)}return[h,f,m,a]}const _=(t,e,i)=>Math.min(Math.max(t,e),i),re=[0,0,0,1];function Bt(){if(typeof window>"u")return;const t=new Image;return t.src=Et,t}const Et="data:image/png;base64,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",bt="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";function St(t){const e=l.useRef(void 0),i=l.useCallback(r=>{const a=t.map(n=>{if(n!=null){if(typeof n=="function"){const o=n,c=o(r);return typeof c=="function"?c:()=>{o(null)}}return n.current=r,()=>{n.current=null}}});return()=>{a.forEach(n=>n==null?void 0:n())}},t);return l.useMemo(()=>t.every(r=>r==null)?null:r=>{e.current&&(e.current(),e.current=void 0),r!=null&&(e.current=i(r))},t)}function Se(t){if(t.naturalWidth<1024&&t.naturalHeight<1024){if(t.naturalWidth<1||t.naturalHeight<1)return;const e=t.naturalWidth/t.naturalHeight;t.width=Math.round(e>1?1024*e:1024),t.height=Math.round(e>1?1024:1024/e)}}async function Re(t){const e={},i=[],r=n=>{try{return n.startsWith("/")||new URL(n),!0}catch{return!1}},a=n=>{try{return n.startsWith("/")?!1:new URL(n,window.location.origin).origin!==window.location.origin}catch{return!1}};return Object.entries(t).forEach(([n,o])=>{if(typeof o=="string"){const c=o||bt;if(!r(c)){console.warn(`Uniform "${n}" has invalid URL "${c}". Skipping image loading.`);return}const h=new Promise((f,m)=>{const A=new Image;a(c)&&(A.crossOrigin="anonymous"),A.onload=()=>{Se(A),e[n]=A,f()},A.onerror=()=>{console.error(`Could not set uniforms. Failed to load image at ${c}`),m()},A.src=c});i.push(h)}else o instanceof HTMLImageElement&&Se(o),e[n]=o}),await Promise.all(i),e}const Ue=l.forwardRef(function({fragmentShader:e,uniforms:i,webGlContextAttributes:r,speed:a=0,frame:n=0,width:o,height:c,minPixelRatio:h,maxPixelCount:f,mipmaps:m,style:A,...x},C){const[B,M]=l.useState(!1),v=l.useRef(null),R=l.useRef(null),T=l.useRef(r);l.useEffect(()=>((async()=>{const G=await Re(i);v.current&&!R.current&&(R.current=new it(v.current,e,G,T.current,a,n,h,f,m),M(!0))})(),()=>{var G;(G=R.current)==null||G.dispose(),R.current=null}),[e]),l.useEffect(()=>{let E=!1;return(async()=>{var j;const Y=await Re(i);E||(j=R.current)==null||j.setUniforms(Y)})(),()=>{E=!0}},[i,B]),l.useEffect(()=>{var E;(E=R.current)==null||E.setSpeed(a)},[a,B]),l.useEffect(()=>{var E;(E=R.current)==null||E.setMaxPixelCount(f)},[f,B]),l.useEffect(()=>{var E;(E=R.current)==null||E.setMinPixelRatio(h)},[h,B]),l.useEffect(()=>{var E;(E=R.current)==null||E.setFrame(n)},[n,B]);const V=St([v,C]);return s.jsx("div",{ref:V,style:o!==void 0||c!==void 0?{width:typeof o=="string"&&isNaN(+o)===!1?+o:o,height:typeof c=="string"&&isNaN(+c)===!1?+c:c,...A}:A,...x})});Ue.displayName="ShaderMount";const S={params:{...ct,speed:1,frame:0,colorBack:"#000000",colors:["#7300ff","#eba8ff","#00bfff","#2a00ff"],softness:.5,intensity:.5,noise:.25,shape:"corners"}},Rt=l.memo(function({speed:e=S.params.speed,frame:i=S.params.frame,colorBack:r=S.params.colorBack,colors:a=S.params.colors,softness:n=S.params.softness,intensity:o=S.params.intensity,noise:c=S.params.noise,shape:h=S.params.shape,fit:f=S.params.fit,scale:m=S.params.scale,rotation:A=S.params.rotation,originX:x=S.params.originX,originY:C=S.params.originY,offsetX:B=S.params.offsetX,offsetY:M=S.params.offsetY,worldWidth:v=S.params.worldWidth,worldHeight:R=S.params.worldHeight,...T}){const V={u_colorBack:be(r),u_colors:a.map(be),u_colorsCount:a.length,u_softness:n,u_intensity:o,u_noise:c,u_shape:gt[h],u_noiseTexture:Bt(),u_fit:lt[f],u_scale:m,u_rotation:A,u_offsetX:B,u_offsetY:M,u_originX:x,u_originY:C,u_worldWidth:v,u_worldHeight:R};return s.jsx(Ue,{...T,speed:e,frame:i,fragmentShader:At,uniforms:V})}),Qt=Le("relative inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-sm border border-transparent font-medium outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-64 [&_svg:not([class*='opacity-'])]:opacity-80 [&_svg:not([class*='size-'])]:size-3.5 sm:[&_svg:not([class*='size-'])]:size-3 [&_svg]:pointer-events-none [&_svg]:shrink-0 [button&,a&]:cursor-pointer [button&,a&]:pointer-coarse:after:absolute [button&,a&]:pointer-coarse:after:size-full [button&,a&]:pointer-coarse:after:min-h-11 [button&,a&]:pointer-coarse:after:min-w-11",{defaultVariants:{size:"default",variant:"default"},variants:{size:{default:"h-5.5 min-w-5.5 px-[calc(--spacing(1)-1px)] text-sm sm:h-4.5 sm:min-w-4.5 sm:text-xs",lg:"h-6.5 min-w-6.5 px-[calc(--spacing(1.5)-1px)] text-base sm:h-5.5 sm:min-w-5.5 sm:text-sm",sm:"h-5 min-w-5 rounded-[.25rem] px-[calc(--spacing(1)-1px)] text-xs sm:h-4 sm:min-w-4 sm:text-[.625rem]"},variant:{default:"bg-primary text-primary-foreground [button&,a&]:hover:bg-primary/90",destructive:"bg-destructive text-white [button&,a&]:hover:bg-destructive/90",error:"bg-destructive/8 text-destructive-foreground dark:bg-destructive/16",info:"bg-info/8 text-info-foreground dark:bg-info/16",outline:"border-input bg-background text-foreground dark:bg-input/32 [button&,a&]:hover:bg-accent/50 dark:[button&,a&]:hover:bg-input/48",secondary:"bg-secondary text-secondary-foreground [button&,a&]:hover:bg-secondary/90",success:"bg-success/8 text-success-foreground dark:bg-success/16",warning:"bg-warning/8 text-warning-foreground dark:bg-warning/16"}}});function Ct({className:t,variant:e,size:i,render:r,...a}){const n={className:Me(Qt({className:t,size:i,variant:e})),"data-slot":"badge"};return Pe({defaultTagName:"span",props:We(n,a),render:r})}const It=l.forwardRef(function(e,i){const{className:r,render:a,orientation:n="horizontal",style:o,...c}=e;return He("div",e,{state:{orientation:n},ref:i,props:[{role:"separator","aria-orientation":n},c]})});function Mt({className:t,orientation:e="horizontal",...i}){return s.jsx(It,{className:Me("shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px data-[orientation=vertical]:not-[[class^='h-']]:not-[[class*='_h-']]:self-stretch",t),"data-slot":"separator",orientation:e,...i})}let ne=null,N=null;function Ft(){return ne||(ne=new AudioContext),ne}function Ut(t){let e=t|0;return()=>{e=e+1831565813|0;let i=Math.imul(e^e>>>15,1|e);return i=i+Math.imul(i^i>>>7,61|i)^i,((i^i>>>14)>>>0)/4294967296}}function Z(){N&&(N.stop(),N.el.classList.remove("playing"),N=null)}function Dt(t){if((N==null?void 0:N.el)===t){Z();return}Z();const e=Math.min(Number(t.dataset.sec)||3,60),i=Number(t.dataset.seed)||1,r=Ft();r.resume();const a=Ut(i),n=r.currentTime+.05,o=r.createGain();o.gain.value=.5,o.connect(r.destination);const c=95+a()*90,h=r.createOscillator();h.type="sawtooth";const f=r.createGain();f.gain.value=0;const m=r.createBiquadFilter();m.type="bandpass",m.Q.value=6;const A=r.createBiquadFilter();A.type="bandpass",A.Q.value=8,h.connect(f),f.connect(m),f.connect(A),m.connect(o),A.connect(o);let x=n;const C=n+e;for(;x<C;){const M=.09+a()*.18,v=a()<.18?.12+a()*.25:.02+a()*.05,R=c*(.92+a()*.25),T=300+a()*500,V=900+a()*1500;h.frequency.setValueAtTime(R,x),h.frequency.linearRampToValueAtTime(R*(.95+a()*.12),x+M),m.frequency.setValueAtTime(T,x),A.frequency.setValueAtTime(V,x),f.gain.setValueAtTime(0,x),f.gain.linearRampToValueAtTime(.6+a()*.3,x+.02),f.gain.setValueAtTime(.5+a()*.3,x+M-.03),f.gain.linearRampToValueAtTime(0,x+M),x+=M+v}h.start(n),h.stop(C+.1);const B=window.setTimeout(()=>{(N==null?void 0:N.el)===t&&Z()},(C-r.currentTime)*1e3+150);t.classList.add("playing"),N={el:t,stop:()=>{window.clearTimeout(B);try{h.stop()}catch{}o.disconnect()}}}const Nt=new URLSearchParams(location.search),P=Math.min(Math.max(parseInt(Nt.get("n")??"",10)||3e7,1e3),1e8),oe=Fe(P);function Qe(t,e,i){const r=et(t);return!(r.kind==="sys"||e&&r.user!==e||i&&r.kind!==i)}function yt(t,e){return tt(t).toLowerCase().includes(e)}function kt(t,e){const i=t.indexOf('class="bubble');if(i===-1)return t;const r=new RegExp(e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi");let a=t.slice(0,i),n=i;for(;n<t.length;){const o=t.indexOf("<",n),c=o===-1?t.slice(n):t.slice(n,o);if(a+=c.replace(r,f=>`<mark class="hl">${f}</mark>`),o===-1)break;const h=t.indexOf(">",o);a+=t.slice(o,h===-1?t.length:h+1),n=h===-1?t.length:h+1}return a}const Ce=[["text","Text"],["img","Image"],["voice","Voice"],["code","Code"],["file","File"],["link","Link"],["video","Video"],["location","Location"],["contact","Contact"],["poll","Poll"]];function Tt({onHome:t}={}){var me;const e=l.useRef(null),i=l.useRef(null),r=l.useRef(""),a=l.useRef(null),n=l.useRef(null),o=l.useRef(null),c=l.useRef(-1),h=l.useRef(null),f=l.useRef(null),m=l.useRef(null),A=l.useRef(null),x=l.useRef(null),C=l.useRef(null),[B,M]=l.useState(""),[v,R]=l.useState(""),[T,V]=l.useState(""),[E,G]=l.useState(""),[Y,j]=l.useState(""),[ae,O]=l.useState(""),[ce,le]=l.useState(!1),[Ne,ue]=l.useState(!1),[ye,ke]=l.useState(!1),X=l.useRef({index:0,offset:0}),q=l.useRef(!1),W=l.useRef(0),$=l.useRef(!1),L=l.useRef(-1);function z(d,p=0){var Q;$.current=!0,(Q=i.current)==null||Q.scrollToIndex(d,p)}const ee=-56;function te(d){return{get count(){return d.count},renderToString:p=>r.current?kt(d.renderToString(p),r.current):d.renderToString(p)}}l.useEffect(()=>{const d=e.current;if(!d)return;const p=new Ie(d,{dataSource:te(oe),keyboard:!0,onAnchorChange(g){if(h.current&&(h.current.textContent=`#${g.index.toLocaleString()}`),$.current){$.current=!1,X.current={index:g.index,offset:g.offset},W.current=0;return}const w=X.current,I=g.index===w.index?g.offset-w.offset:(g.index-w.index)*60;if(X.current={index:g.index,offset:g.offset},Math.abs(I)>=4){const ie=W.current;W.current=ie===0||Math.sign(I)===Math.sign(ie)?ie+I:I}const y=g.index===0&&g.offset<40;let H=q.current;y||W.current<-40?H=!1:W.current>60&&(H=!0),H!==q.current&&(q.current=H,ke(H))},onRangeChange(g,w){m.current&&(m.current.textContent=`[${g.start.toLocaleString()} → ${g.end.toLocaleString()})`),A.current&&(A.current.textContent=`${w.toFixed(1)} ms`),f.current&&(f.current.textContent=String(g.end-g.start))}});i.current=p;let Q=0,b=performance.now(),F=0;const U=g=>{if(Q+=1,g-b>=1e3){C.current&&(C.current.textContent=String(Math.round(Q*1e3/(g-b)))),Q=0,b=g;const w=performance.memory;w&&x.current&&(x.current.textContent=`${(w.usedJSHeapSize/1048576).toFixed(1)} MB`)}F=requestAnimationFrame(U)};F=requestAnimationFrame(U);const D=g=>{const w=g.target.closest(".voice-bubble");w&&Dt(w)};return d.addEventListener("click",D),()=>{var g,w;d.removeEventListener("click",D),Z(),cancelAnimationFrame(F),(g=a.current)==null||g.cancel(),(w=o.current)==null||w.cancel(),p.destroy(),i.current=null}},[]);function se(){var d,p;(d=o.current)==null||d.cancel(),o.current=null,c.current=-1,L.current=-1,O(""),le(!1),ue(!1),r.current&&(r.current="",(p=i.current)==null||p.refresh())}function de(d,p){var w;const Q=i.current;if(!Q)return;if((w=a.current)==null||w.cancel(),a.current=null,se(),!d&&!p){n.current=null,j(""),Q.setDataSource(te(oe));return}const b=new Ge(oe);n.current=b;const F=()=>{const I=L.current;if(I<0)return;const y=b.indexOf(I);y>=0&&(L.current=-1,z(y,ee))};Q.setDataSource(te(b)),j("Filtering…");let U=0,D=0;const g=new Ae(P,I=>Qe(I,d,p),{onMatches(I){b.append(I);const y=performance.now();y-U>250&&(U=y,Q.refresh()),F()},onProgress(I){const y=performance.now();y-D>200&&(D=y,j(`${b.count.toLocaleString()} results (scanned ${Math.round(I/P*100)}%)`))},onDone(I){Q.refresh(),j(`${I.length.toLocaleString()} results`),F()}});a.current=g,g.start()}function J(d){const p=o.current,Q=i.current;if(!p||!Q)return;const b=p.matches.length;if(b===0)return;c.current=(d%b+b)%b;const F=p.matches.at(c.current);O(`${(c.current+1).toLocaleString()} / ${b.toLocaleString()} matches${p.done?"":" (searching…)"}`);const U=n.current;if(U){const D=U.indexOf(F);D>=0?(L.current=-1,z(D,ee)):L.current=F}else z(F,ee)}function he(){const d=i.current;if(!d)return;const p=T.trim().toLowerCase();if(se(),!p)return;ue(!0),r.current=p,d.refresh();const Q=B,b=v,F=performance.now();let U=!0;const D=new Ae(P,g=>Qe(g,Q,b)&&yt(g,p),{onMatches(){U&&(U=!1,le(!0),J(0))},onProgress(g){var w;c.current<0&&O(`Searching ${Math.round(g/P*100)}% (${(((w=o.current)==null?void 0:w.matches.length)??0).toLocaleString()} matches)`)},onDone(g){const w=performance.now()-F;g.length===0?O(`No matches (scanned in ${(w/1e3).toFixed(1)}s)`):c.current>=0&&J(c.current)}});o.current=D,D.start()}function fe(){const d=parseInt(E,10);Number.isNaN(d)||z(d)}return s.jsxs("div",{className:"relative flex h-dvh flex-col bg-background text-foreground",children:[s.jsxs("header",{className:"flex shrink-0 items-center gap-3 px-4 py-2.5",children:[t?s.jsxs("button",{type:"button",onClick:t,className:"whitespace-nowrap font-semibold text-sm tracking-tight",children:["HyperScroll ",s.jsx("span",{className:"hidden font-normal text-muted-foreground sm:inline",children:"@hyperscroll/core"})]}):s.jsxs("div",{className:"whitespace-nowrap font-semibold text-sm tracking-tight",children:["HyperScroll ",s.jsx("span",{className:"hidden font-normal text-muted-foreground sm:inline",children:"@hyperscroll/core"})]}),s.jsx(Ct,{variant:"secondary",className:"hidden whitespace-nowrap sm:inline-flex",children:"demo"}),s.jsxs("div",{className:"ml-auto flex items-center gap-1.5",children:[s.jsx(k,{variant:"link",size:"sm",render:s.jsx("a",{href:"./docs.html"}),children:"Docs"}),s.jsx(k,{variant:"link",size:"sm",render:s.jsx("a",{href:"./benchmark.html"}),children:"Benchmark"}),s.jsx(k,{className:"hidden sm:inline-flex",variant:"ghost",size:"sm",onClick:()=>z(0),children:"Top"}),s.jsx(k,{className:"hidden sm:inline-flex",variant:"ghost",size:"sm",onClick:()=>z(P/2|0),children:"Middle"}),s.jsx(k,{className:"hidden sm:inline-flex",variant:"ghost",size:"sm",onClick:()=>z(P-1),children:"Bottom"}),s.jsx(Ye,{className:"hidden w-40 md:block",size:"sm",type:"number",placeholder:"Jump to message #",value:E,onChange:d=>G(d.target.value),onKeyDown:d=>{d.key==="Enter"&&fe()}}),s.jsx(k,{className:"hidden md:inline-flex",size:"sm",onClick:fe,children:"Jump"})]})]}),s.jsxs("div",{className:"relative min-h-0 flex-1",children:[s.jsxs("div",{className:`absolute inset-x-0 top-0 z-20 flex flex-wrap items-center gap-2 bg-background px-4 pb-2.5 transition-[translate,opacity] duration-300 ease-out will-change-transform ${ye?"pointer-events-none -translate-y-full opacity-0":"translate-y-0 opacity-100"}`,children:[s.jsx("span",{className:"hidden whitespace-nowrap font-medium text-muted-foreground text-xs sm:inline",children:"Filter"}),s.jsxs(ge,{value:B,onValueChange:d=>{const p=d??"";M(p),de(p,v)},children:[s.jsx(pe,{size:"sm",className:"w-32 min-w-0 sm:w-36",children:s.jsx(xe,{children:B||"All senders"})}),s.jsxs(ve,{children:[s.jsx(K,{value:"",children:"All senders"}),$e.map(d=>s.jsx(K,{value:d,children:d},d))]})]}),s.jsxs(ge,{value:v,onValueChange:d=>{const p=d??"";R(p),de(B,p)},children:[s.jsx(pe,{size:"sm",className:"w-32 min-w-0",children:s.jsx(xe,{children:((me=Ce.find(([d])=>d===v))==null?void 0:me[1])??"All types"})}),s.jsxs(ve,{children:[s.jsx(K,{value:"",children:"All types"}),Ce.map(([d,p])=>s.jsx(K,{value:d,children:p},d))]})]}),Y?s.jsx("span",{className:"truncate text-muted-foreground text-xs",children:Y}):null,s.jsx(Mt,{orientation:"vertical",className:"mx-2 hidden h-5 md:block"}),s.jsx("span",{className:"hidden whitespace-nowrap font-medium text-muted-foreground text-xs sm:inline",children:"Search"}),s.jsxs(Oe,{className:"w-full min-w-0 flex-1 basis-48 md:w-72 md:flex-none",children:[s.jsx(Je,{children:s.jsx(Ke,{})}),s.jsx(_e,{size:"sm",type:"search",placeholder:"Find keyword (within current filter)",value:T,onChange:d=>V(d.target.value),onKeyDown:d=>{d.key==="Enter"&&he()}})]}),s.jsx(k,{size:"sm",onClick:he,children:"Search"}),s.jsx(k,{variant:"outline",size:"icon-sm",disabled:!ce,onClick:()=>J(c.current-1),children:s.jsx(Ze,{})}),s.jsx(k,{variant:"outline",size:"icon-sm",disabled:!ce,onClick:()=>J(c.current+1),children:s.jsx(Xe,{})}),s.jsx(k,{variant:"ghost",size:"icon-sm",disabled:!Ne,onClick:()=>{V(""),se()},children:s.jsx(qe,{})}),ae?s.jsx("span",{className:"truncate text-muted-foreground text-xs",children:ae}):null]}),s.jsx("div",{className:"pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-background to-transparent"}),s.jsx("div",{id:"viewport",ref:e,className:"h-full"})]}),s.jsxs("div",{className:"pointer-events-none absolute right-2 bottom-2 z-20 rounded-xl bg-popover/90 p-2 font-mono text-[10px] text-muted-foreground leading-relaxed backdrop-blur sm:right-4 sm:bottom-4 sm:min-w-52 sm:p-3 sm:text-xs",children:[s.jsxs("div",{children:["FPS ",s.jsx("b",{className:"text-base text-green-600",ref:C,children:"--"})]}),s.jsxs("div",{children:["Current message ",s.jsx("b",{className:"font-semibold text-foreground",ref:h,children:"0"})]}),s.jsxs("div",{children:["Live DOM nodes ",s.jsx("b",{className:"font-semibold text-foreground",ref:f,children:"0"})]}),s.jsxs("div",{children:["Render window ",s.jsx("b",{className:"font-semibold text-foreground",ref:m,children:"-"})]}),s.jsxs("div",{children:["Rebuild time ",s.jsx("b",{className:"font-semibold text-foreground",ref:A,children:"-"})]}),s.jsxs("div",{children:["JS heap ",s.jsx("b",{className:"font-semibold text-foreground",ref:x,children:"n/a"})]})]})]})}function Vt(){const t=l.useRef(null);return l.useEffect(()=>{const e=t.current;if(!e)return;const i=new Ie(e,{dataSource:Fe(3e7)});return i.scrollToIndex(14999990),()=>i.destroy()},[]),s.jsx("div",{ref:t,className:"hero-preview h-full",style:{maskImage:"linear-gradient(to bottom, transparent, black 14%, black 86%, transparent)"}})}function Gt(){const[t,e]=l.useState(60);return l.useEffect(()=>{let i=0,r=performance.now(),a=60,n=0,o=0;const c=()=>{o=performance.now()},h=f=>{const m=f-r;if(r=f,m>1&&m<250){f-o<1e3?a+=(1e3/m-a)*.08:a+=(60-a)*(1-Math.exp(-m/350));const A=Math.round(a);Math.abs(A-n)>=2&&(n=A,e(A))}i=requestAnimationFrame(h)};return i=requestAnimationFrame(h),window.addEventListener("wheel",c,{passive:!0}),window.addEventListener("touchmove",c,{passive:!0}),window.addEventListener("scroll",c,{passive:!0,capture:!0}),()=>{cancelAnimationFrame(i),window.removeEventListener("wheel",c),window.removeEventListener("touchmove",c),window.removeEventListener("scroll",c,{capture:!0})}},[]),s.jsxs("span",{className:"text-muted-foreground tabular-nums",children:[t," FPS"]})}function jt(){const[t,e]=l.useState(!1),[i,r]=l.useState(!1),[a,n]=l.useState(!1),o=l.useRef(null);l.useEffect(()=>{const f=setTimeout(()=>e(!0),300);return()=>clearTimeout(f)},[]),l.useEffect(()=>(document.body.style.overflow=i?"hidden":"",()=>{document.body.style.overflow=""}),[i]);const c=()=>{o.current&&clearTimeout(o.current),r(!0),requestAnimationFrame(()=>requestAnimationFrame(()=>n(!0)))},h=()=>{n(!1),o.current=setTimeout(()=>r(!1),600)};return s.jsxs("div",{className:"flex min-h-dvh flex-col bg-background text-foreground",children:[s.jsxs("main",{className:"flex-1 px-4 pt-4",children:[s.jsxs("section",{className:"relative mx-auto flex h-[calc(100dvh-2rem)] max-h-[960px] min-h-[600px] w-full max-w-[1400px] overflow-hidden rounded-2xl border border-border",children:[t?s.jsx(Rt,{className:"absolute inset-0",colors:["#e8e8e8","#c4c4c4","#9a9a9a20"],colorBack:"#00000000",softness:1,intensity:.9,noise:.5,speed:1,shape:"corners",minPixelRatio:1,maxPixelCount:1920*1080}):null,s.jsxs("div",{className:"z-[2] flex size-full flex-col p-6 md:p-12",children:[s.jsxs("nav",{className:"flex items-center gap-4 text-sm",children:[s.jsxs("span",{className:"font-semibold tracking-tight",children:["HyperScroll ",s.jsx("span",{className:"font-normal text-muted-foreground",children:"@hyperscroll/core"})]}),s.jsxs("span",{className:"ml-auto flex items-center gap-4 text-muted-foreground",children:[s.jsx("a",{href:"./docs.html",className:"hover:text-foreground",children:"Docs"}),s.jsx("a",{href:"./benchmark.html",className:"hover:text-foreground",children:"Benchmark"})]})]}),s.jsxs("div",{className:"grid min-h-0 flex-1 grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]",children:[s.jsxs("div",{children:[s.jsx("p",{className:"w-fit rounded-full border border-foreground/20 px-3 py-1.5 font-medium text-foreground/70 text-xs",children:"the virtualization engine for unbounded chat history."}),s.jsxs("h1",{className:"my-8 font-medium text-4xl leading-tighter tracking-tight xl:text-5xl",children:["Scroll thirty million",s.jsx("br",{}),"messages, at ",s.jsx(Gt,{}),"."]}),s.jsx("p",{className:"mb-8 max-w-md text-muted-foreground text-sm leading-6",children:"Zero-dependency, anchor-positioned, constant-memory. The list on the right is the real engine — scroll it."}),s.jsxs("div",{className:"flex w-fit flex-row flex-wrap items-center gap-4",children:[s.jsx("button",{type:"button",onClick:c,className:"inline-flex justify-center rounded-full bg-foreground px-5 py-3 font-medium text-background text-sm tracking-tight transition-colors hover:bg-foreground/85",children:"Open demo"}),s.jsx("a",{href:"./docs.html",className:"inline-flex justify-center rounded-full border border-border bg-background px-5 py-3 font-medium text-sm tracking-tight transition-colors hover:bg-muted/50",children:"Read the docs"})]})]}),s.jsx("div",{className:"hidden h-[72%] min-h-[380px] lg:block",children:s.jsx(Vt,{})})]})]})]}),s.jsx("div",{className:"mx-auto w-full max-w-[1400px] px-2 py-16 md:px-8 lg:py-24",children:s.jsxs("p",{className:"font-light text-2xl leading-snug tracking-tight md:text-3xl xl:text-4xl",children:["HyperScroll is a ",s.jsx("span",{className:"font-medium",children:"zero-dependency"})," virtualization engine for ",s.jsx("span",{className:"font-medium",children:"dynamic-height"})," content — chat logs, IM exports, log streams. It holds no item state, asks a"," ",s.jsx("span",{className:"font-medium",children:"data source"})," for HTML on demand, and renders datasets no offset-based virtualizer can reach."]})})]}),s.jsx("footer",{className:"mt-20 overflow-hidden",children:s.jsxs("div",{className:"mx-auto w-full max-w-[1400px] px-6 md:px-12",children:[s.jsxs("div",{className:"flex flex-col justify-between gap-10 border-border border-t py-12 md:flex-row",children:[s.jsxs("div",{className:"flex flex-col gap-2 text-sm",children:[s.jsx("span",{className:"font-semibold tracking-tight",children:"HyperScroll"}),s.jsx("span",{className:"text-muted-foreground text-xs",children:"Virtualization without a height ceiling."}),s.jsxs("span",{className:"mt-4 inline-flex items-center gap-1.5 font-mono text-muted-foreground text-xs",children:["© ",new Date().getFullYear(),s.jsx("svg",{"aria-hidden":!0,viewBox:"0 0 16 16",className:"size-3.5 fill-current",children:s.jsx("path",{d:"M8.75.75V2h.985c.304 0 .603.08.867.231l1.29.736c.038.022.08.033.124.033h2.234a.75.75 0 0 1 0 1.5h-.427l2.111 4.692a.75.75 0 0 1-.154.838l-.53-.53.529.531-.001.002-.002.002-.006.006-.006.005-.01.01-.045.04c-.21.176-.441.327-.686.45C14.556 10.78 13.88 11 13 11a4.5 4.5 0 0 1-2.023-.454 3.5 3.5 0 0 1-.686-.45l-.045-.04-.016-.015-.006-.006-.004-.004v-.001a.75.75 0 0 1-.154-.838L12.178 4.5h-.162c-.305 0-.604-.079-.868-.231l-1.29-.736a.245.245 0 0 0-.124-.033H8.75V13h2.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5h2.5V3.5h-.984a.245.245 0 0 0-.124.033l-1.289.737c-.265.15-.564.23-.869.23h-.162l2.112 4.692a.75.75 0 0 1-.154.838l-.53-.53.529.531-.001.002-.002.002-.006.006-.016.015-.045.04c-.21.176-.441.327-.686.45C4.556 10.78 3.88 11 3 11a4.5 4.5 0 0 1-2.023-.454 3.5 3.5 0 0 1-.686-.45l-.045-.04-.016-.015-.006-.006-.004-.004v-.001a.75.75 0 0 1-.154-.838L2.178 4.5H1.75a.75.75 0 0 1 0-1.5h2.234a.25.25 0 0 0 .125-.033l1.288-.737c.265-.15.564-.23.869-.23h.984V.75a.75.75 0 0 1 1.5 0Zm2.945 8.477c.285.135.718.273 1.305.273s1.02-.138 1.305-.273L13 6.327Zm-10 0c.285.135.718.273 1.305.273s1.02-.138 1.305-.273L3 6.327Z"})}),"MIT License"]})]}),s.jsxs("div",{className:"flex flex-wrap gap-10 text-sm md:gap-16",children:[s.jsxs("div",{className:"flex flex-col gap-2.5",children:[s.jsx("span",{className:"font-medium text-muted-foreground text-xs",children:"Docs"}),s.jsx("a",{href:"./docs.html#quick-start",className:"w-fit text-muted-foreground hover:text-foreground",children:"Quick start"}),s.jsx("a",{href:"./docs.html#anchor-model",className:"w-fit text-muted-foreground hover:text-foreground",children:"Anchor model"}),s.jsx("a",{href:"./docs.html#hyperscroll",className:"w-fit text-muted-foreground hover:text-foreground",children:"API reference"})]}),s.jsxs("div",{className:"flex flex-col gap-2.5",children:[s.jsx("span",{className:"font-medium text-muted-foreground text-xs",children:"Explore"}),s.jsx("button",{type:"button",onClick:c,className:"w-fit text-left text-muted-foreground hover:text-foreground",children:"Demo"}),s.jsx("a",{href:"./benchmark.html",className:"w-fit text-muted-foreground hover:text-foreground",children:"Benchmark"}),s.jsx("a",{href:"./docs.html#searchscanner",className:"w-fit text-muted-foreground hover:text-foreground",children:"SearchScanner"})]}),s.jsxs("div",{className:"flex flex-col gap-2.5",children:[s.jsx("span",{className:"font-medium text-muted-foreground text-xs",children:"Package"}),s.jsx("span",{className:"font-mono text-muted-foreground text-xs",children:"npm i @hyperscroll/core"}),s.jsx("span",{className:"font-mono text-muted-foreground text-xs",children:"v0.1.0"})]})]})]}),s.jsx("div",{"aria-hidden":!0,className:"-mb-[0.28em] select-none bg-gradient-to-b from-foreground/[0.14] to-foreground/0 bg-clip-text text-center font-semibold text-[clamp(4rem,13vw,11.5rem)] text-transparent leading-none tracking-tighter",children:"HyperScroll"})]})}),i?s.jsxs("div",{className:"fixed inset-0 z-50 transition-opacity duration-600 ease-[cubic-bezier(0.16,1,0.3,1)]",style:{opacity:a?1:0},children:[s.jsx("div",{className:"absolute inset-0 bg-gradient-to-b from-background/60 to-background transition-[backdrop-filter] duration-600 ease-[cubic-bezier(0.16,1,0.3,1)]",style:{backdropFilter:a?"blur(24px)":"blur(0px)"}}),s.jsx("div",{className:"absolute inset-0 bg-background",children:s.jsx(Tt,{onHome:h})})]}):null]})}const De=document.getElementById("root");if(!De)throw new Error("missing #root");je.createRoot(De).render(s.jsx(ze.StrictMode,{children:s.jsx(jt,{})}));
