(() => {
  const landing = document.getElementById("landing");
  const gameScreen = document.getElementById("game");
  const startBtn = document.getElementById("start-btn");
  const optionsBtn = document.getElementById("options-btn");
  const optionsPanel = document.getElementById("options");
  const toggleCoffee = document.getElementById("toggle-coffee");
  const volumeSlider = document.getElementById("volume");

  const pauseOverlay = document.getElementById("pause");
  const resumeBtn = document.getElementById("resume-btn");
  const coffeeInGame = document.getElementById("coffee-in-game");

  const hintBtn = document.getElementById("hint-btn");
  const hint = document.getElementById("hint");
  const closeHint = document.getElementById("close-hint");

  const ending = document.getElementById("ending");
  const restartBtn = document.getElementById("restart-btn");
  const homeBtn = document.getElementById("home-btn");

  const constants = window.__BDG_CONSTANTS || {};
  const BASE_WIDTH = constants.BASE_WIDTH || 800;
  const BASE_HEIGHT = constants.BASE_HEIGHT || 450;
  const WORLD_SCALE = constants.WORLD_SCALE || {
    PLAYER_TARGET_HEIGHT_PX: 72,
    NPC_TARGET_HEIGHT_PX: 78,
    PROJECTILE_TARGET_PX: 28,
    INTERACTABLE_TARGET_PX: 48,
    BADGE_UI_TARGET_PX: 120,
  };
  const MOVEMENT = constants.MOVEMENT || {
    WORLD_GRAVITY_Y: 1250,
    FLOOR_Y: 392,
    PLAYER_SPEED_X: 190,
    JUMP_VELOCITY: -460,
  };
  const COMBAT = constants.COMBAT || {
    THROW_INTERVAL_MIN_MS: 1200,
    THROW_INTERVAL_MAX_MS: 1900,
    PROJECTILE_SPEED_X_MIN: 220,
    PROJECTILE_SPEED_X_MAX: 300,
    PROJECTILE_TTL_MS: 3000,
    WITCH_PATROL_MIN_X: 520,
    WITCH_PATROL_MAX_X: 720,
    WITCH_PATROL_SPEED: 78,
  };
  const SPRITE_IDS = constants.SPRITE_IDS || {
    PLAYER: "player-main",
    BLACKBOY: "npc-blackboy",
    WITCH: "npc-witch",
  };

  let gameInstance = window.__xiaoshouGame || null;

  const state = {
    started: false,
    paused: false,
    ended: false,
    coffee: false,
    scene: "bg1",
    volume: 0.6,
  };
  const sceneKeys = ["bg1", "bg2", "bg3", "bg4", "bg5", "bg6"];

  function syncCoffeeToggles() {
    toggleCoffee.checked = state.coffee;
    coffeeInGame.checked = state.coffee;
  }

  function hideEnding() {
    state.ended = false;
    ending.classList.add("hidden");
  }

  function showEnding() {
    state.ended = true;
    pauseOverlay.classList.add("hidden");
    ending.classList.remove("hidden");
  }

  function withScene(action) {
    if (!gameInstance) return;
    const scene = gameInstance.scene.getScene("free");
    if (scene) action(scene);
  }

  optionsBtn.addEventListener("click", () => {
    optionsPanel.classList.toggle("hidden");
  });

  toggleCoffee.addEventListener("change", (e) => {
    state.coffee = e.target.checked;
    syncCoffeeToggles();
    withScene((scene) => scene.setPlayerTexture(state.coffee ? "coffee" : "player"));
  });

  volumeSlider.addEventListener("input", (e) => {
    state.volume = Number(e.target.value);
    if (gameInstance) {
      gameInstance.sound.volume = state.volume;
    }
  });

  hintBtn.addEventListener("click", () => {
    hint.classList.remove("hidden");
  });

  closeHint.addEventListener("click", () => {
    hint.classList.add("hidden");
  });

  resumeBtn.addEventListener("click", () => {
    togglePause(false);
  });

  coffeeInGame.addEventListener("change", (e) => {
    state.coffee = e.target.checked;
    syncCoffeeToggles();
    withScene((scene) => scene.setPlayerTexture(state.coffee ? "coffee" : "player"));
  });

  restartBtn.addEventListener("click", () => {
    hideEnding();
    state.scene = "bg1";
    state.coffee = false;
    syncCoffeeToggles();
    withScene((scene) => scene.restartRun());
  });

  homeBtn.addEventListener("click", () => {
    hideEnding();
    state.paused = false;
    gameScreen.classList.add("hidden");
    landing.classList.remove("hidden");
    withScene((scene) => scene.scene.pause());
  });

  startBtn.addEventListener("click", () => {
    if (!window.Phaser) {
      alert("Phaser 加载失败，请刷新页面重试。");
      return;
    }

    hideEnding();
    landing.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    if (!gameInstance) {
      gameInstance = createGame();
      window.__xiaoshouGame = gameInstance;
    } else {
      withScene((scene) => scene.restartRun());
    }
  });

  function togglePause(force) {
    if (!state.started || state.ended) return;
    state.paused = typeof force === "boolean" ? force : !state.paused;
    withScene((scene) => {
      if (state.paused) {
        scene.scene.pause();
        pauseOverlay.classList.remove("hidden");
      } else {
        scene.scene.resume();
        pauseOverlay.classList.add("hidden");
      }
    });
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      togglePause();
    }
  });

  function createGame() {
    state.started = true;
    state.paused = false;
    syncCoffeeToggles();

    class FreePlayScene extends Phaser.Scene {
      constructor() {
        super("free");
        this.player = null;
        this.background = null;
        this.ground = null;
        this.cursors = null;
        this.keys = null;
        this.spaceKey = null;
        this.gift = null;
        this.giftOpened = false;
        this.giftLanded = false;
        this.hazards = null;
        this.npc = null;
        this.popup = null;
        this.sceneIndex = 0;
        this.invuln = 0;
        this.throwTimer = null;
        this.runEnded = false;
        this.groundY = MOVEMENT.FLOOR_Y;
        this.awaitingFinalExit = false;
        this.frameVisibleSizeCache = {};
      }

      preload() {
        this.load.image("bg1", "../assets/scenes/A1_scene1_shaanxi_market_main.png");
        this.load.image("bg2", "../assets/scenes/A2_scene2_school_gate_exterior.png");
        this.load.image("bg3", "../assets/scenes/A3_scene2_classroom_interior.png");
        this.load.image("bg4", "../assets/scenes/A4_scene3_haunted_corridor_loop.png");
        this.load.image("bg5", "../assets/scenes/A5_scene4_small_park_cheerful.png");
        this.load.image("bg6", "../assets/scenes/A6_scene5_park_magic_celebration.png");

        this.load.spritesheet("player", "../assets/characters/player_girl_black_walk_32x48.png", {
          frameWidth: 32,
          frameHeight: 48,
        });
        this.load.spritesheet("coffee", "../assets/characters/B3_player_xiaoshou_coffeehead_walk_spritesheet.png", {
          frameWidth: 32,
          frameHeight: 48,
        });
        this.load.spritesheet("blackboy-throw", "../assets/characters/B4_classmate_sitting_aligned_32x48.png", {
          frameWidth: 32,
          frameHeight: 48,
        });

        this.load.image("blackboy", "../assets/characters/B4_classmate_sitting_aligned_32x48.png");

        this.load.spritesheet("witch", "../assets/characters/B5_witch_teacher_run_spritesheet.png", {
          frameWidth: 32,
          frameHeight: 48,
        });

        this.load.spritesheet("gift", "../assets/items/C4_giftbox_pack_spritesheet.png", {
          frameWidth: 32,
          frameHeight: 32,
        });
        this.load.spritesheet("ball", "../assets/items/C1_basketball_spin_spritesheet.png", {
          frameWidth: 16,
          frameHeight: 16,
        });
        this.load.spritesheet("obstacles", "../assets/items/B6_witch_arm_and_hook_pack.png", {
          frameWidth: 16,
          frameHeight: 16,
        });
        this.load.image("badge", "../assets/items/C7_delivery_app_icon_placeholder.png");
      }

      create() {
        this.physics.world.setBounds(0, 0, BASE_WIDTH, BASE_HEIGHT);
        this.physics.world.gravity.y = MOVEMENT.WORLD_GRAVITY_Y;

        this.background = this.add.image(BASE_WIDTH / 2, BASE_HEIGHT / 2, "bg1").setDepth(0);
        this.background.setDisplaySize(BASE_WIDTH, BASE_HEIGHT);

        this.groundY = MOVEMENT.FLOOR_Y;
        this.ground = this.add.rectangle(BASE_WIDTH / 2, this.groundY + 14, BASE_WIDTH, 28, 0x000000, 0);
        this.physics.add.existing(this.ground, true);

        this.player = this.physics.add
          .sprite(120, this.groundY, state.coffee ? "coffee" : "player", 0)
          .setName(SPRITE_IDS.PLAYER)
          .setOrigin(0.5, 1)
          .setCollideWorldBounds(true)
          .setDepth(5);

        this.applyScaleByVisibleHeight(this.player, state.coffee ? "coffee" : "player", WORLD_SCALE.PLAYER_TARGET_HEIGHT_PX);
        this.configureActorBody(this.player);

        this.gift = this.add.sprite(620, this.groundY, "gift", 0).setDepth(6).setVisible(false);
        this.applyScaleByHeight(this.gift, WORLD_SCALE.INTERACTABLE_TARGET_PX);

        this.hazards = this.physics.add.group();

        this.physics.add.collider(this.player, this.ground);
        this.physics.add.overlap(this.player, this.hazards, this.onHit, null, this);

        this.createSideRunAnim("player");
        this.createSideRunAnim("coffee");

        if (!this.anims.exists("ball-spin")) {
          this.anims.create({
            key: "ball-spin",
            frames: [
              { key: "ball", frame: 1 },
              { key: "ball", frame: 2 },
            ],
            frameRate: 10,
            repeat: -1,
          });
        }

        if (!this.anims.exists("witch-run")) {
          this.anims.create({
            key: "witch-run",
            frames: this.anims.generateFrameNumbers("witch", { start: 0, end: 3 }),
            frameRate: 8,
            repeat: -1,
          });
        }

        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys({
          left: Phaser.Input.Keyboard.KeyCodes.A,
          right: Phaser.Input.Keyboard.KeyCodes.D,
        });
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.input.keyboard.on("keydown-SPACE", () => {
          if (this.sceneIndex === 5 && !this.giftOpened) {
            this.tryOpenGift();
          }
        });

        this.cameras.main.roundPixels = true;
        this.sceneIndex = Math.max(0, sceneKeys.indexOf(state.scene));
        this.enterScene(this.sceneIndex);
      }

      restartRun() {
        this.runEnded = false;
        state.paused = false;
        pauseOverlay.classList.add("hidden");

        this.physics.world.resume();
        this.player.clearTint();
        this.player.setAlpha(1);
        this.invuln = 0;

        this.sceneIndex = 0;
        state.scene = sceneKeys[0];
        this.awaitingFinalExit = false;

        this.setPlayerTexture(state.coffee ? "coffee" : "player");
        this.player.setPosition(120, this.groundY);
        this.player.setVelocity(0, 0);

        this.enterScene(0);
        this.scene.resume();
      }

      setBackground(key) {
        this.background.setTexture(key);
        this.background.setDisplaySize(BASE_WIDTH, BASE_HEIGHT);
      }

      setPlayerTexture(key) {
        if (!this.player) return;
        const facingLeft = this.player.flipX;
        this.player.setTexture(key, 0);
        this.applyScaleByVisibleHeight(this.player, key, WORLD_SCALE.PLAYER_TARGET_HEIGHT_PX);
        this.configureActorBody(this.player);
        this.player.setFlipX(facingLeft);
      }

      getFrameSize(textureKey) {
        const texture = this.textures.get(textureKey);
        if (!texture) return { width: 32, height: 32 };

        const frameNames = texture.getFrameNames().filter((name) => name !== "__BASE");
        if (frameNames.length > 0) {
          const frame = texture.get(frameNames[0]);
          if (frame) return { width: frame.width, height: frame.height };
        }

        const base = texture.get("__BASE");
        if (base) return { width: base.width, height: base.height };

        const source = texture.getSourceImage();
        return { width: source.width, height: source.height };
      }

      getVisibleFrameSize(textureKey, frameName = 0) {
        const cacheKey = `${textureKey}:${frameName}`;
        if (this.frameVisibleSizeCache[cacheKey]) {
          return this.frameVisibleSizeCache[cacheKey];
        }

        const texture = this.textures.get(textureKey);
        const candidates = [frameName];
        if (typeof frameName === "number") {
          candidates.push(String(frameName));
        } else if (typeof frameName === "string" && frameName !== "__BASE" && !Number.isNaN(Number(frameName))) {
          candidates.push(Number(frameName));
        }

        let frame = null;
        if (texture) {
          for (let i = 0; i < candidates.length; i += 1) {
            frame = texture.get(candidates[i]);
            if (frame && frame.name !== "__BASE") break;
          }
          if (!frame || frame.name === "__BASE") {
            frame = texture.get("__BASE");
          }
        }
        if (!texture || !frame) {
          return { width: 32, height: 32 };
        }

        const sourceImage = texture.getSourceImage();
        const canvas = document.createElement("canvas");
        canvas.width = frame.width;
        canvas.height = frame.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(
          sourceImage,
          frame.cutX,
          frame.cutY,
          frame.cutWidth,
          frame.cutHeight,
          0,
          0,
          frame.width,
          frame.height
        );

        const data = ctx.getImageData(0, 0, frame.width, frame.height).data;
        let minX = frame.width;
        let minY = frame.height;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < frame.height; y += 1) {
          for (let x = 0; x < frame.width; x += 1) {
            const alpha = data[(y * frame.width + x) * 4 + 3];
            if (alpha > 10) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        const visible =
          maxX >= minX && maxY >= minY
            ? { width: maxX - minX + 1, height: maxY - minY + 1 }
            : { width: frame.width, height: frame.height };

        this.frameVisibleSizeCache[cacheKey] = visible;
        return visible;
      }

      applyScaleByHeight(gameObject, targetHeightPx) {
        const frameHeight = gameObject.frame ? gameObject.frame.height : gameObject.height;
        const scale = targetHeightPx / frameHeight;
        gameObject.setScale(scale);
        return scale;
      }

      applyScaleByVisibleHeight(gameObject, textureKey, targetVisibleHeightPx, frameName = 0) {
        const visible = this.getVisibleFrameSize(textureKey, frameName);
        const scale = targetVisibleHeightPx / Math.max(1, visible.height);
        gameObject.setScale(scale);
        return scale;
      }

      applyScaleByVisibleSize(gameObject, textureKey, targetVisibleSizePx, frameName = 0) {
        const visible = this.getVisibleFrameSize(textureKey, frameName);
        const scale = targetVisibleSizePx / Math.max(1, Math.max(visible.width, visible.height));
        gameObject.setScale(scale);
        return scale;
      }

      applyScaleBySize(textureKey, targetPx) {
        const frame = this.getFrameSize(textureKey);
        return targetPx / Math.max(frame.width, frame.height);
      }

      matchDisplayHeight(targetObject, referenceHeight) {
        if (!targetObject || !referenceHeight || targetObject.displayHeight <= 0) return;
        const scaleRatio = referenceHeight / targetObject.displayHeight;
        targetObject.setScale(targetObject.scaleX * scaleRatio, targetObject.scaleY * scaleRatio);
      }

      configureActorBody(actor) {
        if (!actor.body) return;
        const frameWidth = actor.frame ? actor.frame.realWidth : actor.width;
        const frameHeight = actor.frame ? actor.frame.realHeight : actor.height;
        const bodyWidth = Math.max(10, Math.floor(frameWidth * 0.45));
        const bodyHeight = Math.max(12, Math.floor(frameHeight * 0.62));
        actor.body.setSize(bodyWidth, bodyHeight, false);
        actor.body.setOffset(
          Math.floor((frameWidth - bodyWidth) / 2),
          Math.floor(frameHeight - bodyHeight)
        );
      }

      createSideRunAnim(textureKey) {
        const key = `${textureKey}-run-side`;
        if (this.anims.exists(key)) return;
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(textureKey, { start: 4, end: 7 }),
          frameRate: 9,
          repeat: -1,
        });
      }

      clearSceneActors() {
        if (this.throwTimer) {
          this.throwTimer.remove(false);
          this.throwTimer = null;
        }

        if (this.npc) {
          this.npc.destroy();
          this.npc = null;
        }

        if (this.popup) {
          this.popup.destroy();
          this.popup = null;
        }

        this.hazards.clear(true, true);
        this.gift.setVisible(false);
        this.giftOpened = false;
        this.giftLanded = false;
        this.awaitingFinalExit = false;
      }

      enterScene(index) {
        this.enforceSinglePlayer();
        this.clearSceneActors();

        state.scene = sceneKeys[index];
        this.setBackground(state.scene);

        if (index === 2) {
          this.npc = this.add
            .sprite(690, this.groundY, "blackboy-throw", 0)
            .setName(SPRITE_IDS.BLACKBOY)
            .setOrigin(0.5, 1)
            .setDepth(4);
          this.applyScaleByVisibleHeight(this.npc, "blackboy-throw", WORLD_SCALE.PLAYER_TARGET_HEIGHT_PX, 0);
          this.matchDisplayHeight(this.npc, this.player.displayHeight);
          this.npc.setFlipX(true);
          this.scheduleThrow("blackboy");
        }

        if (index === 3) {
          this.npc = this.add
            .sprite(690, this.groundY, "witch", 0)
            .setName(SPRITE_IDS.WITCH)
            .setOrigin(0.5, 1)
            .setDepth(4);
          this.applyScaleByVisibleHeight(this.npc, "witch", WORLD_SCALE.NPC_TARGET_HEIGHT_PX + 6, 0);
          this.matchDisplayHeight(this.npc, this.player.displayHeight * 1.05);
          this.npc.anims.play("witch-run", true);
          this.npc.setData("vx", -COMBAT.WITCH_PATROL_SPEED);
          this.scheduleThrow("witch");
        }

        if (index === 5) {
          this.spawnGiftDrop();
        }
      }

      scheduleThrow(type) {
        if (this.throwTimer) {
          this.throwTimer.remove(false);
          this.throwTimer = null;
        }

        const delay = Phaser.Math.Between(COMBAT.THROW_INTERVAL_MIN_MS, COMBAT.THROW_INTERVAL_MAX_MS);
        this.throwTimer = this.time.delayedCall(delay, () => {
          if (type === "blackboy") {
            this.launchBlackboyThrow();
          } else {
            this.launchWitchThrow();
          }
          this.scheduleThrow(type);
        });
      }

      spawnProjectile(textureKey, frame, x, y, velocityX, targetSizePx, ttlMs, animKey) {
        const projectile = this.hazards.create(x, y, textureKey, frame);
        projectile.setOrigin(0.5, 0.5).setDepth(6);
        projectile.body.setAllowGravity(false);
        projectile.setVelocity(velocityX, 0);

        this.applyScaleByVisibleSize(projectile, textureKey, targetSizePx, frame);

        if (animKey) {
          projectile.anims.play(animKey, true);
        }

        if (textureKey === "ball") {
          const radius = Math.max(6, projectile.displayWidth * 0.24);
          projectile.body.setCircle(radius, projectile.displayWidth * 0.5 - radius, projectile.displayHeight * 0.5 - radius);
        } else {
          projectile.body.setSize(projectile.displayWidth * 0.6, projectile.displayHeight * 0.6);
          projectile.body.setOffset(projectile.displayWidth * 0.2, projectile.displayHeight * 0.2);
        }

        projectile.setData("expiresAt", this.time.now + ttlMs);
      }

      launchBlackboyThrow() {
        if (this.sceneIndex !== 2 || !this.npc) return;

        this.tweens.add({
          targets: this.npc,
          x: this.npc.x - 4,
          duration: 90,
          yoyo: true,
          ease: "Sine.InOut",
        });

        const speed = Phaser.Math.Between(COMBAT.PROJECTILE_SPEED_X_MIN, COMBAT.PROJECTILE_SPEED_X_MAX);
        const y = this.groundY - this.player.displayHeight * 0.48;
        this.tweens.add({
          targets: this.npc,
          scaleX: this.npc.scaleX * 1.06,
          scaleY: this.npc.scaleY * 0.94,
          duration: 85,
          yoyo: true,
          ease: "Sine.InOut",
        });
        this.spawnProjectile(
          "ball",
          1,
          this.npc.x - this.npc.displayWidth * 0.45,
          y,
          -speed,
          WORLD_SCALE.PLAYER_TARGET_HEIGHT_PX * 0.45,
          COMBAT.PROJECTILE_TTL_MS,
          "ball-spin"
        );
      }

      launchWitchThrow() {
        if (this.sceneIndex !== 3 || !this.npc) return;

        this.tweens.add({
          targets: this.npc,
          y: this.npc.y - 5,
          duration: 90,
          yoyo: true,
          ease: "Sine.InOut",
        });

        const speed = Phaser.Math.Between(COMBAT.PROJECTILE_SPEED_X_MIN, COMBAT.PROJECTILE_SPEED_X_MAX);
        const frame = 1;
        const y = this.groundY - this.player.displayHeight * 0.5;
        this.spawnProjectile(
          "obstacles",
          frame,
          this.npc.x - this.npc.displayWidth * 0.48,
          y,
          -speed,
          WORLD_SCALE.PLAYER_TARGET_HEIGHT_PX * 0.55,
          COMBAT.PROJECTILE_TTL_MS,
          null
        );
      }

      spawnGiftDrop() {
        this.giftOpened = false;
        this.giftLanded = false;
        this.gift.setVisible(true);
        this.gift.setFrame(0);
        this.gift.setPosition(620, -80);

        this.tweens.add({
          targets: this.gift,
          y: this.groundY,
          duration: 1000,
          ease: "Bounce.Out",
          onComplete: () => {
            this.giftLanded = true;
          },
        });
      }

      tryOpenGift() {
        if (this.sceneIndex !== 5 || !this.gift.visible || !this.giftLanded || this.giftOpened) return false;

        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.gift.x, this.gift.y);
        if (dist > 90) return false;

        this.giftOpened = true;
        this.gift.setFrame(4);
        state.coffee = true;
        syncCoffeeToggles();
        this.setPlayerTexture("coffee");
        this.awaitingFinalExit = true;
        this.triggerUberBadgePop(this.gift.x, this.gift.y - this.gift.displayHeight);
        return true;
      }

      triggerUberBadgePop(x, y) {
        if (this.popup) {
          this.popup.destroy();
          this.popup = null;
        }

        const badgeBaseScale = this.applyScaleBySize("badge", WORLD_SCALE.BADGE_UI_TARGET_PX);
        this.popup = this.add.image(x, y, "badge").setDepth(10).setAlpha(1).setScale(badgeBaseScale * 0.2);

        this.tweens.add({
          targets: this.popup,
          scale: badgeBaseScale * 1.8,
          duration: 320,
          ease: "Back.Out",
          onComplete: () => {
            this.tweens.add({
              targets: this.popup,
              scale: badgeBaseScale * 1.2,
              duration: 180,
              ease: "Sine.Out",
            });
          },
        });
      }

      finishGame() {
        if (this.runEnded) return;
        this.runEnded = true;
        this.awaitingFinalExit = false;
        this.player.setVelocity(0, 0);
        this.physics.world.pause();
        showEnding();
      }

      updateWitchPatrol(delta) {
        if (this.sceneIndex !== 3 || !this.npc) return;
        const speed = COMBAT.WITCH_PATROL_SPEED;
        let vx = this.npc.getData("vx") || -speed;

        this.npc.x += (vx * delta) / 1000;

        if (this.npc.x <= COMBAT.WITCH_PATROL_MIN_X) {
          vx = speed;
        } else if (this.npc.x >= COMBAT.WITCH_PATROL_MAX_X) {
          vx = -speed;
        }

        this.npc.setData("vx", vx);
        this.npc.setFlipX(vx > 0);
      }

      onHit(player, hazard) {
        if (this.invuln > 0) return;
        this.invuln = 1.1;
        hazard.destroy();
        player.setTint(0xffb3b3);
        this.time.delayedCall(280, () => {
          if (this.player) this.player.clearTint();
        });
      }

      cleanupHazards() {
        this.hazards.children.each((child) => {
          if (!child) return;
          const expiresAt = child.getData("expiresAt");
          const out = child.x < -80 || child.x > BASE_WIDTH + 80 || child.y < -80 || child.y > BASE_HEIGHT + 80;
          if (out || (expiresAt && this.time.now > expiresAt)) {
            child.destroy();
          }
        });
      }

      enforceSinglePlayer() {
        const players = this.children.list.filter((child) => child && child.name === SPRITE_IDS.PLAYER);
        if (players.length <= 1) return;
        players.slice(1).forEach((extra) => extra.destroy());
      }

      update(time, delta) {
        if (!this.player || this.runEnded) return;

        if (this.invuln > 0) {
          this.invuln -= delta / 1000;
          this.player.setAlpha(this.invuln > 0 ? 0.6 : 1);
        }

        const body = this.player.body;
        const left = this.cursors.left.isDown || this.keys.left.isDown;
        const right = this.cursors.right.isDown || this.keys.right.isDown;

        body.setVelocityX(0);

        if (left) {
          body.setVelocityX(-MOVEMENT.PLAYER_SPEED_X);
          this.player.setFlipX(true);
        } else if (right) {
          body.setVelocityX(MOVEMENT.PLAYER_SPEED_X);
          this.player.setFlipX(false);
        }

        const grounded = body.blocked.down || body.touching.down || body.onFloor();

        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
          const interacted = this.tryOpenGift();
          if (!interacted && grounded) {
            body.setVelocityY(MOVEMENT.JUMP_VELOCITY);
          }
        }

        if (this.player.x > BASE_WIDTH - 36) {
          if (this.sceneIndex < sceneKeys.length - 1) {
            this.sceneIndex += 1;
            this.enterScene(this.sceneIndex);
            this.player.setPosition(44, this.groundY);
            this.player.setVelocity(0, 0);
          } else {
            this.player.setX(BASE_WIDTH - 50);
          }
        }

        if (this.player.x < 24) {
          if (this.sceneIndex === 5 && this.giftOpened && this.awaitingFinalExit) {
            this.finishGame();
            return;
          }
          this.player.setX(24);
        }

        const prefix = this.player.texture.key === "coffee" ? "coffee" : "player";
        if (left || right) {
          this.player.anims.play(`${prefix}-run-side`, true);
        } else {
          this.player.anims.stop();
          this.player.setFrame(0);
        }

        this.updateWitchPatrol(delta);
        this.cleanupHazards();
      }
    }

    const config = {
      type: Phaser.CANVAS,
      parent: "game-canvas",
      width: BASE_WIDTH,
      height: BASE_HEIGHT,
      backgroundColor: "#0d0d10",
      pixelArt: true,
      roundPixels: true,
      physics: {
        default: "arcade",
        arcade: {
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [FreePlayScene],
    };

    const game = new Phaser.Game(config);
    game.sound.volume = state.volume;
    return game;
  }
})();
