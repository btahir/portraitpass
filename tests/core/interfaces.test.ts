import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp,writeFile,readFile,rm,symlink,link,stat } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { layoutSheet,getPreset } from '../../src/core/index.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const cli=(args:string[])=>{const result=spawnSync(path.resolve('scripts/portraitpass'),[...args,'--json'],{encoding:'utf8'});return {exit:result.status,data:JSON.parse(result.stdout),stderr:result.stderr};};
test('CLI actual process: presets, inspect, crop, project handoff, single/sheet, stable failures',async()=>{const dir=await mkdtemp(path.join(tmpdir(),'portraitpass-cli-'));try{const input=path.join(dir,'portrait.jpg');await writeFile(input,await sharp({create:{width:1200,height:1600,channels:3,background:'#8099bb'}}).jpeg().toBuffer());let result=cli(['presets']);assert.equal(result.exit,0);assert.equal(result.data.result.presets.length,6);result=cli(['inspect','--input',input]);assert.equal(result.data.result.width,1200);result=cli(['crop','--input',input,'--preset','uk-passport']);assert(result.data.result.crop.width>0);const project=path.join(dir,'handoff.json');result=cli(['project','--input',input,'--preset','uk-passport','--embed','--output',project]);assert.equal(result.exit,0);assert(JSON.parse(await readFile(project,'utf8')).source.dataUrl.startsWith('data:image/jpeg;base64,'));assert(!JSON.stringify(result.data).includes('base64,'));const output=path.join(dir,'out.jpg');result=cli(['render','--project',project,'--output',output]);assert.equal(result.exit,0);assert.equal((await sharp(await readFile(output)).metadata()).width,413);result=cli(['render','--project',project,'--output',output]);assert.equal(result.exit,4);assert.equal(result.data.error.code,'OUTPUT_EXISTS');result=cli(['sheet','--input',input,'--preset','us-passport','--format','pdf','--output',path.join(dir,'sheet.pdf')]);assert.equal(result.exit,0);assert.equal(result.data.result.count,6);result=cli(['render','--input',input,'--output',input,'--overwrite']);assert.equal(result.exit,4);assert.equal(result.data.error.code,'SOURCE_OVERWRITE');result=cli(['inspect','--input',path.join(dir,'missing.jpg')]);assert.equal(result.exit,3);await writeFile(path.join(dir,'bad.json'),'{}');result=cli(['render','--project',path.join(dir,'bad.json'),'--output',path.join(dir,'bad.jpg')]);assert.equal(result.exit,2);assert.equal(result.data.error.code,'PROJECT_VERSION');}finally{await rm(dir,{recursive:true,force:true});}});
test('MCP real stdio exposes schemas, renders and hands off without network',async()=>{const dir=await mkdtemp(path.join(tmpdir(),'portraitpass-mcp-'));const transport=new StdioClientTransport({command:path.resolve('scripts/portraitpass-mcp'),args:[],cwd:dir,stderr:'pipe'});const client=new Client({name:'portraitpass-test',version:'1.0.0'});try{const input=path.join(dir,'portrait.png');await writeFile(input,await sharp({create:{width:1200,height:1600,channels:3,background:'#aabbcc'}}).png().toBuffer());await client.connect(transport);const list=await client.listTools();assert.equal(list.tools.length,8);for(const tool of list.tools){assert(tool.inputSchema);assert(tool.outputSchema);}const call=async(name:string,args:Record<string,unknown>)=>{const result=await client.callTool({name,arguments:args});return {isError:result.isError,...JSON.parse((result.content as {text:string}[])[0]!.text)};};let out=await call('portraitpass_presets',{});assert.equal(out.result.presets.length,6);out=await call('portraitpass_inspect',{input});assert.equal(out.result.width,1200);out=await call('portraitpass_crop',{input,presetId:'us-passport'});assert.equal(out.result.crop.height,1200);out=await call('portraitpass_layout',{presetId:'uk-passport',paperId:'4x6'});assert.equal(out.result.placements.length,8);assert.equal(out.result.orientation,'landscape');assert.equal(out.result.style,'edge-to-edge');out=await call('portraitpass_render',{input,presetId:'us-passport',output:path.join(dir,'single.png'),format:'png'});assert.equal(out.ok,true);out=await call('portraitpass_sheet',{input,presetId:'uk-passport',paperId:'4x6',output:path.join(dir,'sheet.pdf'),format:'pdf'});assert.equal(out.result.count,8);out=await call('portraitpass_project',{input,presetId:'uk-passport',output:path.join(dir,'project.json')});assert.equal(out.ok,true);out=await call('portraitpass_inspect',{input:path.join(dir,'missing.png')});assert.equal(out.isError,true);assert.equal(out.ok,false);out=await call('portraitpass_render',{input,presetId:'us-passport',output:input,overwrite:true});assert.equal(out.ok,false);}finally{await client.close();await rm(dir,{recursive:true,force:true});}});

const noisy=(width=1000,height=1300)=>sharp({create:{width,height,channels:3,background:'#808080',noise:{type:'gaussian',mean:128,sigma:40}}}).jpeg({quality:90}).toBuffer();
const plain=(format:'jpeg'|'png'='jpeg')=>sharp({create:{width:1200,height:1600,channels:3,background:'#8099bb'}})[format]().toBuffer();
const withDir=async(fn:(dir:string)=>Promise<void>)=>{const dir=await mkdtemp(path.join(tmpdir(),'portraitpass-iface-'));try{await fn(dir);}finally{await rm(dir,{recursive:true,force:true});}};
const exists=(file:string)=>stat(file).then(()=>true,()=>false);
/** Minimal HEIC-like file: a correct ftyp box, a meta box holding two ispe boxes (thumbnail + primary), then filler. It cannot be decoded. */
function fakeHeic(width:number,height:number,brand='heic',filler=60000){
  const box=(type:string,payload:Buffer)=>{const b=Buffer.alloc(8+payload.length);b.writeUInt32BE(b.length,0);b.write(type,4,'latin1');payload.copy(b,8);return b;};
  const ispe=(w:number,h:number)=>{const payload=Buffer.alloc(12);payload.writeUInt32BE(w,4);payload.writeUInt32BE(h,8);return box('ispe',payload);};
  const ftyp=box('ftyp',Buffer.concat([Buffer.from(brand),Buffer.alloc(4),Buffer.from('mif1'),Buffer.from(brand)]));
  const meta=box('meta',Buffer.concat([Buffer.alloc(4),ispe(64,48),ispe(width,height)]));
  return Buffer.concat([ftyp,meta,box('mdat',randomBytes(filler))]);
}
test('CLI output format follows the extension; a --format that disagrees fails and writes nothing',async()=>withDir(async(dir)=>{
  const input=path.join(dir,'p.jpg');await writeFile(input,await plain());
  let r=cli(['render','--input',input,'--preset','uk-passport','--output',path.join(dir,'a.png')]);
  assert.equal(r.exit,0);assert.equal((await sharp(path.join(dir,'a.png')).metadata()).format,'png');
  r=cli(['render','--input',input,'--preset','uk-passport','--output',path.join(dir,'b.pdf')]);
  assert.equal(r.exit,0);assert.equal((await readFile(path.join(dir,'b.pdf'))).subarray(0,4).toString(),'%PDF');
  r=cli(['render','--input',input,'--preset','uk-passport','--output',path.join(dir,'c.JPEG')]);
  assert.equal((await sharp(path.join(dir,'c.JPEG')).metadata()).format,'jpeg');
  r=cli(['render','--input',input,'--preset','uk-passport','--format','jpeg','--output',path.join(dir,'d.png')]);
  assert.equal(r.exit,2);assert.equal(r.data.error.code,'FORMAT_EXTENSION_MISMATCH');assert.equal(await exists(path.join(dir,'d.png')),false);
  r=cli(['render','--input',input,'--preset','uk-passport','--output',path.join(dir,'e.webp')]);
  assert.equal(r.exit,2);assert.equal(r.data.error.code,'FORMAT_EXTENSION_MISMATCH');
  r=cli(['render','--input',input,'--preset','uk-passport','--format','png','--output',path.join(dir,'f.png')]);
  assert.equal(r.exit,0);
  r=cli(['sheet','--input',input,'--preset','uk-passport','--format','pdf','--output',path.join(dir,'g.png')]);
  assert.equal(r.data.error.code,'FORMAT_EXTENSION_MISMATCH');
}));
test('digital-original mode fails like the browser: stable code, exit 3, issues listed; HEIC bytes pass through unchanged',async()=>withDir(async(dir)=>{
  const good=path.join(dir,'good.jpg'),bytes=await noisy();await writeFile(good,bytes);
  let r=cli(['render','--input',good,'--preset','us-online','--output',path.join(dir,'copy.jpg')]);
  assert.equal(r.exit,0);assert.equal(r.data.result.original,true);assert((await readFile(path.join(dir,'copy.jpg'))).equals(bytes),'bytes changed');
  r=cli(['render','--input',good,'--preset','us-online','--output',path.join(dir,'copy.png')]);
  assert.equal(r.exit,2);assert.equal(r.data.error.code,'FORMAT_EXTENSION_MISMATCH');
  const webp=path.join(dir,'w.webp');await writeFile(webp,await sharp({create:{width:1000,height:1300,channels:3,background:'#808080',noise:{type:'gaussian',mean:128,sigma:40}}}).webp({quality:95}).toBuffer());
  r=cli(['render','--input',webp,'--preset','us-online','--output',path.join(dir,'w-out.webp')]);
  assert.equal(r.exit,3);assert.equal(r.data.ok,false);assert.equal(r.data.error.code,'ORIGINAL_NOT_ACCEPTED');
  assert(r.data.error.issues.some((i:{code:string})=>i.code==='UNSUPPORTED_ORIGINAL'));assert.equal(await exists(path.join(dir,'w-out.webp')),false);
  const tiny=path.join(dir,'tiny.jpg');await writeFile(tiny,await sharp({create:{width:400,height:500,channels:3,background:'#808080'}}).jpeg().toBuffer());
  r=cli(['render','--input',tiny,'--preset','uk-online','--output',path.join(dir,'tiny-out.jpg')]);
  assert.equal(r.exit,3);assert.equal(r.data.error.code,'ORIGINAL_NOT_ACCEPTED');
  const codes=r.data.error.issues.map((i:{code:string})=>i.code);assert(codes.includes('FILE_TOO_SMALL'));assert(codes.includes('LOW_RESOLUTION'));
  assert.doesNotMatch(JSON.stringify(r.data),/compliant|approved|guaranteed|verified|official/i);
  for(const brand of ['heic','heix','mif1']){
    const heic=fakeHeic(3024,4032,brand),file=path.join(dir,`i-${brand}.heic`),out=path.join(dir,`o-${brand}.heic`);
    await writeFile(file,heic);
    r=cli(['inspect','--input',file,'--preset','us-online']);
    assert.equal(r.exit,0);assert.equal(r.data.result.width,3024);assert.equal(r.data.result.height,4032);assert.equal(r.data.result.mime,brand==='mif1'?'image/heif':'image/heic');assert.deepEqual(r.data.result.issues,[]);
    r=cli(['render','--input',file,'--preset','us-online','--output',out]);
    assert.equal(r.exit,0,JSON.stringify(r.data));assert.equal(r.data.result.original,true);
    assert((await readFile(out)).equals(heic),'HEIC bytes changed');
  }
  const heic=fakeHeic(3024,4032),file=path.join(dir,'i-heic.heic');await writeFile(file,heic);
  r=cli(['render','--input',file,'--preset','us-online','--output',path.join(dir,'bad.jpg')]);
  assert.equal(r.exit,2);assert.equal(r.data.error.code,'FORMAT_EXTENSION_MISMATCH');
  r=cli(['render','--input',file,'--preset','us-passport','--output',path.join(dir,'bad2.jpg')]);
  assert.equal(r.exit,3);assert.equal(r.data.error.code,'UNSUPPORTED_IMAGE');
  r=cli(['render','--input',file,'--preset','uk-online','--output',path.join(dir,'bad3.heic')]);
  assert.equal(r.exit,3);assert.equal(r.data.error.code,'ORIGINAL_NOT_ACCEPTED');
  const small=path.join(dir,'small.heic');await writeFile(small,fakeHeic(3024,4032,'heic',100));
  r=cli(['render','--input',small,'--preset','us-online','--output',path.join(dir,'small-out.heic')]);
  assert.equal(r.exit,3);assert(r.data.error.issues.some((i:{code:string})=>i.code==='FILE_TOO_SMALL'));
  const projectOut=path.join(dir,'heic.portraitpass.json');
  r=cli(['project','--input',file,'--preset','us-online','--embed','--output',projectOut]);
  assert.equal(r.exit,0);
  r=cli(['render','--project',projectOut,'--output',path.join(dir,'from-project.heic')]);
  assert.equal(r.exit,0,JSON.stringify(r.data));assert((await readFile(path.join(dir,'from-project.heic'))).equals(heic),'HEIC bytes changed');
}));
test('overwrite guard protects --project, symlinks and hardlinks to it; the project file is untouched',async()=>withDir(async(dir)=>{
  const input=path.join(dir,'p.jpg');await writeFile(input,await plain());
  const project=path.join(dir,'p.portraitpass.json');
  assert.equal(cli(['project','--input',input,'--preset','uk-passport','--embed','--output',project]).exit,0);
  const before=await readFile(project);
  await symlink(project,path.join(dir,'sym.json'));await link(project,path.join(dir,'hard.json'));
  for(const target of [project,path.join(dir,'sym.json'),path.join(dir,'hard.json')])
    for(const extra of [[],['--overwrite']]){
      const r=cli(['render','--project',project,'--output',target,'--format','png',...extra]);
      assert.equal(r.exit,4,`${target} ${extra}`);assert.equal(r.data.error.code,'SOURCE_OVERWRITE');
    }
  assert.deepEqual(await readFile(project),before);
  const r=cli(['project','--input',input,'--preset','uk-passport','--output',input,'--overwrite']);
  assert.equal(r.data.error.code,'SOURCE_OVERWRITE');
}));
test('exit codes: INVALID_OUTPUT_KIND is not an output error; missing project and preset conflicts are typed',async()=>withDir(async(dir)=>{
  const input=path.join(dir,'p.jpg');await writeFile(input,await plain());
  const project=path.join(dir,'p.portraitpass.json');
  cli(['project','--input',input,'--preset','uk-passport','--embed','--output',project]);
  const value=JSON.parse(await readFile(project,'utf8'));
  await writeFile(path.join(dir,'kind.json'),JSON.stringify({...value,outputKind:'poster'}));
  let r=cli(['render','--project',path.join(dir,'kind.json'),'--output',path.join(dir,'k.jpg')]);
  assert.equal(r.data.error.code,'INVALID_OUTPUT_KIND');assert.equal(r.exit,2);
  r=cli(['render','--project',path.join(dir,'missing.json'),'--output',path.join(dir,'m.jpg')]);
  assert.equal(r.exit,3);assert.equal(r.data.error.code,'PROJECT_NOT_FOUND');assert.doesNotMatch(r.data.error.message,new RegExp(dir.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  await writeFile(path.join(dir,'junk.json'),'not json');
  r=cli(['render','--project',path.join(dir,'junk.json'),'--output',path.join(dir,'j.jpg')]);
  assert.equal(r.exit,2);assert.equal(r.data.error.code,'INVALID_PROJECT');
  r=cli(['render','--project',project,'--preset','us-passport','--output',path.join(dir,'c.jpg')]);
  assert.equal(r.exit,2);assert.equal(r.data.error.code,'PRESET_PROJECT_CONFLICT');assert.equal(await exists(path.join(dir,'c.jpg')),false);
  r=cli(['render','--project',project,'--preset','uk-passport','--output',path.join(dir,'same.jpg')]);
  assert.equal(r.exit,0);
  r=cli(['render','--input',input,'--output',path.join(dir,'x'),'--bogus']);
  assert.equal(r.exit,2);assert.equal(r.data.error.code,'INVALID_ARGUMENT');
  r=cli(['render','--input',input,'--preset','uk-passport','--crop','{oops','--output',path.join(dir,'x.jpg')]);
  assert.equal(r.exit,2);assert.equal(r.data.error.code,'INVALID_JSON');
  for(const bad of ['null','[]','5','"x"','{}','{"centerX":1}']){
    r=cli(['crop','--input',input,'--preset','uk-passport','--landmarks',bad]);
    assert.equal(r.exit,2,bad);assert.equal(r.data.error.code,'INVALID_JSON',bad);
  }
  r=cli(['render','--input',input,'--preset','uk-passport','--crop','null','--output',path.join(dir,'null.jpg')]);
  assert.equal(r.exit,2);assert.equal(r.data.error.code,'INVALID_JSON');assert.equal(await exists(path.join(dir,'null.jpg')),false);
  r=cli(['render','--input',input,'--preset','uk-passport','--output',path.join(dir,'nodir','x.jpg')]);
  assert.equal(r.exit,4);assert.equal(r.data.error.code,'OUTPUT_DIRECTORY');
}));
test('CLI background replacement on uk-passport embeds XMP, warns, and stamps PDF metadata',async()=>withDir(async(dir)=>{
  const input=path.join(dir,'p.jpg');await writeFile(input,await plain());
  const project=path.join(dir,'bg.portraitpass.json');
  cli(['project','--input',input,'--preset','uk-passport','--embed','--output',project]);
  const value=JSON.parse(await readFile(project,'utf8'));
  const mask=(await sharp({create:{width:1200,height:1600,channels:4,background:{r:255,g:255,b:255,alpha:0}}}).png().toBuffer()).toString('base64');
  value.background={enabled:true,color:'#00ff00',tolerance:24,maskDataUrl:'data:image/png;base64,'+mask};
  await writeFile(project,JSON.stringify(value));
  let r=cli(['render','--project',project,'--output',path.join(dir,'bg.jpg')]);
  assert.equal(r.exit,0,JSON.stringify(r.data));assert.equal(r.data.result.backgroundReplaced,true);assert.equal(r.data.result.warnings.length,1);
  assert.doesNotMatch(r.data.result.warnings[0],/compliant|approved|guaranteed|verified|official/i);
  const meta=await sharp(path.join(dir,'bg.jpg')).metadata();
  assert(meta.xmp?.toString().includes('Background replaced with PortraitPass'));
  {const px=[...(await sharp(path.join(dir,'bg.jpg')).removeAlpha().raw().toBuffer()).subarray(0,3)];assert(px[1]!>240&&px[0]!<20&&px[2]!<20,`expected green, got ${px}`);}
  r=cli(['sheet','--project',project,'--output',path.join(dir,'bg-sheet.pdf')]);
  assert.equal(r.exit,0);
  const pdf=await PDFDocument.load(await readFile(path.join(dir,'bg-sheet.pdf')),{updateMetadata:false});
  assert(pdf.getSubject()?.includes('an independent open-source tool, not affiliated with any government.'));
  assert(pdf.getKeywords()?.includes('Background replaced with PortraitPass'));
  value.background.enabled=false;await writeFile(project,JSON.stringify(value));
  r=cli(['render','--project',project,'--output',path.join(dir,'plain.png')]);
  assert.equal(r.data.result.backgroundReplaced,false);assert.deepEqual(r.data.result.warnings,[]);assert.equal((await sharp(path.join(dir,'plain.png')).metadata()).xmp,undefined);
}));
test('MCP: sheet respects the project paper and dpi, relative paths are rejected, typed errors are surfaced',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'portraitpass-mcp2-'));
  const transport=new StdioClientTransport({command:path.resolve('scripts/portraitpass-mcp'),args:[],cwd:dir,stderr:'pipe'});
  const client=new Client({name:'portraitpass-test',version:'1.0.0'});
  try{
    const input=path.join(dir,'p.jpg');await writeFile(input,await plain());
    const project=path.join(dir,'a4.portraitpass.json');
    assert.equal(cli(['project','--input',input,'--preset','uk-passport','--embed','--output',project]).exit,0);
    const value=JSON.parse(await readFile(project,'utf8'));value.paperId='a4';value.dpi=200;value.format='pdf';await writeFile(project,JSON.stringify(value));
    await client.connect(transport);
    const list=await client.listTools();
    for(const name of ['portraitpass_render','portraitpass_sheet','portraitpass_inspect','portraitpass_crop','portraitpass_project'])
      assert.match(JSON.stringify(list.tools.find(t=>t.name===name)),/absolute/i);
    const sheetSchema=list.tools.find(t=>t.name==='portraitpass_sheet')!.inputSchema as {properties:Record<string,{default?:unknown}>;required?:string[]};
    for(const key of ['paperId','overwrite','dpi','format']) assert.equal(sheetSchema.properties[key]?.default,undefined,key);
    const call=async(name:string,args:Record<string,unknown>)=>{const result=await client.callTool({name,arguments:args});return {isError:result.isError,...JSON.parse((result.content as {text:string}[])[0]!.text)};};
    let out=await call('portraitpass_sheet',{projectPath:project,output:path.join(dir,'from-project.pdf')});
    assert.equal(out.ok,true,JSON.stringify(out));
    let pdf=await PDFDocument.load(await readFile(path.join(dir,'from-project.pdf')),{updateMetadata:false});
    assert(Math.abs(pdf.getPage(0).getWidth()-210*72/25.4)<1e-6);assert.equal(out.result.widthMm,210);
    assert(pdf.getSubject()?.includes('not affiliated with any government'));
    out=await call('portraitpass_sheet',{projectPath:project,paperId:'letter',output:path.join(dir,'letter.pdf')});
    pdf=await PDFDocument.load(await readFile(path.join(dir,'letter.pdf')),{updateMetadata:false});
    assert(Math.abs(pdf.getPage(0).getWidth()-layoutSheet(getPreset('uk-passport'),'letter',200).widthMm*72/25.4)<1e-6);
    out=await call('portraitpass_sheet',{input,presetId:'uk-passport',output:path.join(dir,'default.pdf')});
    assert.equal(out.result.widthMm,152.4);assert.equal(out.result.layout.orientation,'landscape');
    out=await call('portraitpass_sheet',{projectPath:project,output:path.join(dir,'from-project.pdf')});
    assert.equal(out.error.code,'OUTPUT_EXISTS');
    out=await call('portraitpass_sheet',{projectPath:project,output:project,overwrite:true});
    assert.equal(out.error.code,'SOURCE_OVERWRITE');
    out=await call('portraitpass_render',{input,presetId:'uk-passport',output:path.join(dir,'x.png'),format:'jpeg'});
    assert.equal(out.error.code,'FORMAT_EXTENSION_MISMATCH');
    out=await call('portraitpass_render',{input,presetId:'uk-passport',output:path.join(dir,'inferred.png')});
    assert.equal(out.ok,true);assert.equal((await sharp(path.join(dir,'inferred.png')).metadata()).format,'png');
    out=await call('portraitpass_render',{projectPath:project,presetId:'us-passport',output:path.join(dir,'conflict.jpg')});
    assert.equal(out.error.code,'PRESET_PROJECT_CONFLICT');
    out=await call('portraitpass_render',{projectPath:path.join(dir,'missing.json'),output:path.join(dir,'m.jpg')});
    assert.equal(out.error.code,'PROJECT_NOT_FOUND');
    out=await call('portraitpass_render',{input,presetId:'us-online',output:path.join(dir,'o.jpg')});
    assert.equal(out.error.code,'ORIGINAL_NOT_ACCEPTED');assert(out.error.issues.length>0);
    for(const [name,args] of [
      ['portraitpass_inspect',{input:'p.jpg'}],
      ['portraitpass_crop',{input:'p.jpg',presetId:'us-passport'}],
      ['portraitpass_render',{input:'p.jpg',presetId:'us-passport',output:path.join(dir,'rel.jpg')}],
      ['portraitpass_render',{input,presetId:'us-passport',output:'rel.jpg'}],
      ['portraitpass_render',{projectPath:'a4.portraitpass.json',output:path.join(dir,'rel.jpg')}],
      ['portraitpass_sheet',{input,presetId:'us-passport',output:'rel.pdf'}],
      ['portraitpass_project',{input,presetId:'us-passport',output:'rel.json'}],
      ['portraitpass_project',{input:'p.jpg',presetId:'us-passport',output:path.join(dir,'rel.json')}],
    ] as [string,Record<string,unknown>][]){
      out=await call(name,args);
      assert.equal(out.isError,true,name);assert.equal(out.error.code,'PATH_NOT_ABSOLUTE',name);
    }
    assert.equal(await exists(path.join(dir,'rel.jpg')),false);assert.equal(await exists(path.join(dir,'rel.pdf')),false);
  }finally{await client.close();await rm(dir,{recursive:true,force:true});}
});

test('HEIC is only valid for the US online original: project, crop and render refuse it for print presets, CLI and MCP',async()=>withDir(async(dir)=>{
  const file=path.join(dir,'p.heic');await writeFile(file,fakeHeic(3024,4032));
  for(const preset of ['us-passport','uk-passport','general-id']){
    const out=path.join(dir,`${preset}.json`);
    let r=cli(['project','--input',file,'--preset',preset,'--embed','--output',out]);
    assert.equal(r.exit,3,preset);assert.equal(r.data.error.code,'UNSUPPORTED_IMAGE');assert.match(r.data.error.message,/JPEG/);assert.equal(await exists(out),false);
    r=cli(['crop','--input',file,'--preset',preset]);assert.equal(r.data.error.code,'UNSUPPORTED_IMAGE');
  }
  let r=cli(['project','--input',file,'--output',path.join(dir,'default.json')]);
  assert.equal(r.data.error.code,'UNSUPPORTED_IMAGE');assert.equal(await exists(path.join(dir,'default.json')),false);
  r=cli(['project','--input',file,'--preset','uk-online','--embed','--output',path.join(dir,'uk.json')]);
  assert.equal(r.exit,0);
  r=cli(['render','--project',path.join(dir,'uk.json'),'--output',path.join(dir,'uk.heic')]);
  assert.equal(r.data.error.code,'ORIGINAL_NOT_ACCEPTED');
  r=cli(['project','--input',file,'--preset','us-online','--output',path.join(dir,'us.json')]);
  assert.equal(r.exit,0);
  const transport=new StdioClientTransport({command:path.resolve('scripts/portraitpass-mcp'),args:[],cwd:dir,stderr:'pipe'});
  const client=new Client({name:'portraitpass-test',version:'1.0.0'});
  try{
    await client.connect(transport);
    const call=async(name:string,args:Record<string,unknown>)=>{const result=await client.callTool({name,arguments:args});return {isError:result.isError,...JSON.parse((result.content as {text:string}[])[0]!.text)};};
    let out=await call('portraitpass_project',{input:file,presetId:'us-passport',output:path.join(dir,'mcp.json')});
    assert.equal(out.isError,true);assert.equal(out.error.code,'UNSUPPORTED_IMAGE');assert.equal(await exists(path.join(dir,'mcp.json')),false);
    out=await call('portraitpass_project',{input:file,presetId:'us-online',output:path.join(dir,'mcp-us.json')});
    assert.equal(out.ok,true);
  }finally{await client.close();}
}));
test('CLI render reports checks and warnings for saved landmarks without blocking',async()=>withDir(async(dir)=>{
  const input=path.join(dir,'p.jpg');await writeFile(input,await plain());
  const project=path.join(dir,'lm.portraitpass.json');
  assert.equal(cli(['project','--input',input,'--preset','us-passport','--embed','--output',project]).exit,0);
  const value=JSON.parse(await readFile(project,'utf8'));
  value.crop={x:0,y:0,width:1200,height:1200};value.landmarks={centerX:600,crownY:100,chinY:900,eyesY:300};
  await writeFile(project,JSON.stringify(value));
  let r=cli(['render','--project',project,'--output',path.join(dir,'lm.jpg')]);
  assert.equal(r.exit,0,JSON.stringify(r.data));
  assert.equal(r.data.result.checks.find((c:{id:string})=>c.id==='eyes').status,'fail');
  assert.equal(r.data.result.warnings.length,1);
  r=cli(['sheet','--project',project,'--output',path.join(dir,'lm-sheet.pdf')]);
  assert.equal(r.exit,0);assert(Array.isArray(r.data.result.checks));
}));

const noisyJpeg=(width=2000,height=2000)=>sharp({create:{width,height,channels:3,background:'#808080',noise:{type:'gaussian',mean:128,sigma:50}}}).jpeg({quality:92}).toBuffer();
test('CLI: --layout and --orientation on layout and sheet, invalid values are INVALID_ARGUMENT-style failures',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'portraitpass-cli-layout-'));
  try{
    const input=path.join(dir,'p.jpg');await writeFile(input,await sharp({create:{width:1200,height:1600,channels:3,background:'#8099bb'}}).jpeg().toBuffer());
    let r=cli(['layout','--preset','uk-passport','--paper','4x6']);assert.equal(r.data.result.placements.length,8);assert.equal(r.data.result.orientation,'landscape');
    r=cli(['layout','--preset','uk-passport','--paper','4x6','--layout','cut-marks']);assert.equal(r.data.result.placements.length,6);assert.equal(r.data.result.style,'cut-marks');
    r=cli(['layout','--preset','uk-passport','--paper','4x6','--orientation','portrait']);assert.equal(r.data.result.placements.length,6);assert.equal(r.data.result.orientation,'portrait');
    r=cli(['layout','--preset','uk-passport','--paper','letter']);assert.equal(r.data.result.placements.length,28);assert.equal(r.data.result.style,'cut-marks');
    r=cli(['layout','--preset','uk-passport','--paper','letter','--layout','edge-to-edge']);assert.equal(r.data.result.placements.length,36);
    r=cli(['layout','--preset','uk-passport','--layout','fancy']);assert.equal(r.exit,2);assert.equal(r.data.error.code,'INVALID_SHEET_STYLE');
    r=cli(['layout','--preset','uk-passport','--orientation','sideways']);assert.equal(r.exit,2);assert.equal(r.data.error.code,'INVALID_SHEET_ORIENTATION');
    // The PDF page follows the resolved orientation.
    r=cli(['sheet','--input',input,'--preset','uk-passport','--paper','4x6','--output',path.join(dir,'e.pdf')]);assert.equal(r.exit,0,JSON.stringify(r.data));assert.equal(r.data.result.count,8);assert.equal(r.data.result.layout.orientation,'landscape');
    let pdf=await PDFDocument.load(await readFile(path.join(dir,'e.pdf')),{updateMetadata:false});assert(Math.abs(pdf.getPage(0).getWidth()-152.4*72/25.4)<1e-6);assert(Math.abs(pdf.getPage(0).getHeight()-101.6*72/25.4)<1e-6);
    r=cli(['sheet','--input',input,'--preset','uk-passport','--paper','4x6','--layout','cut-marks','--orientation','portrait','--output',path.join(dir,'c.pdf')]);assert.equal(r.data.result.count,6);
    pdf=await PDFDocument.load(await readFile(path.join(dir,'c.pdf')),{updateMetadata:false});assert(Math.abs(pdf.getPage(0).getWidth()-101.6*72/25.4)<1e-6);
    // Raster sheet: pixels follow the oriented layout.
    r=cli(['sheet','--input',input,'--preset','uk-passport','--paper','4x6','--output',path.join(dir,'e.png')]);assert.equal(r.exit,0);const meta=await sharp(path.join(dir,'e.png')).metadata();assert.equal(meta.width,1800);assert.equal(meta.height,1200);
    r=cli(['sheet','--input',input,'--preset','uk-passport','--layout','bogus','--output',path.join(dir,'z.pdf')]);assert.equal(r.exit,2);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('CLI digital: DV lottery 600x600 under 240 KB, SSC-like 20-50 KB, padding, unreachable, no upscaling',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'portraitpass-cli-digital-'));
  try{
    const input=path.join(dir,'p.jpg');await writeFile(input,await noisyJpeg());
    let r=cli(['digital','--input',input,'--preset','us-passport','--width','600','--height','600','--max-kb','240','--kb-bytes','1000','--output',path.join(dir,'dv.jpg')]);
    assert.equal(r.exit,0,JSON.stringify(r.data));
    const dv=await readFile(path.join(dir,'dv.jpg'));const m=await sharp(dv).metadata();
    assert.equal(m.width,600);assert.equal(m.height,600);assert.equal(m.format,'jpeg');assert(dv.length<=240_000,String(dv.length));assert.equal(r.data.result.bytes,dv.length);assert.equal(r.data.result.padded,false);assert(r.data.result.quality>=0.3);
    assert(Array.isArray(r.data.result.checks)&&Array.isArray(r.data.result.warnings)&&Array.isArray(r.data.result.fileChecks));
    // A different shape from the preset: the crop is derived from the target, and measurements are skipped with a warning.
    r=cli(['digital','--input',input,'--preset','general-id','--width','200','--height','230','--min-kb','20','--max-kb','50','--output',path.join(dir,'ssc.jpg')]);
    assert.equal(r.exit,0,JSON.stringify(r.data));const ssc=await readFile(path.join(dir,'ssc.jpg'));const sm=await sharp(ssc).metadata();
    assert.equal(sm.width,200);assert.equal(sm.height,230);assert(ssc.length>=20*1024&&ssc.length<=50*1024,String(ssc.length));
    // Unreachable: a huge noisy target under a tiny cap.
    r=cli(['digital','--input',input,'--preset','us-passport','--width','1200','--height','1200','--max-kb','20','--output',path.join(dir,'no.jpg')]);assert.equal(r.exit,2);assert.equal(r.data.error.code,'FILE_SIZE_UNREACHABLE');assert.match(r.data.error.message,/smaller pixel size/);
    // Never enlarges.
    r=cli(['digital','--input',input,'--preset','us-passport','--width','2400','--height','2400','--max-kb','900','--output',path.join(dir,'up.jpg')]);assert.equal(r.exit,2);assert.equal(r.data.error.code,'LOW_RESOLUTION');
    r=cli(['digital','--input',input,'--preset','us-passport','--width','600','--height','600','--max-kb','nope','--output',path.join(dir,'x.jpg')]);assert.equal(r.exit,2);assert.equal(r.data.error.code,'INVALID_DIGITAL_TARGET');
    r=cli(['digital','--input',input,'--preset','us-passport','--width','600','--output',path.join(dir,'x.jpg')]);assert.equal(r.exit,2);assert.equal(r.data.error.code,'ARGUMENT_REQUIRED');
    r=cli(['digital','--input',input,'--preset','us-passport','--width','600','--height','600','--max-kb','240','--output',path.join(dir,'x.png')]);assert.equal(r.exit,2);assert.equal(r.data.error.code,'FORMAT_EXTENSION_MISMATCH');
    r=cli(['digital','--input',input,'--preset','us-online','--width','600','--height','600','--output',path.join(dir,'o.jpg')]);assert.equal(r.exit,2);assert.equal(r.data.error.code,'ORIGINAL_ONLY');
    r=cli(['digital','--input',input,'--preset','us-passport','--width','600','--height','600','--max-kb','240','--output',path.join(dir,'dv.jpg')]);assert.equal(r.exit,4);assert.equal(r.data.error.code,'OUTPUT_EXISTS');
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('MCP digital tool and sheet style/orientation parameters',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'portraitpass-mcp-digital-'));
  const transport=new StdioClientTransport({command:path.resolve('scripts/portraitpass-mcp'),args:[],cwd:dir,stderr:'pipe'});
  const client=new Client({name:'portraitpass-test',version:'1.0.0'});
  try{
    const input=path.join(dir,'p.jpg');await writeFile(input,await noisyJpeg());
    await client.connect(transport);
    const list=await client.listTools();
    const digital=list.tools.find(t=>t.name==='portraitpass_digital')!;assert(digital);assert.match(JSON.stringify(digital),/absolute/i);
    const props=(digital.inputSchema as {properties:Record<string,{default?:unknown}>}).properties;for(const k of ['minKB','maxKB','kbBytes','crop','overwrite'])assert.equal(props[k]?.default,undefined,k);
    const sheetProps=(list.tools.find(t=>t.name==='portraitpass_sheet')!.inputSchema as {properties:Record<string,{default?:unknown}>}).properties;for(const k of ['sheetStyle','sheetOrientation']){assert(sheetProps[k],k);assert.equal(sheetProps[k]!.default,undefined,k);}
    const call=async(name:string,args:Record<string,unknown>)=>{const result=await client.callTool({name,arguments:args});return {isError:result.isError,...JSON.parse((result.content as {text:string}[])[0]!.text)};};
    let out=await call('portraitpass_digital',{input,presetId:'us-passport',widthPx:600,heightPx:600,maxKB:240,kbBytes:1000,output:path.join(dir,'dv.jpg')});
    assert.equal(out.ok,true,JSON.stringify(out));assert(out.result.bytes<=240_000);assert.equal(out.result.width,600);assert.equal(typeof out.result.quality,'number');assert.equal(out.result.padded,false);
    const meta=await sharp(await readFile(path.join(dir,'dv.jpg'))).metadata();assert.equal(meta.width,600);assert.equal(meta.height,600);
    out=await call('portraitpass_digital',{input,presetId:'us-passport',widthPx:600,heightPx:600,output:'rel.jpg'});assert.equal(out.error.code,'PATH_NOT_ABSOLUTE');
    out=await call('portraitpass_digital',{input,presetId:'us-passport',widthPx:1200,heightPx:1200,maxKB:20,output:path.join(dir,'no.jpg')});assert.equal(out.error.code,'FILE_SIZE_UNREACHABLE');assert.equal(out.isError,true);
    out=await call('portraitpass_sheet',{input,presetId:'uk-passport',paperId:'4x6',sheetStyle:'cut-marks',sheetOrientation:'portrait',output:path.join(dir,'s.pdf')});assert.equal(out.result.count,6);assert.equal(out.result.layout.style,'cut-marks');assert.equal(out.result.widthMm,101.6);
    out=await call('portraitpass_layout',{presetId:'us-passport',paperId:'4x6'});assert.equal(out.result.placements.length,6);
    out=await call('portraitpass_layout',{presetId:'uk-passport',paperId:'letter',sheetStyle:'edge-to-edge'});assert.equal(out.result.placements.length,36);assert.equal(out.result.orientation,'portrait');
  }finally{await client.close();await rm(dir,{recursive:true,force:true});}
});
