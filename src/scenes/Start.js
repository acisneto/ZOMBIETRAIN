export class Start extends Phaser.Scene {
    constructor() {
        super('Start');
        const savedScore = localStorage.getItem('zombieScore');
        this.score = savedScore ? parseInt(savedScore) : 0;
    }

    preload() {
        // ... (seus preloads atuais permanecem iguais)
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
        this.background = this.add.tileSprite(0, 0, width, height, 'background').setOrigin(0, 0).setScrollFactor(0).setDepth(0);

        // 2. Animações (Loop simplificado)
        for (let i = 1; i <= 4; i++) {
            this.anims.create({
                key: `zombie${i}_walk`,
                frames: this.anims.generateFrameNumbers(`zombie${i}walking`, { start: 0, end: 7 }),
                frameRate: 12,
                repeat: -1
            });
        }
        this.anims.create({ key: 'spin', frames: this.anims.generateFrameNumbers('wheels', { start: 0, end: 3 }), frameRate: 15, repeat: -1 });
        this.anims.create({ key: 'blood_anim', frames: this.anims.generateFrameNumbers('bloodSplatter', { start: 0, end: 3 }), frameRate: 15, hideOnComplete: true });

        // 3. Trem
        this.train = this.add.container(400, height / 2);
        this.train.setDepth(10);
        const wheelPositions = [935, 1420, 1710, 2280, 2560, 3060];
        wheelPositions.forEach(xPos => {
            const wheel = this.add.sprite(xPos, 40, 'wheels').play('spin');
            this.train.add(wheel);
        });
        this.ship = this.add.image(0, 0, 'ship').setOrigin(0, 0.5);
        this.train.add(this.ship);

        // 4. Hitbox e Grupos
        this.hitbox = this.add.zone(2400, height / 2.5, 2183, 50);
        this.physics.add.existing(this.hitbox);
        this.hitbox.body.setAllowGravity(false);
        this.hitbox.body.setImmovable(true);
        this.hitbox.setScrollFactor(0);

        this.zombies = this.physics.add.group();
        this.scoreText = this.add.text(50, 50, `Zombies: ${this.score}`, {
            fontSize: '60px', fill: '#ff0000', stroke: '#000', strokeThickness: 6
        }).setScrollFactor(0).setDepth(100);

        // 5. Spawn Event
        this.time.addEvent({
            delay: 300,
            callback: () => this.spawnZombie(),
            loop: true
        });

        // 6. Colisão
        this.physics.add.overlap(this.hitbox, this.zombies, (h, z) => {
            if (!z.active) return;
            const blood = this.physics.add.sprite(z.x, z.y, 'bloodSplatter').setScale(2).setDepth(1).play('blood_anim');
            blood.setVelocityX(-this.bgSpeed * 60);
            z.destroy();
            this.score++;
            this.scoreText.setText(`Zombies: ${this.score}`);
            localStorage.setItem('zombieScore', this.score);
            this.time.delayedCall(2000, () => blood.destroy());
        });

        // 7. Configuração de Câmera e Controles
        this.cameras.main.setBounds(0, 0, trainWidth, height);
        this.cameras.main.scrollX = trainWidth - width;
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // Ativando o Swipe (Pointer)
        this.input.addPointer(1); 
        this.bgSpeed = 15;
        this.camSpeed = 25;
        this.swipeSensitivity = 1.5; // Multiplicador de velocidade do arrasto
    }

    spawnZombie() {
        const { width, height } = this.scale;
        const cam = this.cameras.main;
        const side = Phaser.Math.Between(0, 3);
        let x, y, vx = 0, vy = 0;

        if (side === 0) { x = cam.scrollX + width + 100; y = Phaser.Math.Between(cam.scrollY, cam.scrollY + height); vx = -300; }
        else if (side === 1) { x = cam.scrollX - 100; y = Phaser.Math.Between(cam.scrollY, cam.scrollY + height); vx = 300; }
        else if (side === 2) { x = Phaser.Math.Between(cam.scrollX, cam.scrollX + width); y = cam.scrollY - 100; vy = 300; }
        else { x = Phaser.Math.Between(cam.scrollX, cam.scrollX + width); y = cam.scrollY + height + 100; vy = -300; }

        const type = Phaser.Math.Between(1, 4);
        const z = this.zombies.create(x, y, `zombie${type}walking`);
        z.play(`zombie${type}_walk`).setVelocity(vx, vy);
    }

    update() {
        this.background.tilePositionX += this.bgSpeed;

        // LÓGICA DE MOVIMENTO (Teclado + Swipe)
        if (this.cursors.right.isDown) {
            this.cameras.main.scrollX += this.camSpeed;
        } else if (this.cursors.left.isDown) {
            this.cameras.main.scrollX -= this.camSpeed;
        }

        // Lógica de Swipe / Drag
        if (this.input.activePointer.isDown) {
            // Calcula a distância que o mouse/dedo se moveu desde o último frame
            const dragX = (this.input.activePointer.prevPosition.x - this.input.activePointer.position.x);
            
            // Move a câmera baseado no arrasto
            this.cameras.main.scrollX += dragX * this.swipeSensitivity;
        }

        // Y-Sorting e Limpeza
        this.zombies.children.iterate(z => {
            if (z && z.active) z.setDepth(z.y);
        });
        this.train.setDepth(this.scale.height / 2);

        this.zombies.children.iterate(z => {
            if (z && (z.x < this.cameras.main.scrollX - 400 || z.x > this.cameras.main.scrollX + this.scale.width + 400)) {
                z.destroy();
            }
        });
    }
}
