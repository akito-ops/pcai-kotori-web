const DEFAULT_PARAM_IDS = Object.freeze({
  eyeL: 'ParamEyeLOpen',
  eyeR: 'ParamEyeROpen',
  mouth: 'ParamMouthOpenY',
  breath: 'ParamBreath'
});

function clamp(value, min, max){ return Math.min(max, Math.max(min, value)); }

function compileShader(gl, type, source){
  const shader=gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
    const message=gl.getShaderInfoLog(shader)||'shader compile failed';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl){
  const vertexSource=`
    attribute vec2 a_position;
    attribute vec2 a_uv;
    uniform vec4 u_transform;
    varying vec2 v_uv;
    void main(){
      gl_Position=vec4(
        a_position.x*u_transform.x+u_transform.z,
        a_position.y*u_transform.y+u_transform.w,
        0.0,
        1.0
      );
      v_uv=vec2(a_uv.x,1.0-a_uv.y);
    }
  `;
  const fragmentSource=`
    precision mediump float;
    varying vec2 v_uv;
    uniform sampler2D u_texture;
    uniform vec4 u_baseColor;
    uniform vec4 u_multiplyColor;
    uniform vec4 u_screenColor;
    void main(){
      vec4 tex=texture2D(u_texture,v_uv);
      tex.rgb*=u_multiplyColor.rgb;
      tex.rgb=(tex.rgb+u_screenColor.rgb*tex.a)-(tex.rgb*u_screenColor.rgb);
      gl_FragColor=tex*u_baseColor;
    }
  `;
  const vs=compileShader(gl,gl.VERTEX_SHADER,vertexSource);
  const fs=compileShader(gl,gl.FRAGMENT_SHADER,fragmentSource);
  const program=gl.createProgram();
  gl.attachShader(program,vs); gl.attachShader(program,fs); gl.linkProgram(program);
  gl.deleteShader(vs); gl.deleteShader(fs);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
    const message=gl.getProgramInfoLog(program)||'program link failed';
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

async function fetchArrayBuffer(url, fetchImpl){
  const response=await fetchImpl(url,{cache:'no-store'});
  if(!response.ok) throw new Error(`Live2D asset load failed: ${response.status} ${url}`);
  return response.arrayBuffer();
}

function loadImage(url, ImageCtor=Image){
  return new Promise((resolve,reject)=>{
    const image=new ImageCtor();
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(new Error(`Live2D texture load failed: ${url}`));
    image.src=url;
  });
}

function createTexture(gl,image){
  const texture=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,1);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
  gl.bindTexture(gl.TEXTURE_2D,null);
  return texture;
}

function buildDrawResources(gl,model){
  const d=model.drawables;
  return Array.from({length:d.count},(_,index)=>{
    const position=gl.createBuffer();
    const uv=gl.createBuffer();
    const indices=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,uv);
    gl.bufferData(gl.ARRAY_BUFFER,d.vertexUvs[index],gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,d.indices[index],gl.STATIC_DRAW);
    return {index,position,uv,indices};
  });
}

function parameterIndexMap(model, ids=DEFAULT_PARAM_IDS){
  const map={};
  for(const [key,id] of Object.entries(ids)) map[key]=model.parameters.ids.indexOf(id);
  return Object.freeze(map);
}

function computeCoverTransform(model,canvas){
  const info=model.canvasinfo;
  const ppu=info.PixelsPerUnit||1;
  const modelWidth=info.CanvasWidth/ppu;
  const modelHeight=info.CanvasHeight/ppu;
  const cssWidth=Math.max(1,canvas.clientWidth||canvas.width||1);
  const cssHeight=Math.max(1,canvas.clientHeight||canvas.height||1);
  const pxPerUnit=Math.max(cssWidth/modelWidth,cssHeight/modelHeight);
  const sx=2*pxPerUnit/cssWidth;
  const sy=2*pxPerUnit/cssHeight;
  const left=-info.CanvasOriginX/ppu;
  const right=(info.CanvasWidth-info.CanvasOriginX)/ppu;
  const top=info.CanvasOriginY/ppu;
  const centerX=(left+right)*0.5;
  return new Float32Array([sx,sy,-centerX*sx,1-top*sy]);
}

function resizeCanvas(gl,canvas){
  const dpr=Math.min(2,globalThis.devicePixelRatio||1);
  const width=Math.max(1,Math.round((canvas.clientWidth||canvas.width||1)*dpr));
  const height=Math.max(1,Math.round((canvas.clientHeight||canvas.height||1)*dpr));
  if(canvas.width!==width||canvas.height!==height){ canvas.width=width; canvas.height=height; }
  gl.viewport(0,0,width,height);
}

export async function createCoreDirectRenderer({
  canvas,
  manifest,
  modelBaseUrl='./assets/live2d/kotori/',
  core=globalThis.Live2DCubismCore,
  fetchImpl=fetch,
  ImageCtor=Image,
  requestFrame=globalThis.requestAnimationFrame?.bind(globalThis)
}={}){
  if(!canvas) throw new Error('Live2D canvas is required');
  if(!core?.Moc||!core?.Model) throw new Error('Live2D Cubism Core is not ready');
  if(!manifest?.FileReferences?.Moc||!manifest?.FileReferences?.Textures?.[0]) throw new Error('Live2D manifest is incomplete');

  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true})||canvas.getContext('experimental-webgl');
  if(!gl) throw new Error('WebGL is unavailable');

  const mocBuffer=await fetchArrayBuffer(new URL(manifest.FileReferences.Moc,modelBaseUrl),fetchImpl);
  const moc=core.Moc.fromArrayBuffer(mocBuffer);
  if(!moc) throw new Error('Live2D Moc load failed');
  const model=core.Model.fromMoc(moc);
  if(!model){ moc._release(); throw new Error('Live2D model creation failed'); }
  model.update();

  const image=await loadImage(new URL(manifest.FileReferences.Textures[0],modelBaseUrl),ImageCtor);
  const texture=createTexture(gl,image);
  const program=createProgram(gl);
  const resources=buildDrawResources(gl,model);
  const paramIndex=parameterIndexMap(model);
  const renderOrder=Array.from(model.getRenderOrders(),(order,index)=>({index,order})).sort((a,b)=>a.order-b.order);

  const loc={
    position:gl.getAttribLocation(program,'a_position'),
    uv:gl.getAttribLocation(program,'a_uv'),
    transform:gl.getUniformLocation(program,'u_transform'),
    texture:gl.getUniformLocation(program,'u_texture'),
    baseColor:gl.getUniformLocation(program,'u_baseColor'),
    multiplyColor:gl.getUniformLocation(program,'u_multiplyColor'),
    screenColor:gl.getUniformLocation(program,'u_screenColor')
  };

  gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.ONE,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);

  let running=false, frameId=0, startedAt=0, speaking=false, mouthOverride=null;
  let lastBlinkAt=0, nextBlinkAt=2.6;

  function setParam(index,value){
    if(index<0) return;
    const p=model.parameters;
    p.values[index]=clamp(value,p.minimumValues[index],p.maximumValues[index]);
  }

  function updateAnimation(seconds){
    const local=seconds-startedAt;
    setParam(paramIndex.breath,0.5+0.5*Math.sin(local*1.35));

    if(local>=nextBlinkAt){ lastBlinkAt=local; nextBlinkAt=local+3.2+((Math.sin(local*7.31)+1)*0.9); }
    const blinkAge=local-lastBlinkAt;
    let eye=1;
    if(blinkAge>=0&&blinkAge<0.18) eye=blinkAge<0.09?1-(blinkAge/0.09):(blinkAge-0.09)/0.09;
    setParam(paramIndex.eyeL,eye); setParam(paramIndex.eyeR,eye);

    const mouth=mouthOverride==null?(speaking?0.18+0.62*Math.abs(Math.sin(local*11.5)):0):mouthOverride;
    setParam(paramIndex.mouth,mouth);
    model.update();
  }

  function renderFrame(timestampMs=0){
    if(!running) return;
    const seconds=timestampMs/1000;
    if(startedAt===0) startedAt=seconds;
    resizeCanvas(gl,canvas);
    updateAnimation(seconds);

    gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,texture); gl.uniform1i(loc.texture,0);
    gl.uniform4fv(loc.transform,computeCoverTransform(model,canvas));
    const d=model.drawables;
    for(const {index} of renderOrder){
      if(!core.Utils.hasIsVisibleBit(d.dynamicFlags[index])||d.opacities[index]<=0.001) continue;
      const r=resources[index];
      gl.bindBuffer(gl.ARRAY_BUFFER,r.position);
      gl.bufferData(gl.ARRAY_BUFFER,d.vertexPositions[index],gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(loc.position); gl.vertexAttribPointer(loc.position,2,gl.FLOAT,false,0,0);
      gl.bindBuffer(gl.ARRAY_BUFFER,r.uv);
      gl.enableVertexAttribArray(loc.uv); gl.vertexAttribPointer(loc.uv,2,gl.FLOAT,false,0,0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,r.indices);
      const m=d.multiplyColors, s=d.screenColors, ci=index*4;
      gl.uniform4f(loc.baseColor,1,1,1,d.opacities[index]);
      gl.uniform4f(loc.multiplyColor,m[ci]??1,m[ci+1]??1,m[ci+2]??1,m[ci+3]??1);
      gl.uniform4f(loc.screenColor,s[ci]??0,s[ci+1]??0,s[ci+2]??0,s[ci+3]??0);
      gl.drawElements(gl.TRIANGLES,d.indexCounts[index],gl.UNSIGNED_SHORT,0);
    }
    d.resetDynamicFlags();
    if(requestFrame) frameId=requestFrame(renderFrame);
  }

  function start(){ if(running) return; running=true; startedAt=0; lastBlinkAt=0; nextBlinkAt=2.6; if(requestFrame) frameId=requestFrame(renderFrame); else renderFrame(0); }
  function stop(){ running=false; if(frameId&&globalThis.cancelAnimationFrame) globalThis.cancelAnimationFrame(frameId); frameId=0; }
  function destroy(){ stop(); resources.forEach(r=>{gl.deleteBuffer(r.position);gl.deleteBuffer(r.uv);gl.deleteBuffer(r.indices);}); gl.deleteTexture(texture); gl.deleteProgram(program); model.release(); moc._release(); }

  return Object.freeze({
    start,stop,destroy,
    startSpeaking(){ speaking=true; mouthOverride=null; },
    stopSpeaking(){ speaking=false; mouthOverride=null; setParam(paramIndex.mouth,0); },
    setMouthOpenY(value){ mouthOverride=value==null?null:clamp(Number(value)||0,0,1); },
    inspect(){ return Object.freeze({running,speaking,parameters:{...paramIndex},drawableCount:model.drawables.count,maskCount:Array.from(model.drawables.maskCounts).reduce((a,b)=>a+b,0)}); }
  });
}
