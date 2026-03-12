class EndScreen extends Phaser.Scene {
  constructor() {
    super("endScreen");
  }

  preload() {
    // Safe to preload again (Phaser will cache). Also covers cases where EndScreen is opened directly.
    this.load.image('startBg', 'assets/bg.png');
    this.load.audio('startSound', 'assets/audio/start.mp3');
  }

  create() {
    console.log('=== END SCREEN CREATE ===');
    
    hideHandTrackingUI(); // HIDE UI

    const W = this.scale.width;
    const H = this.scale.height;

    // Hide hand tracking camera canvas on end screen (same as StartScreen)
    const camCanvas = document.getElementById('camera-canvas');
    if (camCanvas) {
      camCanvas.style.zIndex = '-1';
      camCanvas.style.pointerEvents = 'none';
    }

    // Full-screen background image — fit whole image within screen (no cropping)
    const bg = this.add.image(W / 2, H / 2, 'startBg');
    const scaleX = W / bg.width;
    const scaleY = H / bg.height;
    bg.setScale(Math.min(scaleX, scaleY));

    // Big title (optional, keep it minimal like start screen)
    const title = this.add.text(W / 2, 110, 'YOU DID IT!', {
      fontSize: '64px',
      fill: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);

    // Subtitle / message
    this.add.text(W / 2, 190, 'All rooms packed. Box sealed. Time to go!', {
      fontSize: '24px',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      padding: { x: 14, y: 8 }
    }).setOrigin(0.5);

    // Prompt — pulsing at the bottom (same vibe as StartScreen)
    const prompt = this.add.text(W / 2, H - 60, 'PRESS ANY KEY TO PLAY AGAIN', {
      fontSize: '28px',
      fill: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      alpha: 0,
      duration: 900,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });

    // Input: click or any key to restart
    this.input.on('pointerdown', () => this.restartGame());
    this.input.keyboard.on('keydown', () => this.restartGame());

    this.transitioning = false;
  }

  restartGame() {
    if (this.transitioning) return;
    this.transitioning = true;

    // Restore camera canvas z-index for gameplay (same as StartScreen)
    const camCanvas = document.getElementById('camera-canvas');
    if (camCanvas) {
      camCanvas.style.zIndex = '';
      camCanvas.style.pointerEvents = '';
    }

    // Optional: play the same start sound, then go to startScreen
    const sound = this.sound.add('startSound');
    sound.play();

    sound.once('complete', () => {
      this.scene.start('startScreen');
    });

    // Fallback (mirrors your StartScreen pattern)
    this.time.delayedCall(0, () => {
      if (this.transitioning) {
        this.scene.start('startScreen');
      }
    });
  }
}