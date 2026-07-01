# Oryzo Reference Teardown

Source: https://oryzo.ai/

## Recon Evidence

- Captured on: 2026-07-01
- Method: Playwright visual/DOM recon at 1440, 768, and 390 widths. Third-party screenshots were used only as temporary QA evidence and are not kept in this repo.
- Title: `ORYZO AI`
- Static build signal: Astro assets under `/_astro/`
- Scroll height: `56691`
- Canvas count: `6`
- Image count: `39`
- Video count: `2`
- Console errors during capture: `0`
- Main same-origin runtime assets observed: `/_astro/hoisted.CRsATKbF.js`, `/_astro/index.TL6TuoJb.css`

## Classification

- Complexity: L6 visual / L5 rendering surface.
- Recommended mode for this project: content remix and visual-language transfer.
- Not recommended: 1:1 public clone, direct asset reuse, copied brand copy, copied WebGL bundle.

## Transferable Design DNA

- Huge first-surface signal: one unmistakable product/workspace identity in the first viewport.
- Material table feel: dark chrome plus tactile paper/cork/warm accent surfaces.
- Fixed UI chrome: navigation/status appears precise and tool-like while the main visual moves underneath.
- Long narrative rhythm: sections act like scenes, not generic feature cards.
- Sparse but confident actions: a few primary controls carry real weight.
- Status edges: small labels, dots, progress markers, and side rails make the product feel engineered.

## Translation Into The Documentary Editor

- `ORYZO` hero mark becomes a persistent local documentary workstation identity.
- Cork/product material becomes warm paper-edit surfaces and amber tool accents.
- Fullscreen product canvas becomes a functional edit workspace: media library, transcript paper, video monitor, storyboard canvas.
- Product options become export targets: FCPXML, Premiere XML, DaVinci EDL/FCPXML, Jianying/CapCut.
- AI satire copy becomes practical trust copy: local-first, material does not upload, keys stay in the user's browser.
- Scroll narrative becomes workflow stepper: `素材 -> 转写 -> 选段 -> 故事版 -> 导出`.

## Implementation Boundary

This repo should not mirror Oryzo's visual assets, logo, product copy, or minified runtime. The implementation should remain original and centered on the editor's real features.

If a future round wants a faithful technical study, use the private learning workflow:

1. Mirror same-origin static assets locally only for analysis.
2. Remove tracking scripts.
3. Write `TEARDOWN.md` with evidence labels: `SOURCE`, `PARTIAL`, `GUESS`.
4. Do not deploy the faithful mirror publicly without permission.

## Current Applied Changes

- Added a fifth workflow step for export.
- Added persistent local/privacy chips under the project title.
- Added visible export-format rail in the main workflow callout.
- Added Oryzo-inspired but original material cues: restrained grid, warm/cyan status accents, video monitor frame, storyboard template hint.
