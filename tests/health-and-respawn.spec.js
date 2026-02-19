const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.PW_BASE_URL || "http://127.0.0.1:8080";

test("第三四幕受击应扣血，0血后应回到第一幕而非 landing page", async ({ page }) => {
  await page.goto(`${BASE_URL}/`);
  await page.click("#start-btn");
  await page.waitForFunction(() => {
    const scene = window.__xiaoshouGame?.scene?.getScene("free");
    return !!scene?.player && !!scene?.healthIcons && scene.healthIcons.length === 6;
  });

  const initial = await page.evaluate(() => {
    const scene = window.__xiaoshouGame.scene.getScene("free");
    return {
      health: scene.health,
      hearts: scene.healthIcons.length,
      sceneIndex: scene.sceneIndex,
      landingHidden: document.getElementById("landing").classList.contains("hidden"),
    };
  });

  expect(initial.health).toBe(6);
  expect(initial.hearts).toBe(6);
  expect(initial.sceneIndex).toBe(0);
  expect(initial.landingHidden).toBe(true);

  const afterOneHit = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const scene = window.__xiaoshouGame.scene.getScene("free");
    scene.sceneIndex = 2;
    scene.enterScene(2);
    if (scene.throwTimer) {
      scene.throwTimer.remove(false);
      scene.throwTimer = null;
    }
    scene.player.setPosition(250, scene.groundY);
    scene.player.setVelocity(0, 0);

    const hazard = scene.hazards.create(scene.player.x, scene.player.y - scene.player.displayHeight * 0.46, "ball", 0);
    hazard.body.setAllowGravity(false);
    scene.onHit(scene.player, hazard);
    await sleep(120);

    return {
      health: scene.health,
      disabledHearts: scene.healthIcons.filter((heart) => heart.alpha < 0.5).length,
      trailActive: scene.damageTrailRemaining > 0,
      invuln: scene.invuln,
    };
  });

  expect(afterOneHit.health).toBe(5);
  expect(afterOneHit.disabledHearts).toBe(1);
  expect(afterOneHit.trailActive).toBe(true);
  expect(afterOneHit.invuln).toBeGreaterThan(0);

  const afterRespawn = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const scene = window.__xiaoshouGame.scene.getScene("free");

    for (let i = 0; i < 5; i += 1) {
      scene.invuln = 0;
      const hazard = scene.hazards.create(scene.player.x, scene.player.y - scene.player.displayHeight * 0.46, "ball", 0);
      hazard.body.setAllowGravity(false);
      scene.onHit(scene.player, hazard);
      await sleep(90);
    }

    const timeoutAt = performance.now() + 3500;
    while (performance.now() < timeoutAt) {
      if (!scene.awaitingRespawn && scene.sceneIndex === 0 && scene.health === 6) break;
      await sleep(80);
    }

    return {
      health: scene.health,
      sceneIndex: scene.sceneIndex,
      sceneTexture: scene.background?.texture?.key,
      isCoffeeForm: scene.isCoffeeForm,
      playerTexture: scene.player?.texture?.key,
      awaitingRespawn: scene.awaitingRespawn,
      landingHidden: document.getElementById("landing").classList.contains("hidden"),
      gameVisible: !document.getElementById("game").classList.contains("hidden"),
      endingHidden: document.getElementById("ending").classList.contains("hidden"),
    };
  });

  expect(afterRespawn.health).toBe(6);
  expect(afterRespawn.sceneIndex).toBe(0);
  expect(afterRespawn.sceneTexture).toBe("bg1");
  expect(afterRespawn.playerTexture).toBe("player");
  expect(afterRespawn.isCoffeeForm).toBe(false);
  expect(afterRespawn.awaitingRespawn).toBe(false);
  expect(afterRespawn.landingHidden).toBe(true);
  expect(afterRespawn.gameVisible).toBe(true);
  expect(afterRespawn.endingHidden).toBe(true);
});
