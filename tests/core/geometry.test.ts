import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sheetMm,mmToPixels,PRESETS,PAPERS,getPreset,defaultCrop,outputSize,layoutSheet,clampCrop,zoomCrop,cropFromLandmarks,headMeasurement,createProject,validateProject,parseProject,projectPreset,cropIssues,originalIssues,guideBands,measurementChecks,backgroundWarning } from '../../src/core/index.js';
test('golden physical pixels and default crops',()=>{assert.deepEqual(outputSize(getPreset('us-passport')),{width:600,height:600,dpi:300});assert.deepEqual(outputSize(getPreset('uk-passport')),{width:413,height:531,dpi:300});assert.deepEqual(defaultCrop(1200,1600,getPreset('us-passport')),{x:0,y:200,width:1200,height:1200});assert.deepEqual(defaultCrop(1200,1600,getPreset('uk-online')),{x:0,y:0,width:1200,height:1600});});
test('all presets crops stay in bounds and retain correct aspect across dimensions',()=>{for(const preset of PRESETS)for(const w of [1,601,1200,4000])for(const h of [1,719,1600,3000]){const c=defaultCrop(w,h,preset);assert(c.x>=0&&c.y>=0&&c.x+c.width<=w+.001&&c.y+c.height<=h+.001);if(preset.mode!=='original')assert(Math.abs(c.width/c.height-preset.widthMm/preset.heightMm)<1e-10);for(const factor of [.01,.7,1,4,100]){const z=zoomCrop(c,factor,w,h);assert(z.x>=0&&z.y>=0&&z.x+z.width<=w+.001&&z.y+z.height<=h+.001);assert(Math.abs(z.width/z.height-c.width/c.height)<1e-8);}}});
test('bad geometry rejected and low resolution never approved',()=>{const p=getPreset('us-passport');assert.throws(()=>defaultCrop(0,300,p));assert.throws(()=>clampCrop({x:NaN,y:0,width:300,height:300},600,600));assert.throws(()=>outputSize(p,601));assert(cropIssues({x:0,y:0,width:599,height:599},600,600,p).some(x=>x.code==='LOW_RESOLUTION'));assert(cropIssues({x:0,y:0,width:600,height:599},600,600,p).some(x=>x.code==='LOW_RESOLUTION'));});
test('landmark proposal achieves head midpoint when source allows it',()=>{const p=getPreset('uk-passport');const l={centerX:1500,crownY:800,eyesY:1100,chinY:1700};const crop=cropFromLandmarks(3000,3000,p,l);const measurement=headMeasurement(crop,p,l);assert(Math.abs(measurement.heightMm-31.5)<1e-9);assert.equal(measurement.inRange,true);assert.throws(()=>cropFromLandmarks(3000,3000,p,{...l,eyesY:300}));});
// [4x6, a4, letter] photos per sheet, orientation "auto".
const COUNTS:Record<string,Record<'cut-marks'|'edge-to-edge',number[]>>={
  'us-passport':{'cut-marks':[2,15,15],'edge-to-edge':[6,20,20]},
  'uk-passport':{'cut-marks':[6,30,28],'edge-to-edge':[8,36,36]},
  'au-passport':{'cut-marks':[6,30,28],'edge-to-edge':[8,36,36]},
  'general-id':{'cut-marks':[6,30,28],'edge-to-edge':[8,36,36]},
};
const overlap=(a:{x:number;y:number;width:number;height:number},b:typeof a)=>!(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y);
test('sheet packing exact counts for every preset, paper and style; placements inside the page, no overlaps, guides never inside a photo',()=>{
  for(const p of PRESETS.filter(p=>p.mode!=='original'))for(const style of ['cut-marks','edge-to-edge'] as const)PAPERS.forEach((paper,index)=>{
    const layout=layoutSheet(p,paper,300,{style});
    const label=`${p.id} ${paper.id} ${style}`;
    assert.equal(layout.placements.length,COUNTS[p.id]![style][index],label);
    assert.equal(layout.columns*layout.rows,layout.placements.length,label);
    assert.equal(layout.style,style);
    assert.deepEqual(layout,layoutSheet(p,paper,300,{style,orientation:'auto'}),label);
    const margin=style==='cut-marks'?35:0;
    for(const [i,a]of layout.placements.entries()){
      assert(a.x>=margin&&a.y>=margin&&a.x+a.width<=layout.width-margin&&a.y+a.height<=layout.height-margin,label);
      for(const b of layout.placements.slice(i+1))assert(!overlap(a,b),label);
      for(const m of layout.cutMarks){
        const midX=(m.x1+m.x2)/2,midY=(m.y1+m.y2)/2;
        assert(!(midX>a.x&&midX<a.x+a.width&&midY>a.y&&midY<a.y+a.height),label);
        assert(Math.min(m.x1,m.x2,m.y1,m.y2)>=0&&Math.max(m.x1,m.x2)<=layout.width&&Math.max(m.y1,m.y2)<=layout.height,label);
        // No guide passes through the interior of any photo.
        if(style==='edge-to-edge'){if(m.x1===m.x2)assert(!(m.x1>a.x&&m.x1<a.x+a.width&&Math.max(m.y1,m.y2)>a.y&&Math.min(m.y1,m.y2)<a.y+a.height),label);else assert(!(m.y1>a.y&&m.y1<a.y+a.height&&Math.max(m.x1,m.x2)>a.x&&Math.min(m.x1,m.x2)<a.x+a.width),label);}
      }
    }
  });
  assert.throws(()=>layoutSheet(getPreset('uk-online'),'4x6'));
});
test('default style is edge-to-edge on 4x6 and cut marks on A4 and Letter; orientation defaults to auto',()=>{
  const uk=getPreset('uk-passport');
  assert.equal(layoutSheet(uk,'4x6').style,'edge-to-edge');assert.equal(layoutSheet(uk,'a4').style,'cut-marks');assert.equal(layoutSheet(uk,'letter').style,'cut-marks');
  assert.deepEqual(layoutSheet(uk,'a4'),layoutSheet(uk,'a4',300,{style:'cut-marks',orientation:'auto'}));
});
test('edge-to-edge 4x6: US 2x2 is 6 photos (2x3); 35x45 is landscape 4x2 = 8; tiles start at the corner or are centred',()=>{
  const us=layoutSheet(getPreset('us-passport'),'4x6');
  assert.equal(us.placements.length,6);assert.equal(us.columns,2);assert.equal(us.rows,3);assert.equal(us.orientation,'portrait');
  assert.equal(us.width,1200);assert.equal(us.height,1800);assert.deepEqual(us.placements[0],{x:0,y:0,width:600,height:600});
  // Guides: one line per shared edge (1 vertical, 2 horizontal), none on the paper edge.
  assert.equal(us.cutMarks.length,3);
  const uk=layoutSheet(getPreset('uk-passport'),'4x6');
  assert.equal(uk.placements.length,8);assert.equal(uk.columns,4);assert.equal(uk.rows,2);assert.equal(uk.orientation,'landscape');
  assert.equal(uk.width,1800);assert.equal(uk.height,1200);assert.equal(uk.widthMm,152.4);assert.equal(uk.heightMm,101.6);
  // 1800-4*413=148 and 1200-2*531=138 left over: centred, so 74 and 69 px offsets.
  assert.equal(uk.placements[0]!.x,74);assert.equal(uk.placements[0]!.y,69);
  assert.equal(uk.cutMarks.length,4);
});
test('orientation option: auto picks the higher count, ties go to portrait, portrait/landscape are forced',()=>{
  const uk=getPreset('uk-passport'),us=getPreset('us-passport');
  assert.equal(layoutSheet(uk,'letter').orientation,'landscape');
  const letterLandscape=layoutSheet(uk,'letter',300,{orientation:'landscape'});assert.equal(letterLandscape.width,mmToPixels(279.4));assert.equal(letterLandscape.height,mmToPixels(215.9));assert.equal(letterLandscape.widthMm,279.4);
  const letterPortrait=layoutSheet(uk,'letter',300,{orientation:'portrait'});assert.equal(letterPortrait.orientation,'portrait');assert.equal(letterPortrait.placements.length,25);assert.equal(letterLandscape.placements.length,28);
  assert.equal(layoutSheet(us,'4x6').orientation,'portrait');
  assert.equal(layoutSheet(us,'4x6',300,{orientation:'landscape'}).orientation,'landscape');
  assert.equal(layoutSheet(uk,'a4',300,{style:'edge-to-edge',orientation:'landscape'}).placements.length,32);
  assert.throws(()=>layoutSheet(us,'4x6',300,{orientation:'sideways' as never}),{code:'INVALID_SHEET_ORIENTATION'});
  assert.throws(()=>layoutSheet(us,'4x6',300,{style:'fancy' as never}),{code:'INVALID_SHEET_STYLE'});
  assert.throws(()=>layoutSheet({...uk,widthMm:100,heightMm:150},'4x6',300,{style:'cut-marks'}),{code:'PAPER_TOO_SMALL'});
});
test('project stores sheetStyle and sheetOrientation; bad values are rejected',()=>{
  const p=createProject({name:'a.jpg',mime:'image/jpeg',width:1200,height:1600},'uk-passport');
  const ok=validateProject({...p,sheetStyle:'cut-marks',sheetOrientation:'landscape'});assert(ok.valid);assert.equal(ok.project!.sheetStyle,'cut-marks');assert.equal(ok.project!.sheetOrientation,'landscape');
  assert.equal('sheetStyle' in validateProject(p).project!,false);
  assert.equal(validateProject({...p,sheetStyle:'x'}).valid,false);assert.equal(validateProject({...p,sheetOrientation:'x'}).valid,false);
  assert.deepEqual(parseProject(JSON.stringify({...p,sheetStyle:'edge-to-edge'})).sheetStyle,'edge-to-edge');
});
test('project roundtrip, custom dimensions, malformed and forbidden settings',()=>{const p=createProject({name:'sample.jpg',mime:'image/jpeg',width:1200,height:1600});assert(validateProject(p).valid);assert.deepEqual(parseProject(JSON.stringify(p)),p);assert.equal(validateProject({...p,version:2}).valid,false);assert.equal(validateProject({...p,crop:{x:0,y:0,width:0,height:2}}).valid,false);assert.equal(validateProject({...p,background:{...p.background,enabled:true}}).valid,true);const custom=createProject(p.source,'general-id');custom.customSize={widthMm:40,heightMm:50};custom.crop=defaultCrop(1200,1600,projectPreset(custom));assert(validateProject(custom).valid);assert.equal(projectPreset(custom).widthMm,40);assert.equal(validateProject({...custom,customSize:{widthMm:Infinity,heightMm:50}}).valid,false);assert.throws(()=>parseProject('{'));});
test('online policies preserve full crop and basic properties',()=>{const p=createProject({name:'a.png',mime:'image/png',width:1200,height:1600},'uk-online');assert(validateProject(p).valid);assert(!validateProject({...p,crop:{x:0,y:0,width:1000,height:1600}}).valid);assert(!validateProject({...p,format:'jpeg'}).valid);assert.deepEqual(originalIssues({width:1200,height:1600,mime:'image/png',bytes:100000},getPreset('us-online')),[]);assert(originalIssues({width:599,height:749,mime:'image/jpeg',bytes:49000},getPreset('uk-online')).length===2);});
test('custom size with extra keys is rejected, clean size is rebuilt',()=>{const p=createProject({name:'a.jpg',mime:'image/jpeg',width:1200,height:1600},'general-id');p.customSize={widthMm:35,heightMm:45,mode:'original',id:'uk-online',name:'x'} as unknown as typeof p.customSize;assert.equal(projectPreset(p).mode,'general');assert.equal(projectPreset(p).id,'general-id');const bad=validateProject(p);assert.equal(bad.valid,false);assert(bad.issues.some(i=>i.code==='INVALID_CUSTOM_SIZE'));for(const extra of [{widthMm:35,heightMm:45,mode:'original'},{widthMm:35,heightMm:45,__proto__x:1},{widthMm:35},{widthMm:'35',heightMm:45},[35,45]])assert.equal(validateProject({...p,customSize:extra}).valid,false);p.customSize={widthMm:35,heightMm:45};const ok=validateProject(p);assert(ok.valid);assert.deepEqual(Object.keys(ok.project!.customSize!).sort(),['heightMm','widthMm']);p.format='original';assert(!validateProject(p).valid);});

const US_EYE_MID=(getPreset('us-passport').eyeMinMm!+getPreset('us-passport').eyeMaxMm!)/2;
test('US crop puts the eyes at the middle of the band whatever the eye position within the head',()=>{const p=getPreset('us-passport');for(const eyeFraction of [0.45,0.5,0.56]){const crownY=800,headPx=1000,l={centerX:1500,crownY,chinY:crownY+headPx,eyesY:crownY+headPx*eyeFraction};const crop=cropFromLandmarks(3000,3000,p,l);const m=headMeasurement(crop,p,l);assert(Math.abs(m.eyesFromBottomMm-US_EYE_MID)<1e-6,`eyes at ${eyeFraction}: ${m.eyesFromBottomMm}`);assert.equal(m.inRange,true);assert(Math.abs(m.heightMm-(p.headMinMm!+p.headMaxMm!)/2)<1e-6);assert(crop.x>=0&&crop.y>=0&&crop.x+crop.width<=3000+1e-6&&crop.y+crop.height<=3000+1e-6);assert(!cropIssues(crop,3000,3000,p,300,l).some(i=>i.code==='EYE_LINE'));}});
test('head stays in range for UK, AU and US crops across head sizes',()=>{for(const id of ['uk-passport','au-passport','us-passport']){const p=getPreset(id);for(const headPx of [400,900,1400]){const l={centerX:1800,crownY:900,chinY:900+headPx,eyesY:900+headPx*0.48};const crop=cropFromLandmarks(4000,4000,p,l);const m=headMeasurement(crop,p,l);assert.equal(m.inRange,true,`${id} head ${headPx}: ${m.heightMm}`);}}});
test('when the source edge blocks the ideal crop, head size stays in range and the crop stays inside the source',()=>{const p=getPreset('us-passport');const l={centerX:900,crownY:500,chinY:1400,eyesY:900};const crop=cropFromLandmarks(1800,1500,p,l);assert(crop.x>=0&&crop.y>=0&&crop.x+crop.width<=1800+1e-6&&crop.y+crop.height<=1500+1e-6);assert.equal(headMeasurement(crop,p,l).inRange,true);const tight=cropFromLandmarks(1000,1000,p,{centerX:500,crownY:100,chinY:900,eyesY:400});assert(tight.x+tight.width<=1000+1e-6&&tight.y+tight.height<=1000+1e-6);});
test('eye-line issue appears only when the eyes are outside the band',()=>{const p=getPreset('us-passport');const l={centerX:1000,crownY:400,chinY:1000,eyesY:600};const low=cropFromLandmarks(2000,2000,p,l);assert(!cropIssues(low,2000,2000,p,300,l).some(i=>i.code==='EYE_LINE'));const shifted={...low,y:low.y-200};const issues=cropIssues(shifted,2000,2000,p,300,l);assert(issues.some(i=>i.code==='EYE_LINE'&&/mm above the bottom edge/.test(i.message)));assert(!cropIssues(shifted,2000,2000,getPreset('uk-passport'),300,l).some(i=>i.code==='EYE_LINE'));});
test('landmarks need crown < eyes < chin strictly, in validation and in cropFromLandmarks',()=>{const p=getPreset('uk-passport');const l={centerX:1500,crownY:800,eyesY:1100,chinY:1700};for(const bad of [{...l,eyesY:l.crownY},{...l,eyesY:l.chinY},{...l,eyesY:700}])assert.throws(()=>cropFromLandmarks(3000,3000,p,bad),{code:'INVALID_LANDMARKS'});const proj=createProject({name:'a.jpg',mime:'image/jpeg',width:3000,height:3000},'uk-passport');proj.landmarks=l;assert(validateProject(proj).valid);for(const bad of [{...l,eyesY:l.crownY},{...l,eyesY:l.chinY}]){const r=validateProject({...proj,landmarks:bad});assert.equal(r.valid,false);assert(r.issues.some(i=>i.code==='INVALID_LANDMARKS'&&/eyes strictly between/.test(i.message)));}});
test('segmentation mask is dropped when background is off and kept when on',()=>{const mask='data:image/png;base64,iVBORw0KGgo=';const p=createProject({name:'a.jpg',mime:'image/jpeg',width:1200,height:1600},'uk-passport');const off=validateProject({...p,background:{...p.background,enabled:false,maskDataUrl:mask}});assert(off.valid);assert.equal('maskDataUrl' in off.project!.background,false);const on=validateProject({...p,background:{...p.background,enabled:true,maskDataUrl:mask}});assert(on.valid);assert.equal(on.project!.background.maskDataUrl,mask);assert.equal(validateProject({...p,background:{...p.background,enabled:true,maskDataUrl:'javascript:1'}}).valid,false);assert.equal(parseProject(JSON.stringify({...p,background:{...p.background,maskDataUrl:mask}})).background.maskDataUrl,undefined);});
test('unknown top-level and nested keys never reach the validated project',()=>{const p=createProject({name:'a.jpg',mime:'image/jpeg',width:1200,height:1600},'us-passport');const r=validateProject({...p,evil:1,source:{...p.source,extra:1},crop:{...p.crop,extra:1},background:{...p.background,extra:1}});assert(r.valid);assert.deepEqual(r.project,p);});
test('background replacement: allowed for print presets, rejected for digital originals, warning follows the policy',()=>{const bg={enabled:true,color:'#ffffff',tolerance:32};const print=createProject({name:'a.jpg',mime:'image/jpeg',width:1200,height:1600},'uk-passport');assert(validateProject({...print,background:bg}).valid);const online=createProject({name:'a.jpg',mime:'image/jpeg',width:1200,height:1600},'uk-online');const r=validateProject({...online,background:bg});assert.equal(r.valid,false);assert(r.issues.some(i=>i.code==='BACKGROUND_FORBIDDEN'));assert.match(backgroundWarning(getPreset('uk-passport'))!,/does not accept digitally altered photos/);assert.equal(backgroundWarning(getPreset('general-id')),null);});
test('HEIC sources are accepted for digital originals only',()=>{const src={name:'a.heic',mime:'image/heic',width:1200,height:1600} as unknown as Parameters<typeof createProject>[0];assert(validateProject(createProject(src,'us-online')).valid);const r=validateProject(createProject(src,'us-passport'));assert.equal(r.valid,false);assert(r.issues.some(i=>i.code==='INVALID_SOURCE'));const heic=originalIssues({width:3000,height:3000,mime:'image/heic',bytes:900000},getPreset('us-online'));assert.deepEqual(heic,[]);const bad=originalIssues({width:3000,height:3000,mime:'image/webp',bytes:900000},getPreset('us-online'));assert.equal(bad[0]!.code,'UNSUPPORTED_ORIGINAL');assert.match(bad[0]!.message,/JPEG, PNG, HEIC or HEIF/);assert.doesNotMatch(bad[0]!.message,/official/i);});
test('guideBands come straight from preset data',()=>{assert.deepEqual(guideBands(getPreset('us-passport')),{head:{minMm:25.4,maxMm:34.925},eyesFromBottom:{minMm:28.575,maxMm:34.925}});assert.deepEqual(guideBands(getPreset('uk-passport')),{head:{minMm:29,maxMm:34}});assert.deepEqual(guideBands(getPreset('au-passport')),{head:{minMm:32,maxMm:36}});assert.deepEqual(guideBands(getPreset('general-id')),{});assert.deepEqual(guideBands(getPreset('us-online')),{});});
test('measurementChecks pass, fail, unknown and upscaling cases',()=>{const p=getPreset('us-passport');const l={centerX:1500,crownY:800,eyesY:1300,chinY:1800};const good=cropFromLandmarks(3000,3000,p,l);const byId=(c:ReturnType<typeof measurementChecks>)=>Object.fromEntries(c.map(x=>[x.id,x]));let c=byId(measurementChecks(p,good,l,{width:3000,height:3000}));for(const id of ['head','eyes','centre','resolution'])assert.equal(c[id]!.status,'pass',id);assert(Math.abs(c.eyes!.valueMm!-US_EYE_MID)<1e-6);assert.equal(c.eyes!.minMm,28.575);assert.equal(c.head!.maxMm,34.925);assert(c.resolution!.ppi!>=300);const zoomedOut={...good,x:good.x,y:good.y,width:good.width*1.5,height:good.height*1.5};c=byId(measurementChecks(p,zoomedOut,l,{width:3000,height:3000}));assert.equal(c.head!.status,'fail');const tooSmall=byId(measurementChecks(p,{x:0,y:0,width:500,height:500},{centerX:250,crownY:50,eyesY:250,chinY:450},{width:500,height:500}));assert.equal(tooSmall.resolution!.status,'fail');assert.match(tooSmall.resolution!.message,/without enlarging/);assert(tooSmall.resolution!.ppi!<300);const off=byId(measurementChecks(p,good,{...l,centerX:l.centerX+300},{width:3000,height:3000}));assert.equal(off.centre!.status,'fail');const none=byId(measurementChecks(p,good,undefined,{width:3000,height:3000}));assert.equal(none.head!.status,'unknown');assert.equal(none.resolution!.status,'pass');const uk=byId(measurementChecks(getPreset('uk-passport'),{x:0,y:0,width:900,height:1157},{centerX:450,crownY:100,eyesY:400,chinY:800},{width:1000,height:1200}));assert.equal(uk.eyes!.status,'unknown');assert.equal(uk.head!.status,'fail');const orig=byId(measurementChecks(getPreset('uk-online'),{x:0,y:0,width:500,height:600},undefined,{width:500,height:600}));assert.equal(orig.resolution!.status,'fail');for(const m of Object.values({...c,...uk,...orig}))assert.doesNotMatch(m.message,/compliant|approved|guaranteed|verified|official/i);});

test('sheetMm: edge-to-edge tiles at exact millimetres with no overlap, inside the page; cut-marks keep exact photo size',()=>{
  for(const p of PRESETS.filter(p=>p.mode!=='original'))for(const paper of PAPERS)for(const style of ['edge-to-edge','cut-marks'] as const){
    const layout=layoutSheet(p,paper,300,{style});const mm=sheetMm(layout,p);
    assert.equal(mm.placements.length,layout.placements.length);
    for(const [i,a] of mm.placements.entries()){
      assert.equal(a.width,p.widthMm);assert.equal(a.height,p.heightMm);
      assert(a.x>=-1e-9&&a.y>=-1e-9&&a.x+a.width<=layout.widthMm+1e-9&&a.y+a.height<=layout.heightMm+1e-9,`${p.id} ${paper.id} ${style}`);
      for(const b of mm.placements.slice(i+1))assert(a.x+a.width<=b.x+1e-9||b.x+b.width<=a.x+1e-9||a.y+a.height<=b.y+1e-9||b.y+b.height<=a.y+1e-9,`${p.id} ${paper.id} ${style}`);
    }
  }
  const uk=sheetMm(layoutSheet(getPreset('uk-passport'),'4x6'),getPreset('uk-passport'));
  assert(Math.abs(uk.placements[1]!.x-uk.placements[0]!.x-35)<1e-9);
});
