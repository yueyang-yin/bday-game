const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.PW_BASE_URL || "http://127.0.0.1:8080";

test("ending return home then restart should keep default girl before final scene interaction", async ({ page }) => {
  await page.goto(`${BASE_URL}/src/index.html`);
  await page.click("#start-btn");
  await page.waitForFunction(() => {
    const scene = window.__xiaoshouGame?.scene?.getScene("free");
    return !!scene?.player && !!scene?.gift && !!scene?.hazards;
  });

  const firstRun = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const scene = window.__xiaoshouGame.scene.getScene("free");

    scene.sceneIndex = 5;
    scene.enterScene(5);
    await sleep(1200);

    scene.player.setPosition(scene.gift.x, scene.gift.y);
    scene.input.keyboard.emit("keydown-SPACE");
    await sleep(220);

    const afterGift = {
      texture: scene.player.texture.key,
      isCoffeeForm: scene.isCoffeeForm,
    };

    scene.player.setX(790);
    await sleep(220);

    return {
      afterGift,
      endingVisible: !document.getElementById("ending").classList.contains("hidden"),
    };
  });

  expect(firstRun.afterGift.texture).toBe("coffee");
  expect(firstRun.afterGift.isCoffeeForm).toBe(true);
  expect(firstRun.endingVisible).toBe(true);

  await page.click("#home-btn");
  await expect(page.locator("#landing")).toBeVisible();

  await page.click("#start-btn");
  await page.waitForFunction(() => {
    const scene = window.__xiaoshouGame?.scene?.getScene("free");
    return !!scene?.player && !!scene?.gift && !!scene?.hazards;
  });

  const secondRun = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const scene = window.__xiaoshouGame.scene.getScene("free");

    const startPhase = {
      sceneIndex: scene.sceneIndex,
      texture: scene.player.texture.key,
      isCoffeeForm: scene.isCoffeeForm,
    };

    scene.player.setX(790);
    await sleep(160);
    const runningPhase1 = {
      sceneIndex: scene.sceneIndex,
      texture: scene.player.texture.key,
      isCoffeeForm: scene.isCoffeeForm,
    };

    scene.player.setX(790);
    await sleep(160);
    const runningPhase2 = {
      sceneIndex: scene.sceneIndex,
      texture: scene.player.texture.key,
      isCoffeeForm: scene.isCoffeeForm,
    };

    return { startPhase, runningPhase1, runningPhase2 };
  });

  expect(secondRun.startPhase.sceneIndex).toBe(0);
  expect(secondRun.startPhase.texture).toBe("player");
  expect(secondRun.startPhase.isCoffeeForm).toBe(false);

  expect(secondRun.runningPhase1.sceneIndex).toBe(1);
  expect(secondRun.runningPhase1.texture).toBe("player");
  expect(secondRun.runningPhase1.isCoffeeForm).toBe(false);

  expect(secondRun.runningPhase2.sceneIndex).toBe(2);
  expect(secondRun.runningPhase2.texture).toBe("player");
  expect(secondRun.runningPhase2.isCoffeeForm).toBe(false);
});
