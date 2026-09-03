import Phaser from 'phaser';
import { BootScene } from './phaser/scenes/BootScene';
import { MenuScene } from './phaser/scenes/MenuScene';
import { GameScene } from './phaser/scenes/GameScene';
import { UIScene } from './phaser/scenes/UIScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0a0e2a',
  width: window.innerWidth,
  height: window.innerHeight,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  input: {
    activePointers: 1,
  },
  scene: [BootScene, MenuScene, GameScene, UIScene],
};

new Phaser.Game(config);
