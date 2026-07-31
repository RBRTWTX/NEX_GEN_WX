# NextGen Weather Studio 0.1.1

This corrective release fixes the first-run TypeScript validation failures reported on Windows.

## Corrections

- Updated MapLibre GL JS v6 map initialization to use `canvasContextAttributes.preserveDrawingBuffer` instead of the removed top-level `preserveDrawingBuffer` option.
- Added Node.js type definitions for `vite.config.ts`.
- Added `node` to the Vite configuration TypeScript project types.
- Preserved the scene reference and module foundation validation.
