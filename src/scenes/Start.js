// Cores do Menu
const COLOR_PRIMARY = 0xff0000;
const COLOR_LIGHT = 0x7b5e57;
const COLOR_DARK = 0x260e04;

export class Start extends Phaser.Scene {

    constructor() {
        super('Start');
        this.habitacionalCostResources = 0;
        this.habitacionalCostBones = 0;
        this.habitacionalPurchased = false;

        const savedScore = localStorage.getItem('zombieScore');
        this.score = savedScore ? parseInt(savedScore) : 0;

        this.bones = 0;
        this.lastBoneThreshold = 0;
        this.resources = 0;
        this.lastResourceThreshold = 0;

        this.maxTrainLife = 1500;
        this.trainLife = 1500;
        this.displayLife = 1500;

        this.gameOver = false;

        this.activeSubmenu = null;
        this.activeParent = null;

        this.boneMultiplier = 1;

        this.boneUpgradeCost = 10;
        this.reinforceCost = 25;
        this.survivors = 4;
this.maxSurvivors = 12; // ship1 default


    }

    preload() {
        this.load.image('background', 'assets/bgteste.png');
        this.load.image('ship', 'assets/spaceship.png');
        this.load.image('ship2', 'assets/spaceship2.png');
this.load.image('bgtres', 'assets/bgtres(stationone).png');

        this.load.spritesheet('wheels', 'assets/wheel.png', {
            frameWidth: 90,
            frameHeight: 90
        });

        for (let i = 1; i <= 4; i++) {
            this.load.spritesheet(`zombie${i}walking`, `assets/zombie${i}walking.png`, {
                frameWidth: 312,
                frameHeight: 312
            });
        }

        this.load.spritesheet('bloodSplatter', 'assets/bloodSplatter.png', {
            frameWidth: 86,
            frameHeight: 86
        });
    }

    create() {

        const { width, height } = this.scale;
        const trainWidth = 3840;

        this.bgSpeed = 15;

        this.background = this.add
            .tileSprite(0, 0, width, height, 'background')
            .setOrigin(0)
            .setScrollFactor(0);

        // =============================
        // ANIMAÇÕES DOS ZUMBIS (FIX)
        // =============================
        this.anims.create({ key: 'spin', frames: this.anims.generateFrameNumbers('wheels', { start: 0, end: 3 }), frameRate: 15, repeat: -1 });
        for (let i = 1; i <= 4; i++) {
            this.anims.create({
                key: `zombie${i}_walk`,
                frames: this.anims.generateFrameNumbers(`zombie${i}walking`, { start: 0, end: 7 }),
                frameRate: 12,
                repeat: -1
            });
        }

        // =============================
        // MENU SUPERIOR
        // =============================

        const topMargin = 60;
        const buttonWidth = 260;
        const buttonHeight = 55;
        const spacing = 30;
        const verticalSpacing = 10;

        const buttonsData = [
            { name: '+ Adicionar vagão', children: ['Cozinha', 'Habitacional'] },
            { name: 'Reforçar Integridade', cost: 25 },
            { name: 'Mais', children: ['+0.25x Ossadas', '+0.25x Reforço'] }
        ];

        const totalWidth =
            (buttonsData.length * buttonWidth) +
            ((buttonsData.length - 1) * spacing);

        let startX = (width - totalWidth) / 2;

        const createButton = (x, y, label, color, onClick) => {

            const bg = this.add.rectangle(x, y, buttonWidth, buttonHeight, color)
                .setOrigin(0)
                .setScrollFactor(0)
                .setDepth(6000)
                .setInteractive({ useHandCursor: true });

            const text = this.add.text(
                x + buttonWidth / 2,
                y + buttonHeight / 2,
                label,
                {
                    fontSize: '18px',
                    fontStyle: 'bold',
                    color: '#ffffff',
                    align: 'center',
                    wordWrap: { width: buttonWidth - 20 }
                }
            )
                .setOrigin(0.5)
                .setScrollFactor(0)
                .setDepth(6001);


            bg.on('pointerdown', (pointer, lx, ly, event) => {
                event.stopPropagation();
                onClick();
            });

            return { bg, text };
        };

        buttonsData.forEach((btnData, index) => {

            const x = startX + index * (buttonWidth + spacing);
            const y = topMargin;

            // BOTÃO REFORÇAR
            if (btnData.name === 'Reforçar Integridade') {

                const btn = createButton(
                    x,
                    y,
                    `Reforçar Integridade\n(${this.reinforceCost})`,
                    COLOR_DARK,
                    () => {

                        if (this.bones < this.reinforceCost || this.gameOver) return;

                        this.bones -= this.reinforceCost;
                        this.bonesText.setText(`Ossadas: ${this.bones}`);

                        this.trainLife = Phaser.Math.Clamp(
                            this.trainLife + 100,
                            0,
                            this.maxTrainLife
                        );

                        // aumenta custo 10%
                        this.reinforceCost = Math.floor(this.reinforceCost * 1.10);

                        btn.text.setText(
                            `Reforçar Integridade\n(${this.reinforceCost})`
                        );

                        this.updateReinforceState();
                    }
                );


                this.reinforceButton = btn.bg;

                this.updateReinforceState = () => {

                    if (!this.reinforceButton) return;

                    if (this.bones < this.reinforceCost) {

                        this.reinforceButton.disableInteractive();
                        this.reinforceButton.setFillStyle(0x555555);

                    } else {

                        this.reinforceButton.setInteractive();
                        this.reinforceButton.setFillStyle(COLOR_DARK);
                    }
                };
                this.updateBoneUpgradeState = () => {

                    if (!this.boneUpgradeButton) return;
                    if (!this.boneUpgradeButton.scene) return; // ← important
                    if (!this.boneUpgradeButton.active) return;

                    if (this.bones < this.boneUpgradeCost) {

                        this.boneUpgradeButton.disableInteractive();
                        this.boneUpgradeButton.setFillStyle(0x555555);

                    } else {

                        this.boneUpgradeButton.setInteractive({ useHandCursor: true });
                        this.boneUpgradeButton.setFillStyle(COLOR_PRIMARY);
                    }
                };



                this.updateReinforceState();
                return;
            }

            // BOTÕES COM SUBMENU
            createButton(x, y, btnData.name, COLOR_DARK, () => {

                // Fecha se já estiver aberto
                if (this.activeSubmenu) {
                    this.activeSubmenu.forEach(obj => obj.destroy());
                    this.activeSubmenu = null;

                    if (this.activeParent === btnData.name) {
                        this.activeParent = null;
                        return;
                    }
                }

                this.activeParent = btnData.name;
                this.activeSubmenu = [];

                btnData.children.forEach((child, i) => {

                    const subY =
                        y + buttonHeight +
                        verticalSpacing +
                        i * (buttonHeight + verticalSpacing);

                    let label = child;

                    if (child === 'Habitacional') {
                        label =
                            `Habitacional\n(${this.habitacionalCostResources}R / ${this.habitacionalCostBones}O)`;
                    }


                    if (child === '+0.25x Ossadas') {
                        label = `${child}\n(${this.boneUpgradeCost})`;
                    }

                    const subBtn = createButton(
                        x,
                        subY,
                        label,
                        COLOR_PRIMARY,
                        () => {
                            {

                                // =============================
                                // +0.25x OSSADAS
                                // =============================
                                if (child === '+0.25x Ossadas') {

                                    if (this.bones < this.boneUpgradeCost) return;

                                    this.bones -= this.boneUpgradeCost;
                                    this.bonesText.setText(`Ossadas: ${this.bones}`);

                                    this.boneMultiplier += 0.25;

                                    this.boneUpgradeCost = Math.floor(this.boneUpgradeCost * 1.10);

                                    subBtn.text.setText(
                                        `+0.25x Ossadas\n(${this.boneUpgradeCost})`
                                    );
                                }

                                // =============================
                                // HABITACIONAL
                                // =============================
                                if (child === 'Habitacional') {

                                    if (this.habitacionalPurchased) return;

                                    // Pay cost (free for testing is fine)
                                    this.resources -= this.habitacionalCostResources;
                                    this.bones -= this.habitacionalCostBones;

                                    this.resourcesText.setText(`Recursos: ${this.resources}`);
                                    this.bonesText.setText(`Ossadas: ${this.bones}`);

                                    // Change sprite
                                    this.ship.setTexture('ship2');
this.maxSurvivors = 16;
this.survivorsText.setText(
    `Sobreviventes: ${this.survivors} (${this.maxSurvivors - this.survivors} vagas)`
);


                                    // Move slightly left
                                    this.ship.x -= 250;
                                    // New wheel layout for ship2
                                    this.createWheels([
                                        80,
                                        560,
                                        850,
                                        1420,
                                        1710,
                                        2280,
                                        2560,
                                        3060
                                    ]);

                                    // Expand hitbox
                                    this.hitbox.body.setSize(3100, 50);
                                    this.hitbox.x -= 480

                                    this.habitacionalPurchased = true;

                                    subBtn.bg.disableInteractive();
                                    subBtn.bg.setFillStyle(0x444444);
                                }

                                if (this.updateReinforceState)
                                    this.updateReinforceState();

                                if (this.updateBoneUpgradeState)
                                    this.updateBoneUpgradeState();
                            }
                        }

                    );
                    if (child === '+0.25x Ossadas') {
                        this.boneUpgradeButton = subBtn.bg;
                    }
                    this.updateBoneUpgradeState();

                    this.activeSubmenu.push(subBtn.bg, subBtn.text);





                });

            });
        });

        // Fecha submenu clicando fora
        this.input.on('pointerdown', (pointer, currentlyOver) => {
            if (currentlyOver.length === 0 && this.activeSubmenu) {
                this.activeSubmenu.forEach(obj => obj.destroy());
                this.activeSubmenu = null;
                this.activeParent = null;
            }
        });

        // =============================
        // TREM + HITBOX
        // =============================

        this.train = this.add.container(400, height / 2).setDepth(10);

        // ---- WHEELS FIRST ----
        this.wheels = [];

        this.createWheels([935, 1420, 1710, 2280, 2560, 3060]);


        // ---- SHIP AFTER ----
        this.ship = this.add.image(0, 0, 'ship')
            .setOrigin(0, 0.5);

        this.train.add(this.ship);


        this.hitbox = this.add.zone(2400, height / 2.5, 2183, 50);
        this.physics.add.existing(this.hitbox);
        this.hitbox.body.setAllowGravity(false);
        this.hitbox.body.setImmovable(true);

        this.zombies = this.physics.add.group();

        // UI
        this.scoreText = this.add.text(50, 50, `Zombies: ${this.score}`, {
            fontSize: '30px',
            fill: '#ff0000'
        }).setScrollFactor(0);
this.survivorsText = this.add.text(
    50,
    170,
    `Sobreviventes: ${this.survivors} (${this.maxSurvivors - this.survivors} vagas)`,
    {
        fontSize: '30px',
        fill: '#ffffff'
    }
).setScrollFactor(0);
        this.bonesText = this.add.text(50, 90, `Ossadas: ${this.bones}`, {
            fontSize: '30px',
            fill: '#ffffff'
        }).setScrollFactor(0);
        this.resourcesText = this.add.text(50, 130, `Recursos: ${this.resources}`, {
            fontSize: '30px',
            fill: '#ffffff'
        }).setScrollFactor(0);




        // VIDA
        // =============================
        // LIFE BAR (TOP CENTER ABOVE BUTTONS)
        // =============================

        this.lifeBarWidth = 500;
        this.lifeBarHeight = 20;

        const lifeBarY = 20; // top of screen
        const lifeBarX = (width - this.lifeBarWidth) / 2;

        // Background (grey)
        this.lifeBarBg = this.add.rectangle(
            lifeBarX,
            lifeBarY,
            this.lifeBarWidth,
            this.lifeBarHeight,
            0x555555
        )
            .setOrigin(0)
            .setScrollFactor(0)
            .setDepth(7000);

        // Fill (white)
        this.lifeBar = this.add.rectangle(
            lifeBarX,
            lifeBarY,
            this.lifeBarWidth,
            this.lifeBarHeight,
            0xffffff
        )
            .setOrigin(0)
            .setScrollFactor(0)
            .setDepth(7001);


        // OVERLAP
        this.physics.add.overlap(this.hitbox, this.zombies, (h, z) => {

            if (!z.active || this.gameOver) return;

            z.destroy();

            this.score++;
            this.scoreText.setText(`Zombies: ${this.score}`);
            localStorage.setItem('zombieScore', this.score);

            this.trainLife -= 5;
            this.cameras.main.shake(20, 0.01);

            const currentThreshold = Math.floor(this.score / 25);
            // =============================
            // RECURSOS (a cada 30 kills)
            // =============================

            const resourceThreshold = Math.floor(this.score / 30);

            if (resourceThreshold > this.lastResourceThreshold) {

                const gainedResources =
                    (resourceThreshold - this.lastResourceThreshold) * 5;

                this.resources += gainedResources;

                this.resourcesText.setText(
                    `Recursos: ${this.resources}`
                );

                this.lastResourceThreshold = resourceThreshold;
            }

            if (currentThreshold > this.lastBoneThreshold) {
                const baseReward = 10;
                const gained =
                    (currentThreshold - this.lastBoneThreshold) *
                    baseReward *
                    this.boneMultiplier;

                this.bones += gained;
                this.bonesText.setText(`Ossadas: ${this.bones}`);
                this.lastBoneThreshold = currentThreshold;

                if (this.updateReinforceState)
                    this.updateReinforceState();

                if (this.updateBoneUpgradeState)
                    this.updateBoneUpgradeState();

            }

            if (this.trainLife <= 0)
                this.triggerGameOver();
        });

        this.time.addEvent({
            delay: 300,
            callback: () => this.spawnZombie(),
            loop: true
        });

        this.cameras.main.setBounds(0, 0, trainWidth, height);
        this.cameras.main.scrollX = trainWidth - width;

        // =============================
        // CONTROLE DE CÂMERA COMPLETO
        // =============================

        this.camSpeed = 25;
        this.dragSensitivity = 1.2;

        this.isDragging = false;
        this.dragStartX = 0;
        this.cameraStartX = 0;

        // Permitir múltiplos toques
        this.input.addPointer(2);

        // -----------------------------
        // TECLADO
        // -----------------------------
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys({
            A: Phaser.Input.Keyboard.KeyCodes.A,
            D: Phaser.Input.Keyboard.KeyCodes.D
        });

        // -----------------------------
        // MOUSE / TOUCH START
        // -----------------------------
        this.input.on('pointerdown', (pointer, currentlyOver) => {

            // Se clicou em UI, não arrasta
            if (currentlyOver.length > 0) return;

            this.isDragging = true;
            this.dragStartX = pointer.x;
            this.cameraStartX = this.cameras.main.scrollX;
        });

        // -----------------------------
        // MOUSE / TOUCH MOVE
        // -----------------------------
        this.input.on('pointermove', (pointer) => {

            if (!this.isDragging) return;

            const dragDistance =
                (pointer.x - this.dragStartX) * this.dragSensitivity;

            this.cameras.main.scrollX =
                this.cameraStartX - dragDistance;

            this.clampCamera();
        });

        // -----------------------------
        // SOLTAR
        // -----------------------------
        this.input.on('pointerup', () => {
            this.isDragging = false;
        });

// =============================
// STATION TIMER (90s)
// =============================

this.stationActive = false;

this.time.addEvent({
    delay: 90000,
    callback: () => this.triggerStation(),
    loop: true
});


    }

    createWheels(positions) {

        // Remove old wheels
        if (this.wheels) {
            this.wheels.forEach(w => w.destroy());
        }

        this.wheels = [];

        positions.forEach(xPos => {

            const wheel = this.add.sprite(xPos, 40, 'wheels')
                .play('spin');

            this.train.add(wheel);
            this.wheels.push(wheel);
        });
    }


    clampCamera() {

        const cam = this.cameras.main;
        const maxScroll =
            this.cameras.main.getBounds().width -
            this.scale.width;

        cam.scrollX = Phaser.Math.Clamp(
            cam.scrollX,
            0,
            maxScroll
        );
    }

    spawnZombie() {

        if (this.gameOver || this.stationActive) return;


        const { width, height } = this.scale;
        const cam = this.cameras.main;

        const side = Phaser.Math.Between(0, 3);

        let x, y, vx = 0, vy = 0;

        // -----------------------------
        // DIREITA
        // -----------------------------
        if (side === 0) {

            x = cam.scrollX + width + 100;
            y = Phaser.Math.Between(0, height);

            vx = -300;
        }

        // -----------------------------
        // ESQUERDA
        // -----------------------------
        else if (side === 1) {

            x = cam.scrollX - 100;
            y = Phaser.Math.Between(0, height);

            vx = 300;
        }

        // -----------------------------
        // TOPO (NOVO)
        // -----------------------------
        else if (side === 2) {

            x = Phaser.Math.Between(
                cam.scrollX,
                cam.scrollX + width
            );

            y = -100;

            vy = 300;
        }

        // -----------------------------
        // BASE (opcional já incluso)
        // -----------------------------
        else {

            x = Phaser.Math.Between(
                cam.scrollX,
                cam.scrollX + width
            );

            y = height + 100;

            vy = -300;
        }

        const type = Phaser.Math.Between(1, 4);

        const z = this.zombies.create(x, y, `zombie${type}walking`);

        z.play(`zombie${type}_walk`);

        z.setVelocity(vx, vy);
    }

    triggerGameOver() {
        this.gameOver = true;
        this.physics.pause();

        this.add.text(
            this.scale.width / 2,
            this.scale.height / 2,
            "TREM DESTRUÍDO",
            { fontSize: '60px', color: '#ff0000' }
        ).setOrigin(0.5).setScrollFactor(0);
    }
triggerStation() {

    if (this.stationActive || this.gameOver) return;

    this.stationActive = true;

    // Despawn zombies
    this.zombies.clear(true, true);

    // Change background
    this.background.setTexture('bgtres');
    this.bgSpeed = 0;

    this.tweens.add({
        targets: this.background,
        tilePositionX: this.background.tilePositionX + 2000,
        duration: 4000,
        ease: 'Linear',
        onComplete: () => {

            this.physics.pause();
            this.time.paused = true;

            this.showStationPopup();
        }
    });
}

showStationPopup() {

    const { width, height } = this.scale;

    // Random survivors offer (1–5)
    const offer = Phaser.Math.Between(1, 5);

    const availableSpace = this.maxSurvivors - this.survivors;

    const finalOffer = Math.min(offer, availableSpace);

    const overlay = this.add.rectangle(
        width / 2,
        height / 2,
        width,
        height,
        0x000000,
        0.6
    ).setScrollFactor(0).setDepth(10000);

    const popup = this.add.rectangle(
        width / 2,
        height / 2,
        650,
        350,
        0x222222
    ).setScrollFactor(0).setDepth(10001);

    let message;

    if (availableSpace <= 0) {
        message = "ESTAÇÃO ALCANÇADA\n\nO trem está lotado.\nNenhum sobrevivente pode entrar.";
    } else {
        message = `ESTAÇÃO ALCANÇADA\n\n${finalOffer} sobreviventes querem entrar.\nEspaço disponível: ${availableSpace}`;
    }

    const text = this.add.text(
        width / 2,
        height / 2 - 40,
        message,
        {
            fontSize: '28px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: 600 }
        }
    )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(10002);

    // ACCEPT BUTTON
    const acceptBtn = this.add.text(
        width / 2 - 120,
        height / 2 + 100,
        "ACEITAR",
        {
            fontSize: '26px',
            backgroundColor: '#00aa00',
            padding: { x: 20, y: 10 }
        }
    )
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0)
        .setDepth(10002);

    // DECLINE BUTTON
    const declineBtn = this.add.text(
        width / 2 + 120,
        height / 2 + 100,
        "RECUSAR",
        {
            fontSize: '26px',
            backgroundColor: '#aa0000',
            padding: { x: 20, y: 10 }
        }
    )
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0)
        .setDepth(10002);

    // If no space, disable accept
    if (availableSpace <= 0) {
        acceptBtn.disableInteractive();
        acceptBtn.setAlpha(0.5);
    }

    acceptBtn.on('pointerdown', () => {

        if (availableSpace > 0) {
            this.survivors += finalOffer;
            this.survivorsText.setText(
    `Sobreviventes: ${this.survivors} (${this.maxSurvivors - this.survivors} vagas)`
);

        }

        closePopup();
    });

    declineBtn.on('pointerdown', () => {
        closePopup();
    });

    const closePopup = () => {

        overlay.destroy();
        popup.destroy();
        text.destroy();
        acceptBtn.destroy();
        declineBtn.destroy();

        this.physics.resume();
        this.time.paused = false;

        this.background.setTexture('background');
        this.bgSpeed = 15;

        this.stationActive = false;
    };
}


    update() {

        if (this.gameOver) return;

        this.background.tilePositionX += this.bgSpeed;

        // -----------------------------
        // TECLADO
        // -----------------------------

        if (this.cursors.right.isDown || this.keys.D.isDown) {
            this.cameras.main.scrollX += this.camSpeed;
        }

        if (this.cursors.left.isDown || this.keys.A.isDown) {
            this.cameras.main.scrollX -= this.camSpeed;
        }

        this.clampCamera();

        // -----------------------------
        // VIDA
        // -----------------------------

        if (this.trainLife < this.maxTrainLife)
            this.trainLife += 0.02;

        this.displayLife = Phaser.Math.Linear(
            this.displayLife,
            this.trainLife,
            0.05
        );

        const ratio = Phaser.Math.Clamp(
            this.displayLife / this.maxTrainLife,
            0,
            1
        );

        this.lifeBar.width = this.lifeBarWidth * ratio;

    }

}
