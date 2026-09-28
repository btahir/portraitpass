import { test, expect } from '@playwright/test';

test.use({ baseURL: 'http://127.0.0.1:4320' });

test('real CPU face assistance detects synthetic single/no/multiple faces and segmentation retains the portrait', async ({ page, context }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  const external: string[] = [];
  page.on('request', req => { if (/^https?:/.test(req.url()) && new URL(req.url()).origin !== 'http://127.0.0.1:4320') external.push(req.url()); });
  const result = await page.evaluate(async () => {
    const enginePath = '/src/browser/engine.ts', corePath = '/src/core/index.ts';
    const engine = await import(/* @vite-ignore */ enginePath), core = await import(/* @vite-ignore */ corePath);
    const photo = await engine.loadDemo(), preset = core.getPreset('us-passport');
    const assist = await engine.autoCrop(photo, preset);
    const custom = { ...core.getPreset('general-id'), widthMm: 50.8, heightMm: 76.2 };
    await engine.prepareBackground(photo);
    const saved = JSON.parse(await (await engine.saveProject(photo, custom, core.defaultCrop(photo.width, photo.height, custom), { background: '#ff0000' })).text());
    const maskImage = new Image(); maskImage.src = saved.background.maskDataUrl; await maskImage.decode();
    const sourceCanvas = document.createElement('canvas'); sourceCanvas.width = photo.width; sourceCanvas.height = photo.height;
    const ctx = sourceCanvas.getContext('2d')!; ctx.drawImage(photo.image, 0, 0);
    const sourcePixels = ctx.getImageData(0, 0, photo.width, photo.height).data;
    ctx.clearRect(0, 0, photo.width, photo.height); ctx.drawImage(maskImage, 0, 0);
    const maskPixels = ctx.getImageData(0, 0, photo.width, photo.height).data;
    // Fixture-specific silhouette reference: this synthetic portrait has a uniform
    // bright neutral background. Color separation is independent of model output;
    // this is a regression measure for this fixture, not population accuracy.
    let intersection = 0, union = 0, foreground = 0;
    for (let i = 0; i < sourcePixels.length; i += 4) {
      const reference = Math.min(sourcePixels[i], sourcePixels[i+1], sourcePixels[i+2]) < 215;
      const predicted = maskPixels[i+3] >= 128;
      if (reference && predicted) intersection++; if (reference || predicted) union++; if (predicted) foreground++;
    }
    const makePhoto = async (c: HTMLCanvasElement, name: string) => {
      const blob = await new Promise<Blob>(resolve => c.toBlob(b => resolve(b!), 'image/png'));
      return engine.loadPhoto(new File([blob], name, { type: 'image/png' }));
    };
    const flat = document.createElement('canvas');flat.width=800;flat.height=1000;flat.getContext('2d')!.fillRect(0,0,800,1000);
    const noFace=await makePhoto(flat,'no-face.png'); let noFaceError='';
    try { await engine.autoCrop(noFace,preset); } catch(e) { noFaceError=String(e); }
    const pair=document.createElement('canvas');pair.width=photo.width*2;pair.height=photo.height;
    pair.getContext('2d')!.drawImage(photo.image,0,0);pair.getContext('2d')!.drawImage(photo.image,photo.width,0);
    const twoFaces=await makePhoto(pair,'two-synthetic-faces.png');let multiFaceError='';
    try {await engine.autoCrop(twoFaces,preset);}catch(e){multiFaceError=String(e);}
    const response={landmarks:assist.landmarks,width:photo.width,height:photo.height,noFaceError,multiFaceError,iou:intersection/union,foregroundFraction:foreground/(photo.width*photo.height)};
    for (const item of [photo,noFace,twoFaces])engine.releasePhoto(item);
    return response;
  });
  console.log('MODEL_MEASUREMENTS', JSON.stringify(result));
  expect(result.landmarks.eyesY / result.height).toBeGreaterThan(.3);
  expect(result.landmarks.eyesY / result.height).toBeLessThan(.5);
  expect(result.landmarks.chinY).toBeGreaterThan(result.landmarks.eyesY);
  // Manually inspected synthetic reference: crown ≈235px, chin≈949px.
  expect(Math.abs(result.landmarks.crownY - 235)).toBeLessThan(55);
  expect(Math.abs(result.landmarks.chinY - 949)).toBeLessThan(55);
  expect(result.noFaceError).toMatch(/no clear face/i);
  expect(result.multiFaceError).toMatch(/more than one face/i);
  expect(result.iou).toBeGreaterThan(.90);
  expect(result.foregroundFraction).toBeGreaterThan(.3);
  expect(result.foregroundFraction).toBeLessThan(.8);
  expect(external).toEqual([]);
  await context.setOffline(true);
  await expect(page.getByRole('button', { name: 'Try a sample', exact: false })).toBeEnabled();
});
