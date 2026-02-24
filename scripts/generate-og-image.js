const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs');

// Register fonts
registerFont(path.join(__dirname, 'fonts/Oswald-Bold.ttf'), { family: 'Oswald', weight: 'bold' });
registerFont(path.join(__dirname, 'fonts/Inter-Medium.ttf'), { family: 'Inter', weight: '500' });
registerFont(path.join(__dirname, 'fonts/Inter-SemiBold.ttf'), { family: 'Inter', weight: '600' });

// Brand colors
const NAVY = '#04344f';
const ORANGE = '#FA7017';
const WHITE = '#ffffff';
const MUTED = '#9baab8';

const WIDTH = 1200;
const HEIGHT = 630;

async function generate() {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // --- Background ---
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Subtle gradient overlay for depth
  const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  grad.addColorStop(0, 'rgba(250, 112, 23, 0.06)');
  grad.addColorStop(1, 'rgba(4, 52, 79, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // --- Logo ---
  const logo = await loadImage(path.join(__dirname, '../assets/logo-color-transparent.png'));
  const logoMaxH = 380;
  const logoScale = logoMaxH / logo.height;
  const logoW = logo.width * logoScale;
  const logoH = logoMaxH;
  const logoX = 80;
  const logoY = (HEIGHT - logoH) / 2;
  ctx.drawImage(logo, logoX, logoY, logoW, logoH);

  // --- Text area ---
  const textX = logoX + logoW + 60;
  const textAreaW = WIDTH - textX - 60;

  // Headline: "QUESTION EVERYTHING"
  ctx.fillStyle = WHITE;
  ctx.font = 'bold 54px Oswald';
  ctx.textBaseline = 'top';

  const headlineY = 170;
  ctx.fillText('QUESTION', textX, headlineY);
  ctx.fillText('EVERYTHING', textX, headlineY + 62);

  // Orange accent line under headline
  ctx.fillStyle = ORANGE;
  ctx.fillRect(textX, headlineY + 136, 80, 4);

  // Subtitle
  ctx.fillStyle = MUTED;
  ctx.font = '500 22px Inter';
  ctx.fillText('A Philosophy of Life Podcast', textX, headlineY + 160);

  // CTA button: "Listen Now"
  const ctaText = 'Listen Now';
  ctx.font = '600 20px Inter';
  const ctaMetrics = ctx.measureText(ctaText);
  const ctaPadX = 28;
  const ctaPadY = 12;
  const ctaW = ctaMetrics.width + ctaPadX * 2;
  const ctaH = 20 + ctaPadY * 2;
  const ctaX = textX;
  const ctaY = headlineY + 210;

  // Rounded rect for CTA
  const r = ctaH / 2;
  ctx.beginPath();
  ctx.moveTo(ctaX + r, ctaY);
  ctx.lineTo(ctaX + ctaW - r, ctaY);
  ctx.arcTo(ctaX + ctaW, ctaY, ctaX + ctaW, ctaY + r, r);
  ctx.arcTo(ctaX + ctaW, ctaY + ctaH, ctaX + ctaW - r, ctaY + ctaH, r);
  ctx.lineTo(ctaX + r, ctaY + ctaH);
  ctx.arcTo(ctaX, ctaY + ctaH, ctaX, ctaY + r, r);
  ctx.arcTo(ctaX, ctaY, ctaX + r, ctaY, r);
  ctx.closePath();
  ctx.fillStyle = ORANGE;
  ctx.fill();

  ctx.fillStyle = WHITE;
  ctx.textBaseline = 'middle';
  ctx.fillText(ctaText, ctaX + ctaPadX, ctaY + ctaH / 2);

  // --- URL in bottom-right ---
  ctx.fillStyle = MUTED;
  ctx.font = '500 16px Inter';
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'right';
  ctx.fillText('questioneverythingetp.com', WIDTH - 40, HEIGHT - 30);

  // --- Output ---
  const outPath = path.join(__dirname, '../assets/og-image.png');
  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buf);
  console.log(`OG image saved to ${outPath} (${buf.length} bytes)`);
}

generate().catch((err) => {
  console.error('Failed to generate OG image:', err);
  process.exit(1);
});
