const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.PW_BASE_URL || "http://127.0.0.1:8080";

test("第六幕礼物下落、落地与交互后都应保持完整单体形态", async ({ page }, testInfo) => {
  await page.goto(`${BASE_URL}/src/index.html`);
  await page.click("#start-btn");
  await page.waitForFunction(() => {
    const scene = window.__xiaoshouGame?.scene?.getScene("free");
    return !!scene?.player && !!scene?.gift;
  });

  await page.evaluate(() => {
    const scene = window.__xiaoshouGame.scene.getScene("free");
    scene.sceneIndex = 5;
    scene.enterScene(5);
  });

  const screenshotDir = path.resolve(process.cwd(), "test-results", "scene6-gift");
  fs.mkdirSync(screenshotDir, { recursive: true });

  const inspectGift = async () =>
    page.evaluate(() => {
      const scene = window.__xiaoshouGame.scene.getScene("free");
      const texture = scene.textures.get("gift");
      const source = texture.getSourceImage();
      const frame = texture.get(scene.gift.frame.name);
      const canvas = document.createElement("canvas");
      canvas.width = frame.width;
      canvas.height = frame.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.clearRect(0, 0, frame.width, frame.height);
      ctx.drawImage(
        source,
        frame.cutX,
        frame.cutY,
        frame.cutWidth,
        frame.cutHeight,
        0,
        0,
        frame.width,
        frame.height
      );

      const data = ctx.getImageData(0, 0, frame.width, frame.height).data;
      const visited = new Uint8Array(frame.width * frame.height);
      const threshold = 10;
      const minPixelsPerComponent = 10;
      const idxOf = (x, y) => y * frame.width + x;
      const isOpaque = (x, y) => data[idxOf(x, y) * 4 + 3] > threshold;

      let components = 0;
      for (let y = 0; y < frame.height; y += 1) {
        for (let x = 0; x < frame.width; x += 1) {
          const start = idxOf(x, y);
          if (visited[start] || !isOpaque(x, y)) continue;
          const stack = [[x, y]];
          visited[start] = 1;
          let size = 0;
          while (stack.length > 0) {
            const [cx, cy] = stack.pop();
            size += 1;
            [
              [cx + 1, cy],
              [cx - 1, cy],
              [cx, cy + 1],
              [cx, cy - 1],
            ].forEach(([nx, ny]) => {
              if (nx < 0 || ny < 0 || nx >= frame.width || ny >= frame.height) return;
              const ni = idxOf(nx, ny);
              if (visited[ni] || !isOpaque(nx, ny)) return;
              visited[ni] = 1;
              stack.push([nx, ny]);
            });
          }
          if (size >= minPixelsPerComponent) {
            components += 1;
          }
        }
      }

      return {
        texture: scene.gift.texture.key,
        frameName: String(scene.gift.frame.name),
        components,
        y: scene.gift.y,
        groundY: scene.groundY,
        landed: scene.giftLanded,
        giftOpened: scene.giftOpened,
      };
    });

  const giftClip = async () => {
    const viewport = page.viewportSize() || { width: 1280, height: 720 };
    return page.evaluate(({ viewport }) => {
      const scene = window.__xiaoshouGame.scene.getScene("free");
      const canvasRect = scene.game.canvas.getBoundingClientRect();
      const gameWidth = Number(scene.game.config.width);
      const gameHeight = Number(scene.game.config.height);
      const scaleX = canvasRect.width / gameWidth;
      const scaleY = canvasRect.height / gameHeight;

      const centerX = canvasRect.left + scene.gift.x * scaleX;
      const centerY = canvasRect.top + scene.gift.y * scaleY;
      const halfW = Math.max(90, scene.gift.displayWidth * scaleX * 2.2);
      const halfH = Math.max(90, scene.gift.displayHeight * scaleY * 2.2);

      const x = Math.max(0, Math.floor(centerX - halfW));
      const y = Math.max(0, Math.floor(centerY - halfH));
      const maxW = viewport.width - x;
      const maxH = viewport.height - y;
      const width = Math.max(40, Math.min(Math.floor(halfW * 2), maxW));
      const height = Math.max(40, Math.min(Math.floor(halfH * 2), maxH));
      return { x, y, width, height };
    }, { viewport });
  };

  await page.waitForTimeout(160);
  const fallingSnapshot = await inspectGift();
  const fallImage = path.join(screenshotDir, "falling.png");
  await page.screenshot({ path: fallImage, fullPage: true });
  await testInfo.attach("scene6-falling", { path: fallImage, contentType: "image/png" });
  const fallClose = path.join(screenshotDir, "falling-close.png");
  await page.screenshot({ path: fallClose, clip: await giftClip() });
  await testInfo.attach("scene6-falling-close", { path: fallClose, contentType: "image/png" });

  await page.waitForTimeout(1100);
  const landedSnapshot = await inspectGift();
  const landImage = path.join(screenshotDir, "landed.png");
  await page.screenshot({ path: landImage, fullPage: true });
  await testInfo.attach("scene6-landed", { path: landImage, contentType: "image/png" });
  const landClose = path.join(screenshotDir, "landed-close.png");
  await page.screenshot({ path: landClose, clip: await giftClip() });
  await testInfo.attach("scene6-landed-close", { path: landClose, contentType: "image/png" });

  await page.evaluate(() => {
    const scene = window.__xiaoshouGame.scene.getScene("free");
    scene.player.setPosition(scene.gift.x, scene.gift.y);
    scene.input.keyboard.emit("keydown-SPACE");
  });
  await page.waitForTimeout(220);
  const interactedSnapshot = await inspectGift();
  await page.evaluate(() => {
    const scene = window.__xiaoshouGame.scene.getScene("free");
    if (scene.popup) {
      scene.popup.destroy();
      scene.popup = null;
    }
  });
  const interactImage = path.join(screenshotDir, "after-interact.png");
  await page.screenshot({ path: interactImage, fullPage: true });
  await testInfo.attach("scene6-after-interact", { path: interactImage, contentType: "image/png" });
  const interactClose = path.join(screenshotDir, "after-interact-close.png");
  await page.screenshot({ path: interactClose, clip: await giftClip() });
  await testInfo.attach("scene6-after-interact-close", { path: interactClose, contentType: "image/png" });

  expect(fallingSnapshot.texture).toBe("gift");
  expect(["1", "2", "3"]).toContain(fallingSnapshot.frameName);
  expect(fallingSnapshot.frameName).not.toBe("4");

  expect(landedSnapshot.texture).toBe("gift");
  expect(landedSnapshot.frameName).toBe("3");
  expect(landedSnapshot.landed).toBe(true);
  expect(Math.abs(landedSnapshot.y - landedSnapshot.groundY)).toBeLessThanOrEqual(0.5);

  expect(interactedSnapshot.texture).toBe("gift");
  expect(interactedSnapshot.frameName).toBe("4");
  expect(interactedSnapshot.components).toBe(1);
  expect(interactedSnapshot.giftOpened).toBe(true);
  expect(interactedSnapshot.landed).toBe(true);
});
