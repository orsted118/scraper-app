const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser to render SVGs...');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const files = [
    {
      src: 'dev_tech_banner_terminal.svg',
      dest: 'dev_tech_banner_terminal.png',
      width: 851,
      height: 315
    },
    {
      src: 'dev_tech_banner_floppy.svg',
      dest: 'dev_tech_banner_floppy.png',
      width: 851,
      height: 315
    },
    {
      src: 'dev_tech_profile_crt.svg',
      dest: 'dev_tech_profile_crt.png',
      width: 500,
      height: 500
    },
    {
      src: 'dev_tech_profile_pixel_dt.svg',
      dest: 'dev_tech_profile_pixel_dt.png',
      width: 500,
      height: 500
    },
    {
      src: 'dev_tech_profile_prompt.svg',
      dest: 'dev_tech_profile_prompt.png',
      width: 500,
      height: 500
    },
    {
      src: 'dev_tech_profile_crt_v1.svg',
      dest: 'dev_tech_profile_crt_v1.png',
      width: 500,
      height: 500
    },
    {
      src: 'dev_tech_profile_crt_v2.svg',
      dest: 'dev_tech_profile_crt_v2.png',
      width: 500,
      height: 500
    },
    {
      src: 'dev_tech_profile_crt_v3.svg',
      dest: 'dev_tech_profile_crt_v3.png',
      width: 500,
      height: 500
    }
  ];

  for (const file of files) {
    const srcPath = path.resolve(__dirname, '..', file.src);
    const destPath = path.resolve(__dirname, '..', file.dest);
    
    if (!fs.existsSync(srcPath)) {
      console.error(`SVG file not found: ${srcPath}`);
      continue;
    }

    const svgContent = fs.readFileSync(srcPath, 'utf8');
    
    await page.setViewportSize({ width: file.width, height: file.height });

    await page.setContent(`
      <html>
        <head>
          <style>
            html, body {
              margin: 0;
              padding: 0;
              width: ${file.width}px;
              height: ${file.height}px;
              overflow: hidden;
              background-color: transparent;
            }
            svg {
              width: ${file.width}px;
              height: ${file.height}px;
              display: block;
            }
          </style>
        </head>
        <body>
          ${svgContent}
        </body>
      </html>
    `);

    // Give it a brief moment to render styles
    await page.waitForTimeout(500);

    // Capture screenshot
    await page.screenshot({ path: destPath, type: 'png' });
    console.log(`Successfully converted: ${file.src} -> ${file.dest} (${file.width}x${file.height})`);
  }

  await browser.close();
  console.log('Done!');
})();
