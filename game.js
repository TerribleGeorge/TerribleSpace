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
let cursors;
let fireKey;
let pauseKey;
let isPaused = false;
let pauseButton;
let pauseText;
let gameScene;
let shootSound;
let music;
let leftBtn;
let rightBtn;
let shootBtn;

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
    graphics.fillStyle(0x444444);
    graphics.fillRoundedRect(0, 0, 80, 40, 8);
    graphics.generateTexture('buttonBg', 80, 40);
    
    this.load.audio('shoot', 'assets/laser1.ogg');
    this.load.audio('music', 'assets/Kawai Kitsune.mp3');
}

function create() {
    gameScene = this;
    
    player = this.physics.add.sprite(400, 550, 'player');
    player.setCollideWorldBounds(true);
    
    bullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 50
    });
    
    enemies = this.physics.add.group();
    
    cursors = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });
    fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    
    this.time.addEvent({
        delay: 1000,
        callback: spawnEnemy,
        callbackScope: this,
        loop: true
    });
    
    scoreText = this.add.text(16, 16, 'Score: 0', { 
        fontSize: '32px', 
        fill: '#fff' 
    });
    
    pauseButton = this.add.text(700, 16, 'PAUSE', {
        fontSize: '24px',
        fill: '#fff',
        backgroundColor: '#444444',
        padding: { x: 10, y: 5 }
    }).setInteractive({ useHandCursor: true });
    
    pauseButton.on('pointerdown', () => togglePause(this));
    
    pauseText = this.add.text(400, 300, '', {
        fontSize: '28px',
        fill: '#fff',
        align: 'center'
    }).setOrigin(0.5).setVisible(false);
    
    shootSound = this.sound.add('shoot');
    shootSound.setVolume(0.5);
    
    // explosionSound = this.sound.add('explosion');
    // explosionSound.setVolume(0.5);
    
    music = this.sound.add('music');
    music.setVolume(0.4);
    music.setLoop(true);
    music.play();
    
    const isMobile = 'ontouchstart' in window || (this.sys.game.device.os.android || this.sys.game.device.os.iOS);
    
    if (isMobile) {
        this.add.text(400, 300, 'Gire o celular\npara modo paisagem', {
            fontSize: '24px',
            fill: '#ffff00',
            align: 'center',
            backgroundColor: '#000000',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setScrollFactor(0);
        
        leftBtn = this.add.text(50, 500, '◀', {
            fontSize: '40px',
            fill: '#fff',
            backgroundColor: '#333333',
            padding: { x: 15, y: 10 }
        }).setInteractive({ useHandCursor: true });
        
        rightBtn = this.add.text(150, 500, '▶', {
            fontSize: '40px',
            fill: '#fff',
            backgroundColor: '#333333',
            padding: { x: 15, y: 10 }
        }).setInteractive({ useHandCursor: true });
        
        shootBtn = this.add.text(650, 500, '🔫', {
            fontSize: '40px',
            fill: '#fff',
            backgroundColor: '#333333',
            padding: { x: 15, y: 10 }
        }).setInteractive({ useHandCursor: true });
        
        leftBtn.setScrollFactor(0);
        rightBtn.setScrollFactor(0);
        shootBtn.setScrollFactor(0);
        
        leftBtn.on('pointerdown', () => player.setVelocityX(-300));
        leftBtn.on('pointerup', () => player.setVelocityX(0));
        leftBtn.on('pointerout', () => player.setVelocityX(0));
        
        rightBtn.on('pointerdown', () => player.setVelocityX(300));
        rightBtn.on('pointerup', () => player.setVelocityX(0));
        rightBtn.on('pointerout', () => player.setVelocityX(0));
        
        shootBtn.on('pointerdown', () => fireShoot(this));
    }
    
    this.physics.add.overlap(bullets, enemies, hitEnemy, null, this);
    this.physics.add.overlap(player, enemies, hitPlayer, null, this);
}

function update(time) {
    if (pauseKey.isDown && !isPaused) {
        togglePause(gameScene);
    }
    
    if (isPaused) return;
    
    if (cursors.left.isDown) {
        player.setVelocityX(-300);
    } else if (cursors.right.isDown) {
        player.setVelocityX(300);
    } else {
        player.setVelocityX(0);
    }
    
    if (fireKey.isDown && time > lastFired) {
        const bullet = bullets.get(player.x, player.y - 20);
        if (bullet) {
            bullet.setActive(true).setVisible(true);
            bullet.setVelocityY(-400);
            lastFired = time + 200;
            shootSound.play();
        }
    }
    
    bullets.getChildren().forEach(function(b) {
        if (b && b.active && b.y < -10) {
            b.setActive(false).setVisible(false);
        }
    });
    
    enemies.getChildren().forEach(function(e) {
        if (e && e.y > 610) {
            e.destroy();
        }
    });
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

function spawnEnemy() {
    if (isPaused) return;
    const x = Phaser.Math.Between(50, 750);
    const enemy = enemies.create(x, -30, 'enemy');
    enemy.setVelocityY(150);
}

function hitEnemy(bullet, enemy) {
    bullet.setActive(false).setVisible(false);
    enemy.destroy();
    // explosionSound.play();
    score += 10;
    scoreText.setText('Score: ' + score);
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

function showGameOver(scene) {
    const ranking = getRanking();
    let rankingText = '\n--- RANKING ---\n';
    ranking.forEach((r, i) => {
        rankingText += `${i + 1}. ${r.name}: ${r.score}\n`;
    });
    
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
        score = 0;
        scoreText.setFontSize(32);
    });
}

function hitPlayer(player, enemy) {
    enemy.destroy();
    showGameOver(gameScene);
}