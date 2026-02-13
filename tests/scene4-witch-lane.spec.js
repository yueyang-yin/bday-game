const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.PW_BASE_URL || "http://127.0.0.1:8080";

test("第四幕女巫应与玩家同水平线、三名从右向左依次跑动并触左边缘消失", async ({ page }) => {
  await page.goto(`${BASE_URL}/src/index.html`);
  await page.click("#start-btn");
  await page.waitForFunction(() => {
    const scene = window.__xiaoshouGame?.scene?.getScene("free");
    return !!scene?.player && typeof scene.enterScene === "function";
  });

  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const scene = window.__xiaoshouGame.scene.getScene("free");
    // Real gameplay transition to scene 4.
    const jumpToNextScene = async () => {
      scene.player.setX(790);
      await sleep(220);
    };
    await jumpToNextScene();
    await jumpToNextScene();
    await jumpToNextScene();
  });

  await page.waitForFunction(() => {
    const scene = window.__xiaoshouGame?.scene?.getScene("free");
    return scene?.sceneIndex === 3;
  });

  await page.evaluate(() => {
    const scene = window.__xiaoshouGame.scene.getScene("free");
    if (scene.throwTimer) {
      scene.throwTimer.remove(false);
      scene.throwTimer = null;
    }
    scene.hazards.clear(true, true);
  });

  await page.waitForFunction(() => {
    const scene = window.__xiaoshouGame?.scene?.getScene("free");
    const witches = scene?.witches?.filter((w) => w && w.active) || [];
    return witches.length === 3;
  });

  const initial = await page.evaluate(() => {
    const scene = window.__xiaoshouGame.scene.getScene("free");
    const witches = scene.witches.filter((w) => w && w.active);
    const player = scene.player;
    const playerVisible = scene.getVisibleFrameSize(player.texture.key, player.frame?.name ?? 0);
    const witchBaseVisible = scene.getVisibleFrameSize("witch", 0);
    return {
      witchCount: witches.length,
      witchTextureKeys: witches.map((w) => w.texture.key),
      witchVisibleBottomY: witches.map((w) => scene.getSpriteVisibleBottomY(w, "witch", 0)),
      witchVisibleHeights: witches.map((w) => witchBaseVisible.height * w.scaleY),
      witchY: witches.map((w) => w.y),
      witchX: witches.map((w) => w.x),
      playerY: player.y,
      playerVisibleHeight: playerVisible.height * player.scaleY,
    };
  });

  expect(initial.witchCount).toBe(3);
  initial.witchTextureKeys.forEach((key) => expect(key).toBe("witch"));
  initial.witchVisibleBottomY.forEach((bottomY) => {
    expect(Math.abs(bottomY - initial.playerY)).toBeLessThanOrEqual(1);
  });
  initial.witchVisibleHeights.forEach((height) => {
    expect(Math.abs(height - initial.playerVisibleHeight)).toBeLessThanOrEqual(1);
  });
  initial.witchY.forEach((y) => {
    expect(y).toBeGreaterThan(initial.playerY);
  });
  expect(initial.witchX[0]).toBeLessThan(800);
  expect(initial.witchX[0]).toBeLessThan(initial.witchX[1]);
  expect(initial.witchX[1]).toBeLessThan(initial.witchX[2]);

  await page.waitForTimeout(260);

  const movedX = await page.evaluate(() => {
    const scene = window.__xiaoshouGame.scene.getScene("free");
    return scene.witches.filter((w) => w && w.active).map((w) => w.x);
  });
  expect(movedX.length).toBe(3);
  movedX.forEach((x, idx) => {
    expect(x).toBeLessThan(initial.witchX[idx]);
  });

  await page.evaluate(() => {
    const scene = window.__xiaoshouGame.scene.getScene("free");
    scene.witches.forEach((witch) => {
      if (!witch || !witch.active) return;
      witch.x = witch.displayWidth * 0.5 - 1;
    });
    scene.updateWitchPatrol(16);
  });

  await page.waitForFunction(() => {
    const scene = window.__xiaoshouGame?.scene?.getScene("free");
    const witches = scene?.witches?.filter((w) => w && w.active) || [];
    return witches.length === 0;
  });
});
