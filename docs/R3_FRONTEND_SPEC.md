# R3 frontend specification

This document locks the visible and operational direction for NEX GEN WX.

## Authority

`RBRTW_Studio_1_6_1_R3` and the supplied R3 screenshots define the target interface. The goal is a close rebuild, not a reinterpretation.

## Fixed shell regions

### Top status/navigation bar

- approximately 50 pixels high
- menu button, studio/project name, national place search, data state, clock and map position
- Home, Products, Show, Model Lab, Sources, Settings and Present actions
- compact enough to leave the broadcast canvas dominant

### Left workspace

- approximately 340 pixels wide at desktop scale
- searchable category-filtered scene library
- two-column scene thumbnails
- Add Graphic and Save Scene actions
- active layer stack below the scene library
- panel may hide without changing scene composition

### Broadcast canvas

- occupies all remaining central space
- map and graphic scenes use the same stage boundary
- operator tools overlay the stage and must not permanently reduce output dimensions
- clean output and PNG export hide operator-only controls

### Map header and legend

- shaped left logo/control area
- editable title, time/subtitle and valid label
- integrated color legend where appropriate
- header settings persist per scene
- logo/control area opens the hidden context-sensitive menu

### Bottom dock

- persistent Layers group
- persistent Tools group
- weather opacity and smoothing controls
- Save, Export and PNG actions at the right
- approximately 48 pixels high

## Floating workspaces

Settings, Products, Graphic Builder, Save Scene, Show Builder, Radar, Satellite, Alerts, Draw, Assets, Sources, Model Lab and Color Tables open as modeless movable windows. They should not convert the whole interface into a new page or dashboard.

## Scene and show workflow

- saved scenes remain the central unit of work
- map and graphic scenes appear together in the library
- scenes store transition, duration, hold and manual/automatic advance behavior
- a show is an ordered rundown of scene IDs
- the show builder supports adding, removing and reordering scenes, loop mode and presentation start
- PNG export captures the selected scene, not the operator chrome

## State ownership

The React reducer owns project, scene, show, playback and UI-window state. Individual controls dispatch typed actions and do not mutate shared scene objects directly.

## Data rule

R3 screenshots may be imitated for composition and styling only. Weather values and plotted fields must come from verified data providers and proper geographic/rendering logic.
