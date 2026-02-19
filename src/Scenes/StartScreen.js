class StartScreen extends Phaser.Scene {
    constructor() {
        super("startScreen");
    }

    create() {
        console.log('START SCREEN CREATE');
        
        // Background
        this.cameras.main.setBackgroundColor('#1a1a2e');
        
        // Title
        this.add.text(this.cameras.main.centerX, 200, 'SAM AND ME', {
            fontSize: '72px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#0f4c75',
            strokeThickness: 6
        }).setOrigin(0.5);
        
        // Subtitle
        this.add.text(this.cameras.main.centerX, 280, 'A labor focused unpacking game', {
            fontSize: '28px',
            fill: '#bbe1fa',
            fontStyle: 'italic'
        }).setOrigin(0.5);
        
        // Instructions
        const instructions = [
            'Use your hands to control the character',
            'Pack up items and move through rooms',
            'Complete each room by packing and unpacking items'
        ];
        
        let yPos = 380;
        instructions.forEach(text => {
            this.add.text(this.cameras.main.centerX, yPos, text, {
                fontSize: '20px',
                fill: '#e8e8e8'
            }).setOrigin(0.5);
            yPos += 35;
        });
        
        // Start button
        const startButton = this.add.rectangle(
            this.cameras.main.centerX,
            550,
            300,
            80,
            0x0f4c75
        ).setInteractive();
        
        const startText = this.add.text(
            this.cameras.main.centerX,
            550,
            'START GAME',
            { fontSize: '36px', fill: '#ffffff', fontStyle: 'bold' }
        ).setOrigin(0.5);
        
        // Button hover effects
        startButton.on('pointerover', () => {
            startButton.setFillStyle(0x3282b8);
            this.game.canvas.style.cursor = 'pointer';
        });
        
        startButton.on('pointerout', () => {
            startButton.setFillStyle(0x0f4c75);
            this.game.canvas.style.cursor = 'default';
        });
        
        startButton.on('pointerdown', () => {
            this.scene.start('calibrationScene');
        });
        
        // Credits
        this.add.text(this.cameras.main.centerX, this.cameras.main.height - 30, 
            'Use hand tracking or keyboard controls', {
            fontSize: '16px',
            fill: '#95a5a6'
        }).setOrigin(0.5);
    }
}
