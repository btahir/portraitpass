import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitToFileSize,kbToBytes,insertJpegComment,digitalTargetBytes,PortraitError } from '../../src/core/index.js';

// A tiny well-formed JPEG skeleton: SOI, JFIF APP0, filler in the scan, EOI.
const jpegOf=(size:number)=>{const b=new Uint8Array(size);b.set([0xff,0xd8,0xff,0xe0,0,16,0x4a,0x46,0x49,0x46,0,1,1,0,0,1,0,1,0,0]);b[size-2]=0xff;b[size-1]=0xd9;return b;};
// Monotonic fake encoder: bytes grow with quality. size(q) = base + slope * q^2.
const fake=(base:number,slope:number)=>{const calls:number[]=[];return {calls,encode:async(q:number)=>{calls.push(q);return jpegOf(Math.round(base+slope*q*q));}};};

test('kbToBytes: 1024 by default, 1000 on request, whole bytes',()=>{assert.equal(kbToBytes(20),20480);assert.equal(kbToBytes(240,1000),240000);assert.equal(kbToBytes(0.5),512);assert.throws(()=>kbToBytes(-1),{code:'INVALID_DIGITAL_TARGET'});assert.throws(()=>kbToBytes(NaN));});

test('fitToFileSize lands inside the range within 8 encodes and prefers no padding',async()=>{
  for(const [min,max] of [[20_000,50_000],[100_000,120_000],[undefined,240_000],[60_000,64_000]] as const){
    const f=fake(5_000,400_000);
    const r=await fitToFileSize(f.encode,{minBytes:min,maxBytes:max});
    assert(f.calls.length<=8,`${f.calls.length} encodes`);assert.equal(r.iterations,f.calls.length);
    assert(r.bytes.length<=max!);if(min!==undefined)assert(r.bytes.length>=min);
    assert.equal(r.padded,false);assert(r.quality>=0.3&&r.quality<=0.95);
    for(const q of f.calls)assert(q>=0.3&&q<=0.95);
  }
});
test('with only a maximum the search climbs towards the highest quality that fits',async()=>{
  const f=fake(2_000,300_000);
  const r=await fitToFileSize(f.encode,{maxBytes:150_000});
  assert(r.bytes.length<=150_000);assert(r.bytes.length>=150_000*0.9,`only ${r.bytes.length}`);
  // A limit above the top-quality size returns the top-quality encode at once.
  const easy=fake(2_000,30_000);const e=await fitToFileSize(easy.encode,{maxBytes:1_000_000});assert.equal(easy.calls.length,1);assert.equal(e.quality,0.95);assert.equal(e.padded,false);
});
test('a file below the minimum at top quality is padded with a comment segment, pixels untouched',async()=>{
  const f=fake(1_000,4_000);// about 4.6 KB at 0.95
  const r=await fitToFileSize(f.encode,{minBytes:20_480,maxBytes:51_200});
  assert.equal(r.padded,true);assert.equal(r.bytes.length,20_480);assert.equal(r.quality,0.95);assert.equal(f.calls.length,1);assert(r.paddedBytes>0);
  assert.equal(r.bytes[0],0xff);assert.equal(r.bytes[1],0xd8);
  // Still starts SOI, JFIF, then the COM marker; ends with EOI.
  assert.deepEqual([...r.bytes.subarray(20,22)],[0xff,0xfe]);assert.deepEqual([...r.bytes.subarray(-2)],[0xff,0xd9]);
  const minOnly=await fitToFileSize(fake(1_000,4_000).encode,{minBytes:70_000});assert.equal(minOnly.bytes.length,70_000);assert.equal(minOnly.padded,true);
});
test('unreachable maximum throws FILE_SIZE_UNREACHABLE and suggests a smaller pixel size',async()=>{
  const f=fake(60_000,500_000);
  await assert.rejects(()=>fitToFileSize(f.encode,{maxBytes:20_000}),(e:unknown)=>e instanceof PortraitError&&e.code==='FILE_SIZE_UNREACHABLE'&&/smaller pixel size/.test(e.message)&&!/compliant|approved|guaranteed|verified|official/i.test(e.message));
  assert.equal(f.calls.length,2);
});
test('invalid ranges are rejected',async()=>{
  const f=fake(1,1);
  await assert.rejects(()=>fitToFileSize(f.encode,{minBytes:50,maxBytes:10}),{code:'INVALID_DIGITAL_TARGET'});
  await assert.rejects(()=>fitToFileSize(f.encode,{maxBytes:10},{minQuality:0.9,maxQuality:0.3}),{code:'INVALID_DIGITAL_TARGET'});
});
test('iteration cap is honoured',async()=>{
  const f=fake(2_000,900_000);
  await fitToFileSize(f.encode,{minBytes:100_000,maxBytes:100_500},{maxIterations:4});
  assert(f.calls.length<=4);
});
test('insertJpegComment by text and by size',()=>{
  const j=jpegOf(100);
  const t=insertJpegComment(j,'hello');
  assert.equal(t.length,100+4+5);assert.deepEqual([...t.subarray(0,2)],[0xff,0xd8]);
  assert.deepEqual([...t.subarray(20,22)],[0xff,0xfe]);assert.equal((t[22]!<<8)|t[23]!,7);assert.equal(Buffer.from(t.subarray(24,29)).toString(),'hello');assert.deepEqual([...t.subarray(29,32)],[...j.subarray(20,23)]);
  for(const n of [4,5,7,1000,65_537,65_538,65_539,70_000,200_000]){const g=insertJpegComment(j,n);assert.equal(g.length,100+n,String(n));assert.deepEqual([...g.subarray(-2)],[0xff,0xd9]);
    // Every segment header is valid: walk COM segments up to the original scan bytes.
    let at=20,seen=0;while(g[at]===0xff&&g[at+1]===0xfe){const len=(g[at+2]!<<8)|g[at+3]!;assert(len>=2);seen+=len+2;at+=2+len;}assert.equal(seen,n,String(n));}
  assert.throws(()=>insertJpegComment(j,3),{code:'INVALID_DIGITAL_TARGET'});
  assert.throws(()=>insertJpegComment(new Uint8Array([1,2,3,4,5]),'x'),{code:'INVALID_JPEG'});
  // Without APP segments the comment goes straight after SOI.
  const bare=new Uint8Array([0xff,0xd8,0xff,0xda,0,2,0xff,0xd9]);assert.deepEqual([...insertJpegComment(bare,4).subarray(2,4)],[0xff,0xfe]);
});
test('digitalTargetBytes validates pixels and converts KB',()=>{
  assert.deepEqual(digitalTargetBytes({widthPx:600,heightPx:600,maxKB:240,kbBytes:1000,format:'jpeg'}),{maxBytes:240000});
  assert.deepEqual(digitalTargetBytes({widthPx:200,heightPx:230,minKB:20,maxKB:50,format:'jpeg'}),{minBytes:20480,maxBytes:51200});
  for(const bad of [{widthPx:0,heightPx:10},{widthPx:10.5,heightPx:10},{widthPx:10,heightPx:20000},{widthPx:10,heightPx:10,minKB:9,maxKB:3},{widthPx:10,heightPx:10,maxKB:-1},{widthPx:10,heightPx:10,kbBytes:1234 as never}])assert.throws(()=>digitalTargetBytes({format:'jpeg',...bad}),{code:'INVALID_DIGITAL_TARGET'});
  assert.throws(()=>digitalTargetBytes({widthPx:10,heightPx:10,format:'png' as never}),{code:'INVALID_DIGITAL_TARGET'});
});
