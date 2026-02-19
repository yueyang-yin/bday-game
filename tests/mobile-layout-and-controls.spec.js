const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.PW_BASE_URL || "http://127.0.0.1:8080";
const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.describe("移动端三页舞台一致性", () => {
  test.use({
    viewport: MOBILE_VIEWPORT,
    hasTouch: true,
    isMobile: true,
  });

  test("landing、game、ending 的画布尺寸应一致，且 landing/ending 底部显示键盘", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    const landingState = await page.evaluate(() => {
      const stage = document.querySelector(".landing-canvas");
      const wrap = document.getElementById("landing-wrap");
      const controls = document.querySelector("#landing .mobile-controls--static");
      if (!stage || !controls || !wrap) return null;
      const stageRect = stage.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      return {
        width: stageRect.width,
        height: stageRect.height,
        wrapWidth: wrapRect.width,
        wrapHeight: wrapRect.height,
        controlsDisplay: window.getComputedStyle(controls).display,
      };
    });

    expect(landingState).toBeTruthy();
    expect(landingState.controlsDisplay).not.toBe("none");

    await page.click("#start-btn");
    await page.waitForFunction(() => {
      const scene = window.__xiaoshouGame?.scene?.getScene("free");
      return !!scene?.player;
    });

    const gameState = await page.evaluate(() => {
      const stage = document.getElementById("game-stage");
      const wrap = document.getElementById("game-wrap");
      if (!stage || !wrap) return null;
      const stageRect = stage.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      return {
        width: stageRect.width,
        height: stageRect.height,
        wrapWidth: wrapRect.width,
        wrapHeight: wrapRect.height,
      };
    });
    expect(gameState).toBeTruthy();

    await page.evaluate(async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const scene = window.__xiaoshouGame.scene.getScene("free");
      scene.sceneIndex = 5;
      scene.enterScene(5);
      await sleep(1200);
      scene.player.setPosition(scene.gift.x, scene.gift.y);
      scene.input.keyboard.emit("keydown-SPACE");
      await sleep(260);
      scene.player.setX(790);
    });
    await page.waitForSelector("#ending:not(.hidden)");

    const endingState = await page.evaluate(() => {
      const stage = document.querySelector("#ending .ending-card--alien");
      const wrap = document.getElementById("ending-wrap");
      const controls = document.querySelector("#ending .mobile-controls--static");
      if (!stage || !controls || !wrap) return null;
      const stageRect = stage.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      return {
        width: stageRect.width,
        height: stageRect.height,
        wrapWidth: wrapRect.width,
        wrapHeight: wrapRect.height,
        controlsDisplay: window.getComputedStyle(controls).display,
      };
    });

    expect(endingState).toBeTruthy();
    expect(endingState.controlsDisplay).not.toBe("none");

    expect(Math.abs(landingState.width - gameState.width)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(landingState.height - gameState.height)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(landingState.width - endingState.width)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(landingState.height - endingState.height)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(landingState.wrapWidth - gameState.wrapWidth)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(landingState.wrapHeight - gameState.wrapHeight)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(landingState.wrapWidth - endingState.wrapWidth)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(landingState.wrapHeight - endingState.wrapHeight)).toBeLessThanOrEqual(1.5);
    expect(landingState.wrapHeight).toBeGreaterThan(landingState.height + 180);
  });
});

test.describe("移动端布局与虚拟按键", () => {
  test.use({
    viewport: MOBILE_VIEWPORT,
    hasTouch: true,
    isMobile: true,
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.click("#start-btn");
    await page.waitForFunction(() => {
      const scene = window.__xiaoshouGame?.scene?.getScene("free");
      return !!scene?.player;
    });
  });

  test("窄屏下画布应保持比例并与四周保持安全间距，虚拟键盘在画布下方", async ({ page }) => {
    const layout = await page.evaluate(() => {
      const stage = document.getElementById("game-stage");
      const controls = document.getElementById("mobile-controls");
      const canvas = document.querySelector("#game-canvas canvas");
      if (!stage || !controls || !canvas) return null;

      const stageRect = stage.getBoundingClientRect();
      const controlsRect = controls.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const controlsStyle = window.getComputedStyle(controls);

      return {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        stageRect: {
          left: stageRect.left,
          right: stageRect.right,
          top: stageRect.top,
          bottom: stageRect.bottom,
          width: stageRect.width,
          height: stageRect.height,
        },
        controlsRect: {
          left: controlsRect.left,
          right: controlsRect.right,
          top: controlsRect.top,
          bottom: controlsRect.bottom,
          width: controlsRect.width,
          height: controlsRect.height,
        },
        canvasRect: {
          width: canvasRect.width,
          height: canvasRect.height,
        },
        controlsDisplay: controlsStyle.display,
      };
    });

    expect(layout).toBeTruthy();
    expect(layout.controlsDisplay).not.toBe("none");

    expect(layout.stageRect.left).toBeGreaterThanOrEqual(8);
    expect(layout.stageRect.top).toBeGreaterThanOrEqual(8);
    expect(layout.viewport.width - layout.stageRect.right).toBeGreaterThanOrEqual(8);

    const canvasRatio = layout.canvasRect.width / layout.canvasRect.height;
    expect(canvasRatio).toBeGreaterThan(0.66);
    expect(canvasRatio).toBeLessThan(0.78);

    expect(layout.controlsRect.top).toBeGreaterThan(layout.stageRect.bottom);
    expect(layout.viewport.height - layout.controlsRect.bottom).toBeGreaterThanOrEqual(6);
    expect(layout.controlsRect.height).toBeGreaterThan(40);
  });

  test("移动端虚拟按键应支持左右移动与空格（跳跃/交互）", async ({ page }) => {
    const leftBtn = page.locator("#mobile-left-btn");
    const rightBtn = page.locator("#mobile-right-btn");
    const spaceBtn = page.locator("#mobile-space-btn");

    await expect(leftBtn).toBeVisible();
    await expect(rightBtn).toBeVisible();
    await expect(spaceBtn).toBeVisible();

    await page.evaluate(() => {
      const scene = window.__xiaoshouGame.scene.getScene("free");
      scene.player.setPosition(400, scene.groundY);
      scene.player.setVelocity(0, 0);
    });

    const startX = await page.evaluate(() => window.__xiaoshouGame.scene.getScene("free").player.x);

    await leftBtn.dispatchEvent("pointerdown", {
      pointerId: 101,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      buttons: 1,
    });
    await page.waitForTimeout(240);
    await leftBtn.dispatchEvent("pointerup", {
      pointerId: 101,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      buttons: 0,
    });

    const afterLeftX = await page.evaluate(() => window.__xiaoshouGame.scene.getScene("free").player.x);
    expect(afterLeftX).toBeLessThan(startX - 12);

    await rightBtn.dispatchEvent("pointerdown", {
      pointerId: 102,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      buttons: 1,
    });
    await page.waitForTimeout(240);
    await rightBtn.dispatchEvent("pointerup", {
      pointerId: 102,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      buttons: 0,
    });

    const afterRightX = await page.evaluate(() => window.__xiaoshouGame.scene.getScene("free").player.x);
    expect(afterRightX).toBeGreaterThan(afterLeftX + 12);

    await page.waitForFunction(() => {
      const scene = window.__xiaoshouGame.scene.getScene("free");
      const body = scene.player?.body;
      if (!body) return false;
      return body.blocked.down || body.touching.down || body.onFloor();
    });

    await spaceBtn.dispatchEvent("pointerdown", {
      pointerId: 103,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      buttons: 1,
    });
    await spaceBtn.dispatchEvent("pointerup", {
      pointerId: 103,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      buttons: 0,
    });

    await page.waitForFunction(() => {
      const scene = window.__xiaoshouGame.scene.getScene("free");
      const body = scene.player?.body;
      if (!body) return false;
      const grounded = body.blocked.down || body.touching.down || body.onFloor();
      return !grounded && scene.player.y < scene.groundY - 2;
    });

    const jumpState = await page.evaluate(() => {
      const scene = window.__xiaoshouGame.scene.getScene("free");
      const body = scene.player.body;
      return {
        y: scene.player.y,
        groundY: scene.groundY,
        velocityY: body.velocity.y,
      };
    });
    expect(jumpState.y).toBeLessThan(jumpState.groundY - 2);
    expect(jumpState.velocityY).toBeLessThan(0);

    await page.evaluate(async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const scene = window.__xiaoshouGame.scene.getScene("free");
      scene.sceneIndex = 5;
      scene.enterScene(5);
      await sleep(1200);
      scene.player.setPosition(scene.gift.x, scene.gift.y);
      scene.player.setVelocity(0, 0);
    });

    await spaceBtn.dispatchEvent("pointerdown", {
      pointerId: 104,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      buttons: 1,
    });
    await spaceBtn.dispatchEvent("pointerup", {
      pointerId: 104,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      buttons: 0,
    });

    await page.waitForFunction(() => window.__xiaoshouGame.scene.getScene("free").giftOpened === true);
  });

  test("长按后触摸取消不应导致角色持续自动前进", async ({ page }) => {
    const rightBtn = page.locator("#mobile-right-btn");
    await expect(rightBtn).toBeVisible();

    await page.evaluate(() => {
      const scene = window.__xiaoshouGame.scene.getScene("free");
      scene.player.setPosition(300, scene.groundY);
      scene.player.setVelocity(0, 0);
    });

    await rightBtn.dispatchEvent("pointerdown", {
      pointerId: 301,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      buttons: 1,
    });
    await page.waitForTimeout(380);

    const moving = await page.evaluate(() => {
      const scene = window.__xiaoshouGame.scene.getScene("free");
      return {
        x: scene.player.x,
        vx: scene.player.body.velocity.x,
      };
    });
    expect(moving.vx).toBeGreaterThan(80);

    await page.evaluate(() => {
      window.dispatchEvent(new Event("touchcancel"));
    });
    await page.waitForTimeout(180);

    const stopped = await page.evaluate(async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const scene = window.__xiaoshouGame.scene.getScene("free");
      const beforeX = scene.player.x;
      await sleep(260);
      return {
        vx: scene.player.body.velocity.x,
        beforeX,
        afterX: scene.player.x,
      };
    });

    expect(Math.abs(stopped.vx)).toBeLessThan(2);
    expect(Math.abs(stopped.afterX - stopped.beforeX)).toBeLessThan(2.5);
  });
});

test.describe("iPad 适配", () => {
  test.use({
    viewport: { width: 1024, height: 1366 },
    hasTouch: true,
    isMobile: true,
  });

  test("iPad 纵向应保持画布比例和边距，并显示虚拟按键", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.click("#start-btn");
    await page.waitForFunction(() => {
      const scene = window.__xiaoshouGame?.scene?.getScene("free");
      return !!scene?.player;
    });

    const layout = await page.evaluate(() => {
      const stage = document.getElementById("game-stage");
      const controls = document.getElementById("mobile-controls");
      if (!stage || !controls) return null;
      const stageRect = stage.getBoundingClientRect();
      const controlsRect = controls.getBoundingClientRect();
      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        stageRect: {
          left: stageRect.left,
          right: stageRect.right,
          top: stageRect.top,
          bottom: stageRect.bottom,
          width: stageRect.width,
          height: stageRect.height,
        },
        controlsRect: {
          top: controlsRect.top,
          bottom: controlsRect.bottom,
          height: controlsRect.height,
        },
        controlsDisplay: window.getComputedStyle(controls).display,
      };
    });

    expect(layout).toBeTruthy();
    expect(layout.controlsDisplay).not.toBe("none");
    expect(layout.stageRect.left).toBeGreaterThanOrEqual(10);
    expect(layout.stageRect.top).toBeGreaterThanOrEqual(10);
    expect(layout.viewport.width - layout.stageRect.right).toBeGreaterThanOrEqual(10);
    const stageRatio = layout.stageRect.width / layout.stageRect.height;
    expect(stageRatio).toBeGreaterThan(0.66);
    expect(stageRatio).toBeLessThan(0.78);
    expect(layout.controlsRect.top).toBeGreaterThan(layout.stageRect.bottom);
    expect(layout.controlsRect.height).toBeGreaterThan(40);
    expect(layout.viewport.height - layout.controlsRect.bottom).toBeGreaterThanOrEqual(6);
  });
});
