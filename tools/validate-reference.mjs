import { readFile } from 'node:fs/promises';

async function json(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
}

const scenes = await json('../reference/legacy-r3/default-scenes.json');
const graphics = await json('../reference/legacy-r3/default-graphics.json');
const products = await json('../reference/legacy-r3/product-registry.json');
const productList = Object.values(products).flatMap((value) => (Array.isArray(value) ? value : []));

const errors = [];
if (scenes.length !== 31) errors.push(`Expected 31 legacy map scenes, found ${scenes.length}`);
if (graphics.length !== 16) errors.push(`Expected 16 legacy graphic scenes, found ${graphics.length}`);
if (productList.length !== 113) errors.push(`Expected 113 legacy products, found ${productList.length}`);

for (const product of productList) {
  if (!product.id || !product.renderer || !product.layerOrder) {
    errors.push(`Product is missing id/renderer/layerOrder: ${JSON.stringify(product)}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Reference validation passed: ${scenes.length} scenes, ${graphics.length} graphics, ${productList.length} products.`);
