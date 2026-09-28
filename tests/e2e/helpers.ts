import type { Download, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

/** Geometry-only fixture. It is deliberately not a real person's photo. */
export async function geometryImage(format: 'png' | 'jpeg' | 'webp' = 'png', width = 1600, height = 2000) {
  return sharp({ create: { width, height, channels: 3, background: '#d7e2e8' } })
    .composite([{ input: Buffer.from(`<svg width="${width}" height="${height}"><rect x="0" y="0" width="${width / 2}" height="${height / 2}" fill="#c34231"/><rect x="${width / 2}" y="${height / 2}" width="${width / 2}" height="${height / 2}" fill="#214e72"/><circle cx="${width / 2}" cy="${height / 2}" r="${width / 8}" fill="#edbe68"/></svg>`) }])
    .toFormat(format).toBuffer();
}

export async function downloadBytes(download: Download) {
  const path = await download.path();
  if (!path) throw new Error(`Download has no saved path: ${await download.failure()}`);
  return readFile(path);
}

export async function assertNoSourcePersistence(page: Page) {
  return page.evaluate(async () => ({
    local: Object.fromEntries(Object.entries(localStorage)),
    session: Object.fromEntries(Object.entries(sessionStorage)),
    databases: await indexedDB.databases(),
  }));
}
