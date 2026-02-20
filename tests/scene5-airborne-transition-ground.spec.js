const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.PW_BASE_URL || "http://127.0.0.1:8080";

test("第四幕跳跃切场进入第五幕后，玩家落地应回到地面水平线", async ({ page }) => {
  await page.goto(`${BASE_URL}/?cold=20260220-scene5`);
  await page.click("#start-btn");
  await page.waitForFunction(() => {
    const scene = window.__xiaoshouGame?.scene?.getScene("free");
    return !!scene?.player;
  });

  const state = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const scene = window.__xiaoshouGame.scene.getScene("free");

    const transitionGrounded = async () => {
      scene.player.setY(scene.groundY);
      scene.player.setVelocity(0, 0);
      scene.player.setX(790);
      await sleep(280);
    };

    await transitionGrounded(); // index 1
    await transitionGrounded(); // index 2
    await transitionGrounded(); // index 3 (第四幕)

    // Airborne at scene 4 boundary, then enter scene 5.
    scene.player.setX(790);
    scene.player.setY(scene.groundY - 96);
    scene.player.setVelocity(0, -280);
    await sleep(280);

    // Wait until scene 5 and settle.
    await sleep(450);
    const player = scene.player;
    const frameName = player.frame?.name ?? 0;
    const textureKey = player.texture?.key || "player";
    const visibleBottomY = scene.getSpriteVisibleBottomY(player, textureKey, frameName);
    const grounded = !!(player.body && (player.body.blocked.down || player.body.touching.down || player.body.onFloor()));

    return {
      sceneIndex: scene.sceneIndex,
      groundY: scene.groundY,
      playerY: player.y,
      textureKey,
      frameName,
      visibleBottomY,
      grounded,
      velocityY: player.body?.velocity?.y ?? null,
    };
  });

  expect(state.sceneIndex).toBe(4);
  expect(state.grounded).toBe(true);
  expect(Math.abs(state.playerY - state.groundY)).toBeLessThanOrEqual(1);
  expect(Math.abs(state.visibleBottomY - state.groundY)).toBeLessThanOrEqual(1);
  expect(Math.abs(state.velocityY)).toBeLessThanOrEqual(1);
});
