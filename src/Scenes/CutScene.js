class CutScene extends Phaser.Scene {
    constructor(key) {
        super(key || "cutScene");
        this.sceneKey = key || "cutScene";
    }

    preload() {
        // Preload cutscene images (safe to call multiple times — Phaser caches)
        this.load.setPath('./assets/');
        this.load.image('cutscene1', 'cutscene1.png');
        this.load.image('cutscene2', 'cutscene2.jpg');
        this.load.image('endscene',  'endscene.jpg');
    }

    init(data) {
        this.nextScene = data.nextScene || 'room2';
        this.sceneNumber = data.sceneNumber || 1;
        this.imageKey = data.imageKey || 'placeholder';
        this.text = data.text || 'Moving to the next room...';
    }

    create() {
        // Black background
        this.cameras.main.setBackgroundColor('#000000');
        
        // Cutscene image — scaled to fit within a 500x320 box, centred above text
        const imgX = this.cameras.main.centerX;
        const imgY = this.cameras.main.centerY - 110;
        const maxW = 600;
        const maxH = 400;

        if (this.textures.exists(this.imageKey)) {
            const img = this.add.image(imgX, imgY, this.imageKey).setOrigin(0.5);
            const scaleX = maxW / img.width;
            const scaleY = maxH / img.height;
            img.setScale(Math.min(scaleX, scaleY));
        } else {
            // Fallback grey box if image not loaded
            this.add.rectangle(imgX, imgY, maxW, maxH, 0x333333).setOrigin(0.5);
        }
        
        // Text below image
        this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY + 200,
            this.text,
            {
                fontSize: '28px',
                fill: '#ffffff',
                align: 'center',
                wordWrap: { width: 600 }
            }
        ).setOrigin(0.5);
        
        // Continue prompt
        const continueText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.height - 50,
            'Click or press SPACE to continue',
            { fontSize: '20px', fill: '#888888' }
        ).setOrigin(0.5);
        
        // Fade in effect
        continueText.setAlpha(0);
        this.tweens.add({
            targets: continueText,
            alpha: 1,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });
        
        this.transitioning = false;

        // Input handlers
        this.input.keyboard.once('keydown-SPACE', () => this.nextRoom());
        this.input.once('pointerdown', () => this.nextRoom());
        
        // Auto-advance after 8 seconds (extra time for sound)
        this.time.delayedCall(8000, () => this.nextRoom());
    }

    nextRoom() {
        if (this.transitioning) return;
        this.transitioning = true;

        // Play transition sound then move to next scene
        if (this.sound.get('sfx_nextscene') || this.cache.audio.exists('sfx_nextscene')) {
            const snd = this.sound.add('sfx_nextscene');
            snd.play();
            snd.once('complete', () => this.scene.start(this.nextScene));
            // Fallback in case complete never fires
            this.time.delayedCall(3000, () => {
                if (this.transitioning) this.scene.start(this.nextScene);
            });
        } else {
            this.scene.start(this.nextScene);
        }
    }
}

// Create specific cutscene classes
class CutScene1 extends CutScene {
    constructor() {
        super("cutScene1");
    }
    
    init() {
        super.init({
            nextScene: 'room2',
            sceneNumber: 1,
            imageKey: 'cutscene1',
            text: 'You finished packing the guest room, it\'s now time to pack your Mother\'s room. \nLet\'s move her room and pack the rest of her items.'
        });
    }
}

class CutScene2 extends CutScene {
    constructor() {
        super("cutScene2");
    }
    
    init() {
        super.init({
            nextScene: 'room3',
            sceneNumber: 2,
            imageKey: 'cutscene2',
            text: 'I guess she did most of the packing herself...\nOnly my room left to pack!'
        });
    }
}

class CutScene3 extends CutScene {
    constructor() {
        super("cutScene3");
    }
    
    init() {
        super.init({
            nextScene: 'endScreen',
            sceneNumber: 3,
            imageKey: 'endscene',
            text: 'It\'s time to let the movers in.\nAs you watch the boxes move. It\'s time to leave your home.'
        });
    }
}
