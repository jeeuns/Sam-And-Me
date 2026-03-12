class StartScreen extends Phaser.Scene {
    constructor() {
        super("startScreen");
    }

    preload() {
        this.load.image('startBg', 'assets/bg.png');
        this.load.audio('startSound', 'assets/audio/start.mp3');
    }

    create() {
        console.log('START SCREEN CREATE');

        hideHandTrackingUI(); //HIDE UI
        this.input.setDefaultCursor('none');

        const W = this.scale.width;
        const H = this.scale.height;

        // Hide hand tracking camera canvas on start screen
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

        // "Press any key to continue" prompt — pulsing at the bottom
        const prompt = this.add.text(W / 2, H - 60, 'PRESS ANY KEY TO CONTINUE', {
            fontSize: '28px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 5,
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        // Pulsing tween on the prompt
        this.tweens.add({
            targets: prompt,
            alpha: 0,
            duration: 900,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        // Mouse/touch click
        this.input.on('pointerdown', () => this.startGame());

        // Any keyboard key
        this.input.keyboard.on('keydown', () => this.startGame());

        this.transitioning = false;
    }

    startGame() {
        if (this.transitioning) return;
        this.transitioning = true;

        // Restore camera canvas z-index for gameplay
        const camCanvas = document.getElementById('camera-canvas');
        if (camCanvas) {
            camCanvas.style.zIndex = '';
            camCanvas.style.pointerEvents = '';
        }

        // Play start sound, then transition when it finishes
        const sound = this.sound.add('startSound');
        sound.play();

        sound.once('complete', () => {
            this.scene.start('calibrationScene');
        });

        // Fallback in case 'complete' never fires (e.g. audio decode issue)
        this.time.delayedCall(0, () => {
            if (this.transitioning) {
                this.scene.start('calibrationScene'); //change back to 'calibrationScene' after testing
            }
        });
    }
}
