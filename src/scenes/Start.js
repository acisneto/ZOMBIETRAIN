// Cores do Menu
const COLOR_PRIMARY = 0xff0000;
const COLOR_LIGHT = 0x7b5e57;
const COLOR_DARK = 0x260e04;

export class Start extends Phaser.Scene {

    constructor() {
        super('Start');
        
        // Carrega dados salvos dos vagões
        const savedWagons = JSON.parse(localStorage.getItem('zombieWagons'));
        
        this.habitacionalCostResources = 125;
        this.habitacionalCostBones = 300;
        this.habitacionalPurchased = savedWagons ? savedWagons.habitacionalPurchased : false;
        
        this.cozinhaCostResources = 100;
        this.cozinhaCostBones = 100;
        this.cozinhaPurchased = savedWagons ? savedWagons.cozinhaPurchased : false;
        
        this.survivorData = [];

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

        const savedUpgrades = JSON.parse(localStorage.getItem('zombieUpgrades'));

        if (savedUpgrades) {
            this.boneMultiplier = savedUpgrades.boneMultiplier;
            this.reinforceMultiplier = savedUpgrades.reinforceMultiplier;
        } else {
            this.boneMultiplier = 1;
            this.reinforceMultiplier = 1;
        }


        this.boneUpgradeCost = 10;
        this.reinforceUpgradeCost = 10;
        this.reinforceCost = 25;
        this.survivors = 4;
        this.maxSurvivors = 8;
        
        // Bounce effect properties
        this.bounceTime = 0;
        this.bounceSpeed = 2;
        this.bounceAmount = 3;
    }

    preload() {
        this.load.image('background', 'assets/bgteste.png');
        this.load.image('ship', 'assets/spaceship.png');
        this.load.image('ship2', 'assets/spaceship2.png');
        this.load.image('ship3', 'assets/spaceship3.png');
        this.load.image('bgtres', 'assets/bgtres(stationone).png');

        this.load.spritesheet('wheels', 'assets/wheel.png', {
            frameWidth: 90,
            frameHeight: 90
        });

        // Zombies 1 through 6
        for (let i = 1; i <= 6; i++) {
            let fWidth = (i >= 5) ? 310 : 312;
            this.load.spritesheet(`zombie${i}walking`, `assets/zombie${i}walking.png`, {
                frameWidth: fWidth,
                frameHeight: 310
            });
        }

        for (let i = 1; i <= 4; i++) {
            this.load.spritesheet(`survivor${i}`, `assets/h${i}.png`, {
                frameWidth: 310,
                frameHeight: 310
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
        // Text styling
        const textStyle = {
            fontSize: '22px',
            fill: '#ffffff',
            align: 'center'
        };

        const labelStyle = {
            fontSize: '16px',
            fill: '#aaaaaa',
            align: 'center'
        };
        this.background = this.add
            .tileSprite(0, 0, width, height, 'background')
            .setOrigin(0)
            .setScrollFactor(0);

        // --- WHEEL ANIMATION ---
        this.anims.create({
            key: 'spin',
            frames: this.anims.generateFrameNumbers('wheels', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        });

        // ZOMBIE ANIMATIONS
        for (let i = 1; i <= 6; i++) {
            let endFrame = 7;

            if (this.textures.exists(`zombie${i}walking`)) {
                this.anims.create({
                    key: `zombie${i}_walk`,
                    frames: this.anims.generateFrameNumbers(`zombie${i}walking`, { start: 0, end: endFrame }),
                    frameRate: 12,
                    repeat: -1
                });
            }
        }

        // SURVIVOR ANIMATIONS
        for (let i = 1; i <= 4; i++) {
            this.anims.create({
                key: `survivor${i}_idle`,
                frames: this.anims.generateFrameNumbers(`survivor${i}`, { start: 0, end: 5 }),
                frameRate: 5,
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
                        this.bonesText.setText(`${this.bones}`);

                        const healAmount = Math.floor(100 * this.reinforceMultiplier);

                        this.trainLife = Phaser.Math.Clamp(
                            this.trainLife + healAmount,
                            0,
                            this.maxTrainLife
                        );

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
                    if (!this.boneUpgradeButton.scene) return;
                    if (!this.boneUpgradeButton.active) return;

                    if (this.bones < this.boneUpgradeCost) {
                        this.boneUpgradeButton.disableInteractive();
                        this.boneUpgradeButton.setFillStyle(0x555555);
                    } else {
                        this.boneUpgradeButton.setInteractive({ useHandCursor: true });
                        this.boneUpgradeButton.setFillStyle(COLOR_PRIMARY);
                    }
                };

                this.updateReinforceUpgradeState = () => {

                    if (!this.reinforceUpgradeButton) return;
                    if (!this.reinforceUpgradeButton.scene) return;
                    if (!this.reinforceUpgradeButton.active) return;

                    if (this.bones < this.reinforceUpgradeCost) {
                        this.reinforceUpgradeButton.disableInteractive();
                        this.reinforceUpgradeButton.setFillStyle(0x555555);
                    } else {
                        this.reinforceUpgradeButton.setInteractive({ useHandCursor: true });
                        this.reinforceUpgradeButton.setFillStyle(COLOR_PRIMARY);
                    }
                };
                
                this.updateHabilitacionalState = () => {
                    if (!this.habitacionalButton) return;
                    if (!this.habitacionalButton.bg.scene) return;
                    if (!this.habitacionalButton.bg.active) return;
                    
                    if (this.habitacionalPurchased) {
                        this.habitacionalButton.bg.disableInteractive();
                        this.habitacionalButton.bg.setFillStyle(0x444444);
                        this.habitacionalButton.text.setText('Habitacional\n(Comprado)');
                    } else if (this.resources < this.habitacionalCostResources || 
                               this.bones < this.habitacionalCostBones) {
                        this.habitacionalButton.bg.disableInteractive();
                        this.habitacionalButton.bg.setFillStyle(0x555555);
                    } else {
                        this.habitacionalButton.bg.setInteractive({ useHandCursor: true });
                        this.habitacionalButton.bg.setFillStyle(COLOR_PRIMARY);
                    }
                };
                
                this.updateCozinhaState = () => {
                    if (!this.cozinhaButton) return;
                    if (!this.cozinhaButton.bg.scene) return;
                    if (!this.cozinhaButton.bg.active) return;
                    
                    if (this.cozinhaPurchased) {
                        this.cozinhaButton.bg.disableInteractive();
                        this.cozinhaButton.bg.setFillStyle(0x444444);
                        this.cozinhaButton.text.setText('Cozinha\n(Comprado)');
                    } else if (!this.habitacionalPurchased) {
                        this.cozinhaButton.bg.disableInteractive();
                        this.cozinhaButton.bg.setFillStyle(0x555555);
                        this.cozinhaButton.text.setText('Cozinha\n(Requer Habitacional)');
                    } else if (this.resources < this.cozinhaCostResources || 
                               this.bones < this.cozinhaCostBones) {
                        this.cozinhaButton.bg.disableInteractive();
                        this.cozinhaButton.bg.setFillStyle(0x555555);
                    } else {
                        this.cozinhaButton.bg.setInteractive({ useHandCursor: true });
                        this.cozinhaButton.bg.setFillStyle(COLOR_PRIMARY);
                    }
                };

                this.updateReinforceState();
                this.updateReinforceUpgradeState();
                return;
            }

            // BOTÕES COM SUBMENU
            createButton(x, y, btnData.name, COLOR_DARK, () => {

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
                    let isDisabled = false;

                    if (child === 'Habitacional') {
                        label =
                            `Habitacional\n(${this.habitacionalCostResources}R / ${this.habitacionalCostBones}O)`;
                        
                        // Desabilita se já foi comprado ou se não tem recursos suficientes
                        if (this.habitacionalPurchased) {
                            label = 'Habitacional\n(Comprado)';
                            isDisabled = true;
                        } else if (this.resources < this.habitacionalCostResources || 
                                   this.bones < this.habitacionalCostBones) {
                            isDisabled = true;
                        }
                    }

                    if (child === 'Cozinha') {
                        if (this.cozinhaPurchased) {
                            label = 'Cozinha\n(Comprado)';
                            isDisabled = true;
                        } else if (!this.habitacionalPurchased) {
                            label = 'Cozinha\n(Requer Habitacional)';
                            isDisabled = true;
                        } else {
                            label = `Cozinha\n(${this.cozinhaCostResources}R / ${this.cozinhaCostBones}O)`;
                            isDisabled = false;
                        }
                    }

                    if (child === '+0.25x Ossadas') {
                        label = `${child}\n(${this.boneUpgradeCost})`;
                    }

                    if (child === '+0.25x Reforço') {
                        label = `${child}\n(${this.reinforceUpgradeCost})`;
                    }

                    const subBtn = createButton(
                        x,
                        subY,
                        label,
                        isDisabled ? 0x555555 : COLOR_PRIMARY,
                        () => {
                            if (isDisabled) return;

                            {
                                if (child === '+0.25x Ossadas') {

                                    if (this.bones < this.boneUpgradeCost) return;

                                    this.bones -= this.boneUpgradeCost;
                                    this.bonesText.setText(`${this.bones}`);

                                    this.boneMultiplier += 0.25;
                                    this.saveUpgrades();
                                    this.updateUpgradeDisplay();

                                    this.boneUpgradeCost = Math.floor(this.boneUpgradeCost * 1.10);

                                    subBtn.text.setText(
                                        `+0.25x Ossadas\n(${this.boneUpgradeCost})`
                                    );
                                }

                                if (child === '+0.25x Reforço') {

                                    if (this.bones < this.reinforceUpgradeCost) return;

                                    this.bones -= this.reinforceUpgradeCost;
                                    this.bonesText.setText(`${this.bones}`);

                                    this.reinforceMultiplier += 0.25;
                                    this.saveUpgrades();
                                    this.updateUpgradeDisplay();

                                    this.reinforceUpgradeCost = Math.floor(this.reinforceUpgradeCost * 1.10);

                                    subBtn.text.setText(
                                        `+0.25x Reforço\n(${this.reinforceUpgradeCost})`
                                    );
                                }

                                if (child === 'Habitacional') {

                                    if (this.habitacionalPurchased) return;
                                    if (this.resources < this.habitacionalCostResources) return;
                                    if (this.bones < this.habitacionalCostBones) return;

                                    this.resources -= this.habitacionalCostResources;
                                    this.bones -= this.habitacionalCostBones;

                                    this.resourcesText.setText(`${this.resources}`);
                                    this.bonesText.setText(`${this.bones}`);

                                    this.ship.setTexture('ship2');
                                    this.maxSurvivors = 12;
                                    this.survivorsText.setText(`${this.survivors}/${this.maxSurvivors}`);

                                    this.ship.x -= 250;
                                    this.ship.y -= 10;
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

                                    this.hitbox.body.setSize(3100, 50);
                                    this.hitbox.x -= 480;

                                    this.habitacionalPurchased = true;
                                    this.saveWagons();

                                    this.createSurvivors();

                                    subBtn.bg.disableInteractive();
                                    subBtn.bg.setFillStyle(0x444444);
                                    
                                    // Atualiza submenu para liberar Cozinha
                                    if (this.activeSubmenu) {
                                        this.activeSubmenu.forEach(obj => obj.destroy());
                                        this.activeSubmenu = null;
                                        this.activeParent = null;
                                    }
                                }

                                if (child === 'Cozinha') {

                                    if (this.cozinhaPurchased) return;
                                    if (!this.habitacionalPurchased) return;
                                    if (this.resources < this.cozinhaCostResources) return;
                                    if (this.bones < this.cozinhaCostBones) return;

                                    this.resources -= this.cozinhaCostResources;
                                    this.bones -= this.cozinhaCostBones;

                                    this.resourcesText.setText(`${this.resources}`);
                                    this.bonesText.setText(`${this.bones}`);

                                    this.ship.setTexture('ship3');
                                    this.maxSurvivors = 16;
                                    this.survivorsText.setText(`${this.survivors}/${this.maxSurvivors}`);

                                    this.cozinhaPurchased = true;
                                    this.saveWagons();

                                    subBtn.bg.disableInteractive();
                                    subBtn.bg.setFillStyle(0x444444);
                                    subBtn.text.setText('Cozinha\n(Comprado)');
                                }

                                if (this.updateReinforceState)
                                    this.updateReinforceState();

                                if (this.updateBoneUpgradeState)
                                    this.updateBoneUpgradeState();

                                if (this.updateReinforceUpgradeState)
                                    this.updateReinforceUpgradeState();
                            }
                        }

                    );

                    if (isDisabled) {
                        subBtn.bg.disableInteractive();
                    }

                    if (child === '+0.25x Ossadas') {
                        this.boneUpgradeButton = subBtn.bg;
                    }

                    if (child === '+0.25x Reforço') {
                        this.reinforceUpgradeButton = subBtn.bg;
                    }
                    
                    if (child === 'Habitacional') {
                        this.habitacionalButton = subBtn;
                    }
                    
                    if (child === 'Cozinha') {
                        this.cozinhaButton = subBtn;
                    }

                    this.updateBoneUpgradeState();
                    this.updateReinforceUpgradeState();
                    this.updateHabilitacionalState();
                    this.updateCozinhaState();
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

        // =========================
        // TREM + CONTÊINER
        // =========================
        this.train = this.add.container(400, height / 2).setDepth(10);

        // Wheels first (behind the hull)
        this.wheels = [];
        
        // Determina qual configuração de rodas usar baseado nos vagões comprados
        let wheelPositions = [935, 1420, 1710, 2280, 2560, 3060];
        
        if (this.habitacionalPurchased) {
            wheelPositions = [80, 560, 850, 1420, 1710, 2280, 2560, 3060];
        }
        
        this.createWheels(wheelPositions);

        // Ship hull - salvando posição inicial Y para o bounce
        // Determina qual textura e posição usar
        let shipTexture = 'ship';
        let shipOffsetX = 0;
        let shipOffsetY = 0;
        
        if (this.cozinhaPurchased) {
            shipTexture = 'ship3';
            shipOffsetX = -250;
            shipOffsetY = -10;
            this.maxSurvivors = 16;
        } else if (this.habitacionalPurchased) {
            shipTexture = 'ship2';
            shipOffsetX = -250;
            shipOffsetY = -10;
            this.maxSurvivors = 12;
        }
        
        this.ship = this.add.image(shipOffsetX, shipOffsetY, shipTexture).setOrigin(0, 0.5);
        this.shipBaseY = shipOffsetY; // posição Y base para bounce
        this.train.add(this.ship);

        // Survivor container (last, so it appears in front)
        this.survivorContainer = this.add.container(0, 0);
        this.train.add(this.survivorContainer);
// =============================
// FRONT UPGRADE DISPLAY (VERTICAL)
// =============================

this.upgradeDisplay = this.add.container(3338, -100);

// background rounded like bottom panel
const upgradeBg = this.add.graphics();
upgradeBg.fillStyle(0x333333, 0.85);
upgradeBg.fillRoundedRect(-95, -88, 190, 148, 15);

this.upgradeDisplay.add(upgradeBg);

// ---- OSSADAS (TOP)
const boneLabel = this.add.text(
    0,
    -70,
    'Ossadas Mult.',
    labelStyle   // reuse existing style
).setOrigin(0.5);

this.boneUpgradeText = this.add.text(
    0,
    -35,
    '',
    textStyle    // reuse existing style
).setOrigin(0.5);



// ---- REFORÇO (BOTTOM)
const reinforceLabel = this.add.text(
    0,
    0,
    'Reforço Mult.',
    labelStyle
).setOrigin(0.5);

this.reinforceUpgradeText = this.add.text(
    0,
    35,
    '',
    textStyle
).setOrigin(0.5);

this.upgradeDisplay.add([
    boneLabel,
    this.boneUpgradeText,
    reinforceLabel,
    this.reinforceUpgradeText
]);

this.train.add(this.upgradeDisplay);

this.upgradeDisplay.setDepth(5000);

this.updateUpgradeDisplay();


        // Populate survivors
        // Only generate initial survivors if empty
        if (this.survivorData.length === 0) {
            for (let i = 0; i < this.survivors; i++) {
                this.survivorData.push(Phaser.Math.Between(1, 4));
            }
        }

        this.createSurvivors();


        // Continue with hitbox setup...
        // Ajusta hitbox baseado nos vagões comprados
        let hitboxWidth = 2183;
        let hitboxX = 2400;
        
        if (this.habitacionalPurchased || this.cozinhaPurchased) {
            hitboxWidth = 3100;
            hitboxX = 2400 - 480;
        }
        
        this.hitbox = this.add.zone(hitboxX, height / 2.5, hitboxWidth, 50);
        this.physics.add.existing(this.hitbox);
        this.hitbox.body.setAllowGravity(false);
        this.hitbox.body.setImmovable(true);

        this.zombies = this.physics.add.group();

        // BLOOD SPLATTER ANIMATION - Create AFTER zombies group
        this.anims.create({
            key: 'blood_splat',
            frames: this.anims.generateFrameNumbers('bloodSplatter', { start: 0, end: 3 }),
            frameRate: 12,
            repeat: 0
        });

        // =============================
        // UI - STATS PANEL UNDER TRAIN
        // =============================

        const panelY = height - 150;
        const panelHeight = 85;
        const panelWidth = 900;
        const panelX = (width - panelWidth) / 2;

        // Background panel with rounded corners
        const panelGraphics = this.add.graphics();
        panelGraphics.fillStyle(0x333333, 0.85);
        panelGraphics.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 15);
        panelGraphics.setScrollFactor(0);
        panelGraphics.setDepth(5000);

        // Divider lines between stats
        panelGraphics.lineStyle(2, 0x555555, 0.5);
        panelGraphics.beginPath();
        panelGraphics.moveTo(panelX + panelWidth / 4, panelY + 15);
        panelGraphics.lineTo(panelX + panelWidth / 4, panelY + panelHeight - 15);
        panelGraphics.strokePath();

        panelGraphics.beginPath();
        panelGraphics.moveTo(panelX + panelWidth / 2, panelY + 15);
        panelGraphics.lineTo(panelX + panelWidth / 2, panelY + panelHeight - 15);
        panelGraphics.strokePath();

        panelGraphics.beginPath();
        panelGraphics.moveTo(panelX + (panelWidth * 3) / 4, panelY + 15);
        panelGraphics.lineTo(panelX + (panelWidth * 3) / 4, panelY + panelHeight - 15);
        panelGraphics.strokePath();



        // Column 1: Zombies
        this.add.text(
            panelX + (panelWidth / 8),
            panelY + 25,
            'Zombies',
            labelStyle
        ).setOrigin(0.5).setScrollFactor(0).setDepth(5001);

        this.scoreText = this.add.text(
            panelX + (panelWidth / 8),
            panelY + 55,
            `${this.score}`,
            textStyle
        ).setOrigin(0.5).setScrollFactor(0).setDepth(5001);

        // Column 2: Ossadas
        this.add.text(
            panelX + (panelWidth * 3 / 8),
            panelY + 25,
            'Ossadas',
            labelStyle
        ).setOrigin(0.5).setScrollFactor(0).setDepth(5001);

        this.bonesText = this.add.text(
            panelX + (panelWidth * 3 / 8),
            panelY + 55,
            `${this.bones}`,
            textStyle
        ).setOrigin(0.5).setScrollFactor(0).setDepth(5001);

        // Column 3: Recursos
        this.add.text(
            panelX + (panelWidth * 5 / 8),
            panelY + 25,
            'Recursos',
            labelStyle
        ).setOrigin(0.5).setScrollFactor(0).setDepth(5001);

        this.resourcesText = this.add.text(
            panelX + (panelWidth * 5 / 8),
            panelY + 55,
            `${this.resources}`,
            textStyle
        ).setOrigin(0.5).setScrollFactor(0).setDepth(5001);

        // Column 4: Sobreviventes
        this.add.text(
            panelX + (panelWidth * 7 / 8),
            panelY + 25,
            'Sobreviventes',
            labelStyle
        ).setOrigin(0.5).setScrollFactor(0).setDepth(5001);

        this.survivorsText = this.add.text(
            panelX + (panelWidth * 7 / 8),
            panelY + 55,
            `${this.survivors}/${this.maxSurvivors}`,
            textStyle
        ).setOrigin(0.5).setScrollFactor(0).setDepth(5001);

        // VIDA
        // =============================
        // LIFE BAR (TOP CENTER ABOVE BUTTONS)
        // =============================

        this.lifeBarWidth = 500;
        this.lifeBarHeight = 20;

        const lifeBarY = 20;
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

        // OVERLAP - WITH BLOOD SPLATTER
        this.physics.add.overlap(this.hitbox, this.zombies, (h, z) => {

            if (!z.active || this.gameOver) return;

            // CREATE BLOOD SPLATTER AT ZOMBIE POSITION
            const bloodSplat = this.add.sprite(z.x, z.y, 'bloodSplatter');
            bloodSplat.setDepth(15);
            bloodSplat.setScale(1.5);
            bloodSplat.play('blood_splat');

            // Destroy blood splatter after animation completes
            bloodSplat.on('animationcomplete', () => {
                bloodSplat.destroy();
            });

            z.destroy();

            this.score++;
            this.scoreText.setText(`${this.score}`);
            localStorage.setItem('zombieScore', this.score);

            this.trainLife -= 5;
            this.cameras.main.shake(20, 0.01);

            const currentThreshold = Math.floor(this.score / 25);

            const resourceThreshold = Math.floor(this.score / 30);

            if (resourceThreshold > this.lastResourceThreshold) {

                const gainedResources =
                    (resourceThreshold - this.lastResourceThreshold) * 5;

                this.resources += gainedResources;

                this.resourcesText.setText(`${this.resources}`);

                this.lastResourceThreshold = resourceThreshold;
                
                if (this.updateHabilitacionalState)
                    this.updateHabilitacionalState();
                    
                if (this.updateCozinhaState)
                    this.updateCozinhaState();
            }

            if (currentThreshold > this.lastBoneThreshold) {
                const baseReward = 10;
                const gained =
                    (currentThreshold - this.lastBoneThreshold) *
                    baseReward *
                    this.boneMultiplier;

                this.bones += gained;
                this.bonesText.setText(`${this.bones}`);
                this.lastBoneThreshold = currentThreshold;

                if (this.updateReinforceState)
                    this.updateReinforceState();

                if (this.updateBoneUpgradeState)
                    this.updateBoneUpgradeState();
                    
                if (this.updateHabilitacionalState)
                    this.updateHabilitacionalState();
                    
                if (this.updateCozinhaState)
                    this.updateCozinhaState();

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
            delay: 20000,
            callback: () => this.triggerStation(),
            loop: true
        });
    }

    createSurvivors() {
        if (!this.survivorContainer) return;

        this.survivorContainer.removeAll(true);

        const wagonConfig = this.habitacionalPurchased
            ? [
                { startX: 2600, capacity: 4, isFirstWagon: true },
                { startX: 1800, capacity: 4, isFirstWagon: false },
                { startX: 900, capacity: 4, isFirstWagon: false },
            ]
            : [
                { startX: 2600, capacity: 4, isFirstWagon: true },
                { startX: 1800, capacity: 4, isFirstWagon: false },
                { startX: 900, capacity: 4, isFirstWagon: false },
            ];

        let survivorIndex = 0;
        const firstWagonSpacing = 120;
        const otherWagonSpacing = 150;

        for (const wagon of wagonConfig) {

            const spacing = wagon.isFirstWagon ? firstWagonSpacing : otherWagonSpacing;

            for (let i = 0; i < wagon.capacity; i++) {

                if (survivorIndex >= this.survivorData.length) return;

                const type = this.survivorData[survivorIndex];

                const survivor = this.add.sprite(
                    wagon.startX + (i * spacing),
                    -170,
                    `survivor${type}`
                ).play(`survivor${type}_idle`);

                survivor.setScale(0.9);
                this.survivorContainer.add(survivor);

                survivorIndex++;
            }

        }
    }

    createWheels(positions) {

        if (this.wheels) {
            this.wheels.forEach(w => w.destroy());
        }

        this.wheels = [];

        positions.forEach(xPos => {

            const wheel = this.add.sprite(xPos, 40, 'wheels')
                .play('spin');

            this.train.add(wheel);

            // 👇 FORCE wheel to be behind everything in container
            this.train.sendToBack(wheel);

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

        if (side === 0) { // RIGHT
            x = cam.scrollX + width + 100;
            y = Phaser.Math.Between(0, height);
            vx = -300;
        } else if (side === 1) { // LEFT
            x = cam.scrollX - 100;
            y = Phaser.Math.Between(0, height);
            vx = 300;
        } else if (side === 2) { // TOP
            x = Phaser.Math.Between(cam.scrollX, cam.scrollX + width);
            y = -100;
            vy = 300;
        } else { // BOTTOM
            x = Phaser.Math.Between(cam.scrollX, cam.scrollX + width);
            y = height + 100;
            vy = -300;
        }

        const type = Phaser.Math.Between(1, 6);
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
        this.showStationCinematicText();

        // Stop zombies
        this.zombies.clear(true, true);

        // Stop normal scrolling
        this.bgSpeed = 0;

        // Destroy scrolling background
        this.background.destroy();

        // Create real world-sized station background
        this.stationBg = this.add.image(0, 0, 'bgtres')
            .setOrigin(0)
            .setDepth(-10);


        const cam = this.cameras.main;
        const trainWidth = 3840;

        // Move camera to the LEFT edge
        cam.scrollX = 0;

        // Disable player control during cinematic
        this.isDragging = false;

        // Smooth camera pan to the RIGHT
        this.tweens.add({
            targets: cam,
            scrollX: trainWidth - this.scale.width,
            duration: 5000,
            ease: 'Linear',
            onComplete: () => {

                this.hideStationCinematicText();

                this.physics.pause();
                this.time.paused = true;

                this.showStationPopup();
            }

        });
    }

    showStationPopup() {

        const { width, height } = this.scale;

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

        if (availableSpace <= 0) {
            acceptBtn.disableInteractive();
            acceptBtn.setAlpha(0.5);
        }

        const closePopup = () => {

            overlay.destroy();
            popup.destroy();
            text.destroy();
            acceptBtn.destroy();
            declineBtn.destroy();

            // Destroy station background
            if (this.stationBg) {
                this.stationBg.destroy();
                this.stationBg = null;
            }

            // Resume systems
            this.physics.resume();
            this.time.paused = false;

            // Reset camera bounds to train world
            const trainWidth = 3840;
            this.cameras.main.setBounds(0, 0, trainWidth, this.scale.height);
            this.cameras.main.scrollX = trainWidth - this.scale.width;

            // Recreate scrolling background
            this.background = this.add
                .tileSprite(0, 0, this.scale.width, this.scale.height, 'background')
                .setOrigin(0)
                .setScrollFactor(0)
                .setDepth(-10);

            this.bgSpeed = 15;
            this.stationActive = false;
        };

        acceptBtn.on('pointerdown', () => {

            if (availableSpace > 0) {
                for (let i = 0; i < finalOffer; i++) {
                    this.survivorData.push(Phaser.Math.Between(1, 4));
                }

                this.survivors = this.survivorData.length;
                this.survivorsText.setText(`${this.survivors}/${this.maxSurvivors}`);

                this.createSurvivors();

            }

            closePopup();
        });

        declineBtn.on('pointerdown', () => {
            closePopup();
        });




    }
    showStationCinematicText() {

        const { width, height } = this.scale;

        this.stationCineOverlay = this.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0x000000,
            0.35
        )
            .setScrollFactor(0)
            .setDepth(9000);

        this.stationCineText = this.add.text(
            width / 2,
            height / 2,
            "Stopping at a train station...",
            {
                fontSize: '36px',
                color: '#ffffff',
                fontStyle: 'bold'
            }
        )
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(9001);

        // Optional subtle fade animation
        this.tweens.add({
            targets: this.stationCineText,
            alpha: { from: 0, to: 1 },
            duration: 800,
            ease: 'Power2'
        });
    }
    hideStationCinematicText() {

        if (this.stationCineOverlay)
            this.stationCineOverlay.destroy();

        if (this.stationCineText)
            this.stationCineText.destroy();
    }
    saveUpgrades() {
        localStorage.setItem('zombieUpgrades', JSON.stringify({
            boneMultiplier: this.boneMultiplier,
            reinforceMultiplier: this.reinforceMultiplier
        }));
    }
    
    saveWagons() {
        localStorage.setItem('zombieWagons', JSON.stringify({
            habitacionalPurchased: this.habitacionalPurchased,
            cozinhaPurchased: this.cozinhaPurchased
        }));
    }
updateUpgradeDisplay() {

    this.boneUpgradeText.setText(
        `x${this.boneMultiplier.toFixed(2)}`
    );

    this.reinforceUpgradeText.setText(
        `x${this.reinforceMultiplier.toFixed(2)}`
    );
}


    update() {

        if (this.gameOver) return;

        if (!this.stationActive && this.background) {
            this.background.tilePositionX += this.bgSpeed;
        }

        // =============================
        // BOUNCE EFFECT - TREM
        // =============================
        if (!this.stationActive && this.ship) {
            // Incrementa o tempo de bounce
            this.bounceTime += this.bounceSpeed * 0.01;
            
            // Calcula offset vertical usando seno para movimento suave
            const bounceOffset = Math.sin(this.bounceTime) * this.bounceAmount;
            
            // Aplica o bounce à posição Y do trem
            this.ship.y = this.shipBaseY + bounceOffset;
        }

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
        const cam = this.cameras.main;
        const maxScroll = cam.getBounds().width - this.scale.width;

        // If camera is fully right
        if (cam.scrollX >= maxScroll - 5) {
            this.upgradeDisplay.setVisible(true);
        } else {
            this.upgradeDisplay.setVisible(false);
        }

    }

}
