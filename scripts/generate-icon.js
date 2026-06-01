const pngToIcoModule = require('png-to-ico');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pngToIco = pngToIcoModule.default || pngToIcoModule;
const sizes = [16, 32, 64, 128, 256, 512];

function createSquarePng(source) {
  const squareSize = Math.max(source.width, source.height);
  const output = new PNG({ width: squareSize, height: squareSize });
  output.data.fill(0);

  const offsetX = Math.floor((squareSize - source.width) / 2);
  const offsetY = Math.floor((squareSize - source.height) / 2);

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const sourceIndex = (source.width * y + x) * 4;
      const targetX = x + offsetX;
      const targetY = y + offsetY;
      const targetIndex = (output.width * targetY + targetX) * 4;

      output.data[targetIndex] = source.data[sourceIndex];
      output.data[targetIndex + 1] = source.data[sourceIndex + 1];
      output.data[targetIndex + 2] = source.data[sourceIndex + 2];
      output.data[targetIndex + 3] = source.data[sourceIndex + 3];
    }
  }

  return output;
}

function resizeNearest(source, size) {
  const output = new PNG({ width: size, height: size });

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sourceX = Math.min(source.width - 1, Math.floor((x / size) * source.width));
      const sourceY = Math.min(source.height - 1, Math.floor((y / size) * source.height));
      const sourceIndex = (source.width * sourceY + sourceX) * 4;
      const targetIndex = (size * y + x) * 4;

      output.data[targetIndex] = source.data[sourceIndex];
      output.data[targetIndex + 1] = source.data[sourceIndex + 1];
      output.data[targetIndex + 2] = source.data[sourceIndex + 2];
      output.data[targetIndex + 3] = source.data[sourceIndex + 3];
    }
  }

  return output;
}

async function generateIcon() {
  const rootDir = path.resolve(__dirname, '..');
  const sourcePath = path.join(rootDir, 'src', 'assets', 'branding', 'dvpotro-logo.png');
  const buildDir = path.join(rootDir, 'build');
  const tempDir = path.join(buildDir, '.icon-tmp');

  fs.mkdirSync(tempDir, { recursive: true });

  const sourceBuffer = fs.readFileSync(sourcePath);
  const sourcePng = PNG.sync.read(sourceBuffer);
  const squarePng = createSquarePng(sourcePng);

  const resizedPngPaths = sizes.map((size) => {
    const resized = resizeNearest(squarePng, size);
    const filePath = path.join(tempDir, `icon-${size}.png`);
    fs.writeFileSync(filePath, PNG.sync.write(resized));
    return filePath;
  });

  const buffer = await pngToIco(resizedPngPaths);
  fs.mkdirSync(buildDir, { recursive: true });
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), buffer);
  fs.copyFileSync(sourcePath, path.join(buildDir, 'icon.png'));
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('✅ Íconos DVPotro generados en build/icon.ico y build/icon.png');
}

generateIcon().catch((error) => {
  console.error(error);
  process.exit(1);
});
