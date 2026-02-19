class Room3 extends Phaser.Scene {
    constructor() {
        super("room3");
    }

    init() {
        console.log('=== ROOM3 INIT ===');
        this.playerSpeed = 150;
        this.handMovement = { x: 0, y: 0, magnitude: 0 };
        this.useHandTracking = true;
    }

    create() {
        console.log('=== ROOM3 CREATE ===');
        
        this.cameras.main.setBackgroundColor('#5d4e37');
        
        // Create simple room
        this.physics.world.setBounds(100, 100, 1240, 790);
        
        // Create player
        this.player = this.physics.add.sprite(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            'player'
        );
        this.player.setDepth(100);
        this.player.setCollideWorldBounds(true);
        
        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys({
            w: Phaser.Input.Keyboard.KeyCodes.W,
            a: Phaser.Input.Keyboard.KeyCodes.A,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            d: Phaser.Input.Keyboard.KeyCodes.D
        });
        
        // UI
        this.statusText = this.add.text(20, 20, 'ROOM 3 - FINAL ROOM\nHead to the door to finish!', {
            fontSize: '20px',
            fill: '#ffffff',
            backgroundColor: '#000000aa',
            padding: { x: 15, y: 10 }
        }).setScrollFactor(0).setDepth(1000);
        
        // Door indicator
        this.doorZone = this.add.rectangle(
            this.cameras.main.width - 50,
            this.cameras.main.centerY,
            50,
            100,
            0xffff00,
            0.3
        );
        
        this.setupHandTracking();
    }

    setupHandTracking() {
        if (!window.handTracker || !window.handTracker.initialized) {
            this.useHandTracking = false;
            return;
        }
        
        window.handTracker.onHandUpdate = (movement) => {
            this.handMovement = movement;
        };
    }

    update() {
        if (!this.player) return;
        
        // Movement
        this.player.setVelocity(0);
        
        if (this.useHandTracking && window.handTracker?.initialized) {
            const m = this.handMovement;
            this.player.setVelocity(
                m.x * this.playerSpeed * m.magnitude,
                m.y * this.playerSpeed * m.magnitude
            );
        } else {
            let moveX = 0;
            let moveY = 0;
            
            if (this.cursors.left.isDown || this.keys.a.isDown) moveX = -1;
            if (this.cursors.right.isDown || this.keys.d.isDown) moveX = 1;
            if (this.cursors.up.isDown || this.keys.w.isDown) moveY = -1;
            if (this.cursors.down.isDown || this.keys.s.isDown) moveY = 1;
            
            if (moveX !== 0 || moveY !== 0) {
                const angle = Math.atan2(moveY, moveX);
                this.player.setVelocity(
                    Math.cos(angle) * this.playerSpeed,
                    Math.sin(angle) * this.playerSpeed
                );
            }
        }
        
        // Check door transition
        if (this.player.x > 1300) {
            this.scene.start('cutScene3');
        }
    }
}
