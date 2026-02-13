const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.PW_BASE_URL || "http://127.0.0.1:8080";

test("space 跳跃时显示气泡与“我是奶龙”，落地隐藏并可重复触发", async ({ page }) => {
  await page.goto(`${BASE_URL}/src/index.html`);
  await page.click("#start-btn");
  await page.waitForFunction(() => {
    const scene = window.__xiaoshouGame?.scene?.getScene("free");
    return !!scene?.player && !!scene?.jumpBubble && !!scene?.jumpBubbleText && !!scene?.spaceKey;
  });

  await page.evaluate(() => {
    const scene = window.__xiaoshouGame.scene.getScene("free");
    scene.player.setPosition(220, scene.groundY);
    scene.player.setVelocity(0, 0);
  });

  await page.waitForFunction(() => {
    const scene = window.__xiaoshouGame?.scene?.getScene("free");
    if (!scene || !scene.player?.body) return false;
    const body = scene.player.body;
    return body.blocked.down || body.touching.down || body.onFloor();
  });

  const triggerSpaceJump = async () =>
    page.evaluate(() => {
      const scene = window.__xiaoshouGame.scene.getScene("free");
      scene.spaceKey.onDown({ timeStamp: performance.now() });
    });

  const readBubbleState = async () =>
    page.evaluate(() => {
      const scene = window.__xiaoshouGame.scene.getScene("free");
      const bubble = scene.jumpBubble;
      const text = scene.jumpBubbleText;
      const player = scene.player;
      if (!bubble || !text || !player) return null;

      const b = bubble.getBounds();
      const t = text.getBounds();
      const textInsideBubble = t.x >= b.x && t.y >= b.y && t.right <= b.right && t.bottom <= b.bottom;

      return {
        bubbleVisible: bubble.visible,
        textVisible: text.visible,
        text: text.text,
        textInsideBubble,
        bubbleRightOfHead: bubble.x > player.x + player.displayWidth * 0.2,
        ratio: bubble.displayHeight / player.displayHeight,
      };
    });

  await triggerSpaceJump();
  await page.waitForTimeout(30);
  await page.evaluate(() => {
    const scene = window.__xiaoshouGame.scene.getScene("free");
    scene.spaceKey.onUp({ timeStamp: performance.now() });
  });
  await page.waitForFunction(() => {
    const scene = window.__xiaoshouGame?.scene?.getScene("free");
    return !!scene?.jumpBubble?.visible && scene.player?.body?.velocity?.y < -40;
  });

  const firstJump = await readBubbleState();
  expect(firstJump).toBeTruthy();
  expect(firstJump.bubbleVisible).toBe(true);
  expect(firstJump.textVisible).toBe(true);
  expect(firstJump.text).toBe("我是奶龙");
  expect(firstJump.textInsideBubble).toBe(true);
  expect(firstJump.bubbleRightOfHead).toBe(true);
  expect(firstJump.ratio).toBeGreaterThan(0.8);
  expect(firstJump.ratio).toBeLessThan(1.1);

  await page.waitForFunction(() => {
    const scene = window.__xiaoshouGame?.scene?.getScene("free");
    if (!scene || !scene.player?.body || !scene.jumpBubble) return false;
    const body = scene.player.body;
    const grounded = body.blocked.down || body.touching.down || body.onFloor();
    return grounded && !scene.jumpBubble.visible;
  });

  await triggerSpaceJump();
  await page.waitForTimeout(30);
  await page.evaluate(() => {
    const scene = window.__xiaoshouGame.scene.getScene("free");
    scene.spaceKey.onUp({ timeStamp: performance.now() });
  });
  await page.waitForFunction(() => {
    const scene = window.__xiaoshouGame?.scene?.getScene("free");
    return !!scene?.jumpBubble?.visible && scene.player?.body?.velocity?.y < -40;
  });

  const secondJump = await readBubbleState();
  expect(secondJump).toBeTruthy();
  expect(secondJump.bubbleVisible).toBe(true);
  expect(secondJump.textVisible).toBe(true);
  expect(secondJump.text).toBe("我是奶龙");
  expect(secondJump.textInsideBubble).toBe(true);
  expect(secondJump.bubbleRightOfHead).toBe(true);
  expect(secondJump.ratio).toBeGreaterThan(0.8);
  expect(secondJump.ratio).toBeLessThan(1.1);
  expect(Math.abs(secondJump.ratio - firstJump.ratio)).toBeLessThan(0.08);
});
