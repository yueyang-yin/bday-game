# A Birthday Web Gift for My Friend 🎂

This is a small birthday gift I made for a friend: a browsable, interactive static web game. 🎁

The project centers on "scenes + character + birthday wishes," featuring page animations, gift presentation, and a pixel-style UI. It is lightweight and ready to enjoy right away.

## Project Overview
- `src/`: Website source code (`index.html`, `styles.css`, `main.js`)
- `assets/`: Images and visual assets
- `scripts/`: Helper scripts for asset processing
- `tests/`: Automated test cases

## How to Use Playwright
This project uses Playwright for end-to-end regression tests, focused on story flow, interaction behavior, and visual consistency:
- Scene and transition checks: validate character state, landing logic, sprite/frame state, and lane alignment across multi-scene transitions (for example, `tests/scene4-airborne-transition-lane.spec.js` and `tests/scene5-airborne-transition-ground.spec.js`).
- Core gameplay mechanics: verify health reduction, invulnerability windows, respawn-to-scene-1 behavior, gift interaction, and final transformation consistency (for example, `tests/health-and-respawn.spec.js` and `tests/final-transform-consistency.spec.js`).
- Mobile experience: run mobile viewport + touch interaction tests to verify canvas ratio, safe margins, and virtual control behavior (for example, `tests/mobile-layout-and-controls.spec.js`).
- Visual debugging support: selected tests save screenshots under `test-results/` for fast diagnosis of sprite/frame/UI issues (for example, `tests/scene6-gift-drop-complete.spec.js`).

### Run Playwright Locally
1. Start a local static server:
   ```bash
   python3 -m http.server 8080
   ```
2. Run tests in another terminal:
   ```bash
   npm test
   ```
3. Optionally set a custom base URL:
   ```bash
   PW_BASE_URL=http://127.0.0.1:8080 npm test
   ```

## Agent Skills Used
- `imagegen`: Used to generate or edit art assets through the OpenAI Image API workflow.
- `vercel-deploy`: Used when publishing the static site to Vercel.
