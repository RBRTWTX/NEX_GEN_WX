# NEX GEN WX product definition

NEX GEN WX is primarily a **weather presentation authoring and rendering application**.

Its main workflow is similar to PowerPoint combined with a professional broadcast-weather workstation:

1. Acquire and process verified weather data.
2. Build and edit a sequence of map or full-screen graphic scenes.
3. Present those scenes manually or automatically.
4. Export scenes as individual PNG slides.

OBS is secondary. OBS may capture the same clean output for streaming or recording, but NEX GEN WX is not intended to replace OBS.

## One-renderer output contract

There is one scene renderer. A scene may be:

- displayed inside the operator editor
- displayed in the clean output window
- exported as a PNG

The visual result should remain equivalent across all three destinations. A separate social-media layout system is intentionally out of scope; social posts use PNG screen grabs of the same presentation scene.

## Visual and interaction contract

`RBRTW_Studio_1_6_1_R3` is the authoritative operator-interface specification.

The new TypeScript/Rust/Tauri architecture may replace internal code, improve data collection, make rendering more reliable and organize features into modules. It must not redesign the visible application into a generic dashboard, GIS application or developer console.

The uploaded screenshots are references for design, control placement, visual hierarchy and workflow only. Their displayed map data or values are not authoritative. Actual products must use current verified sources, correct geographic logic and scientifically appropriate rendering.
