const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.PW_BASE_URL || "http://127.0.0.1:8080";

test("第三幕跳跃切场进入第四幕时，女巫与投掷物应保持地面水平基准", async ({ page }) => {
  await page.goto(`${BASE_URL}/`);
  await page.click("#start-btn");
  await page.waitForFunction(() => {
    const scene = window.__xiaoshouGame?.scene?.getScene("free");
    return !!scene?.player && typeof scene.launchWitchThrow === "function";
  });

  const state = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const scene = window.__xiaoshouGame.scene.getScene("free");

    const transitionGrounded = async () => {
      scene.player.setY(scene.groundY);
      scene.player.setVelocity(0, 0);
      scene.player.setX(790);
      await sleep(260);
    };

    await transitionGrounded();
    await transitionGrounded();

    // Airborne at scene 3 boundary, then enter scene 4.
    scene.player.setX(790);
    scene.player.setY(scene.groundY - 78);
    scene.player.setVelocity(0, -260);
    await sleep(260);

    await sleep(1550);
    const witches = scene.witches.filter((w) => w && w.active);

    if (scene.throwTimer) {
      scene.throwTimer.remove(false);
      scene.throwTimer = null;
    }
    scene.hazards.clear(true, true);
    scene.launchWitchThrow();
    await sleep(60);

    const projectiles = scene.hazards
      .getChildren()
      .filter((child) => child && child.active && child.texture?.key === "obstacles");
    const projectile = projectiles[0] || null;
    const expectedProjectileY = scene.groundY - scene.getCurrentFormGroundVisibleHeight() * 0.5;

    return {
      sceneIndex: scene.sceneIndex,
      playerY: scene.player.y,
      groundY: scene.groundY,
      witchCount: witches.length,
      witchVisibleBottomY: witches.map((w) => scene.getSpriteVisibleBottomY(w, "witch", 0)),
      projectileY: projectile ? projectile.y : null,
      expectedProjectileY,
    };
  });

  expect(state.sceneIndex).toBe(3);
  expect(Math.abs(state.playerY - state.groundY)).toBeLessThanOrEqual(1);
  expect(state.witchCount).toBeGreaterThan(0);
  state.witchVisibleBottomY.forEach((bottomY) => {
    expect(Math.abs(bottomY - state.groundY)).toBeLessThanOrEqual(1);
  });
  expect(state.projectileY).not.toBeNull();
  expect(Math.abs(state.projectileY - state.expectedProjectileY)).toBeLessThanOrEqual(1);
});
