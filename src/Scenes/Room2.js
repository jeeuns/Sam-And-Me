class Room2 extends Phaser.Scene {
    constructor() {
        super("room2");
    }

    init() {
        console.log('=== ROOM2 INIT ===');
        this.playerSpeed = 150;
        
        // Copy all init logic from Room1
        this.handMovement = { x: 0, y: 0, magnitude: 0 };
        this.bothHandsGrabbing = false;
        this.nonDominantGrabbing = false;
        this.dominantHandOpen = false;
        this.useHandTracking = true;
        
        this.heldItem = null;
        this.heldItemSprite = null;
        this.nearbyInteractable = null;
        this.interactionHoldTime = 0;
        this.requiredHoldTime = 3.0;
        
        this.interactables = [];
        this.openBoxes = [];
        this.roomComplete = false;
    }

    create() {
        console.log('=== ROOM2 CREATE ===');
        
        // Reuse Room1 create logic but simplified
        this.cameras.main.setBackgroundColor('#8b7355');
        
        // For now, create a simple room
        this.createSimpleRoom();
        
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
        this.statusText = this.add.text(20, 20, 'ROOM 2\nPack items and proceed to the door', {
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
            0x00ff00,
            0.3
        );
        
        this.setupHandTracking();
    }

    createSimpleRoom() {
        // Create simple room boundaries
        this.physics.world.setBounds(100, 100, 1240, 790);
        
        // Create some walls
        const walls = this.physics.add.staticGroup();
        
        // Top wall
        walls.create(this.cameras.main.centerX, 100, null).setSize(1240, 20).setVisible(false);
        // Bottom wall
        walls.create(this.cameras.main.centerX, 890, null).setSize(1240, 20).setVisible(false);
        // Left wall
        walls.create(100, this.cameras.main.centerY, null).setSize(20, 790).setVisible(false);
        // Right wall (with door gap)
        walls.create(1340, 200, null).setSize(20, 200).setVisible(false);
        walls.create(1340, 700, null).setSize(20, 200).setVisible(false);
        
        this.wallsGroup = walls;
    }

    setupHandTracking() {
        if (!window.handTracker || !window.handTracker.initialized) {
            this.useHandTracking = false;
            return;
        }
        
        window.handTracker.onHandUpdate = (movement) => {
            this.handMovement = movement;
        };
        
        window.handTracker.onGestureChange = (gestures) => {
            this.bothHandsGrabbing = gestures.bothHands;
            this.nonDominantGrabbing = gestures.nonDominant;
            this.dominantHandOpen = gestures.dominantOpen;
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
            this.scene.start('cutScene2');
        }
    }
}
