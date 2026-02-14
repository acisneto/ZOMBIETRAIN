export class Start extends Phaser.Scene {
    constructor() {
        super('Start');
        const savedScore = localStorage.getItem('zombieScore');
        this.score = savedScore ? parseInt(savedScore) : 0;
    }

    preload() {
        this.load.image('background', 'assets/bgteste.png');
        this.load.image('ship', 'assets/spaceship.png');
        this.load.spritesheet('wheels', 'assets/wheel.png', { frameWidth: 90, frameHeight: 90 });
        this.load.spritesheet('zombie1walking', 'assets/zombie1walking.png', { frameWidth: 312, frameHeight: 312 });
        this.load.spritesheet('zombie2walking', 'assets/zombie2walking.png', { frameWidth: 312, frameHeight: 312 });
        this.load.spritesheet('zombie3walking', 'assets/zombie3walking.png', { frameWidth: 312, frameHeight: 312 });
        this.load.spritesheet('zombie4walking', 'assets/zombie4walking.png', { frameWidth: 312, frameHeight: 312 });
        this.load.spritesheet('bloodSplatter', 'assets/bloodSplatter.png', { frameWidth: 86, frameHeight: 86 });
    }

    create() {
        const { width, height } = this.scale;
        const trainWidth = 3840;

        // 1. Fundo
        this.background = this.add.tileSprite(0, 0, width, height, 'background')
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(0);

        // 2. Animações
        this.anims.create({
            key: 'spin',
            frames: this.anims.generateFrameNumbers('wheels', { start: 0, end: 3 }),
            frameRate: 15,
            repeat: -1
        });

        for (let i = 1; i <= 4; i++) {
            this.anims.create({
                key: `zombie${i}_walk`,
                frames: this.anims.generateFrameNumbers(`zombie${i}walking`, { start: 0, end: 7 }),
                frameRate: 12,
                repeat: -1
            });
        }

        this.anims.create({
            key: 'blood_anim',
            frames: this.anims.generateFrameNumbers('bloodSplatter', { start: 0, end: 3 }),
            frameRate: 15,
            hideOnComplete: true
        });

        // 3. Trem
        this.train = this.add.container(400, height / 2);
        this.train.setDepth(10);

        const wheelY = 40;
        const wheelPositions = [935, 1420, 1710, 2280, 2560, 3060];
        wheelPositions.forEach(xPos => {
            const wheel = this.add.sprite(xPos, wheelY, 'wheels').play('spin');
            this.train.add(wheel);
        });

        this.ship = this.add.image(0, 0, 'ship').setOrigin(0, 0.5);
        this.train.add(this.ship);

        // --- HITBOX ---
        this.hitbox = this.add.zone(2400, height / 2.5, 2183, 50);
        this.physics.add.existing(this.hitbox);
        this.hitbox.body.setAllowGravity(false);
        this.hitbox.body.setImmovable(true);
        this.hitbox.setScrollFactor(0);

        // 4. Grupos e UI
        this.zombies = this.physics.add.group();
        this.scoreText = this.add.text(50, 50, `Zombies: ${this.score}`, {
            fontSize: '60px',
            fill: '#ff0000',
            stroke: '#000',
            strokeThickness: 6
        }).setScrollFactor(0).setDepth(100);

        // 5. Spawn de Zumbis
        this.time.addEvent({
            delay: 300,
            callback: () => {
                const cam = this.cameras.main;
                const side = Phaser.Math.Between(0, 3);
                let spawnX, spawnY, velocityX = 0, velocityY = 0;

                switch (side) {
                    case 0: // DIREITA
                        spawnX = cam.scrollX + width + 100;
                        spawnY = Phaser.Math.Between(cam.scrollY, cam.scrollY + height);
                        velocityX = Phaser.Math.Between(-400, -200);
                        break;
                    case 1: // ESQUERDA
                        spawnX = cam.scrollX - 100;
                        spawnY = Phaser.Math.Between(cam.scrollY, cam.scrollY + height);
                        velocityX = Phaser.Math.Between(200, 400);
                        break;
                    case 2: // CIMA
                        spawnX = Phaser.Math.Between(cam.scrollX, cam.scrollX + width);
                        spawnY = cam.scrollY - 100;
                        velocityY = Phaser.Math.Between(200, 400);
                        break;
                    case 3: // BAIXO
                        spawnX = Phaser.Math.Between(cam.scrollX, cam.scrollX + width);
                        spawnY = cam.scrollY + height + 100;
                        velocityY = Phaser.Math.Between(-400, -200);
                        break;
                }

                const type = Phaser.Math.Between(1, 4);
                const z = this.zombies.create(spawnX, spawnY, `zombie${type}walking`);
                z.setFrame(0);
                z.play(`zombie${type}_walk`);
                z.setVelocity(velocityX, velocityY);
            },
            loop: true
        });

        // 6. Colisão
        this.physics.add.overlap(this.hitbox, this.zombies, (hitbox, zombie) => {
            if (!zombie.active) return;
            const blood = this.physics.add.sprite(zombie.x, zombie.y, 'bloodSplatter').setScale(2);
            blood.setDepth(1);
            blood.play('blood_anim');
            blood.setVelocityX(-this.bgSpeed * 60);
            zombie.destroy();
            this.score += 1;
            this.scoreText.setText(`Zombies: ${this.score}`);
            localStorage.setItem('zombieScore', this.score);
            this.time.delayedCall(2000, () => blood.destroy());
        });

        // 7. Controles (Teclado + Toque)
        this.cameras.main.setBounds(0, 0, trainWidth, height);
        this.cameras.main.scrollX = trainWidth - width;
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // Ativa o pointer (mouse/touch)
        this.pointer = this.input.activePointer;

        this.bgSpeed = 15;
        this.camSpeed = 25;
    }

    update() {
        const { width } = this.scale;
        this.background.tilePositionX += this.bgSpeed;

        // Movimentação (Teclado OU Touch)
        if (this.cursors.right.isDown || (this.pointer.isDown && this.pointer.x > width / 2)) {
            this.cameras.main.scrollX += this.camSpeed;
        } else if (this.cursors.left.isDown || (this.pointer.isDown && this.pointer.x < width / 2)) {
            this.cameras.main.scrollX -= this.camSpeed;
        }

        // Y-Sorting
        this.zombies.children.iterate(z => {
            if (z && z.active) z.setDepth(z.y);
        });
        this.train.setDepth(this.scale.height / 2);

        // Limpeza
        const cam = this.cameras.main;
        this.zombies.children.iterate(z => {
            if (z && (z.x < cam.scrollX - 300 || z.x > cam.scrollX + this.scale.width + 300 || 
                z.y < cam.scrollY - 300 || z.y > cam.scrollY + this.scale.height + 300)) {
                z.destroy();
            }
        });
    }
}