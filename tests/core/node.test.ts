import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,readFile,writeFile,rm,symlink,link } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { PRESETS,PAPERS,createProject,mmToPoints,outputSize,layoutSheet } from '../../src/core/index.js';
import { renderBuffer,saveFile,inspectFile,sourceForProject,loadProject } from '../../src/node/operations.js';
const fixture=()=>sharp({create:{width:1200,height:1600,channels:3,background:'#99aacc'}}).jpeg({quality:95}).toBuffer();
test('every print preset and image format produces exact dimensions and 300 DPI',async()=>{const bytes=await fixture();for(const preset of PRESETS.filter(p=>p.mode!=='original'))for(const format of ['jpeg','png']as const){const p=createProject({name:'synthetic.jpg',mime:'image/jpeg',width:1200,height:1600},preset.id);p.format=format;const out=await renderBuffer(bytes,p);const meta=await sharp(out.bytes).metadata();assert.equal(meta.width,outputSize(preset).width);assert.equal(meta.height,outputSize(preset).height);assert.equal(meta.density,300);}});
test('PDF single/page physical sizes and all paper sheet geometry',async()=>{const bytes=await fixture();for(const preset of PRESETS.filter(p=>p.mode!=='original')){const p=createProject({name:'synthetic.jpg',mime:'image/jpeg',width:1200,height:1600},preset.id);p.format='pdf';let out=await renderBuffer(bytes,p);let pdf=await PDFDocument.load(out.bytes);assert(Math.abs(pdf.getPage(0).getWidth()-mmToPoints(preset.widthMm))<1e-7);assert(Math.abs(pdf.getPage(0).getHeight()-mmToPoints(preset.heightMm))<1e-7);for(const paper of PAPERS){p.paperId=paper.id;out=await renderBuffer(bytes,p,true);pdf=await PDFDocument.load(out.bytes);assert.equal(pdf.getPageCount(),1);assert(Math.abs(pdf.getPage(0).getWidth()-mmToPoints(paper.widthMm))<1e-7);assert(Math.abs(pdf.getPage(0).getHeight()-mmToPoints(paper.heightMm))<1e-7);assert.equal(out.details.count,layoutSheet(preset,paper).placements.length);}}});
test('sheet image pixels and density match all papers',async()=>{const bytes=await fixture();const p=createProject({name:'a.jpg',mime:'image/jpeg',width:1200,height:1600});for(const paper of PAPERS){p.paperId=paper.id;const out=await renderBuffer(bytes,p,true);const meta=await sharp(out.bytes).metadata();const layout=layoutSheet(PRESETS[0]!,paper);assert.equal(meta.width,layout.width);assert.equal(meta.height,layout.height);assert.equal(meta.density,300);}});
const noisy=(width=1000,height=1300)=>sharp({create:{width,height,channels:3,background:'#808080',noise:{type:'gaussian',mean:128,sigma:40}}}).jpeg({quality:90}).toBuffer();
test('original modes preserve exact bytes, reject sheets and refuse inputs the browser refuses',async()=>{
  const bytes=await noisy();
  assert(bytes.length>54000);
  for(const id of ['us-online','uk-online']){
    const p=createProject({name:'a.jpg',mime:'image/jpeg',width:1000,height:1300},id);
    const out=await renderBuffer(bytes,p);
    assert.deepEqual(out.bytes,bytes);
    assert.deepEqual(out.details.warnings,[]);
    await assert.rejects(()=>renderBuffer(bytes,p,true),{code:'ORIGINAL_ONLY'});
  }
  const tiny=await fixture();
  await assert.rejects(()=>renderBuffer(tiny,createProject({name:'a.jpg',mime:'image/jpeg',width:1200,height:1600},'us-online')),(e:any)=>e.code==='ORIGINAL_NOT_ACCEPTED'&&e.issues.some((i:any)=>i.code==='FILE_TOO_SMALL'));
  const small=await sharp({create:{width:300,height:300,channels:3,background:'#808080',noise:{type:'gaussian',mean:128,sigma:60}}}).jpeg({quality:95}).toBuffer();
  await assert.rejects(()=>renderBuffer(small,createProject({name:'s.jpg',mime:'image/jpeg',width:300,height:300},'uk-online')),(e:any)=>e.code==='ORIGINAL_NOT_ACCEPTED'&&e.issues.some((i:any)=>i.code==='LOW_RESOLUTION'));
  const webp=await sharp({create:{width:1000,height:1300,channels:3,background:'#808080',noise:{type:'gaussian',mean:128,sigma:40}}}).webp({quality:95}).toBuffer();
  await assert.rejects(()=>renderBuffer(webp,createProject({name:'a.webp',mime:'image/webp',width:1000,height:1300},'us-online')),(e:any)=>e.code==='ORIGINAL_NOT_ACCEPTED'&&e.issues.some((i:any)=>i.code==='UNSUPPORTED_ORIGINAL'));
});
const maskUrl=async(width=1200,height=1600)=>'data:image/png;base64,'+(await sharp({create:{width,height,channels:4,background:{r:255,g:255,b:255,alpha:0}}}).png().toBuffer()).toString('base64');
test('mask compositor applies the saved alpha on print presets and flags forbidden documents; digital originals never edit',async()=>{
  const bytes=await fixture();
  const p=createProject({name:'a.jpg',mime:'image/jpeg',width:1200,height:1600},'general-id');
  p.format='png';
  p.background={enabled:true,color:'#ff0000',tolerance:32,maskDataUrl:await maskUrl()};
  let out=await renderBuffer(bytes,p);
  const rgb=await sharp(out.bytes).removeAlpha().raw().toBuffer();
  assert.deepEqual([...rgb.subarray(0,3)],[255,0,0]);
  assert.equal(out.details.backgroundReplaced,true);
  assert.deepEqual(out.details.warnings,[]);
  assert.equal((await sharp(out.bytes).metadata()).xmp?.toString().includes('Background replaced with PortraitPass'),true);
  p.presetId='uk-passport';
  out=await renderBuffer(bytes,p);
  assert.equal((out.details.warnings as string[]).length,1);
  assert.doesNotMatch((out.details.warnings as string[])[0]!,/compliant|approved|guaranteed|verified|official/i);
  assert.deepEqual([...(await sharp(out.bytes).removeAlpha().raw().toBuffer()).subarray(0,3)],[255,0,0]);
  assert.equal((await sharp(out.bytes).metadata()).xmp?.toString().includes('Background replaced with PortraitPass'),true);
  p.format='jpeg';
  out=await renderBuffer(bytes,p);
  assert.equal((await sharp(out.bytes).metadata()).xmp?.toString().includes('Background replaced with PortraitPass'),true);
  p.background.enabled=false;
  out=await renderBuffer(bytes,p);
  assert.equal((await sharp(out.bytes).metadata()).xmp,undefined);
  assert.equal(out.details.backgroundReplaced,false);
  assert.deepEqual(out.details.warnings,[]);
  const big=await noisy();
  const online=createProject({name:'a.jpg',mime:'image/jpeg',width:1000,height:1300},'uk-online');
  online.background={enabled:true,color:'#ff0000',tolerance:32,maskDataUrl:await maskUrl(1000,1300)};
  await assert.rejects(()=>renderBuffer(big,online),{code:'BACKGROUND_FORBIDDEN'});
  const small=await sharp({create:{width:100,height:100,channels:3,background:'#ccc'}}).jpeg().toBuffer();
  await assert.rejects(()=>renderBuffer(small,createProject({name:'small.jpg',mime:'image/jpeg',width:100,height:100})),{code:'LOW_RESOLUTION'});
});
test('every PDF, single or sheet, carries the independent-tool metadata',async()=>{
  const bytes=await fixture();
  const sentence='PortraitPass, an independent open-source tool, not affiliated with any government.';
  for(const sheet of [false,true]){
    const p=createProject({name:'a.jpg',mime:'image/jpeg',width:1200,height:1600},'us-passport');
    p.format='pdf';
    const pdf=await PDFDocument.load((await renderBuffer(bytes,p,sheet)).bytes,{updateMetadata:false});
    assert.equal(pdf.getSubject(),sentence);
    assert(pdf.getKeywords()?.includes(sentence));
    assert.equal(pdf.getCreator(),sentence);
    assert.equal(pdf.getProducer(),'PortraitPass');
    assert.doesNotMatch(pdf.getKeywords()??'',/Background replaced/);
  }
  const p=createProject({name:'a.jpg',mime:'image/jpeg',width:1200,height:1600},'uk-passport');
  p.format='pdf';
  p.background={enabled:true,color:'#ffffff',tolerance:32,maskDataUrl:await maskUrl()};
  const pdf=await PDFDocument.load((await renderBuffer(bytes,p,true)).bytes);
  assert(pdf.getKeywords()?.includes('Background replaced with PortraitPass'));
});
test('exclusive outputs, symlink source protection and decoded-source mismatch',async()=>{const dir=await mkdtemp(path.join(tmpdir(),'portraitpass-test-'));try{const bytes=await fixture(),input=path.join(dir,'input.jpg'),out=path.join(dir,'out.jpg');await writeFile(input,bytes);await saveFile(out,bytes);await assert.rejects(()=>saveFile(out,bytes),{code:'OUTPUT_EXISTS'});await assert.rejects(()=>saveFile(input,bytes,true,input),{code:'SOURCE_OVERWRITE'});await symlink(input,path.join(dir,'link.jpg'));await assert.rejects(()=>saveFile(path.join(dir,'link.jpg'),bytes,true,input),{code:'SOURCE_OVERWRITE'});const project=path.join(dir,'p.json');await writeFile(project,'{}');await assert.rejects(()=>saveFile(project,bytes,true,[input,project]),{code:'SOURCE_OVERWRITE'});await link(project,path.join(dir,'hard.json'));await assert.rejects(()=>saveFile(path.join(dir,'hard.json'),bytes,true,project),{code:'SOURCE_OVERWRITE'});await assert.rejects(()=>saveFile(path.join(dir,'fresh.jpg'),bytes,true,path.join(dir,'never-existed.json')).then(()=>{throw Object.assign(new Error('ok'),{code:'WROTE'});}),{code:'WROTE'});await assert.rejects(()=>loadProject(path.join(dir,'missing.json')),{code:'PROJECT_NOT_FOUND'});await assert.rejects(()=>loadProject(dir),{code:'INVALID_PROJECT'});const source=await inspectFile(input);assert.equal(source.width,1200);const p=createProject({name:'a.jpg',mime:'image/jpeg',width:1201,height:1600});await assert.rejects(()=>sourceForProject(p,input),{code:'SOURCE_MISMATCH'});assert.deepEqual(await readFile(input),bytes);}finally{await rm(dir,{recursive:true,force:true});}});
test('orientation is normalized and corrupt or mismatched masks fail',async()=>{const bytes=await sharp({create:{width:1600,height:1200,channels:3,background:'#aabbcc'}}).withMetadata({orientation:6}).jpeg().toBuffer();const p=createProject({name:'oriented.jpg',mime:'image/jpeg',width:1200,height:1600});const out=await renderBuffer(bytes,p);assert.equal((await sharp(out.bytes).metadata()).width,600);p.presetId='general-id';p.crop={x:0,y:0,width:1200,height:1200*45/35};p.crop={x:0,y:0,width:1120,height:1440};p.background={enabled:true,color:'#ffffff',tolerance:32,maskDataUrl:'data:image/png;base64,'+(await sharp({create:{width:10,height:10,channels:4,background:'#ffffff'}}).png().toBuffer()).toString('base64')};await assert.rejects(()=>renderBuffer(bytes,p),{code:'INVALID_MASK'});});
test('head and eye-line ranges are measurements: out-of-band landmarks render with a warning and a failing check, never an error',async()=>{
  const bytes=await fixture();
  const make=(landmarks:{centerX:number;crownY:number;chinY:number;eyesY:number})=>{const p=createProject({name:'a.jpg',mime:'image/jpeg',width:1200,height:1600},'us-passport');p.crop={x:0,y:0,width:1200,height:1200};p.landmarks=landmarks;return p;};
  const byId=(out:{details:Record<string,unknown>},id:string)=>(out.details.checks as {id:string;status:string}[]).find(c=>c.id===id)!;
  // Eyes 900 px above the bottom of a 1200 px crop of a 50.8 mm photo: about 38 mm, outside 28.6 to 34.9 mm.
  let out=await renderBuffer(bytes,make({centerX:600,crownY:100,chinY:900,eyesY:300}));
  assert.equal((await sharp(out.bytes).metadata()).width,600);
  assert.equal(byId(out,'eyes').status,'fail');assert.equal(byId(out,'head').status,'pass');assert.equal(byId(out,'centre').status,'pass');assert.equal(byId(out,'resolution').status,'pass');
  const warnings=out.details.warnings as string[];
  assert.equal(warnings.length,1);assert.match(warnings[0]!,/Eye line/);
  assert.doesNotMatch(warnings.join(' '),/compliant|approved|guaranteed|verified|official/i);
  // Head far too small: also a warning, not a throw, and sheets carry the same fields.
  out=await renderBuffer(bytes,make({centerX:600,crownY:500,chinY:700,eyesY:600}),true);
  assert.equal(byId(out,'head').status,'fail');assert((out.details.warnings as string[]).some(w=>/Head height/.test(w)));
  // All in range: no warnings. No landmarks: unknown checks, no warnings.
  out=await renderBuffer(bytes,make({centerX:600,crownY:200,chinY:900,eyesY:450}));
  assert.deepEqual(out.details.warnings,[]);assert.equal(byId(out,'eyes').status,'pass');
  const bare=createProject({name:'a.jpg',mime:'image/jpeg',width:1200,height:1600},'us-passport');
  out=await renderBuffer(bytes,bare);
  assert.equal(byId(out,'head').status,'unknown');assert.deepEqual(out.details.warnings,[]);
  // Hard geometry still blocks.
  const wrong=make({centerX:600,crownY:200,chinY:900,eyesY:450});wrong.crop={x:0,y:0,width:1200,height:1000};
  await assert.rejects(()=>renderBuffer(bytes,wrong),{code:'ASPECT_MISMATCH'});
  const outside=make({centerX:600,crownY:200,chinY:900,eyesY:450});outside.crop={x:100,y:500,width:1200,height:1200};
  await assert.rejects(()=>renderBuffer(bytes,outside),{code:'INVALID_CROP'});
});
test('HEIC sources are rejected for print and general presets before any decoding',async()=>{
  const heic:any={name:'a.heic',mime:'image/heic',width:3000,height:4000};
  for(const id of ['us-passport','uk-passport','general-id'])
    await assert.rejects(()=>renderBuffer(Buffer.alloc(10),createProject(heic,id)),(e:any)=>e.code==='UNSUPPORTED_IMAGE'&&/JPEG/.test(e.message));
});
