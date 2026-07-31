# R2 and R3 comparison

## Verified baselines

The uploaded releases were unpacked and their included regression suites were executed.

### 1.6.0 R2

- Startup-order test passed.
- R2 regression test passed.
- Smoke test passed.
- Inventory reported 31 map scenes, 15 graphic scenes and 157 radar sites.

### 1.6.1 R3

- Startup-order test passed.
- R2 foundation regression remained passing.
- Graphic renderer test passed.
- R3 comprehensive test passed.
- Smoke test passed.
- Inventory reported 31 map scenes, 16 graphic scenes and 157 radar sites.

R3 contains approximately 2,060 additions and 278 deletions across 30 changed or added files relative to R2.

## Confirmed R3 expansion

- Full alert pagination/filtering and geometry grouping
- City hide/restore and label background state
- Satellite frame catalogs and animation controls
- Field-specific observations and continuous IDW analyses
- Tropical identity reconciliation and independent impact controls
- Sixteen null-safe graphic templates
- More extensive regression coverage

## Migration decision

- **R2 remains the user-confirmed working behavioral baseline.**
- **R3 is the latest code reference and passes its automated tests, but remains user-unverified in operation.**
- NextGen does not blindly copy either release. It preserves their product catalog, scenes, data-source knowledge and verified fixes while replacing the tightly coupled runtime.
