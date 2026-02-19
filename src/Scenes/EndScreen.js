class EndScreen extends Phaser.Scene {
    constructor() {
        super("endScreen");
    }

    create() {
        console.log('=== END SCREEN CREATE ===');
        
        // Background
        this.cameras.main.setBackgroundColor('#1a1a2e');
        
        // Congratulations title
        this.add.text(this.cameras.main.centerX, 150, 'CONGRATULATIONS!', {
            fontSize: '64px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#27ae60',
            strokeThickness: 6
        }).setOrigin(0.5);
        
        // Success message
        this.add.text(this.cameras.main.centerX, 250, 'You successfully packed all the rooms!', {
            fontSize: '28px',
            fill: '#ecf0f1'
        }).setOrigin(0.5);
        
        // Image placeholder
        const imgPlaceholder = this.add.rectangle(
            this.cameras.main.centerX,
            400,
            400,
            300,
            0x27ae60
        );
        
        this.add.text(
            this.cameras.main.centerX,
            400,
            '[Victory Image\nPlaceholder]',
            { fontSize: '32px', fill: '#ffffff', align: 'center' }
        ).setOrigin(0.5);
        
        // Play again button
        const playAgainButton = this.add.rectangle(
            this.cameras.main.centerX,
            650,
            300,
            80,
            0x27ae60
        ).setInteractive();
        
        const playAgainText = this.add.text(
            this.cameras.main.centerX,
            650,
            'PLAY AGAIN',
            { fontSize: '36px', fill: '#ffffff', fontStyle: 'bold' }
        ).setOrigin(0.5);
        
        // Button hover effects
        playAgainButton.on('pointerover', () => {
            playAgainButton.setFillStyle(0x2ecc71);
            this.game.canvas.style.cursor = 'pointer';
        });
        
        playAgainButton.on('pointerout', () => {
            playAgainButton.setFillStyle(0x27ae60);
            this.game.canvas.style.cursor = 'default';
        });
        
        playAgainButton.on('pointerdown', () => {
            // Restart game from beginning
            this.scene.start('startScreen');
        });
        
        // Stats
        this.add.text(this.cameras.main.centerX, 750, 'Thank you for playing!', {
            fontSize: '20px',
            fill: '#95a5a6'
        }).setOrigin(0.5);
    }
}
