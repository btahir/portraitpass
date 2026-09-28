import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import { PDFArray, PDFDocument, PDFRawStream } from 'pdf-lib';
import { inflateSync } from 'node:zlib';
import { geometryImage } from './helpers';

test.use({ baseURL: 'http://127.0.0.1:4320' });

test('browser exports have independent expected image and physical PDF sizes', async ({ page }) => {
  await page.goto('/');
  const base64 = (await geometryImage()).toString('base64');
  const outputs = await page.evaluate(async ({ base64 }) => {
    const enginePath = '/src/browser/engine.ts', corePath = '/src/core/index.ts';
    const engine = await import(/* @vite-ignore */ enginePath);
    const core = await import(/* @vite-ignore */ corePath);
    if (core.getPreset('us-passport').headMaxMm !== 34.925) throw new Error('US maximum must follow explicit 1 3/8 inch source requirement');
    const input = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const photo = await engine.loadPhoto(new File([input], 'geometry.png', { type: 'image/png' }));
    const results = [];
    for (const id of ['us-passport', 'uk-passport', 'au-passport', 'general-id']) {
      const preset = core.getPreset(id), crop = core.defaultCrop(photo.width, photo.height, preset);
      for (const format of ['png', 'jpeg', 'pdf']) {
        const result = await engine.exportPhoto(photo, preset, crop, { format });
        results.push({ id, format, bytes: Array.from(new Uint8Array(await result.blob.arrayBuffer())) });
      }
    }
    for (const presetId of ['us-passport', 'uk-passport', 'au-passport', 'general-id']) for (const paperId of ['4x6', 'a4', 'letter']) {
      const preset = core.getPreset(presetId), crop = core.defaultCrop(photo.width, photo.height, preset);
      const result = await engine.exportPhoto(photo, preset, crop, { format: 'pdf', sheet: true, paperId });
      results.push({ id: `${presetId}:${paperId}`, format: 'pdf', bytes: Array.from(new Uint8Array(await result.blob.arrayBuffer())) });
    }
    engine.releasePhoto(photo);
    return results;
  }, { base64 });
  const mm: Record<string, number[]> = { 'us-passport': [50.8, 50.8], 'uk-passport': [35, 45], 'au-passport': [35, 45], 'general-id': [35, 45], '4x6': [101.6, 152.4], a4: [210, 297], letter: [215.9, 279.4] };
  for (const output of outputs) {
    const [presetId,paperId]=output.id.split(':');
    const bytes = Buffer.from(output.bytes), size = mm[paperId??presetId];
    if (output.format === 'pdf') {
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount()).toBe(1);
      expect(doc.getPage(0).getWidth()).toBeCloseTo(size[0] * 72 / 25.4, 4);
      expect(doc.getPage(0).getHeight()).toBeCloseTo(size[1] * 72 / 25.4, 4);
      const page=doc.getPage(0),streams=page.node.Contents();let content='';
      const streamEntries=streams instanceof PDFArray?streams.asArray():streams?[streams]:[];
      for(const entry of streamEntries){const stream=doc.context.lookup(entry) as PDFRawStream;content+=inflateSync(stream.getContents()).toString();}
      type Matrix=[number,number,number,number,number,number];
      let matrix:Matrix=[1,0,0,1,0,0];const stack:Matrix[]=[],images:Matrix[]=[];
      for(const line of content.split('\n')){
        if(line==='q')stack.push([...matrix]);else if(line==='Q')matrix=stack.pop()??[1,0,0,1,0,0];
        else if(line.endsWith(' cm')){const [a,b,c,d,e,f]=line.split(' ').map(Number);const [A,B,C,D,E,F]=matrix;matrix=[A*a+C*b,B*a+D*b,A*c+C*d,B*c+D*d,A*e+C*f+E,B*e+D*f+F];}
        else if(line.endsWith(' Do'))images.push([...matrix]);
      }
      const sheetCount:Record<string,number>=presetId==='us-passport'?{'4x6':2,a4:15,letter:15}:{'4x6':6,a4:30,letter:25};
      expect(images.length).toBe(paperId?sheetCount[paperId]:1);
      const photoMm=mm[presetId];
      for(const [i,m]of images.entries()){
        expect(m[1]).toBe(0);expect(m[2]).toBe(0);
        expect(m[0]).toBeCloseTo(photoMm[0]*72/25.4,4);expect(m[3]).toBeCloseTo(photoMm[1]*72/25.4,4);
        expect(m[4]).toBeGreaterThanOrEqual(-.001);expect(m[5]).toBeGreaterThanOrEqual(-.001);
        expect(m[4]+m[0]).toBeLessThanOrEqual(page.getWidth()+.001);expect(m[5]+m[3]).toBeLessThanOrEqual(page.getHeight()+.001);
        for(const n of images.slice(i+1))expect(m[4]+m[0]<=n[4]||n[4]+n[0]<=m[4]||m[5]+m[3]<=n[5]||n[5]+n[3]<=m[5]).toBe(true);
      }

    } else {
      const metadata = await sharp(bytes).metadata();
      expect(metadata.width).toBe(Math.round(size[0] * 300 / 25.4));
      expect(metadata.height).toBe(Math.round(size[1] * 300 / 25.4));
      expect(metadata.density).toBe(300);
      expect(metadata.format).toBe(output.format);
      if(output.format==='png'){let densityChunks=0;for(let offset=8;offset+12<=bytes.length;){const length=bytes.readUInt32BE(offset);if(bytes.toString('ascii',offset+4,offset+8)==='pHYs')densityChunks++;offset+=length+12;}expect(densityChunks).toBe(1);}
    }
  }
});

test('digital originals preserve bytes and browser rejects low-resolution print exports', async ({ page }) => {
  await page.goto('/');
  const original = Buffer.concat([await geometryImage('png', 800, 1000), Buffer.alloc(60_000)]);
  const result = await page.evaluate(async (base64) => {
    const enginePath = '/src/browser/engine.ts', corePath = '/src/core/index.ts';
    const engine = await import(/* @vite-ignore */ enginePath), core = await import(/* @vite-ignore */ corePath);
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const photo = await engine.loadPhoto(new File([bytes], 'original.png', { type: 'image/png' }));
    const results = [];
    for (const id of ['us-online', 'uk-online']) {
      const preset = core.getPreset(id);
      const result = await engine.exportPhoto(photo, preset, { x: 100, y: 100, width: 600, height: 700 }, { format: 'png' });
      results.push(Array.from(new Uint8Array(await result.blob.arrayBuffer())));
    }
    let lowResolutionError = '';
    try { await engine.exportPhoto(photo, core.getPreset('us-passport'), { x: 0, y: 0, width: 200, height: 200 }, { format: 'png' }); }
    catch (e) { lowResolutionError = String(e); }
    engine.releasePhoto(photo);
    return { results, lowResolutionError };
  }, original.toString('base64'));
  for (const bytes of result.results) expect(Buffer.from(bytes).equals(original)).toBe(true);
  expect(result.lowResolutionError).toMatch(/upscale|source pixels|resolution/i);
});

test('portable browser project round trip preserves source/crop and rejects forged source dimensions', async ({ page }) => {
  await page.goto('/');
  const base64 = (await geometryImage()).toString('base64');
  const result = await page.evaluate(async (base64) => {
    const enginePath = '/src/browser/engine.ts', corePath = '/src/core/index.ts';
    const engine = await import(/* @vite-ignore */ enginePath), core = await import(/* @vite-ignore */ corePath);
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const photo = await engine.loadPhoto(new File([bytes], 'geometry.png', { type: 'image/png' }));
    const preset = core.getPreset('uk-passport'), crop = { x: 200, y: 100, width: 1050, height: 1350 };
    const saved = await engine.saveProject(photo, preset, crop, { paperId: 'a4', format: 'png' });
    const project = JSON.parse(await saved.text());
    const opened = await engine.openProject(new File([saved], 'project.json', { type: 'application/json' }));
    const restoredSource = Array.from(new Uint8Array(await opened.photo.file.arrayBuffer()));
    project.source.width += 10;
    let error = '';
    try { await engine.openProject(new File([JSON.stringify(project)], 'forged.json', { type: 'application/json' })); }
    catch (e) { error = String(e); }
    engine.releasePhoto(photo); engine.releasePhoto(opened.photo);
    return { crop: opened.crop, paperId: opened.paperId, format: opened.format, restoredSource, error };
  }, base64);
  expect(result.crop).toEqual({ x: 200, y: 100, width: 1050, height: 1350 });
  expect(result.paperId).toBe('a4');
  expect(result.format).toBe('png');
  expect(Buffer.from(result.restoredSource).toString('base64')).toBe(base64);
  expect(result.error).toMatch(/dimensions.*match|match.*photo/i);
});

test('saved alpha mask handoff matches Node and cannot affect passport exports', async ({ page }) => {
  await page.goto('/');
  const bytes = await sharp({ create: { width: 1200, height: 1200, channels: 3, background: '#214e72' } }).png().toBuffer();
  const mask = await sharp({ create: { width: 1200, height: 1200, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } } })
    .composite([{ input: Buffer.from('<svg width="1200" height="1200"><rect x="600" y="0" width="600" height="1200" fill="white"/></svg>') }]).png().toBuffer();
  const project = {
    version: 1, presetId: 'general-id', dpi: 300, paperId: '4x6', format: 'png',
    source: { name: 'mask-fixture.png', mime: 'image/png', width: 1200, height: 1200, dataUrl: `data:image/png;base64,${bytes.toString('base64')}` },
    crop: { x: 0, y: 0, width: 1200, height: 1200 }, customSize: { widthMm: 50.8, heightMm: 50.8 },
    background: { enabled: true, color: '#ff0000', tolerance: 24, maskDataUrl: `data:image/png;base64,${mask.toString('base64')}` },
  };
  const browserOutput = await page.evaluate(async (project) => {
    const enginePath = '/src/browser/engine.ts', corePath = '/src/core/index.ts';
    const engine = await import(/* @vite-ignore */ enginePath), core = await import(/* @vite-ignore */ corePath);
    const opened = await engine.openProject(new File([JSON.stringify(project)], 'masked.json', { type: 'application/json' }));
    const preset = core.projectPreset(project);
    const output = await engine.exportPhoto(opened.photo, preset, opened.crop, { format: 'png', background: opened.background });
    const passport = await engine.exportPhoto(opened.photo, core.getPreset('us-passport'), opened.crop, { format: 'png' });
    const saved = JSON.parse(await (await engine.saveProject(opened.photo, preset, opened.crop, { background: opened.background })).text());
    engine.releasePhoto(opened.photo);
    return {
      output: Array.from(new Uint8Array(await output.blob.arrayBuffer())),
      passport: Array.from(new Uint8Array(await passport.blob.arrayBuffer())),
      savedMask: saved.background.maskDataUrl,
    };
  }, project);
  const { renderBuffer } = await import('../../src/node/operations');
  const { parseProject } = await import('../../src/core/project');
  const nodeOutput = await renderBuffer(bytes, parseProject(JSON.stringify(project)));
  for (const image of [Buffer.from(browserOutput.output), nodeOutput.bytes]) {
    const { data, info } = await sharp(image).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const rgbAt = (x: number, y: number) => [...data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3)];
    expect(rgbAt(50, 300)).toEqual([255, 0, 0]);
    expect(rgbAt(550, 300)).toEqual([33, 78, 114]);
  }
  const unedited = await sharp(Buffer.from(browserOutput.passport)).removeAlpha().raw().toBuffer();
  expect([...unedited.subarray(0, 3)]).toEqual([33, 78, 114]);
  expect(browserOutput.savedMask).toMatch(/^data:image\/png;base64,/);
});

test('fractional crop raster adapters differ by less than one source pixel', async ({ page }) => {
  await page.goto('/');
  const bytes = await sharp({ create: { width: 1600, height: 2000, channels: 3, background: '#000000' } })
    .composite([{ input: Buffer.from('<svg width="1600" height="2000"><rect x="800" y="0" width="800" height="2000" fill="white"/></svg>') }]).png().toBuffer();
  const project = {
    version: 1, presetId: 'uk-passport', dpi: 300, paperId: '4x6', format: 'png',
    source: { name: 'edge.png', mime: 'image/png', width: 1600, height: 2000, dataUrl: `data:image/png;base64,${bytes.toString('base64')}` },
    crop: { x: 100.4, y: 50.2, width: 1400.2, height: 1400.2 * 45 / 35 },
    background: { enabled: false, color: '#ffffff', tolerance: 24 },
  };
  const browser = await page.evaluate(async project => {
    const enginePath='/src/browser/engine.ts',corePath='/src/core/index.ts';
    const engine=await import(/* @vite-ignore */enginePath),core=await import(/* @vite-ignore */corePath);
    const loaded=await engine.openProject(new File([JSON.stringify(project)],'edge.json',{type:'application/json'}));
    const out=await engine.exportPhoto(loaded.photo,core.getPreset('uk-passport'),loaded.crop,{format:'png'});
    engine.releasePhoto(loaded.photo);return Array.from(new Uint8Array(await out.blob.arrayBuffer()));
  }, project);
  const {renderBuffer}=await import('../../src/node/operations');
  const {parseProject}=await import('../../src/core/project');
  const node=await renderBuffer(bytes,parseProject(JSON.stringify(project)));
  async function edgeCentroid(image:Buffer){
    const {data,info}=await sharp(image).removeAlpha().raw().toBuffer({resolveWithObject:true});
    let weighted=0,total=0;const y=Math.floor(info.height/2);
    for(let x=1;x<info.width;x++){const gradient=Math.max(0,data[(y*info.width+x)*3]-data[(y*info.width+x-1)*3]);weighted+=(x-.5)*gradient;total+=gradient;}
    return weighted/total;
  }
  const browserEdge=await edgeCentroid(Buffer.from(browser)),nodeEdge=await edgeCentroid(node.bytes);
  const sourceDrift=Math.abs(browserEdge-nodeEdge)*project.crop.width/413;
  console.log('RASTER_ADAPTER_DRIFT',JSON.stringify({browserEdge,nodeEdge,sourceDrift}));
  expect(sourceDrift).toBeLessThan(1);
});

test('transparent PNG passport print is rejected while general ID flattens white consistently', async ({ page }) => {
  await page.goto('/');
  const source=await sharp({create:{width:1200,height:1200,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).png().toBuffer();
  const result=await page.evaluate(async base64=>{
    const enginePath='/src/browser/engine.ts',corePath='/src/core/index.ts';
    const engine=await import(/* @vite-ignore */enginePath),core=await import(/* @vite-ignore */corePath);
    const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
    const photo=await engine.loadPhoto(new File([bytes],'transparent.png',{type:'image/png'}));
    const crop={x:0,y:0,width:1200,height:1200};let error='';
    try{await engine.exportPhoto(photo,core.getPreset('us-passport'),crop,{format:'png'});}catch(e){error=String(e);}
    const general={...core.getPreset('general-id'),widthMm:50.8,heightMm:50.8};
    const out=await engine.exportPhoto(photo,general,crop,{format:'png'});
    engine.releasePhoto(photo);return{error,bytes:Array.from(new Uint8Array(await out.blob.arrayBuffer()))};
  },source.toString('base64'));
  expect(result.error).toMatch(/transparen|opaque/i);
  const rgb=await sharp(Buffer.from(result.bytes)).removeAlpha().raw().toBuffer();
  expect([...rgb.subarray(0,3)]).toEqual([255,255,255]);
});

test('browser preflight rejects spoofed, animated and oversized containers before decode', async ({ page }) => {
  await page.goto('/');
  const source=await geometryImage('png', 100, 100);
  const oversized=Buffer.from(source);oversized.writeUInt32BE(10000,16);oversized.writeUInt32BE(10000,20);
  const actl=Buffer.alloc(20);actl.writeUInt32BE(8,0);actl.write('acTL',4);actl.writeUInt32BE(2,8);
  const animated=Buffer.concat([source.subarray(0,33),actl,source.subarray(33)]);
  const errors=await page.evaluate(async fixtures=>{
    const path='/src/browser/engine.ts',engine=await import(/* @vite-ignore */path);
    let decodes=0;const decode=HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode=function(){decodes++;return decode.call(this);};
    const errors=[];
    for(const fixture of fixtures){try{await engine.loadPhoto(new File([Uint8Array.from(atob(fixture.bytes),c=>c.charCodeAt(0))],fixture.name,{type:fixture.mime}));errors.push('accepted');}catch(e){errors.push(String(e));}}
    try{await engine.loadPhoto(new File([new Uint8Array(20*1024*1024+1)],'huge.png',{type:'image/png'}));errors.push('accepted');}catch(e){errors.push(String(e));}
    HTMLImageElement.prototype.decode=decode;return{errors,decodes};
  },[{bytes:source.toString('base64'),name:'renamed.jpg',mime:'image/jpeg'},{bytes:animated.toString('base64'),name:'animated.png',mime:'image/png'},{bytes:oversized.toString('base64'),name:'huge-pixels.png',mime:'image/png'}]);
  expect(errors.decodes).toBe(0);
  expect(errors.errors[0]).toMatch(/contents.*match/);
  expect(errors.errors[1]).toMatch(/animated PNG/);
  expect(errors.errors[2]).toMatch(/40 megapixels/);
  expect(errors.errors[3]).toMatch(/20 MB/);
});
