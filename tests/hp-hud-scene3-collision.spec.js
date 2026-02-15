const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.PW_BASE_URL || "http://127.0.0.1:8080";

test("血量 HUD 应可见，第三幕真实碰撞后应扣 1 点血", async ({ page }, testInfo) => {
  await page.goto(`${BASE_URL}/src/index.html`);
  await page.click("#start-btn");

  await page.waitForFunction(() => {
    const scene = window.__xiaoshouGame?.scene?.getScene("free");
    return !!scene?.player && Array.isArray(scene.healthIcons) && scene.healthIcons.length === 6;
  });

  const hudState = await page.evaluate(() => {
    const scene = window.__xiaoshouGame.scene.getScene("free");
    return {
      health: scene.health,
      icons: scene.healthIcons.map((heart) => ({
        x: heart.x,
        y: heart.y,
        visible: heart.visible,
        alpha: heart.alpha,
        depth: heart.depth,
      })),
    };
  });

  expect(hudState.health).toBe(6);
  expect(hudState.icons).toHaveLength(6);
  hudState.icons.forEach((icon) => {
    expect(icon.visible).toBe(true);
    expect(icon.alpha).toBeGreaterThan(0.9);
    expect(icon.x).toBeGreaterThanOrEqual(0);
    expect(icon.y).toBeGreaterThanOrEqual(0);
    expect(icon.depth).toBeGreaterThanOrEqual(20);
  });

  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const scene = window.__xiaoshouGame.scene.getScene("free");
    const jumpToNextScene = async () => {
      scene.player.setX(790);
      await sleep(220);
    };
    await jumpToNextScene();
    await jumpToNextScene();
  });

  await page.waitForFunction(() => window.__xiaoshouGame?.scene?.getScene("free")?.sceneIndex === 2);

  await page.evaluate(() => {
    const scene = window.__xiaoshouGame.scene.getScene("free");
    if (scene.throwTimer) {
      scene.throwTimer.remove(false);
      scene.throwTimer = null;
    }
    scene.player.setPosition(260, scene.groundY);
    scene.player.setVelocity(0, 0);

    const hazard = scene.hazards.create(scene.player.x + 2, scene.player.y - scene.player.displayHeight * 0.44, "ball", 0);
    hazard.body.setAllowGravity(false);
    hazard.setVelocity(0, 0);
    hazard.setData("expiresAt", scene.time.now + 2200);
  });

  await page.waitForFunction(() => window.__xiaoshouGame?.scene?.getScene("free")?.health === 5);

  const afterHit = await page.evaluate(() => {
    const scene = window.__xiaoshouGame.scene.getScene("free");
    return {
      health: scene.health,
      disabledHearts: scene.healthIcons.filter((heart) => heart.alpha < 0.5).length,
      trailActive: scene.damageTrailRemaining > 0,
      ghostCount: scene.damageGhosts.filter((ghost) => ghost && ghost.active).length,
    };
  });

  expect(afterHit.health).toBe(5);
  expect(afterHit.disabledHearts).toBe(1);
  expect(afterHit.trailActive).toBe(true);
  expect(afterHit.ghostCount).toBeGreaterThan(0);

  await page.screenshot({ path: testInfo.outputPath("hp-hud-scene3-collision.png"), fullPage: true });
});
