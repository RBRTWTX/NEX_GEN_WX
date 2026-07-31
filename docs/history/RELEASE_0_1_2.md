# NextGen Weather Studio 0.1.2

This corrective release fixes the Windows Tauri build failure reported during the first native compile.

## Corrections

- Added the Windows application icon resource required by `tauri-build`.
- Declared the icon path explicitly in `src-tauri/tauri.conf.json`.
- Includes the TypeScript fixes from 0.1.1:
  - MapLibre GL JS v6 uses `canvasContextAttributes.preserveDrawingBuffer`.
  - Node type definitions are included for `vite.config.ts`.
- Synchronized the package, Rust crate and Tauri configuration version as 0.1.2.

The included icon is a temporary neutral build placeholder and can be replaced later with an approved project icon.
