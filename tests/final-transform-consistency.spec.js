const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.PW_BASE_URL || "http://127.0.0.1:8080";

test("final gift transform should stay coffee form during movement and jump cycles", async ({ page }) => {
  await page.goto(`${BASE_URL}/`);
  await page.click("#start-btn");
  await page.waitForFunction(() => {
    const scene = window.__xiaoshouGame?.scene?.getScene("free");
    return !!scene?.player && !!scene?.gift && !!scene?.hazards && !!scene?.keys;
  });

  const result = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const scene = window.__xiaoshouGame.scene.getScene("free");
    const attempts = 6;
    const runs = [];

    for (let i = 0; i < attempts; i += 1) {
      scene.restartRun();
      scene.sceneIndex = 5;
      scene.enterScene(5);
      await sleep(1200);

      scene.player.setPosition(scene.gift.x, scene.gift.y);
      scene.keys.left.isDown = true;
      scene.input.keyboard.emit("keydown-SPACE");
      await sleep(60);

      if (scene.player.body) {
        scene.player.body.setVelocityY(-300);
      }

      const samples = [];
      for (let frame = 0; frame < 45; frame += 1) {
        await sleep(16);
        samples.push(scene.player.texture.key);
      }

      scene.keys.left.isDown = false;
      scene.input.keyboard.emit("keyup-SPACE");

      const leakedToGirl = samples.some((key) => key === "player" || key === "player-jump");
      runs.push({
        giftOpened: scene.giftOpened,
        isCoffeeForm: scene.isCoffeeForm,
        leakedToGirl,
        finalTexture: scene.player.texture.key,
      });
    }

    return {
      attempts,
      runs,
    };
  });

  expect(result.runs).toHaveLength(result.attempts);
  for (const run of result.runs) {
    expect(run.giftOpened).toBe(true);
    expect(run.isCoffeeForm).toBe(true);
    expect(run.leakedToGirl).toBe(false);
    expect(["coffee", "coffee-jump"]).toContain(run.finalTexture);
  }
});
