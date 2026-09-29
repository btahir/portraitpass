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
    // Default sheet layout: edge-to-edge on 4x6, cut marks on A4/Letter; orientation auto (more photos wins, ties portrait).
    const sheetInfo:Record<string,{count:number;landscape:boolean}>=presetId==='us-passport'?{'4x6':{count:6,landscape:false},a4:{count:15,landscape:false},letter:{count:15,landscape:false}}:{'4x6':{count:8,landscape:true},a4:{count:30,landscape:false},letter:{count:28,landscape:true}};
    const paper=paperId?sheetInfo[paperId]:undefined;
    const base=mm[paperId??presetId];
    const bytes = Buffer.from(output.bytes), size = paper?.landscape?[base[1],base[0]]:base;
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
      expect(images.length).toBe(paper?paper.count:1);
      const photoMm=mm[presetId];
      for(const [i,m]of images.entries()){
        expect(m[1]).toBe(0);expect(m[2]).toBe(0);
        expect(m[0]).toBeCloseTo(photoMm[0]*72/25.4,4);expect(m[3]).toBeCloseTo(photoMm[1]*72/25.4,4);
        expect(m[4]).toBeGreaterThanOrEqual(-.001);expect(m[5]).toBeGreaterThanOrEqual(-.001);
        expect(m[4]+m[0]).toBeLessThanOrEqual(page.getWidth()+.001);expect(m[5]+m[3]).toBeLessThanOrEqual(page.getHeight()+.001);
        for(const n of images.slice(i+1))expect(m[4]+m[0]<=n[4]+.001||n[4]+n[0]<=m[4]+.001||m[5]+m[3]<=n[5]+.001||n[5]+n[3]<=m[5]+.001).toBe(true);
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

/** Half-transparent mask fixture: right half of a 1200 px square is kept, the left half is background. */
async function maskFixture() {
  const bytes = await sharp({ create: { width: 1200, height: 1200, channels: 3, background: '#214e72' } }).png().toBuffer();
  const mask = await sharp({ create: { width: 1200, height: 1200, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } } })
    .composite([{ input: Buffer.from('<svg width="1200" height="1200"><rect x="600" y="0" width="600" height="1200" fill="white"/></svg>') }]).png().toBuffer();
  return { bytes, mask };
}
function backgroundProject(presetId: string, bytes: Buffer, mask: Buffer, background = true) {
  return {
    version: 1, presetId, dpi: 300, paperId: '4x6', format: 'png',
    source: { name: 'mask-fixture.png', mime: 'image/png', width: 1200, height: 1200, dataUrl: `data:image/png;base64,${bytes.toString('base64')}` },
    crop: { x: 100, y: 0, width: 1200 * 35 / 45, height: 1200 },
    background: { enabled: background, color: '#ff0000', tolerance: 24, maskDataUrl: `data:image/png;base64,${mask.toString('base64')}` },
  };
}

test('background replacement works on print presets, is noted in every format, and never touches originals', async ({ page }) => {
  await page.goto('/');
  const { bytes, mask } = await maskFixture();
  const project = backgroundProject('uk-passport', bytes, mask);
  const original = Buffer.concat([await geometryImage('png', 800, 1000), Buffer.alloc(60_000)]);
  const result = await page.evaluate(async ({ project, original }) => {
    const enginePath = '/src/browser/engine.ts', corePath = '/src/core/index.ts';
    const engine = await import(/* @vite-ignore */ enginePath), core = await import(/* @vite-ignore */ corePath);
    const opened = await engine.openProject(new File([JSON.stringify(project)], 'bg.json', { type: 'application/json' }));
    const preset = core.getPreset('uk-passport');
    const outputs: Record<string, number[]> = {};
    for (const format of ['png', 'jpeg', 'pdf']) {
      const withBackground = await engine.exportPhoto(opened.photo, preset, opened.crop, { format, background: opened.background });
      const plain = await engine.exportPhoto(opened.photo, preset, opened.crop, { format });
      outputs[`${format}:edited`] = Array.from(new Uint8Array(await withBackground.blob.arrayBuffer()));
      outputs[`${format}:plain`] = Array.from(new Uint8Array(await plain.blob.arrayBuffer()));
    }
    engine.releasePhoto(opened.photo);
    // Digital originals ignore a background option and stay byte-identical.
    const photo = await engine.loadPhoto(new File([Uint8Array.from(atob(original), c => c.charCodeAt(0))], 'original.png', { type: 'image/png' }));
    const kept = await engine.exportPhoto(photo, core.getPreset('uk-online'), { x: 0, y: 0, width: 800, height: 1000 }, { format: 'png', background: '#ff0000' });
    outputs.original = Array.from(new Uint8Array(await kept.blob.arrayBuffer()));
    engine.releasePhoto(photo);
    return outputs;
  }, { project, original: original.toString('base64') });
  const note = 'Background replaced with PortraitPass';
  const get = (key: string) => Buffer.from(result[key]);
  // PNG: tEXt Description chunk, still exactly one pHYs, and the mask really recoloured the left half.
  const chunks = (b: Buffer) => { const found: string[] = []; for (let o = 8; o + 12 <= b.length; o += b.readUInt32BE(o) + 12) found.push(b.toString('ascii', o + 4, o + 8)); return found; };
  expect(chunks(get('png:edited')).filter(c => c === 'pHYs')).toHaveLength(1);
  expect(chunks(get('png:edited'))).toContain('tEXt');
  expect(get('png:edited').includes(Buffer.from(`Description\0${note}`))).toBe(true);
  const png = await sharp(get('png:edited')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const at = (x: number, y: number) => [...png.data.subarray((y * png.info.width + x) * 3, (y * png.info.width + x) * 3 + 3)];
  expect(png.info.width).toBe(413);
  expect(at(40, 200)).toEqual([255, 0, 0]);
  expect(at(380, 200)).toEqual([33, 78, 114]);
  expect((await sharp(get('png:edited')).metadata()).density).toBe(300);
  // JPEG: XMP APP1 segment carries the note and JFIF density is intact.
  const jpegMeta = await sharp(get('jpeg:edited')).metadata();
  expect(jpegMeta.density).toBe(300);
  expect(jpegMeta.xmp?.toString('utf8')).toContain(note);
  // PDF: metadata only, with the independent-tool line in the creator.
  const doc = await PDFDocument.load(get('pdf:edited'));
  expect(doc.getCreator()).toContain('not affiliated with any government');
  expect(doc.getSubject()).toContain(note);
  expect(doc.getKeywords()).toContain(note);
  // Unedited outputs carry no background note; PDFs still name the tool.
  for (const format of ['png', 'jpeg']) expect(get(`${format}:plain`).includes(Buffer.from(note))).toBe(false);
  const plainPdf = await PDFDocument.load(get('pdf:plain'));
  expect(plainPdf.getCreator()).toContain('independent open-source tool');
  expect(plainPdf.getSubject() ?? '').not.toContain(note);
  expect(get('original').equals(original)).toBe(true);
});

test('project masks are size-checked from the PNG header before any decode and failures release the photo URL', async ({ page }) => {
  await page.goto('/');
  const { bytes, mask } = await maskFixture();
  const small = await sharp({ create: { width: 600, height: 600, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } }).png().toBuffer();
  const forged = Buffer.from(mask); forged.writeUInt32BE(20000, 16); forged.writeUInt32BE(20000, 20);
  // Chrome decodes a merely truncated PNG as a partial image, so corrupt the pixel data after the intact header instead.
  const truncated = Buffer.from(mask); for (let i = 40; i < truncated.length - 20; i++) truncated[i] ^= 0x5a;
  const result = await page.evaluate(async ({ projectBase, fixtures }) => {
    const enginePath = '/src/browser/engine.ts', engine = await import(/* @vite-ignore */ enginePath);
    let decodes = 0, created = 0, revoked = 0;
    const decode = HTMLImageElement.prototype.decode, create = URL.createObjectURL, revoke = URL.revokeObjectURL;
    HTMLImageElement.prototype.decode = function () { decodes++; return decode.call(this); };
    URL.createObjectURL = (o: Blob | MediaSource) => { created++; return create(o); };
    URL.revokeObjectURL = (u: string) => { revoked++; return revoke(u); };
    const out: Record<string, { error: string; decodes: number; leaked: number }> = {};
    for (const [name, b64] of Object.entries(fixtures)) {
      const project = structuredClone(projectBase);
      project.background.maskDataUrl = `data:image/png;base64,${b64}`;
      decodes = created = revoked = 0;
      let error = '';
      try { await engine.openProject(new File([JSON.stringify(project)], `${name}.json`, { type: 'application/json' })); error = 'accepted'; }
      catch (e) { error = String(e); }
      out[name] = { error, decodes, leaked: created - revoked };
    }
    HTMLImageElement.prototype.decode = decode; URL.createObjectURL = create; URL.revokeObjectURL = revoke;
    return out;
  }, { projectBase: backgroundProject('uk-passport', bytes, mask), fixtures: { wrongSize: small.toString('base64'), forgedHeader: forged.toString('base64'), truncated: truncated.toString('base64') } });
  // Wrong or forged headers are refused before the photo or mask is decoded, so nothing is created.
  for (const name of ['wrongSize', 'forgedHeader']) {
    expect(result[name].error).toMatch(/mask size is invalid/i);
    expect(result[name].decodes).toBe(0);
    expect(result[name].leaked).toBe(0);
  }
  // A header that looks right but will not decode fails after the photo loaded: its URL must be revoked.
  expect(result.truncated.error).not.toBe('accepted');
  expect(result.truncated.leaked).toBe(0);
});

test('HEIC originals pass through byte-identical even when the browser cannot decode them; print modes explain', async ({ page }) => {
  await page.goto('/');
  // Synthetic ISO-BMFF container: ftyp heic + mif1, padded above the 54 KB minimum. Not a decodable image.
  const brand = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypheic'), Buffer.alloc(4), Buffer.from('mif1heic')]);
  const heic = Buffer.concat([brand, Buffer.from(Array.from({ length: 70_000 }, (_, i) => (i * 31 + 7) & 255))]);
  const result = await page.evaluate(async base64 => {
    const enginePath = '/src/browser/engine.ts', corePath = '/src/core/index.ts';
    const engine = await import(/* @vite-ignore */ enginePath), core = await import(/* @vite-ignore */ corePath);
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const out: Record<string, unknown> = {};
    // Browsers usually report HEIC as "", some as image/heic.
    for (const type of ['', 'image/heic']) {
      const photo = await engine.loadPhoto(new File([bytes], 'IMG_0001.HEIC', { type }));
      const exported = await engine.exportPhoto(photo, core.getPreset('us-online'), { x: 0, y: 0, width: 1, height: 1 }, { format: 'png' });
      const canvas = document.createElement('canvas');
      engine.renderPreview(canvas, photo, core.getPreset('us-online'), { x: 0, y: 0, width: 1, height: 1 });
      let printError = '', backgroundError = '', projectError = '';
      try { await engine.exportPhoto(photo, core.getPreset('us-passport'), { x: 0, y: 0, width: 100, height: 100 }, { format: 'png' }); } catch (e) { printError = String(e); }
      try { await engine.prepareBackground(photo); } catch (e) { backgroundError = String(e); }
      try { await engine.saveProject(photo, core.getPreset('us-passport'), { x: 0, y: 0, width: 100, height: 100 }); } catch (e) { projectError = String(e); }
      out[type || 'empty'] = {
        bytesOnly: photo.bytesOnly, mime: photo.mime, fileType: photo.file.type, url: photo.url, name: exported.filename,
        bytes: Array.from(new Uint8Array(await exported.blob.arrayBuffer())), previewSized: canvas.width > 0 && canvas.height > 0, printError, backgroundError, projectError,
      };
      engine.releasePhoto(photo);
    }
    return out as Record<string, { bytesOnly: boolean; mime: string; fileType: string; url: string; name: string; bytes: number[]; previewSized: boolean; printError: string; backgroundError: string; projectError: string }>;
  }, heic.toString('base64'));
  for (const item of Object.values(result)) {
    expect(item.bytesOnly).toBe(true);
    expect(item.mime).toBe('image/heic');
    expect(item.fileType).toBe('image/heic');
    expect(item.url).toBe('');
    expect(item.name).toBe('IMG_0001.heic');
    expect(Buffer.from(item.bytes).equals(heic)).toBe(true);
    expect(item.previewSized).toBe(true);
    for (const message of [item.printError, item.backgroundError, item.projectError]) expect(message).toMatch(/can't read HEIC photos.*Safari.*JPEG/);
  }
});

test('600 DPI sheets: PDF works at any size, raster sheets over the canvas budget are refused with advice', async ({ page }) => {
  await page.goto('/');
  const base64 = (await geometryImage()).toString('base64');
  const result = await page.evaluate(async base64 => {
    const enginePath = '/src/browser/engine.ts', corePath = '/src/core/index.ts';
    const engine = await import(/* @vite-ignore */ enginePath), core = await import(/* @vite-ignore */ corePath);
    const photo = await engine.loadPhoto(new File([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], 'geometry.png', { type: 'image/png' }));
    const preset = core.getPreset('uk-passport'), crop = core.defaultCrop(photo.width, photo.height, preset);
    const sheet = { sheet: true, dpi: 600 };
    const pdf = await engine.exportPhoto(photo, preset, crop, { ...sheet, format: 'pdf', paperId: 'a4' });
    const letterPdf = await engine.exportPhoto(photo, preset, crop, { ...sheet, format: 'pdf', paperId: 'letter' });
    const errors: Record<string, string> = {};
    for (const [format, paperId] of [['png', 'a4'], ['jpeg', 'a4'], ['png', 'letter']]) {
      try { await engine.exportPhoto(photo, preset, crop, { ...sheet, format, paperId }); errors[`${format}:${paperId}`] = 'accepted'; }
      catch (e) { errors[`${format}:${paperId}`] = `${(e as { code?: string }).code}: ${(e as Error).message}`; }
    }
    // 4x6 at 600 DPI is 8.6 MP: still a normal raster export.
    const small = await engine.exportPhoto(photo, preset, crop, { ...sheet, format: 'png', paperId: '4x6' });
    const limit = engine.MAX_CANVAS_AREA;
    engine.releasePhoto(photo);
    const head = new Uint8Array(await small.blob.slice(0, 45).arrayBuffer()), view = new DataView(head.buffer);
    return {
      limit, errors, pdf: Array.from(new Uint8Array(await pdf.blob.arrayBuffer())), letterPdf: Array.from(new Uint8Array(await letterPdf.blob.arrayBuffer())),
      small: { width: view.getUint32(16), height: view.getUint32(20), pixelsPerMetre: view.getUint32(41) },
    };
  }, base64);
  expect(result.limit).toBe(16_000_000);
  for (const [key, message] of Object.entries(result.errors)) {
    expect(message, key).toMatch(/^SHEET_TOO_LARGE:/);
    expect(message, key).toMatch(/PDF/);
    expect(message, key).toMatch(/300 DPI/);
  }
  for (const [bytes, size] of [[result.pdf, [210, 297]], [result.letterPdf, [279.4, 215.9]]] as const) {
    const doc = await PDFDocument.load(Buffer.from(bytes));
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getWidth()).toBeCloseTo(size[0] * 72 / 25.4, 4);
    expect(doc.getPage(0).getHeight()).toBeCloseTo(size[1] * 72 / 25.4, 4);
  }
  expect(result.small).toEqual({ width: 3600, height: 2400, pixelsPerMetre: Math.round(600 / 0.0254) });
});

test('spec guides draw eye and head bands from the preset, with or without landmarks', async ({ page }) => {
  await page.goto('/');
  const base64 = (await geometryImage()).toString('base64');
  const result = await page.evaluate(async base64 => {
    const enginePath = '/src/browser/engine.ts', corePath = '/src/core/index.ts';
    const engine = await import(/* @vite-ignore */ enginePath), core = await import(/* @vite-ignore */ corePath);
    const photo = await engine.loadPhoto(new File([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], 'geometry.png', { type: 'image/png' }));
    const preset = core.getPreset('us-passport'), crop = core.defaultCrop(photo.width, photo.height, preset);
    const draw = (options: object) => {
      const c = document.createElement('canvas');
      engine.renderPreview(c, photo, preset, crop, options);
      const ctx = c.getContext('2d')!;
      return { width: c.width, height: c.height, data: ctx.getImageData(0, 0, c.width, c.height).data };
    };
    const plain = draw({}), guided = draw({ guides: true });
    const landmarks = { centerX: crop.x + crop.width / 2, crownY: crop.y + crop.height * 0.15, eyesY: crop.y + crop.height * 0.42, chinY: crop.y + crop.height * 0.8 };
    const withLandmarks = draw({ guides: true, landmarks });
    const changed = (a: typeof plain, b: typeof plain, y0: number, y1: number) => {
      let n = 0;
      for (let y = Math.floor(y0 * a.height); y < Math.ceil(y1 * a.height); y++) for (let x = 0; x < a.width; x++) { const i = (y * a.width + x) * 4; if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2]) n++; }
      return n / ((Math.ceil(y1 * a.height) - Math.floor(y0 * a.height)) * a.width);
    };
    const eyeTop = 1 - 34.925 / preset.heightMm, eyeBottom = 1 - 28.575 / preset.heightMm;
    const out = {
      eyeBand: changed(plain, guided, eyeTop + 0.02, eyeBottom - 0.02),
      aboveEyes: changed(plain, guided, 0.235, 0.27),
      crownZone: changed(guided, withLandmarks, 0.13, 0.27),
    };
    engine.releasePhoto(photo);
    return out;
  }, base64);
  // The eye band is tinted across the whole row block; outside the bands (bar the centre line) little changes.
  expect(result.eyeBand).toBeGreaterThan(0.9);
  expect(result.aboveEyes).toBeLessThan(0.1);
  // With landmarks the crown zone (chin line minus 25.4-34.9 mm) is tinted instead of the side bracket.
  expect(result.crownZone).toBeGreaterThan(0.8);
});

test('spec guide labels stay legible when the preview is shown small, and chips never overlap', async ({ page }) => {
  await page.goto('/');
  const base64 = (await geometryImage()).toString('base64');
  const result = await page.evaluate(async base64 => {
    const enginePath = '/src/browser/engine.ts', corePath = '/src/core/index.ts';
    const engine = await import(/* @vite-ignore */ enginePath), core = await import(/* @vite-ignore */ corePath);
    const photo = await engine.loadPhoto(new File([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], 'geometry.png', { type: 'image/png' }));
    const out: Record<string, { minFontCss: number; overlaps: number; chips: number }> = {};
    for (const [id, cssWidth] of [['us-passport', 160], ['uk-passport', 300], ['us-passport', 700]] as const) {
      const preset = core.getPreset(id), crop = core.defaultCrop(photo.width, photo.height, preset);
      const canvas = document.createElement('canvas');
      canvas.style.cssText = `position:fixed;left:0;top:0;width:${cssWidth}px;height:auto`;
      document.body.append(canvas);
      const proto = CanvasRenderingContext2D.prototype, fillText = proto.fillText, fillRect = proto.fillRect;
      const fonts: number[] = [], chips: number[][] = [];
      proto.fillText = function (this: CanvasRenderingContext2D, ...args: [string, number, number]) {
        fonts.push(parseFloat(this.font) * this.getTransform().a * (cssWidth / this.canvas.width));
        return fillText.apply(this, args);
      };
      proto.fillRect = function (this: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
        if (String(this.fillStyle) === 'rgba(255, 253, 246, 0.9)') chips.push([x, y, x + w, y + h]);
        return fillRect.call(this, x, y, w, h);
      };
      const landmarks = { centerX: crop.x + crop.width / 2, crownY: crop.y + crop.height * 0.16, eyesY: crop.y + crop.height * 0.19, chinY: crop.y + crop.height * 0.2 };
      try { engine.renderPreview(canvas, photo, preset, crop, { guides: true, landmarks }); } finally { proto.fillText = fillText; proto.fillRect = fillRect; }
      let overlaps = 0;
      for (let i = 0; i < chips.length; i++) for (let j = i + 1; j < chips.length; j++) { const a = chips[i], b = chips[j]; if (a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]) overlaps++; }
      out[`${id}@${cssWidth}`] = { minFontCss: Math.min(...fonts), overlaps, chips: chips.length };
      canvas.remove();
    }
    engine.releasePhoto(photo);
    return out;
  }, base64);
  for (const item of Object.values(result)) {
    expect(item.chips).toBeGreaterThanOrEqual(3);
    expect(item.minFontCss).toBeGreaterThanOrEqual(11);
    expect(item.overlaps).toBe(0);
  }
});

test('original downloads get a safe name with the extension from the sniffed type', async ({ page }) => {
  await page.goto('/');
  const png = (await geometryImage('png', 800, 1000)).toString('base64');
  const names = await page.evaluate(async base64 => {
    const enginePath = '/src/browser/engine.ts', corePath = '/src/core/index.ts';
    const engine = await import(/* @vite-ignore */ enginePath), core = await import(/* @vite-ignore */ corePath);
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const out: string[] = [];
    const preset = { ...core.getPreset('us-online'), minBytes: undefined };
    for (const name of ['../../etc/passwd.jpg', 'C:\\Users\\me\\holiday: "me".JPEG', 'a\u0000b\u202ec.png', `${'x'.repeat(200)}.png`, '...', 'no-extension']) {
      const photo = await engine.loadPhoto(new File([bytes], name, { type: 'image/png' }));
      out.push((await engine.exportPhoto(photo, preset, { x: 0, y: 0, width: 1, height: 1 }, { format: 'png' })).filename);
      engine.releasePhoto(photo);
    }
    return out;
  }, png);
  expect(names[0]).toBe('passwd.png');
  expect(names[1]).toBe('holiday me.png');
  expect(names[2]).toBe('abc.png');
  expect(names[3]).toBe(`${'x'.repeat(80)}.png`);
  expect(names[4]).toBe('photo.png');
  expect(names[5]).toBe('no-extension.png');
  for (const name of names) expect(name).not.toMatch(/[\\/\u0000-\u001f]/);
});

test('exportDigital: exact pixels inside a KB range, padding below the minimum, errors for enlarging and unreachable caps', async ({ page }) => {
  await page.goto('/');
  const base64 = (await geometryImage()).toString('base64');
  const result = await page.evaluate(async base64 => {
    const enginePath = '/src/browser/engine.ts', corePath = '/src/core/index.ts';
    const engine = await import(/* @vite-ignore */ enginePath), core = await import(/* @vite-ignore */ corePath);
    const photo = await engine.loadPhoto(new File([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], 'geometry.png', { type: 'image/png' }));
    const preset = core.getPreset('us-passport'), crop = core.defaultCrop(photo.width, photo.height, preset);
    const size = async (b: Blob) => { const img = await createImageBitmap(b); const r = { width: img.width, height: img.height }; img.close(); return r; };
    const ok = await engine.exportDigital(photo, preset, crop, { widthPx: 600, heightPx: 600, maxKB: 240, kbBytes: 1000, format: 'jpeg' });
    const padded = await engine.exportDigital(photo, preset, crop, { widthPx: 100, heightPx: 100, minKB: 20, maxKB: 50, format: 'jpeg' });
    const errors: Record<string, string> = {};
    for (const [name, target] of [
      ['enlarge', { widthPx: Math.floor(crop.width) * 2, heightPx: Math.floor(crop.height) * 2, format: 'jpeg' }],
      ['unreachable', { widthPx: 600, heightPx: 600, maxKB: 0.05, format: 'jpeg' }],
      ['shape', { widthPx: 600, heightPx: 700, format: 'jpeg' }],
    ] as const) {
      try { await engine.exportDigital(photo, preset, crop, target); errors[name] = 'accepted'; }
      catch (e) { errors[name] = `${(e as { code?: string }).code}: ${(e as Error).message}`; }
    }
    engine.releasePhoto(photo);
    return {
      ok: { ...ok, blob: undefined, bytesRead: Array.from(new Uint8Array(await ok.blob.arrayBuffer())).length, type: ok.blob.type, decoded: await size(ok.blob) },
      padded: { ...padded, blob: undefined, type: padded.blob.type, decoded: await size(padded.blob), length: padded.blob.size },
      errors,
    };
  }, base64);
  expect(result.ok.type).toBe('image/jpeg');
  expect(result.ok.decoded).toEqual({ width: 600, height: 600 });
  expect(result.ok.bytes).toBe(result.ok.bytesRead);
  expect(result.ok.bytes).toBeLessThanOrEqual(240_000);
  expect(result.ok.padded).toBe(false);
  expect(result.padded.decoded).toEqual({ width: 100, height: 100 });
  expect(result.padded.length).toBeGreaterThanOrEqual(20 * 1024);
  expect(result.padded.length).toBeLessThanOrEqual(50 * 1024);
  expect(result.errors.enlarge).toMatch(/^LOW_RESOLUTION:.*never enlarged/);
  expect(result.errors.unreachable).toMatch(/^FILE_SIZE_UNREACHABLE:.*smaller pixel size/);
  expect(result.errors.shape).toMatch(/^ASPECT_MISMATCH:/);
});
