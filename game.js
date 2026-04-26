const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let player;
let bullets;
let enemies;
let enemyBullets;
let powerUps;
let lastFired = 0;
let score = 0;
let scoreText;
let phaseText;
let bossHealthText;
let buffText;
let cursors;
let fireKey;
let pauseKey;
let isPaused = false;
let pauseButton;
let pauseText;
let gameScene;
let rankingText;
let shootSound;
let music;
let touchPointer;
let gameStarted = false;
let currentPhase = 1;
let boss = null;
let bossSpawned = false;
let bossGroup;
let enemySpawnEvent;
let enemyShootEvent;
let fx;
let hasShield = false;
let rapidFireUntil = 0;
let multishotUntil = 0;
let shotLevel = 1;
let invulnerableUntil = 0;
let playerHp = 0;
let playerMaxHp = 0;
let hpBarBg;
let hpBarFill;
let hpText;
const PLAYER_SPEED = 300;
const POINTS_PER_PHASE = 500;
const BOSS_SCORE = 3000;
const BOSS_MAX_HEALTH = 1000;
const BOSS_DAMAGE = 50;
const BASE_FIRE_COOLDOWN_MS = 200;
const RAPID_FIRE_COOLDOWN_MS = 90;
const RAPID_FIRE_DURATION_MS = 8000;
const MULTISHOT_DURATION_MS = 10000;
const POWERUP_DROP_CHANCE = 0.22;
const ENEMY_BULLET_SPEED = 280;
const INVULNERABLE_MS = 750;
const PLAYER_MAX_HP = 5;
const POWERUP_HP_AMOUNT = 2;
const SHOT_LEVEL_MAX = 3;

function preload() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    
    graphics.fillStyle(0x00ff00);
    graphics.beginPath();
    graphics.moveTo(20, 0);
    graphics.lineTo(40, 40);
    graphics.lineTo(20, 30);
    graphics.lineTo(0, 40);
    graphics.closePath();
    graphics.fillPath();
    graphics.generateTexture('player', 40, 40);
    
    graphics.clear();
    graphics.fillStyle(0xff0000);
    graphics.beginPath();
    graphics.moveTo(20, 0);
    graphics.lineTo(40, 40);
    graphics.lineTo(20, 30);
    graphics.lineTo(0, 40);
    graphics.closePath();
    graphics.fillPath();
    graphics.generateTexture('enemy', 40, 40);
    
    graphics.clear();
    graphics.fillStyle(0xffff00);
    graphics.fillRect(0, 0, 10, 20);
    graphics.generateTexture('bullet', 10, 20);

    graphics.clear();
    graphics.fillStyle(0xff33ff);
    graphics.fillRect(0, 0, 8, 16);
    graphics.generateTexture('enemyBullet', 8, 16);
    
    graphics.clear();
    graphics.fillStyle(0xff6600);
    graphics.fillRect(0, 0, 80, 80);
    graphics.generateTexture('boss', 80, 80);
    
    graphics.clear();
    graphics.fillStyle(0xff6600);
    graphics.fillRect(0, 0, 160, 160);
    graphics.generateTexture('bossBig', 160, 160);

    graphics.clear();
    graphics.fillStyle(0x66ccff);
    graphics.fillRect(0, 0, 18, 18);
    graphics.generateTexture('powerRapid', 18, 18);

    graphics.clear();
    graphics.fillStyle(0x00ffff);
    graphics.fillCircle(9, 9, 9);
    graphics.generateTexture('powerShield', 18, 18);

    graphics.clear();
    graphics.fillStyle(0xffdd00);
    graphics.fillTriangle(9, 0, 18, 18, 0, 18);
    graphics.generateTexture('powerMulti', 18, 18);

    graphics.clear();
    graphics.fillStyle(0xff3366);
    graphics.fillCircle(6, 6, 6);
    graphics.fillCircle(14, 6, 6);
    graphics.fillTriangle(0, 8, 20, 8, 10, 20);
    graphics.generateTexture('powerHp', 20, 20);

    graphics.clear();
    graphics.fillStyle(0xffffff);
    graphics.fillRect(0, 0, 20, 20);
    graphics.fillStyle(0x00aaff);
    graphics.fillRect(3, 9, 14, 3);
    graphics.fillRect(9, 3, 3, 14);
    graphics.generateTexture('powerGun', 20, 20);

    graphics.clear();
    graphics.fillStyle(0xffffff);
    graphics.fillCircle(3, 3, 3);
    graphics.generateTexture('spark', 6, 6);
    
    this.load.audio('shoot', 'assets/laser1.ogg');
    this.load.audio('music', 'assets/Kawai Kitsune.mp3');
}

function create() {
    gameScene = this;
    gameStarted = false;
    currentPhase = 1;
    bossSpawned = false;
    boss = null;
    score = 0;
    
    let startText = this.add.text(400, 300, 'CLIQUE PARA INICIAR', {
        fontSize: '40px',
        fill: '#fff',
        backgroundColor: '#000000',
        padding: { x: 20, y: 10 }
    }).setOrigin(0.5);
    
    this.input.once('pointerdown', () => {
        startText.destroy();
        gameStarted = true;
        
        music = this.sound.add('music');
        music.setVolume(0.4);
        music.setLoop(true);
        music.play();
        
        initGame(this);
    });
}

function initGame(scene) {
    currentPhase = 1;
    bossSpawned = false;
    boss = null;
    bossGroup = null;
    enemyShootEvent = null;
    fx = null;
    score = 0;
    isPaused = false;
    hasShield = false;
    rapidFireUntil = 0;
    multishotUntil = 0;
    shotLevel = 1;
    invulnerableUntil = 0;
    playerMaxHp = PLAYER_MAX_HP;
    playerHp = playerMaxHp;
    
    player = scene.physics.add.sprite(400, 500, 'player');
    player.setCollideWorldBounds(true);
    
    bullets = scene.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 50
    });
    
    enemies = scene.physics.add.group();
    bossGroup = scene.physics.add.group();
    enemyBullets = scene.physics.add.group({
        defaultKey: 'enemyBullet',
        maxSize: 80
    });
    powerUps = scene.physics.add.group();
    
    cursors = scene.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });
    fireKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    pauseKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    
    enemySpawnEvent = scene.time.addEvent({
        delay: 1000,
        callback: spawnEnemy,
        callbackScope: scene,
        loop: true
    });
    
    scoreText = scene.add.text(16, 16, 'Score: 0', { 
        fontSize: '32px', 
        fill: '#fff' 
    });
    
    phaseText = scene.add.text(16, 50, 'Fase: 1', {
        fontSize: '24px',
        fill: '#00ff00'
    });
    
    bossHealthText = scene.add.text(400, 50, '', {
        fontSize: '28px',
        fill: '#ff0000',
        backgroundColor: '#000000',
        padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setVisible(false);

    buffText = scene.add.text(16, 80, '', {
        fontSize: '18px',
        fill: '#ffff00'
    });

    hpBarBg = scene.add.rectangle(16, 115, 200, 16, 0x333333).setOrigin(0, 0.5);
    hpBarFill = scene.add.rectangle(16, 115, 200, 16, 0x00ff00).setOrigin(0, 0.5);
    hpText = scene.add.text(224, 107, `${playerHp}/${playerMaxHp}`, {
        fontSize: '16px',
        fill: '#ffffff'
    });
    
    pauseButton = scene.add.text(700, 16, 'PAUSE', {
        fontSize: '24px',
        fill: '#fff',
        backgroundColor: '#444444',
        padding: { x: 10, y: 5 }
    }).setInteractive({ useHandCursor: true });
    
    pauseButton.on('pointerdown', () => togglePause(scene));
    
    pauseText = scene.add.text(400, 300, '', {
        fontSize: '28px',
        fill: '#fff',
        align: 'center'
    }).setOrigin(0.5).setVisible(false);
    
    updateRankingDisplay(scene);
    
    shootSound = scene.sound.add('shoot');
    shootSound.setVolume(0.5);

    fx = scene.add.particles(0, 0, 'spark', {
        speed: { min: 60, max: 240 },
        scale: { start: 1.0, end: 0 },
        lifespan: 350,
        blendMode: 'ADD',
        emitting: false
    });
    
    scene.input.on('pointerdown', (pointer) => {
        if (pointer.x < 650) {
            touchPointer = pointer;
        }
    });
    
    scene.input.on('pointermove', (pointer) => {
        if (pointer.x < 650 && pointer.isDown) {
            touchPointer = pointer;
        }
    });
    
    scene.input.on('pointerup', () => {
        touchPointer = null;
    });
    
    scene.physics.add.overlap(bullets, enemies, hitEnemy, null, scene);
    scene.physics.add.overlap(player, enemies, hitPlayerEnemy, null, scene);
    scene.physics.add.overlap(player, enemyBullets, hitPlayerBullet, null, scene);
    scene.physics.add.overlap(player, powerUps, collectPowerUp, null, scene);

    enemyShootEvent = scene.time.addEvent({
        delay: 800,
        callback: enemyShoot,
        callbackScope: scene,
        loop: true
    });
}

function update(time, delta) {
    if (!gameScene || !gameStarted || !cursors || !player) return;
    
    if (pauseKey && Phaser.Input.Keyboard.JustDown(pauseKey)) {
        togglePause(gameScene);
    }
    if (isPaused) return;
    
    checkPhase();
    
    if (touchPointer) {
        gameScene.physics.moveToObject(player, touchPointer, PLAYER_SPEED);
    } else if (cursors.left.isDown) {
        player.setVelocityX(-300);
    } else if (cursors.right.isDown) {
        player.setVelocityX(300);
    } else if (!touchPointer) {
        player.setVelocityX(0);
    }

    updateBuffHud(time);
    updateHpHud(time);
    
    if (fireKey && fireKey.isDown && time > lastFired) {
        const cooldown = time < rapidFireUntil ? RAPID_FIRE_COOLDOWN_MS : BASE_FIRE_COOLDOWN_MS;
        fireBullet(time);
        lastFired = time + cooldown;
    }
    
    bullets.getChildren().forEach((b) => {
        if (b && b.y < -20) {
            b.disableBody(true, true);
        }
    });

    enemyBullets.getChildren().forEach((b) => {
        if (b && (b.y < -40 || b.y > 640 || b.x < -40 || b.x > 840)) {
            b.disableBody(true, true);
        }
    });

    powerUps.getChildren().forEach((p) => {
        if (p && p.y > 640) {
            p.destroy();
        }
    });
    
    enemies.getChildren().forEach((e) => {
        if (e && e.y > 620) {
            e.destroy();
        }
    });
}

function checkPhase() {
    if (score >= BOSS_SCORE && !bossSpawned) {
        spawnBoss();
    } else if (score > 0 && score % POINTS_PER_PHASE === 0) {
        const newPhase = Math.floor(score / POINTS_PER_PHASE);
        if (newPhase > currentPhase) {
            currentPhase = newPhase;
            phaseText.setText('Fase: ' + currentPhase);
        }
    }
}

function spawnBoss() {
    bossSpawned = true;
    currentPhase = -1;
    phaseText.setText('BOSS!');
    phaseText.setColor('#ff0000');
    
    if (enemySpawnEvent) {
        enemySpawnEvent.remove();
    }
    if (enemyShootEvent) {
        enemyShootEvent.remove();
    }
    
    enemies.clear(true, true);
    
    boss = bossGroup.create(400, -80, 'bossBig');
    boss.setVelocityY(100);
    boss.setCollideWorldBounds(true);
    boss.setBounce(1, 1);
    boss.body.onWorldBounds = true;
    boss.health = BOSS_MAX_HEALTH;
    
    boss.setScale(1.5);
    
    boss.body.setSize(160, 160);
    boss.body.setOffset(-80, -80);
    
    bossHealthText.setText('BOSS: ' + boss.health + '/' + BOSS_MAX_HEALTH);
    bossHealthText.setVisible(true);

    gameScene.physics.add.overlap(bullets, boss, hitBoss, null, gameScene);
    gameScene.physics.add.overlap(player, boss, hitPlayerEnemy, null, gameScene);
    
    gameScene.physics.world.on('worldbounds', (body) => {
        if (body.gameObject === boss && boss.active) {
            boss.setVelocityX(Phaser.Math.Between(-200, 200));
            boss.setVelocityY(Phaser.Math.Between(-50, 50));
        }
    });
    
    boss.body.onWorldBounds = true;
    
    gameScene.time.addEvent({
        delay: 1500,
        callback: () => {
            if (boss && boss.active) {
                boss.setVelocityX(Phaser.Math.Between(-200, 200));
                boss.setVelocityY(Phaser.Math.Between(-50, 50));
            }
        },
        loop: true
    });
}

function fireBullet(time) {
    const isMulti = time < multishotUntil;
    const level = isMulti ? Math.max(shotLevel, 3) : shotLevel;
    firePattern(level);
    shootSound.play();
}

function firePattern(level) {
    if (level <= 1) {
        spawnPlayerBullet(player.x, player.y - 20, -520, 0);
        return;
    }
    if (level === 2) {
        spawnPlayerBullet(player.x - 10, player.y - 20, -500, -40);
        spawnPlayerBullet(player.x + 10, player.y - 20, -500, 40);
        return;
    }
    spawnPlayerBullet(player.x - 14, player.y - 20, -470, -90);
    spawnPlayerBullet(player.x, player.y - 20, -520, 0);
    spawnPlayerBullet(player.x + 14, player.y - 20, -470, 90);
}

function spawnPlayerBullet(x, y, vy, vx) {
    const bullet = bullets.get(x, y);
    if (!bullet) return;
    bullet.setActive(true).setVisible(true);
    bullet.body.enable = true;
    bullet.setVelocity(vx, vy);
}

function spawnEnemy() {
    if (isPaused || bossSpawned) return;
    const x = Phaser.Math.Between(50, 750);
    const speed = 150 + (currentPhase * 20);
    const enemy = enemies.create(x, -30, 'enemy');
    enemy.setVelocityY(speed);
    enemy.isShooter = Math.random() < 0.25;
    if (enemy.isShooter) {
        enemy.setTint(0x66ccff);
    }
}

function hitEnemy(bullet, enemy) {
    if (enemy === boss) return;
    bullet.disableBody(true, true);
    const ex = enemy.x;
    const ey = enemy.y;
    enemy.destroy();
    explodeAt(ex, ey, 0xff3300);
    maybeDropPowerUp(ex, ey);
    score += 20;
    updateScoreText();
}

function hitBoss(bullet, enemy) {
    if (enemy !== boss) return;
    bullet.disableBody(true, true);
    boss.health -= BOSS_DAMAGE;
    bossHealthText.setText('BOSS: ' + boss.health + '/' + BOSS_MAX_HEALTH);
    flashSprite(boss);
    
    if (boss.health <= 0) {
        explodeAt(boss.x, boss.y, 0xffaa00, 40);
        boss.destroy();
        boss = null;
        bossHealthText.setVisible(false);
        showVictory(gameScene);
    }
}

function explodeAt(x, y, tint = 0xffffff, count = 18) {
    if (!fx) return;
    fx.emitParticleAt(x, y, count, { tint });
}

function flashSprite(sprite) {
    if (!sprite || !sprite.active) return;
    sprite.setTintFill(0xffffff);
    gameScene.time.delayedCall(60, () => {
        if (sprite && sprite.active) sprite.clearTint();
    });
}

function maybeDropPowerUp(x, y) {
    if (Math.random() > POWERUP_DROP_CHANCE) return;
    const r = Math.random();
    let key = 'powerRapid';
    let type = 'rapid';
    if (r < 0.22) {
        key = 'powerHp';
        type = 'hp';
    } else if (r < 0.44) {
        key = 'powerShield';
        type = 'shield';
    } else if (r < 0.66) {
        key = 'powerMulti';
        type = 'multi';
    } else if (r < 0.83) {
        key = 'powerRapid';
        type = 'rapid';
    } else {
        key = 'powerGun';
        type = 'gun';
    }
    const p = powerUps.create(x, y, key);
    p.type = type;
    p.setVelocityY(140);
    p.setCollideWorldBounds(false);
}

function collectPowerUp(playerSprite, powerUp) {
    if (!powerUp) return;
    const now = gameScene.time.now;
    if (powerUp.type === 'rapid') {
        rapidFireUntil = now + RAPID_FIRE_DURATION_MS;
    } else if (powerUp.type === 'shield') {
        hasShield = true;
        player.setTint(0x00ffff);
    } else if (powerUp.type === 'multi') {
        multishotUntil = now + MULTISHOT_DURATION_MS;
    } else if (powerUp.type === 'hp') {
        playerHp = Math.min(playerMaxHp, playerHp + POWERUP_HP_AMOUNT);
        explodeAt(player.x, player.y, 0xff6699, 16);
    } else if (powerUp.type === 'gun') {
        shotLevel = Math.min(SHOT_LEVEL_MAX, shotLevel + 1);
        explodeAt(player.x, player.y, 0x66ccff, 16);
    }
    explodeAt(powerUp.x, powerUp.y, 0x66ff66, 12);
    powerUp.destroy();
}

function updateBuffHud(time) {
    let parts = [];
    if (hasShield) parts.push('SHIELD');
    if (time < rapidFireUntil) parts.push('RAPID ' + Math.ceil((rapidFireUntil - time) / 1000) + 's');
    if (time < multishotUntil) parts.push('MULTI ' + Math.ceil((multishotUntil - time) / 1000) + 's');
    parts.push('GUN ' + shotLevel);
    buffText.setText(parts.length ? parts.join(' | ') : '');
    if (!hasShield && player && player.active) {
        player.clearTint();
    }
}

function updateHpHud(time) {
    const ratio = playerMaxHp > 0 ? (playerHp / playerMaxHp) : 0;
    hpBarFill.width = 200 * Phaser.Math.Clamp(ratio, 0, 1);
    if (ratio > 0.6) hpBarFill.fillColor = 0x00ff00;
    else if (ratio > 0.3) hpBarFill.fillColor = 0xffff00;
    else hpBarFill.fillColor = 0xff3333;
    hpText.setText(`${playerHp}/${playerMaxHp}`);

    if (time < invulnerableUntil) {
        const blink = Math.sin(time / 60) > 0 ? 0.35 : 1;
        player.setAlpha(blink);
    } else if (player.alpha !== 1) {
        player.setAlpha(1);
    }
}

function enemyShoot() {
    if (isPaused || bossSpawned) return;
    if (!player || !player.active) return;
    const list = enemies.getChildren().filter((e) => e && e.active);
    if (!list.length) return;
    const shooter = Phaser.Utils.Array.GetRandom(list);
    if (!shooter) return;
    if (!shooter.isShooter && Math.random() < 0.6) return;
    fireEnemyBullet(shooter);
}

function fireEnemyBullet(fromEnemy) {
    const b = enemyBullets.get(fromEnemy.x, fromEnemy.y + 10);
    if (!b) return;
    b.setActive(true).setVisible(true);
    b.body.enable = true;
    b.setPosition(fromEnemy.x, fromEnemy.y + 10);
    gameScene.physics.moveToObject(b, player, ENEMY_BULLET_SPEED);
}

function updateScoreText() {
    scoreText.setText('Score: ' + score);
    if (score < BOSS_SCORE) {
        const phase = Math.floor(score / POINTS_PER_PHASE) + 1;
        if (phase !== currentPhase) {
            currentPhase = phase;
            phaseText.setText('Fase: ' + currentPhase);
        }
    }
}

function togglePause(scene) {
    isPaused = !isPaused;
    
    if (isPaused) {
        scene.physics.pause();
        scene.sound.pauseAll();
        pauseText.setText('PAUSADO\n\nPressione ESC\nou clique em PAUSE').setVisible(true);
        pauseButton.setText('RESUME');
    } else {
        scene.physics.resume();
        scene.sound.resumeAll();
        pauseText.setVisible(false);
        pauseButton.setText('PAUSE');
    }
}

function getRanking() {
    const stored = localStorage.getItem('spaceShooterRanking');
    return stored ? JSON.parse(stored) : [];
}

function updateRankingDisplay(scene) {
    const ranking = getRanking();
    let rankingStr = '--- TOP 3 ---\n';
    for (let i = 0; i < 3; i++) {
        if (ranking[i]) {
            rankingStr += `${i + 1}. ${ranking[i].name}: ${ranking[i].score}\n`;
        } else {
            rankingStr += `${i + 1}. ---: ---\n`;
        }
    }
    if (rankingText) {
        rankingText.setText(rankingStr);
    } else {
        rankingText = scene.add.text(700, 500, rankingStr, {
            fontSize: '16px',
            fill: '#00ff00',
            align: 'right'
        }).setOrigin(0.5);
    }
}

function saveScore(name, newScore) {
    let ranking = getRanking();
    ranking.push({ name: name, score: newScore });
    ranking.sort((a, b) => b.score - a.score);
    ranking = ranking.slice(0, 10);
    localStorage.setItem('spaceShooterRanking', JSON.stringify(ranking));
    return ranking;
}

function showVictory(scene) {
    scene.physics.pause();
    
    let name = prompt('PARABENS!\n\nScore Final: ' + score + '\n\nDigite seu nome para o ranking:');
    if (name && name.trim()) {
        saveScore(name.trim(), score);
        updateRankingDisplay(scene);
    }
    
    const newRanking = getRanking();
    let finalText = 'VICTORY!\n\nScore: ' + score + '\n\n--- RANKING ---\n';
    newRanking.forEach((r, i) => {
        finalText += `${i + 1}. ${r.name}: ${r.score}\n`;
    });
    finalText += '\nClique para reiniciar';
    
    scoreText.setText(finalText);
    scoreText.setFontSize(20);
    scoreText.setOrigin(0.5);
    scoreText.setPosition(400, 300);
    
    scene.input.once('pointerdown', () => {
        scene.scene.restart();
    });
}

function showGameOver(scene) {
    scene.physics.pause();
    player.setTint(0xff0000);
    
    let name = prompt('Game Over! Score: ' + score + '\n\nDigite seu nome para o ranking:');
    if (name && name.trim()) {
        saveScore(name.trim(), score);
        updateRankingDisplay(scene);
    }
    
    const newRanking = getRanking();
    let finalText = 'GAME OVER\n\nScore: ' + score + '\n\n--- RANKING ---\n';
    newRanking.forEach((r, i) => {
        finalText += `${i + 1}. ${r.name}: ${r.score}\n`;
    });
    finalText += '\nClique para reiniciar';
    
    scoreText.setText(finalText);
    scoreText.setFontSize(20);
    
    scene.input.once('pointerdown', () => {
        scene.scene.restart();
    });
}

function hitPlayerEnemy(playerSprite, enemy) {
    if (isPaused) return;
    const now = gameScene.time.now;
    if (now < invulnerableUntil) return;
    if (hasShield) {
        hasShield = false;
        invulnerableUntil = now + INVULNERABLE_MS;
        explodeAt(player.x, player.y, 0x00ffff, 24);
        flashSprite(player);
        if (enemy && enemy !== boss) enemy.destroy();
        return;
    }
    if (enemy && enemy !== boss) enemy.destroy();
    damagePlayer(1);
}

function hitPlayerBullet(playerSprite, bullet) {
    if (isPaused) return;
    const now = gameScene.time.now;
    bullet.disableBody(true, true);
    if (now < invulnerableUntil) return;
    if (hasShield) {
        hasShield = false;
        invulnerableUntil = now + INVULNERABLE_MS;
        explodeAt(player.x, player.y, 0x00ffff, 24);
        flashSprite(player);
        return;
    }
    damagePlayer(1);
}

function damagePlayer(amount) {
    const now = gameScene.time.now;
    playerHp -= amount;
    invulnerableUntil = now + INVULNERABLE_MS;
    explodeAt(player.x, player.y, 0xffffff, 14);
    flashSprite(player);
    if (playerHp <= 0) {
        player.setAlpha(1);
        showGameOver(gameScene);
    }
}
