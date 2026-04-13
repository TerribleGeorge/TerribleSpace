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
let lastFired = 0;
let score = 0;
let scoreText;
let phaseText;
let bossHealthText;
let cursors;
let fireKey;
let pauseKey;
let isPaused = false;
let pauseButton;
let pauseText;
let gameScene;
let shootSound;
let music;
let touchPointer;
let gameStarted = false;
let currentPhase = 1;
let boss = null;
let bossSpawned = false;
let enemySpawnEvent;
const PLAYER_SPEED = 300;
const POINTS_PER_PHASE = 500;
const BOSS_SCORE = 3000;
const BOSS_MAX_HEALTH = 1000;
const BOSS_DAMAGE = 20;

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
    graphics.fillStyle(0xff6600);
    graphics.fillRect(0, 0, 80, 80);
    graphics.generateTexture('boss', 80, 80);
    
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
    score = 0;
    isPaused = false;
    
    player = scene.physics.add.sprite(400, 500, 'player');
    player.setCollideWorldBounds(true);
    
    bullets = scene.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 50
    });
    
    enemies = scene.physics.add.group();
    
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
    
    shootSound = scene.sound.add('shoot');
    shootSound.setVolume(0.5);
    
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
    scene.physics.add.overlap(bullets, boss, hitBoss, null, scene);
    scene.physics.add.overlap(player, enemies, hitPlayer, null, scene);
    scene.physics.add.overlap(player, boss, hitPlayer, null, scene);
}

function update(time, delta) {
    if (!gameScene || !gameStarted || !cursors || !player) return;
    
    if (pauseKey && pauseKey.isDown && !isPaused) {
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
    
    if (fireKey && fireKey.isDown && time > lastFired) {
        fireBullet();
        lastFired = time + 200;
    }
    
    bullets.getChildren().forEach((b) => {
        if (b && b.y < -20) {
            b.destroy();
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
    
    enemies.clear(true, true);
    
    boss = enemies.create(400, -50, 'boss');
    boss.setVelocityY(50);
    boss.setCollideWorldBounds(true);
    boss.health = BOSS_MAX_HEALTH;
    
    bossHealthText.setText('BOSS: ' + boss.health + '/' + BOSS_MAX_HEALTH);
    bossHealthText.setVisible(true);
    
    gameScene.time.addEvent({
        delay: 2000,
        callback: () => {
            if (boss && boss.active) {
                boss.setVelocityY(0);
                boss.setVelocityX(Phaser.Math.Between(-100, 100));
            }
        },
        loop: true
    });
}

function fireBullet() {
    const bullet = bullets.get(player.x, player.y - 20);
    if (bullet) {
        bullet.setActive(true).setVisible(true);
        bullet.setVelocityY(-400);
        shootSound.play();
    }
}

function spawnEnemy() {
    if (isPaused || bossSpawned) return;
    const x = Phaser.Math.Between(50, 750);
    const speed = 150 + (currentPhase * 20);
    const enemy = enemies.create(x, -30, 'enemy');
    enemy.setVelocityY(speed);
}

function hitEnemy(bullet, enemy) {
    bullet.setActive(false).setVisible(false);
    enemy.destroy();
    score += 10;
    updateScoreText();
}

function hitBoss(bullet, enemy) {
    if (enemy !== boss) return;
    bullet.setActive(false).setVisible(false);
    boss.health -= BOSS_DAMAGE;
    bossHealthText.setText('BOSS: ' + boss.health + '/' + BOSS_MAX_HEALTH);
    
    if (boss.health <= 0) {
        boss.destroy();
        boss = null;
        bossHealthText.setVisible(false);
        showVictory(gameScene);
    }
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
    
    scene.input.on('pointerdown', () => {
        scene.input.off('pointerdown');
        scene.scene.restart();
    });
}

function showGameOver(scene) {
    scene.physics.pause();
    player.setTint(0xff0000);
    
    let name = prompt('Game Over! Score: ' + score + '\n\nDigite seu nome para o ranking:');
    if (name && name.trim()) {
        saveScore(name.trim(), score);
    }
    
    const newRanking = getRanking();
    let finalText = 'GAME OVER\n\nScore: ' + score + '\n\n--- RANKING ---\n';
    newRanking.forEach((r, i) => {
        finalText += `${i + 1}. ${r.name}: ${r.score}\n`;
    });
    finalText += '\nClique para reiniciar';
    
    scoreText.setText(finalText);
    scoreText.setFontSize(20);
    
    scene.input.on('pointerdown', () => {
        scene.input.off('pointerdown');
        scene.scene.restart();
    });
}

function hitPlayer(playerSprite, enemy) {
    enemy.destroy();
    showGameOver(gameScene);
}
