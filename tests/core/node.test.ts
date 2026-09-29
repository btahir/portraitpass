import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,readFile,writeFile,rm,symlink,link } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { PRESETS,PAPERS,createProject,mmToPoints,outputSize,layoutSheet } from '../../src/core/index.js';
import { renderBuffer,renderDigitalBuffer,saveFile,inspectFile,sourceForProject,loadProject } from '../../src/node/operations.js';
const fixture=()=>sharp({create:{width:1200,height:1600,channels:3,background:'#99aacc'}}).jpeg({quality:95}).toBuffer();
test('every print preset and image format produces exact dimensions and 300 DPI',async()=>{const bytes=await fixture();for(const preset of PRESETS.filter(p=>p.mode!=='original'))for(const format of ['jpeg','png']as const){const p=createProject({name:'synthetic.jpg',mime:'image/jpeg',width:1200,height:1600},preset.id);p.format=format;const out=await renderBuffer(bytes,p);const meta=await sharp(out.bytes).metadata();assert.equal(meta.width,outputSize(preset).width);assert.equal(meta.height,outputSize(preset).height);assert.equal(meta.density,300);}});
test('PDF single/page physical sizes and all paper sheet geometry',async()=>{const bytes=await fixture();for(const preset of PRESETS.filter(p=>p.mode!=='original')){const p=createProject({name:'synthetic.jpg',mime:'image/jpeg',width:1200,height:1600},preset.id);p.format='pdf';let out=await renderBuffer(bytes,p);let pdf=await PDFDocument.load(out.bytes);assert(Math.abs(pdf.getPage(0).getWidth()-mmToPoints(preset.widthMm))<1e-7);assert(Math.abs(pdf.getPage(0).getHeight()-mmToPoints(preset.heightMm))<1e-7);for(const paper of PAPERS){p.paperId=paper.id;out=await renderBuffer(bytes,p,true);pdf=await PDFDocument.load(out.bytes);assert.equal(pdf.getPageCount(),1);const expected=layoutSheet(preset,paper);assert(Math.abs(pdf.getPage(0).getWidth()-mmToPoints(expected.widthMm))<1e-7);assert(Math.abs(pdf.getPage(0).getHeight()-mmToPoints(expected.heightMm))<1e-7);assert.equal(pdf.getPage(0).getWidth()>pdf.getPage(0).getHeight(),expected.orientation==='landscape');assert.equal(Math.min(expected.widthMm,expected.heightMm),paper.widthMm);assert.equal(out.details.count,expected.placements.length);}}});
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

const noisyBig=(size=2000)=>sharp({create:{width:size,height:size,channels:3,background:'#808080',noise:{type:'gaussian',mean:128,sigma:50}}}).jpeg({quality:92}).toBuffer();
const digitalProject=(size:number,presetId='us-passport')=>createProject({name:'d.jpg',mime:'image/jpeg',width:size,height:size},presetId);
test('digital export: DV lottery 600x600 within 240 KB, exact pixels, valid JPEG, quality reported',async()=>{
  const bytes=await noisyBig();
  const p=digitalProject(2000);
  for(const kbBytes of [1000,1024] as const){
    const out=await renderDigitalBuffer(bytes,p,{widthPx:600,heightPx:600,maxKB:240,kbBytes,format:'jpeg'});
    const meta=await sharp(out.bytes).metadata();
    assert.equal(meta.width,600);assert.equal(meta.height,600);assert.equal(meta.format,'jpeg');
    assert(out.bytes.length<=240*kbBytes,`${kbBytes}: ${out.bytes.length}`);assert(out.bytes.length>240*kbBytes*0.5,'uses the budget, not a tiny file');
    assert.equal(out.details.bytes,out.bytes.length);assert.equal(out.details.padded,false);assert.equal(out.details.kbBytes,kbBytes);
    const q=out.details.quality as number;assert(q>=0.3&&q<=0.95);
    await sharp(out.bytes).raw().toBuffer();// fully decodable
    assert.deepEqual((out.details.warnings as string[]).filter(w=>/compliant|approved|guaranteed|verified|official/i.test(w)),[]);
  }
});
test('digital export: 20-50 KB range lands inside the range on a real photo-like image',async()=>{
  const big=await sharp({create:{width:1600,height:2000,channels:3,background:'#808080',noise:{type:'gaussian',mean:128,sigma:40}}}).jpeg({quality:90}).toBuffer();
  const p=createProject({name:'d.jpg',mime:'image/jpeg',width:1600,height:2000},'general-id');
  for(const [w,h,min,max] of [[200,230,20,50],[150,200,20,50],[100,120,10,20]] as const){
    p.crop={x:0,y:0,width:Math.min(1600,2000*w/h),height:Math.min(2000,1600*h/w)};
    const out=await renderDigitalBuffer(big,p,{widthPx:w,heightPx:h,minKB:min,maxKB:max,format:'jpeg'});
    const meta=await sharp(out.bytes).metadata();
    assert.equal(meta.width,w);assert.equal(meta.height,h);assert.equal(meta.format,'jpeg');
    assert(out.bytes.length>=min*1024&&out.bytes.length<=max*1024,`${w}x${h}: ${out.bytes.length}`);
  }
});
test('digital export: a smooth image under the minimum is padded with a comment, pixels identical, still valid JPEG',async()=>{
  const smooth=await sharp({create:{width:1200,height:1200,channels:3,background:'#8099bb'}}).jpeg({quality:95}).toBuffer();
  const p=digitalProject(1200);
  const plain=await renderDigitalBuffer(smooth,p,{widthPx:600,heightPx:600,format:'jpeg'});
  assert(plain.bytes.length<20*1024);assert.equal(plain.details.padded,false);
  const padded=await renderDigitalBuffer(smooth,p,{widthPx:600,heightPx:600,minKB:20,maxKB:50,format:'jpeg'});
  assert.equal(padded.details.padded,true);assert.equal(padded.bytes.length,20*1024);assert(padded.details.paddedBytes as number>0);
  assert.equal(padded.details.quality,0.95);
  assert((padded.details.warnings as string[]).some(w=>/padded/.test(w)&&/pixels are unchanged/.test(w)));
  const a=await sharp(plain.bytes).raw().toBuffer(),b=await sharp(padded.bytes).raw().toBuffer();
  assert.deepEqual(a,b);
  const meta=await sharp(padded.bytes).metadata();assert.equal(meta.width,600);assert.equal(meta.height,600);
  assert.deepEqual([...padded.bytes.subarray(0,2)],[0xff,0xd8]);assert.deepEqual([...padded.bytes.subarray(-2)],[0xff,0xd9]);
});
test('digital export errors: unreachable cap, no enlarging, wrong shape, invalid target, original presets',async()=>{
  const bytes=await noisyBig();
  const p=digitalProject(2000);
  await assert.rejects(()=>renderDigitalBuffer(bytes,p,{widthPx:1500,heightPx:1500,maxKB:20,format:'jpeg'}),{code:'FILE_SIZE_UNREACHABLE'});
  await assert.rejects(()=>renderDigitalBuffer(bytes,p,{widthPx:2500,heightPx:2500,maxKB:500,format:'jpeg'}),(e:any)=>e.code==='LOW_RESOLUTION'&&/never enlarged/.test(e.message));
  await assert.rejects(()=>renderDigitalBuffer(bytes,p,{widthPx:600,heightPx:800,maxKB:500,format:'jpeg'}),(e:any)=>e.code==='ASPECT_MISMATCH'&&/"width":/.test(e.message));
  await assert.rejects(()=>renderDigitalBuffer(bytes,p,{widthPx:600,heightPx:600,minKB:50,maxKB:20,format:'jpeg'}),{code:'INVALID_DIGITAL_TARGET'});
  await assert.rejects(()=>renderDigitalBuffer(bytes,p,{widthPx:0,heightPx:600,format:'jpeg'}),{code:'INVALID_DIGITAL_TARGET'});
  const online=createProject({name:'d.jpg',mime:'image/jpeg',width:2000,height:2000},'us-online');
  await assert.rejects(()=>renderDigitalBuffer(bytes,online,{widthPx:600,heightPx:600,format:'jpeg'}),{code:'ORIGINAL_ONLY'});
});
test('digital export keeps the saved background and its XMP note; forbidden documents warn',async()=>{
  const bytes=await noisyBig(1200);
  const p=digitalProject(1200,'general-id');p.crop={x:0,y:0,width:1200,height:1200};
  p.background={enabled:true,color:'#ff0000',tolerance:32,maskDataUrl:await maskUrl(1200,1200)};
  let out=await renderDigitalBuffer(bytes,p,{widthPx:400,heightPx:400,maxKB:60,format:'jpeg'});
  const meta=await sharp(out.bytes).metadata();assert.equal(meta.xmp?.toString().includes('Background replaced with PortraitPass'),true);assert.equal(out.details.backgroundReplaced,true);
  const px=await sharp(out.bytes).raw().toBuffer();assert(px[0]!>200&&px[1]!<60);
  p.presetId='uk-passport';p.crop={x:0,y:0,width:1200,height:1200};
  out=await renderDigitalBuffer(bytes,p,{widthPx:400,heightPx:400,maxKB:60,format:'jpeg'});
  assert((out.details.warnings as string[]).some(w=>/digitally altered/.test(w)));
});
test('edge-to-edge raster sheet: photos tile from the corner and guides sit on shared edges only',async()=>{
  const bytes=await sharp({create:{width:1200,height:1600,channels:3,background:'#204060'}}).jpeg({quality:95}).toBuffer();
  const p=createProject({name:'a.jpg',mime:'image/jpeg',width:1200,height:1600},'us-passport');p.format='png';p.paperId='4x6';
  const out=await renderBuffer(bytes,p,true);
  const meta=await sharp(out.bytes).metadata();assert.equal(meta.width,1200);assert.equal(meta.height,1800);
  const {data,info}=await sharp(out.bytes).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const at=(x:number,y:number)=>[...data.subarray((y*info.width+x)*3,(y*info.width+x)*3+3)];
  // Corner pixel is photo, not paper white; the guide line pixel on the 600 boundary is lighter than the photo.
  assert.deepEqual(at(0,0),at(300,300));assert.notDeepEqual(at(0,0),[255,255,255]);
  const guide=at(600,300);assert(guide[0]!>at(300,300)[0]!);
  assert.deepEqual(at(200,200),at(300,300));
  assert.equal(out.details.count,6);assert.equal((out.details.layout as {style:string}).style,'edge-to-edge');
  // Cut-marks style keeps white margins.
  p.sheetStyle='cut-marks';const cm=await renderBuffer(bytes,p,true);const raw=await sharp(cm.bytes).removeAlpha().raw().toBuffer({resolveWithObject:true});assert.deepEqual([...raw.data.subarray(0,3)],[255,255,255]);
});
