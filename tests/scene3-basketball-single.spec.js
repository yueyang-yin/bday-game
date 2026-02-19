const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.PW_BASE_URL || "http://127.0.0.1:8080";

test("第三幕篮球贴图与投掷应保持单球显示", async ({ page }) => {
  await page.goto(`${BASE_URL}/`);
  await page.click("#start-btn");
  await page.waitForFunction(() => {
    const scene = window.__xiaoshouGame?.scene?.getScene("free");
    return !!scene?.player && !!scene?.hazards && !!scene?.launchBlackboyThrow;
  });

  await page.evaluate(() => {
    const scene = window.__xiaoshouGame.scene.getScene("free");
    scene.sceneIndex = 2;
    scene.enterScene(2);
    if (scene.throwTimer) {
      scene.throwTimer.remove(false);
      scene.throwTimer = null;
    }
    scene.hazards.clear(true, true);
  });

  await page.evaluate(() => {
    const scene = window.__xiaoshouGame.scene.getScene("free");
    scene.launchBlackboyThrow();
  });

  await page.waitForFunction(() => {
    const scene = window.__xiaoshouGame?.scene?.getScene("free");
    return !!scene && scene.hazards.countActive(true) === 1;
  });

  const inspect = await page.evaluate(() => {
    const scene = window.__xiaoshouGame.scene.getScene("free");
    const balls = scene.hazards
      .getChildren()
      .filter((child) => child && child.active && child.texture?.key === "ball");

    const texture = scene.textures.get("ball");
    const source = texture.getSourceImage();
    const frameNames = [0, 1];

    const countLargeComponents = (frameName) => {
      const frame = texture.get(frameName);
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
      const minPixelsPerBall = 10;
      let components = 0;

      const idxOf = (x, y) => y * frame.width + x;
      const isOpaque = (x, y) => data[idxOf(x, y) * 4 + 3] > threshold;

      for (let y = 0; y < frame.height; y += 1) {
        for (let x = 0; x < frame.width; x += 1) {
          const start = idxOf(x, y);
          if (visited[start] || !isOpaque(x, y)) continue;

          let size = 0;
          const stack = [[x, y]];
          visited[start] = 1;
          while (stack.length > 0) {
            const [cx, cy] = stack.pop();
            size += 1;
            const next = [
              [cx + 1, cy],
              [cx - 1, cy],
              [cx, cy + 1],
              [cx, cy - 1],
            ];
            next.forEach(([nx, ny]) => {
              if (nx < 0 || ny < 0 || nx >= frame.width || ny >= frame.height) return;
              const ni = idxOf(nx, ny);
              if (visited[ni] || !isOpaque(nx, ny)) return;
              visited[ni] = 1;
              stack.push([nx, ny]);
            });
          }

          if (size >= minPixelsPerBall) {
            components += 1;
          }
        }
      }

      return components;
    };

    return {
      ballCount: balls.length,
      frameComponents: frameNames.map((name) => countLargeComponents(name)),
    };
  });

  expect(inspect.ballCount).toBe(1);
  inspect.frameComponents.forEach((count) => {
    expect(count).toBe(1);
  });
});
