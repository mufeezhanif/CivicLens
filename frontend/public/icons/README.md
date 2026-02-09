# PWA Icons

This directory should contain the following PWA icons:

## Required Icons

Generate these PNG icons from the SVG template (`icon-72x72.svg`):

| Filename | Size | Purpose |
|----------|------|---------|
| icon-72x72.png | 72x72 | Android home screen |
| icon-96x96.png | 96x96 | Android home screen |
| icon-128x128.png | 128x128 | Chrome Web Store |
| icon-144x144.png | 144x144 | Android splash |
| icon-152x152.png | 152x152 | iOS |
| icon-167x167.png | 167x167 | iPad Pro |
| icon-180x180.png | 180x180 | iPhone |
| icon-192x192.png | 192x192 | Android (maskable) |
| icon-384x384.png | 384x384 | Android (maskable) |
| icon-512x512.png | 512x512 | Android splash |

## iOS Splash Screens

| Filename | Size | Device |
|----------|------|--------|
| splash-640x1136.png | 640x1136 | iPhone 5 |
| splash-750x1334.png | 750x1334 | iPhone 6/7/8 |
| splash-1242x2208.png | 1242x2208 | iPhone 6+/7+/8+ |

## Generate Icons

Use a tool like `sharp` or online services to generate icons:

```bash
# Using ImageMagick
convert icon-72x72.svg -resize 192x192 icon-192x192.png
convert icon-72x72.svg -resize 512x512 icon-512x512.png
# ... etc
```

Or use https://realfavicongenerator.net/ to generate all icons from the SVG.
