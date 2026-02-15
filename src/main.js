(() => {
  const landing = document.getElementById("landing");
  const gameScreen = document.getElementById("game");
  const startBtn = document.getElementById("start-btn");

  const pauseOverlay = document.getElementById("pause");
  const resumeBtn = document.getElementById("resume-btn");

  const hintBtn = document.getElementById("hint-btn");
  const hint = document.getElementById("hint");
  const closeHint = document.getElementById("close-hint");

  const ending = document.getElementById("ending");
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
    WITCH_COUNT: 3,
    WITCH_SPAWN_GAP: 180,
    WITCH_SPAWN_INTERVAL_MS: 700,
    WITCH_RUN_SPEED: 92,
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
  const FINAL_TRANSFORM_ITALIAN_LINE = "Ballerina Cappuccina";
  const HEALTH_RULES = {
    MAX_HP: 6,
    INVULN_SECONDS: 1.2,
    DAMAGE_TRAIL_SECONDS: 1.35,
    DAMAGE_TRAIL_INTERVAL_MS: 75,
    ZERO_HP_RESTART_DELAY_MS: 900,
  };
  const SCENE4_BALANCE = {
    THROW_INTERVAL_EXTRA_MIN_MS: 520,
    THROW_INTERVAL_EXTRA_MAX_MS: 900,
    PROJECTILE_SPEED_REDUCTION_MIN: 60,
    PROJECTILE_SPEED_REDUCTION_MAX: 70,
    PROJECTILE_SIZE_MULTIPLIER: 0.42,
    WITCH_SPAWN_GAP: 240,
    WITCH_SPAWN_INTERVAL_MS: 920,
    WITCH_RUN_SPEED: 76,
    MAX_ACTIVE_PROJECTILES: 2,
  };

  function resetRunStateToDefaultGirl() {
    state.coffee = false;
    state.scene = sceneKeys[0];
    syncCoffeeToggles();
  }

  function syncCoffeeToggles() {
    const toggleCoffee = document.getElementById("toggle-coffee");
    const coffeeInGame = document.getElementById("coffee-in-game");
    if (toggleCoffee) toggleCoffee.checked = state.coffee;
    if (coffeeInGame) coffeeInGame.checked = state.coffee;
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

  if (hintBtn && hint) {
    hintBtn.addEventListener("click", () => {
      hint.classList.remove("hidden");
    });
  }

  if (closeHint && hint) {
    closeHint.addEventListener("click", () => {
      hint.classList.add("hidden");
    });
  }

  if (resumeBtn) {
    resumeBtn.addEventListener("click", () => {
      togglePause(false);
    });
  }

  if (homeBtn && gameScreen && landing) {
    homeBtn.addEventListener("click", () => {
      hideEnding();
      resetRunStateToDefaultGirl();
      state.paused = false;
      gameScreen.classList.add("hidden");
      landing.classList.remove("hidden");
      withScene((scene) => scene.scene.pause());
    });
  }

  if (startBtn && landing && gameScreen) {
    startBtn.addEventListener("click", () => {
      if (!window.Phaser) {
        alert("Phaser 加载失败，请刷新页面重试。");
        return;
      }

      hideEnding();
      resetRunStateToDefaultGirl();
      landing.classList.add("hidden");
      gameScreen.classList.remove("hidden");

      if (!gameInstance) {
        gameInstance = createGame();
        window.__xiaoshouGame = gameInstance;
      } else {
        withScene((scene) => scene.restartRun());
      }
    });
  }

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
        this.witches = [];
        this.nextWitchThrowIndex = 0;
        this.witchLaneY = null;
        this.witchSpawnTimers = [];
        this.popup = null;
        this.sceneIndex = 0;
        this.invuln = 0;
        this.throwTimer = null;
        this.runEnded = false;
        this.groundY = MOVEMENT.FLOOR_Y;
        this.awaitingFinalExit = false;
        this.frameVisibleSizeCache = {};
        this.isCoffeeForm = false;
        this.jumpBubble = null;
        this.jumpBubbleText = null;
        this.jumpBubbleVisible = false;
        this.jumpBubbleSeenAirborne = false;
        this.pendingSpacePress = false;
        this.health = HEALTH_RULES.MAX_HP;
        this.healthIcons = [];
        this.damageTrailRemaining = 0;
        this.damageTrailCooldownMs = 0;
        this.damageGhosts = [];
        this.awaitingRespawn = false;
        this.respawnTimer = null;
      }

      speakFinalTransformNarration() {
        if (!("speechSynthesis" in window) || typeof window.SpeechSynthesisUtterance !== "function") {
          return;
        }

        const utterance = new window.SpeechSynthesisUtterance(FINAL_TRANSFORM_ITALIAN_LINE);
        utterance.lang = "it-IT";
        utterance.rate = 0.8;
        utterance.pitch = 0.78;
        utterance.volume = 1;

        const voices = window.speechSynthesis.getVoices();
        const italianVoices = voices.filter((voice) => (voice.lang || "").toLowerCase().startsWith("it"));
        const maleNameHints = [
          "male",
          "man",
          "uomo",
          "luca",
          "marco",
          "giorgio",
          "diego",
          "federico",
          "alessandro",
        ];
        const maleItalianVoice = italianVoices.find((voice) => {
          const info = `${voice.name || ""} ${voice.voiceURI || ""}`.toLowerCase();
          return maleNameHints.some((hint) => info.includes(hint));
        });
        utterance.voice = maleItalianVoice || italianVoices[0] || null;

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }

      getGroundFrameForCurrentForm() {
        return this.isCoffeeForm ? 5 : 0;
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
        this.load.image("player-jump", "../assets/characters/player_jump_32x48.png?v=20260213jumpfix");
        this.load.image("coffee-jump", "../assets/characters/coffee_jump_32x48.png?v=20260213jumpfix");
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
        this.load.spritesheet("ball", "../assets/items/C1_basketball_spin_clean_spritesheet.png", {
          frameWidth: 16,
          frameHeight: 16,
        });
        this.load.spritesheet("obstacles", "../assets/items/B6_witch_arm_and_hook_pack.png", {
          frameWidth: 16,
          frameHeight: 16,
        });
        this.load.image("badge", "../assets/items/C7_delivery_app_icon_placeholder.png");
        this.load.image("thought-bubble", "../assets/ui/D2_thought_bubble_frame.png");
        this.load.image("hud-heart", "../assets/ui/hp_heart_pixel.png");
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
          .sprite(120, this.groundY, state.coffee ? "coffee" : "player", state.coffee ? 5 : 0)
          .setName(SPRITE_IDS.PLAYER)
          .setOrigin(0.5, 1)
          .setCollideWorldBounds(true)
          .setDepth(5);

        this.applyScaleByVisibleHeight(this.player, state.coffee ? "coffee" : "player", WORLD_SCALE.PLAYER_TARGET_HEIGHT_PX);
        this.configureActorBody(this.player);
        this.isCoffeeForm = state.coffee;
        this.createJumpBubble();
        this.createHealthHud();
        this.resetHealth();

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
            frames: this.anims.generateFrameNumbers("ball", { start: 0, end: 1 }),
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

        if (!this.anims.exists("gift-fall")) {
          this.anims.create({
            key: "gift-fall",
            frames: this.anims.generateFrameNumbers("gift", { start: 1, end: 3 }),
            frameRate: 10,
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
          this.pendingSpacePress = true;
        });

        this.cameras.main.roundPixels = true;
        this.sceneIndex = Math.max(0, sceneKeys.indexOf(state.scene));
        this.enterScene(this.sceneIndex);
      }

      createJumpBubble() {
        this.jumpBubble = this.add.image(0, 0, "thought-bubble").setOrigin(0.5).setDepth(9).setVisible(false);
        this.jumpBubbleText = this.add
          .text(0, 0, "我是奶龙", {
            fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
            fontStyle: "900",
            color: "#ffd84d",
            stroke: "#7a2d00",
            strokeThickness: 4,
            shadow: {
              offsetX: 1,
              offsetY: 1,
              color: "#2a1300",
              blur: 0,
              stroke: true,
              fill: true,
            },
            align: "center",
          })
          .setOrigin(0.5)
          .setDepth(10)
          .setVisible(false);
      }

      updateJumpBubbleLayout() {
        if (!this.player || !this.jumpBubble || !this.jumpBubbleText) return;

        const playerHeight = Math.max(1, this.player.displayHeight);
        const targetBubbleHeight = playerHeight * 0.95;
        const bubbleTexture = this.textures.get("thought-bubble");
        const bubbleFrame = bubbleTexture ? bubbleTexture.get("__BASE") : null;
        const baseBubbleWidth = bubbleFrame ? bubbleFrame.width : 160;
        const baseBubbleHeight = bubbleFrame ? bubbleFrame.height : 120;
        const bubbleWidth = (baseBubbleWidth / baseBubbleHeight) * targetBubbleHeight;

        this.jumpBubble.setDisplaySize(bubbleWidth, targetBubbleHeight);

        const playerTopY = this.player.y - playerHeight;
        let bubbleX = this.player.x + this.player.displayWidth * 0.66 + bubbleWidth * 0.34;
        let bubbleY = playerTopY - targetBubbleHeight * 0.08;

        bubbleX = Phaser.Math.Clamp(bubbleX, bubbleWidth * 0.52, BASE_WIDTH - bubbleWidth * 0.52);
        bubbleY = Phaser.Math.Clamp(bubbleY, targetBubbleHeight * 0.52, BASE_HEIGHT - targetBubbleHeight * 0.52);

        this.jumpBubble.setPosition(bubbleX, bubbleY);

        const textBoxWidth = bubbleWidth * 0.6;
        const textBoxHeight = targetBubbleHeight * 0.4;
        const fontSize = Math.max(12, Math.round(targetBubbleHeight * 0.16));
        const strokeThickness = Math.max(2, Math.round(targetBubbleHeight * 0.045));

        this.jumpBubbleText.setFontSize(fontSize);
        this.jumpBubbleText.setStroke("#7a2d00", strokeThickness);
        this.jumpBubbleText.setWordWrapWidth(textBoxWidth, true);
        this.jumpBubbleText.setFixedSize(textBoxWidth, textBoxHeight);
        this.jumpBubbleText.setPosition(bubbleX + bubbleWidth * 0.04, bubbleY - targetBubbleHeight * 0.02);
      }

      showJumpBubbleForJump() {
        if (!this.jumpBubble || !this.jumpBubbleText) return;
        this.jumpBubbleVisible = true;
        this.jumpBubbleSeenAirborne = false;
        this.jumpBubble.setVisible(true);
        this.jumpBubbleText.setVisible(true);
        this.updateJumpBubbleLayout();
      }

      hideJumpBubble() {
        if (!this.jumpBubble || !this.jumpBubbleText) return;
        this.jumpBubbleVisible = false;
        this.jumpBubbleSeenAirborne = false;
        this.jumpBubble.setVisible(false);
        this.jumpBubbleText.setVisible(false);
      }

      createHealthHud() {
        if (this.healthIcons.length > 0) return;
        const startX = 18;
        const startY = 12;
        const spacing = 30;
        for (let i = 0; i < HEALTH_RULES.MAX_HP; i += 1) {
          const heart = this.add
            .image(startX + i * spacing, startY, "hud-heart")
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(20)
            .setScale(0.82);
          this.healthIcons.push(heart);
        }
      }

      resetHealth() {
        this.health = HEALTH_RULES.MAX_HP;
        this.updateHealthHud();
      }

      updateHealthHud() {
        if (!this.healthIcons || this.healthIcons.length === 0) return;
        this.healthIcons.forEach((heart, index) => {
          if (!heart) return;
          if (index < this.health) {
            heart.clearTint();
            heart.setAlpha(1);
          } else {
            heart.setTint(0x5f2b35);
            heart.setAlpha(0.35);
          }
        });
      }

      clearDamageGhosts() {
        if (!this.damageGhosts || this.damageGhosts.length === 0) return;
        this.damageGhosts.forEach((ghost) => {
          if (ghost && ghost.active) ghost.destroy();
        });
        this.damageGhosts = [];
      }

      emitDamageGhost() {
        if (!this.player || !this.player.active) return;
        const ghost = this.add
          .sprite(this.player.x, this.player.y, this.player.texture.key, this.player.frame?.name ?? 0)
          .setOrigin(0.5, 1)
          .setDepth(this.player.depth - 0.2)
          .setScale(this.player.scaleX, this.player.scaleY)
          .setFlipX(this.player.flipX)
          .setAlpha(0.42);
        this.damageGhosts.push(ghost);
        this.tweens.add({
          targets: ghost,
          alpha: 0,
          x: ghost.x + (this.player.flipX ? 9 : -9),
          y: ghost.y - 6,
          duration: 360,
          ease: "Sine.Out",
          onComplete: () => {
            if (ghost && ghost.active) ghost.destroy();
            this.damageGhosts = this.damageGhosts.filter((item) => item && item !== ghost && item.active);
          },
        });
      }

      startDamageVisuals() {
        this.player.setTint(0xffb3b3);
        this.time.delayedCall(280, () => {
          if (this.player && this.player.active) this.player.clearTint();
        });
        this.damageTrailRemaining = HEALTH_RULES.DAMAGE_TRAIL_SECONDS;
        this.damageTrailCooldownMs = 0;
        this.emitDamageGhost();
      }

      updateDamageTrail(delta) {
        if (this.damageTrailRemaining <= 0) return;
        this.damageTrailRemaining = Math.max(0, this.damageTrailRemaining - delta / 1000);
        this.damageTrailCooldownMs -= delta;
        if (this.damageTrailCooldownMs <= 0) {
          this.emitDamageGhost();
          this.damageTrailCooldownMs = HEALTH_RULES.DAMAGE_TRAIL_INTERVAL_MS;
        }
      }

      loseHealth(amount = 1) {
        this.health = Math.max(0, this.health - amount);
        this.updateHealthHud();
        if (this.health <= 0) {
          this.startRespawnToFirstScene();
        }
      }

      startRespawnToFirstScene() {
        if (this.awaitingRespawn) return;
        this.awaitingRespawn = true;
        this.hideJumpBubble();
        this.player.setVelocity(0, 0);
        this.clearSceneActors();
        if (this.respawnTimer) {
          this.respawnTimer.remove(false);
          this.respawnTimer = null;
        }
        this.respawnTimer = this.time.delayedCall(HEALTH_RULES.ZERO_HP_RESTART_DELAY_MS, () => {
          this.respawnTimer = null;
          this.restartRun();
        });
      }

      getThrowDelayMs(type) {
        if (type === "witch") {
          return Phaser.Math.Between(
            COMBAT.THROW_INTERVAL_MIN_MS + SCENE4_BALANCE.THROW_INTERVAL_EXTRA_MIN_MS,
            COMBAT.THROW_INTERVAL_MAX_MS + SCENE4_BALANCE.THROW_INTERVAL_EXTRA_MAX_MS
          );
        }
        return Phaser.Math.Between(COMBAT.THROW_INTERVAL_MIN_MS, COMBAT.THROW_INTERVAL_MAX_MS);
      }

      restartRun() {
        this.runEnded = false;
        this.awaitingRespawn = false;
        state.paused = false;
        pauseOverlay.classList.add("hidden");

        this.physics.world.resume();
        this.clearDamageGhosts();
        this.damageTrailRemaining = 0;
        this.damageTrailCooldownMs = 0;
        this.player.clearTint();
        this.player.setAlpha(1);
        this.invuln = 0;
        if (this.respawnTimer) {
          this.respawnTimer.remove(false);
          this.respawnTimer = null;
        }

        this.sceneIndex = 0;
        state.coffee = false;
        state.scene = sceneKeys[0];
        syncCoffeeToggles();
        this.awaitingFinalExit = false;
        this.isCoffeeForm = false;

        this.setPlayerTexture("player");
        this.player.setPosition(120, this.groundY);
        this.player.setVelocity(0, 0);
        this.hideJumpBubble();
        this.resetHealth();

        this.enterScene(0);
        this.scene.resume();
      }

      setBackground(key) {
        this.background.setTexture(key);
        this.background.setDisplaySize(BASE_WIDTH, BASE_HEIGHT);
      }

      setPlayerTexture(key) {
        if (!this.player) return;
        if (key === "player" || key === "coffee") {
          this.isCoffeeForm = key === "coffee";
        }
        const facingLeft = this.player.flipX;
        const frameForGround = this.getGroundFrameForCurrentForm();
        const targetFrame = key === "player" || key === "coffee" ? frameForGround : 0;
        this.player.setTexture(key, targetFrame);
        const texture = this.textures.get(key);
        const hasSpriteFrames =
          texture &&
          texture
            .getFrameNames()
            .some((name) => name !== "__BASE");
        const baseFrame = hasSpriteFrames ? targetFrame : "__BASE";
        this.applyScaleByVisibleHeight(this.player, key, WORLD_SCALE.PLAYER_TARGET_HEIGHT_PX, baseFrame);
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

      getVisibleFrameMetrics(textureKey, frameName = 0) {
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
          return {
            width: 32,
            height: 32,
            frameWidth: 32,
            frameHeight: 32,
            minX: 0,
            minY: 0,
            maxX: 31,
            maxY: 31,
            bottomOffset: 0,
          };
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

        const hasVisiblePixels = maxX >= minX && maxY >= minY;
        const metrics = hasVisiblePixels
          ? {
              width: maxX - minX + 1,
              height: maxY - minY + 1,
              frameWidth: frame.width,
              frameHeight: frame.height,
              minX,
              minY,
              maxX,
              maxY,
              bottomOffset: Math.max(0, frame.height - 1 - maxY),
            }
          : {
              width: frame.width,
              height: frame.height,
              frameWidth: frame.width,
              frameHeight: frame.height,
              minX: 0,
              minY: 0,
              maxX: frame.width - 1,
              maxY: frame.height - 1,
              bottomOffset: 0,
            };

        this.frameVisibleSizeCache[cacheKey] = metrics;
        return metrics;
      }

      getVisibleFrameSize(textureKey, frameName = 0) {
        const metrics = this.getVisibleFrameMetrics(textureKey, frameName);
        return { width: metrics.width, height: metrics.height };
      }

      getVisibleBottomOffset(textureKey, frameName = 0) {
        const metrics = this.getVisibleFrameMetrics(textureKey, frameName);
        return metrics.bottomOffset || 0;
      }

      getSpriteVisibleBottomY(sprite, textureKey, frameName = 0) {
        if (!sprite) return this.groundY;
        const bottomOffset = this.getVisibleBottomOffset(textureKey, frameName);
        return sprite.y - bottomOffset * sprite.scaleY;
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

      alignVisibleBottomToY(targetObject, textureKey, referenceVisibleBottomY, frameName = 0) {
        if (!targetObject) return;
        const bottomOffset = this.getVisibleBottomOffset(textureKey, frameName);
        targetObject.y = referenceVisibleBottomY + bottomOffset * targetObject.scaleY;
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
        if (this.witches && this.witches.length > 0) {
          this.witches.forEach((witch) => {
            if (witch) witch.destroy();
          });
        }
        if (this.witchSpawnTimers && this.witchSpawnTimers.length > 0) {
          this.witchSpawnTimers.forEach((timer) => {
            if (timer) timer.remove(false);
          });
        }
        this.witches = [];
        this.nextWitchThrowIndex = 0;
        this.witchLaneY = null;
        this.witchSpawnTimers = [];

        if (this.popup) {
          this.popup.destroy();
          this.popup = null;
        }

        if (this.hazards) {
          this.hazards.clear(true, true);
        }
        this.clearDamageGhosts();
        if (this.gift) {
          this.gift.setVisible(false);
        }
        this.giftOpened = false;
        this.giftLanded = false;
        this.awaitingFinalExit = false;
        this.hideJumpBubble();
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
          this.createWitchSquad();
          this.scheduleThrow("witch");
        }

        if (index === 5) {
          this.spawnGiftDrop();
        }
      }

      createWitchSquad() {
        this.witches = [];
        this.nextWitchThrowIndex = 0;
        this.witchLaneY = null;
        this.witchSpawnTimers = [];

        // Align witch visible bottom line to player's ground lane (player.y).
        const playerLaneY = this.player ? this.player.y : this.groundY;
        const playerTextureKey = this.player?.texture?.key || "player";
        const playerFrameName = this.player?.frame?.name ?? 0;
        const playerVisible = this.getVisibleFrameSize(playerTextureKey, playerFrameName);
        const targetWitchVisibleHeight = Math.max(1, playerVisible.height * (this.player?.scaleY || 1));

        let spawnX = BASE_WIDTH + 30;
        for (let i = 0; i < COMBAT.WITCH_COUNT; i += 1) {
          const spawnDelay = i * SCENE4_BALANCE.WITCH_SPAWN_INTERVAL_MS;
          const currentSpawnX = spawnX;
          const timer = this.time.delayedCall(spawnDelay, () => {
            if (this.sceneIndex !== 3 || this.runEnded) return;
            const witch = this.add
              .sprite(currentSpawnX, this.groundY, "witch", 0)
              .setName(SPRITE_IDS.WITCH)
              .setOrigin(0.5, 1)
              .setDepth(4);
            // Match witch visible body height to player visible body height (1:1).
            this.applyScaleByVisibleHeight(witch, "witch", targetWitchVisibleHeight, 0);
            this.alignVisibleBottomToY(witch, "witch", playerLaneY, 0);
            this.witchLaneY = this.witchLaneY === null ? witch.y : this.witchLaneY;
            witch.setY(this.witchLaneY);
            witch.anims.play("witch-run", true);
            witch.setFlipX(false);
            this.witches.push(witch);
          });
          this.witchSpawnTimers.push(timer);
          spawnX += SCENE4_BALANCE.WITCH_SPAWN_GAP;
        }
      }

      scheduleThrow(type) {
        if (this.throwTimer) {
          this.throwTimer.remove(false);
          this.throwTimer = null;
        }

        const delay = this.getThrowDelayMs(type);
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
          0,
          this.npc.x - this.npc.displayWidth * 0.45,
          y,
          -speed,
          WORLD_SCALE.PLAYER_TARGET_HEIGHT_PX * 0.45,
          COMBAT.PROJECTILE_TTL_MS,
          "ball-spin"
        );
      }

      launchWitchThrow() {
        if (this.sceneIndex !== 3 || !this.witches || this.witches.length === 0) return;
        const activeProjectiles = this.hazards
          .getChildren()
          .filter((child) => child && child.active && child.texture?.key === "obstacles").length;
        if (activeProjectiles >= SCENE4_BALANCE.MAX_ACTIVE_PROJECTILES) return;

        const activeWitches = this.witches.filter((witch) => witch && witch.active);
        if (activeWitches.length === 0) return;
        const witch = activeWitches[this.nextWitchThrowIndex % activeWitches.length];
        this.nextWitchThrowIndex = (this.nextWitchThrowIndex + 1) % activeWitches.length;

        this.tweens.add({
          targets: witch,
          y: witch.y - 5,
          duration: 90,
          yoyo: true,
          ease: "Sine.InOut",
        });

        const minSpeed = Math.max(120, COMBAT.PROJECTILE_SPEED_X_MIN - SCENE4_BALANCE.PROJECTILE_SPEED_REDUCTION_MIN);
        const maxSpeed = Math.max(minSpeed + 20, COMBAT.PROJECTILE_SPEED_X_MAX - SCENE4_BALANCE.PROJECTILE_SPEED_REDUCTION_MAX);
        const speed = Phaser.Math.Between(minSpeed, maxSpeed);
        const frame = 1;
        const y = this.player.y - this.player.displayHeight * 0.5;
        this.spawnProjectile(
          "obstacles",
          frame,
          witch.x - witch.displayWidth * 0.48,
          y,
          -speed,
          WORLD_SCALE.PLAYER_TARGET_HEIGHT_PX * SCENE4_BALANCE.PROJECTILE_SIZE_MULTIPLIER,
          COMBAT.PROJECTILE_TTL_MS,
          null
        );
      }

      spawnGiftDrop() {
        this.giftOpened = false;
        this.giftLanded = false;
        this.gift.setVisible(true);
        this.gift.setFrame(1);
        this.gift.play("gift-fall", true);
        this.gift.setPosition(620, -80);

        this.tweens.add({
          targets: this.gift,
          y: this.groundY,
          duration: 1000,
          ease: "Bounce.Out",
          onComplete: () => {
            this.gift.anims.stop();
            this.gift.setFrame(3);
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
        this.player.anims.stop();
        this.player.setFrame(this.getGroundFrameForCurrentForm());
        this.speakFinalTransformNarration();
        this.awaitingFinalExit = true;
        this.triggerUberBadgePop(this.gift.x, this.gift.y - this.gift.displayHeight);
        return true;
      }

      triggerUberBadgePop(x, y) {
        if (this.popup) {
          this.popup.destroy();
          this.popup = null;
        }

        const badgeBaseScale = this.applyScaleBySize("badge", WORLD_SCALE.BADGE_UI_TARGET_PX * 1.45);
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
        this.hideJumpBubble();
        this.player.setVelocity(0, 0);
        this.physics.world.pause();
        showEnding();
      }

      updateWitchPatrol(delta) {
        if (this.sceneIndex !== 3 || !this.witches || this.witches.length === 0) return;

        const speed = SCENE4_BALANCE.WITCH_RUN_SPEED;
        this.witches = this.witches.filter((witch) => {
          if (!witch || !witch.active) return false;

          witch.x -= (speed * delta) / 1000;
          if (this.witchLaneY !== null) {
            witch.y = this.witchLaneY;
          }
          witch.setFlipX(false);

          const touchedLeftEdge = witch.x - witch.displayWidth * 0.5 <= 0;
          if (touchedLeftEdge) {
            witch.destroy();
            return false;
          }
          return true;
        });
      }

      onHit(player, hazard) {
        if (this.invuln > 0 || this.awaitingRespawn || this.runEnded) return;
        this.invuln = HEALTH_RULES.INVULN_SECONDS;
        if (hazard && hazard.active) hazard.destroy();
        this.startDamageVisuals();
        this.loseHealth(1);
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

        this.updateDamageTrail(delta);

        if (this.awaitingRespawn) {
          this.player.setVelocity(0, 0);
          this.cleanupHazards();
          return;
        }

        // Final scene contract: once the gift is opened, the player must stay in coffee form immediately.
        if (this.sceneIndex === 5 && this.giftOpened && !this.isCoffeeForm) {
          this.setPlayerTexture("coffee");
          this.player.anims.stop();
          this.player.setFrame(this.getGroundFrameForCurrentForm());
        }

        if (this.invuln > 0) {
          this.invuln = Math.max(0, this.invuln - delta / 1000);
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

        if (this.sceneIndex === 5 && this.giftOpened) {
          if (!this.isCoffeeForm) {
            this.isCoffeeForm = true;
          }
          if (this.player.texture.key === "player" || this.player.texture.key === "player-jump") {
            if (grounded) {
              this.setPlayerTexture("coffee");
              this.player.anims.stop();
              this.player.setFrame(this.getGroundFrameForCurrentForm());
            } else {
              this.player.setTexture("coffee-jump");
              this.applyScaleByVisibleHeight(this.player, "coffee-jump", WORLD_SCALE.PLAYER_TARGET_HEIGHT_PX, "__BASE");
              this.configureActorBody(this.player);
            }
          }
        }

        const spacePressed = this.pendingSpacePress || Phaser.Input.Keyboard.JustDown(this.spaceKey);
        this.pendingSpacePress = false;
        if (spacePressed) {
          const interacted = this.tryOpenGift();
          if (!interacted && grounded) {
            body.setVelocityY(MOVEMENT.JUMP_VELOCITY);
            this.showJumpBubbleForJump();
          }
        }

        if (this.player.x > BASE_WIDTH - 36) {
          if (this.sceneIndex === 5 && this.giftOpened && this.awaitingFinalExit) {
            this.finishGame();
            return;
          }
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
          this.player.setX(24);
        }

        const prefix = this.isCoffeeForm ? "coffee" : "player";
        if (!grounded) {
          const jumpKey = this.isCoffeeForm ? "coffee-jump" : "player-jump";
          this.player.setTexture(jumpKey);
          this.applyScaleByVisibleHeight(this.player, jumpKey, WORLD_SCALE.PLAYER_TARGET_HEIGHT_PX, "__BASE");
          this.configureActorBody(this.player);
        } else if (this.player.texture.key === "player-jump" || this.player.texture.key === "coffee-jump") {
          const baseKey = this.isCoffeeForm ? "coffee" : "player";
          const groundedFrame = this.getGroundFrameForCurrentForm();
          this.player.setTexture(baseKey, groundedFrame);
          this.applyScaleByVisibleHeight(this.player, baseKey, WORLD_SCALE.PLAYER_TARGET_HEIGHT_PX, groundedFrame);
          this.configureActorBody(this.player);
        }

        if (grounded && (left || right)) {
          this.player.anims.play(`${prefix}-run-side`, true);
        } else if (grounded) {
          this.player.anims.stop();
          this.player.setFrame(this.getGroundFrameForCurrentForm());
        }

        if (this.jumpBubbleVisible) {
          this.updateJumpBubbleLayout();
          if (!grounded) {
            this.jumpBubbleSeenAirborne = true;
          } else if (this.jumpBubbleSeenAirborne) {
            this.hideJumpBubble();
          }
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
