import { test, expect, type Page } from '@playwright/test';

/**
 * Camera modal with Chrome's fake media stream.
 *
 * These tests open the modal through the studio's own "Take photo" button (the STUDIO agent mounts
 * <CameraCapture/> there; no harness route exists in product code). They need no other studio selectors:
 * the captured file is observed where the photo pipeline creates its object URL.
 *
 * Chrome flags: --use-fake-ui-for-media-stream auto-answers the permission prompt,
 * --use-fake-device-for-media-stream serves a synthetic test-pattern camera. The fake pattern has no face,
 * so the live-hint test only checks the "no face" message.
 */
test.use({ launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] } });

async function record(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as {
      __tracks: MediaStreamTrack[];
      __files: { name: string; type: string; size: number; width: number; height: number }[];
    };
    w.__tracks = [];
    w.__files = [];
    const gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await gum(constraints);
      stream.getTracks().forEach((t) => w.__tracks.push(t));
      return stream;
    };
    const create = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (obj: Blob | MediaSource) => {
      if (obj instanceof Blob && obj.type === 'image/jpeg') {
        const file = obj as File;
        createImageBitmap(obj).then((b) => {
          w.__files.push({ name: file.name ?? '', type: obj.type, size: obj.size, width: b.width, height: b.height });
          b.close();
        });
      }
      return create(obj);
    };
  });
}

async function openCamera(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Take photo' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Take a photo' });
  await expect(dialog).toBeVisible();
  // A first visit shows the permission explainer; a site that already has permission goes straight to the preview.
  const turnOn = dialog.getByRole('button', { name: 'Turn on camera' });
  const video = dialog.getByTestId('camera-video');
  await expect(turnOn.or(video)).toBeVisible();
  await expect(dialog.getByText('Your camera stays on this device; nothing is recorded or uploaded.')).toBeVisible();
  if (await turnOn.isVisible()) await turnOn.click();
  await expect(video).toBeVisible();
  await page.waitForFunction(() => {
    const v = document.querySelector('video');
    return !!v && v.readyState >= 2 && v.videoWidth > 0 && !v.paused;
  });
  return { dialog, video };
}

const trackStates = (page: Page) =>
  page.evaluate(() => (window as unknown as { __tracks: MediaStreamTrack[] }).__tracks.map((t) => t.readyState));

test.describe('camera with a fake stream', () => {
  test.use({ permissions: ['camera'] });

  test('opens as a dialog, shows guides, captures a full-size JPEG and stops the camera', async ({ page }) => {
    await record(page);
    const { dialog, video } = await openCamera(page);
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog.getByTestId('camera-overlay')).toBeVisible();
    await expect(dialog.getByText(/Ask someone to take it, or use a tripod and timer/)).toBeVisible();
    const size = await video.evaluate((v: HTMLVideoElement) => ({ w: v.videoWidth, h: v.videoHeight }));
    expect(size.w).toBeGreaterThan(0);

    await dialog.getByRole('button', { name: 'Take photo' }).click();
    await expect(dialog.getByRole('img', { name: 'The photo you just took' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Use photo' })).toBeVisible();
    // Retake goes back to the live preview.
    await dialog.getByRole('button', { name: 'Retake' }).click();
    await expect(dialog.getByTestId('camera-video')).toBeVisible();
    await dialog.getByRole('button', { name: 'Take photo' }).click();
    await dialog.getByRole('button', { name: 'Use photo' }).click();
    await expect(page.getByRole('dialog', { name: 'Take a photo' })).toHaveCount(0);

    // The file reached the photo pipeline: a JPEG named camera-<timestamp>.jpg at the video's own size.
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __files: unknown[] }).__files.length))
      .toBeGreaterThan(0);
    const [file] = await page.evaluate(
      () => (window as unknown as { __files: { name: string; type: string; width: number; height: number }[] }).__files,
    );
    expect(file.name).toMatch(/^camera-\d+\.jpg$/);
    expect(file.type).toBe('image/jpeg');
    expect([file.width, file.height]).toEqual([size.w, size.h]);

    // Closing stopped every track.
    expect((await trackStates(page)).length).toBeGreaterThan(0);
    expect((await trackStates(page)).every((s) => s === 'ended')).toBe(true);
  });

  test('Escape closes the dialog, stops the camera and returns focus to the button', async ({ page }) => {
    await record(page);
    const opener = page.getByRole('button', { name: 'Take photo' }).first();
    const { dialog } = await openCamera(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect.poll(async () => (await trackStates(page)).every((s) => s === 'ended')).toBe(true);
    await expect(opener).toBeFocused();
  });

  test('keeps keyboard focus inside the dialog', async ({ page }) => {
    await record(page);
    const { dialog } = await openCamera(page);
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Shift+Tab');
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  });

  test('the 3-second timer waits before it takes the photo', async ({ page }) => {
    test.slow();
    await record(page);
    const { dialog } = await openCamera(page);
    const timer = dialog.getByRole('button', { name: /3-second timer/ });
    await timer.click();
    await expect(timer).toHaveAttribute('aria-pressed', 'true');
    await dialog.getByRole('button', { name: 'Start timer' }).click();
    await expect(dialog.getByRole('button', { name: 'Cancel timer' })).toBeVisible();
    await expect(dialog.getByRole('img', { name: 'The photo you just took' })).toHaveCount(0);
    await expect(dialog.getByRole('img', { name: 'The photo you just took' })).toBeVisible({ timeout: 8_000 });
  });

  test('live hints load from this site and say when no face is in view', async ({ page, baseURL }) => {
    test.slow();
    const external: string[] = [];
    page.on('request', (r) => {
      if (/^https?:/.test(r.url()) && new URL(r.url()).origin !== new URL(baseURL!).origin) external.push(r.url());
    });
    await record(page);
    const { dialog } = await openCamera(page);
    await expect(dialog.getByRole('list').getByText(/No face found/)).toBeVisible({ timeout: 30_000 });
    await expect(dialog.getByRole('status').filter({ hasText: 'No face found' })).toHaveCount(1);
    expect(external).toEqual([]);
  });
});

test.describe('camera permission denied', () => {
  test('explains the block and offers the upload instead', async ({ page }) => {
    // Chrome's fake UI flag answers every prompt, so the refusal is simulated at the API the browser would reject.
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Take photo' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Take a photo' });
    const turnOn = dialog.getByRole('button', { name: 'Turn on camera' });
    await expect(turnOn.or(dialog.getByRole('alert'))).toBeVisible();
    if (await turnOn.isVisible()) await turnOn.click();
    await expect(dialog.getByRole('alert')).toContainText('Camera access is blocked');
    await expect(dialog.getByRole('button', { name: 'Upload a photo instead' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});
