// scripts/process-images.js

import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import imagemin from 'imagemin';
import webp from 'imagemin-webp';
import mozjpeg from 'imagemin-mozjpeg';

const SRC_DIR = path.resolve('src-images');
const OUT_DIR = path.resolve('public/images');

// Define the four aspect targets with 1× and 2× sizes
const TARGETS = [
    {
        aspect: '16-9',          // Hero
        sizes: [
            {label: 'hero1x', width: 1600, height: 900},
            {label: 'hero2x', width: 3200, height: 1800}
        ]
    },
    {
        aspect: '3-1',           // Banner
        sizes: [
            {label: 'banner1x', width: 1200, height: 400},
            {label: 'banner2x', width: 2400, height: 800}
        ]
    },
    {
        aspect: '1-1',           // Gallery
        sizes: [
            {label: 'gallery1x', width: 600, height: 600},
            {label: 'gallery2x', width: 1200, height: 1200}
        ]
    },
    {
        aspect: '2-3',           // Portrait
        sizes: [
            {label: 'portrait1x', width: 400, height: 600},
            {label: 'portrait2x', width: 800, height: 1200}
        ]
    }
];

// Ensure the output directory exists
async function ensureDir(dir) {
    await fs.mkdir(dir, {recursive: true});
}

// Process a single file: for each target and size, create cover‑crop variants
async function processFile(filename) {
    const basename = path.parse(filename).name;
    const inputPath = path.join(SRC_DIR, filename);
    const buffer = await fs.readFile(inputPath);

    for (const target of TARGETS) {
        for (const {label, width, height} of target.sizes) {
            // 1) Cover crop
            const coverBuf = await sharp(buffer)
                .resize(width, height, {
                    fit: sharp.fit.cover,
                    position: sharp.strategy.attention
                })
                .toBuffer();

            // Write JPEGs
            const coverJpg = `${basename}.${label}.${width}x${height}.cover.jpg`;

            await sharp(coverBuf).jpeg({quality: 80}).toFile(path.join(OUT_DIR, coverJpg));

            // Optimize only the cover JPEG
            await imagemin(
                [path.join(OUT_DIR, coverJpg)],
                {
                    destination: OUT_DIR,
                    plugins: [
                        webp({quality: 75}),
                        mozjpeg({quality: 75})
                    ]
                }
            );

            console.log(`Generated ${coverJpg} (${width}×${height})`);
        }
    }
}

// Main runner
async function main() {
    await ensureDir(OUT_DIR);
    const files = (await fs.readdir(SRC_DIR)).filter(f => /\.(jpe?g|png)$/i.test(f));
    for (const file of files) {
        console.log(`Processing ${file}…`);
        await processFile(file);
    }
    console.log('✅ All images processed.');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
