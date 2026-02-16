import { Start } from './scenes/Start.js';

const config = {
    type: Phaser.AUTO,
    title: 'Overlord Rising',
    parent: 'game-container',
    width: 1920,
    height: 1080,
    backgroundColor: '#000000',
    pixelArt: true, // Ativei para manter o estilo que você pediu
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: true
        }
    },
    parent: 'game-container',
    dom: {
        createContainer: true
    },
    scene: [Start],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

// Certifique-se de que esta linha esteja FORA de qualquer bloco de chaves do config
new Phaser.Game(config);