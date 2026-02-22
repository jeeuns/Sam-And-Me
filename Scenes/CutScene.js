class CutScene extends Phaser.Scene {
    constructor(key) {
        super(key || "cutScene");
        this.sceneKey = key || "cutScene";
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
        
        // Image (placeholder for now)
        const img = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 100,
            400,
            300,
            0x333333
        );
        
        this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 100,
            '[Image Placeholder]',
            { fontSize: '24px', fill: '#ffffff' }
        ).setOrigin(0.5);
        
        // Text below image
        this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY + 250,
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
        
        // Input handlers
        this.input.keyboard.once('keydown-SPACE', () => this.nextRoom());
        this.input.once('pointerdown', () => this.nextRoom());
        
        // Auto-advance after 5 seconds
        this.time.delayedCall(5000, () => this.nextRoom());
    }

    nextRoom() {
        this.scene.start(this.nextScene);
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
            text: 'Great job packing up Room 1!\nNow let\'s move to Room 2 and pack more items.'
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
            text: 'Room 2 complete!\nOne more room to go. Let\'s finish strong!'
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
            text: 'All rooms packed!\nYou\'re ready for moving day!'
        });
    }
}
