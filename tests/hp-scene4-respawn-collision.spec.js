const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.PW_BASE_URL || "http://127.0.0.1:8080";

test("第四幕连续受击 6 次后应自动回到第一幕，且不返回 landing page", async ({ page }, testInfo) => {
  await page.goto(`${BASE_URL}/`);
  await page.click("#start-btn");

  await page.waitForFunction(() => {
    const scene = window.__xiaoshouGame?.scene?.getScene("free");
    return !!scene?.player && Array.isArray(scene.healthIcons) && scene.healthIcons.length === 6;
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
    await jumpToNextScene();
  });

  await page.waitForFunction(() => window.__xiaoshouGame?.scene?.getScene("free")?.sceneIndex === 3);

  await page.evaluate(() => {
    const scene = window.__xiaoshouGame.scene.getScene("free");
    if (scene.throwTimer) {
      scene.throwTimer.remove(false);
      scene.throwTimer = null;
    }
    scene.player.setPosition(220, scene.groundY);
    scene.player.setVelocity(0, 0);
  });

  for (let i = 0; i < 6; i += 1) {
    const targetHealth = 5 - i;
    await page.evaluate(() => {
      const scene = window.__xiaoshouGame.scene.getScene("free");
      scene.invuln = 0;
      const hazard = scene.hazards.create(
        scene.player.x + 2,
        scene.player.y - scene.player.displayHeight * 0.44,
        "obstacles",
        1
      );
      hazard.body.setAllowGravity(false);
      hazard.setVelocity(0, 0);
      hazard.setData("expiresAt", scene.time.now + 2200);
    });
    await page.waitForFunction(
      (health) => window.__xiaoshouGame?.scene?.getScene("free")?.health === health,
      targetHealth
    );
  }

  await page.waitForFunction(() => {
    const scene = window.__xiaoshouGame?.scene?.getScene("free");
    return !!scene && scene.sceneIndex === 0 && scene.health === 6 && scene.awaitingRespawn === false;
  });

  const finalState = await page.evaluate(() => {
    const scene = window.__xiaoshouGame.scene.getScene("free");
    return {
      health: scene.health,
      sceneIndex: scene.sceneIndex,
      background: scene.background?.texture?.key,
      playerTexture: scene.player?.texture?.key,
      awaitingRespawn: scene.awaitingRespawn,
      landingHidden: document.getElementById("landing").classList.contains("hidden"),
      gameVisible: !document.getElementById("game").classList.contains("hidden"),
      endingHidden: document.getElementById("ending").classList.contains("hidden"),
    };
  });

  expect(finalState.health).toBe(6);
  expect(finalState.sceneIndex).toBe(0);
  expect(finalState.background).toBe("bg1");
  expect(finalState.playerTexture).toBe("player");
  expect(finalState.awaitingRespawn).toBe(false);
  expect(finalState.landingHidden).toBe(true);
  expect(finalState.gameVisible).toBe(true);
  expect(finalState.endingHidden).toBe(true);

  await page.screenshot({ path: testInfo.outputPath("hp-scene4-respawn-collision.png"), fullPage: true });
});
