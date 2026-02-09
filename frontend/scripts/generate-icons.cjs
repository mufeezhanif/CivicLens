/**
 * PWA Icon Generator Script
 * Generates all required PNG icons from SVG source using Sharp
 * 
 * Usage: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Icon sizes required for PWA manifest
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Additional icons needed
const ADDITIONAL_ICONS = [
  { name: 'badge', size: 96 },
  { name: 'shortcut-submit', size: 96 },
  { name: 'shortcut-list', size: 96 },
  { name: 'shortcut-map', size: 96 }
];

// Colors for theming
const PRIMARY_COLOR = '#1976D2';
const ACCENT_COLOR = '#4CAF50';

// Base SVG icon template that scales well
const createIconSVG = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e88e5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1565c0;stop-opacity:1" />
    </linearGradient>
  </defs>
  <!-- Background with rounded corners for maskable icons -->
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.15)}" fill="url(#bgGrad)"/>
  
  <!-- Safe area padding for maskable icons (10% from edges) -->
  <g transform="translate(${size * 0.1}, ${size * 0.1}) scale(0.8)">
    <!-- Person silhouette (citizen) -->
    <circle cx="${size * 0.5}" cy="${size * 0.35}" r="${size * 0.15}" fill="white"/>
    <path d="M${size * 0.25} ${size * 0.75}
             c0-${size * 0.15} ${size * 0.1}-${size * 0.25} ${size * 0.25}-${size * 0.25}
             s${size * 0.25} ${size * 0.1} ${size * 0.25} ${size * 0.25}" 
          fill="white"/>
    
    <!-- Checkmark badge (resolution) -->
    <circle cx="${size * 0.7}" cy="${size * 0.7}" r="${size * 0.15}" fill="#4CAF50"/>
    <path d="M${size * 0.58} ${size * 0.7}
             l${size * 0.08} ${size * 0.08}
             l${size * 0.12}-${size * 0.15}" 
          stroke="white" 
          stroke-width="${Math.max(2, size * 0.03)}" 
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"/>
  </g>
</svg>
`.trim();

// Shortcut icon for submit
const createSubmitIconSVG = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#4CAF50"/>
  <g transform="translate(${size * 0.2}, ${size * 0.2}) scale(0.6)">
    <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.35}" fill="none" stroke="white" stroke-width="${size * 0.05}"/>
    <line x1="${size * 0.5}" y1="${size * 0.3}" x2="${size * 0.5}" y2="${size * 0.7}" stroke="white" stroke-width="${size * 0.05}" stroke-linecap="round"/>
    <line x1="${size * 0.3}" y1="${size * 0.5}" x2="${size * 0.7}" y2="${size * 0.5}" stroke="white" stroke-width="${size * 0.05}" stroke-linecap="round"/>
  </g>
</svg>
`.trim();

// Shortcut icon for list
const createListIconSVG = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#FF9800"/>
  <g transform="translate(${size * 0.2}, ${size * 0.2}) scale(0.6)">
    <rect x="${size * 0.15}" y="${size * 0.2}" width="${size * 0.7}" height="${size * 0.15}" rx="${size * 0.03}" fill="white"/>
    <rect x="${size * 0.15}" y="${size * 0.42}" width="${size * 0.7}" height="${size * 0.15}" rx="${size * 0.03}" fill="white"/>
    <rect x="${size * 0.15}" y="${size * 0.64}" width="${size * 0.7}" height="${size * 0.15}" rx="${size * 0.03}" fill="white"/>
  </g>
</svg>
`.trim();

// Shortcut icon for map
const createMapIconSVG = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#2196F3"/>
  <g transform="translate(${size * 0.2}, ${size * 0.15}) scale(0.6)">
    <path d="M${size * 0.5} ${size * 0.15}
             c-${size * 0.2} 0-${size * 0.3} ${size * 0.15}-${size * 0.3} ${size * 0.35}
             c0 ${size * 0.25} ${size * 0.3} ${size * 0.5} ${size * 0.3} ${size * 0.5}
             s${size * 0.3}-${size * 0.25} ${size * 0.3}-${size * 0.5}
             c0-${size * 0.2}-${size * 0.1}-${size * 0.35}-${size * 0.3}-${size * 0.35}z" 
          fill="#F44336"/>
    <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.1}" fill="white"/>
  </g>
</svg>
`.trim();

// Badge icon (small notification badge)
const createBadgeIconSVG = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.45}" fill="#F44336"/>
  <text x="${size * 0.5}" y="${size * 0.65}" 
        font-family="Arial, sans-serif" 
        font-size="${size * 0.5}" 
        font-weight="bold" 
        fill="white" 
        text-anchor="middle">!</text>
</svg>
`.trim();

async function generateIcons() {
  const iconsDir = path.join(__dirname, '..', 'public', 'icons');
  
  // Ensure icons directory exists
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  console.log('🎨 Generating PWA icons...\n');

  // Generate main app icons in all sizes
  for (const size of ICON_SIZES) {
    const svgBuffer = Buffer.from(createIconSVG(size));
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(outputPath);
      
      console.log(`✅ Generated: icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`❌ Failed to generate icon-${size}x${size}.png:`, error.message);
    }
  }

  // Generate shortcut icons
  const shortcutIcons = [
    { name: 'shortcut-submit', generator: createSubmitIconSVG },
    { name: 'shortcut-list', generator: createListIconSVG },
    { name: 'shortcut-map', generator: createMapIconSVG },
    { name: 'badge', generator: createBadgeIconSVG }
  ];

  for (const icon of shortcutIcons) {
    const size = 96;
    const svgBuffer = Buffer.from(icon.generator(size));
    const outputPath = path.join(iconsDir, `${icon.name}.png`);
    
    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(outputPath);
      
      console.log(`✅ Generated: ${icon.name}.png`);
    } catch (error) {
      console.error(`❌ Failed to generate ${icon.name}.png:`, error.message);
    }
  }

  // Also generate Apple Touch Icon (180x180)
  const appleTouchSize = 180;
  const appleSvgBuffer = Buffer.from(createIconSVG(appleTouchSize));
  try {
    await sharp(appleSvgBuffer)
      .resize(appleTouchSize, appleTouchSize)
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(path.join(iconsDir, 'apple-touch-icon.png'));
    
    console.log(`✅ Generated: apple-touch-icon.png`);
  } catch (error) {
    console.error(`❌ Failed to generate apple-touch-icon.png:`, error.message);
  }

  // Generate favicon.ico (32x32)
  const faviconSize = 32;
  const faviconSvgBuffer = Buffer.from(createIconSVG(faviconSize));
  try {
    await sharp(faviconSvgBuffer)
      .resize(faviconSize, faviconSize)
      .png({ quality: 100 })
      .toFile(path.join(__dirname, '..', 'public', 'favicon.png'));
    
    console.log(`✅ Generated: favicon.png`);
  } catch (error) {
    console.error(`❌ Failed to generate favicon.png:`, error.message);
  }

  console.log('\n🎉 Icon generation complete!');
  console.log(`📁 Icons saved to: ${iconsDir}`);
}

// Run the generator
generateIcons().catch(console.error);
