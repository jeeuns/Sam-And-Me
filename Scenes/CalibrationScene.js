class CalibrationScene extends Phaser.Scene {
    constructor() {
        super("calibrationScene");
    }

    init() {
        console.log('=== CALIBRATION SCENE INIT ===');
        this.dominantHand = null;
        this.calibrationComplete = false;
        this.readyButtonHoldTime = 0;
        this.requiredHoldTime = 2.0; // seconds
    }

    create() {
        console.log('=== CALIBRATION SCENE CREATE ===');
        
        // Background
        this.cameras.main.setBackgroundColor('#2c3e50');
        
        // Title
        this.add.text(this.cameras.main.centerX, 50, 'HAND CALIBRATION', {
            fontSize: '48px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Instructions
        const instructions = [
            'Show both hands to the camera',
            'Use your INDEX FINGER as cursor to select dominant hand (hold 2 seconds)',
            'Then hold your cursor on READY for 2 seconds to start'
        ];
        
        let yPos = 120;
        instructions.forEach(text => {
            this.add.text(this.cameras.main.centerX, yPos, text, {
                fontSize: '24px',
                fill: '#ecf0f1'
            }).setOrigin(0.5);
            yPos += 35;
        });
        
        // Hand selection buttons
        this.createHandButtons();
        
        // Ready button
        this.createReadyButton();
        
        // Status text
        this.statusText = this.add.text(this.cameras.main.centerX, 500, '', {
            fontSize: '20px',
            fill: '#e74c3c'
        }).setOrigin(0.5);
        
        // Camera feed indicator
        this.add.text(this.cameras.main.centerX, 550, 'Camera feed appears below ↓', {
            fontSize: '18px',
            fill: '#95a5a6'
        }).setOrigin(0.5);
        
        // Initialize hand tracking
        this.initHandTracking();
        
        // Cursor visualization
        this.cursor = this.add.circle(0, 0, 10, 0x00ff00, 0.7);
        this.cursor.setDepth(1000);
        this.cursor.setVisible(false);
        
        // Hold progress circle
        this.holdProgress = this.add.graphics();
        this.holdProgress.setDepth(999);
    }

    createHandButtons() {
        const buttonY = 280;
        const buttonWidth = 200;
        const buttonHeight = 60;
        
        // Left hand button (no pointer interactions - use cursor only)
        this.leftHandButton = this.add.rectangle(
            this.cameras.main.centerX - 150,
            buttonY,
            buttonWidth,
            buttonHeight,
            0x3498db
        );
        
        this.leftHandText = this.add.text(
            this.cameras.main.centerX - 150,
            buttonY,
            'LEFT HAND',
            { fontSize: '24px', fill: '#ffffff', fontStyle: 'bold' }
        ).setOrigin(0.5);
        
        // Right hand button (no pointer interactions - use cursor only)
        this.rightHandButton = this.add.rectangle(
            this.cameras.main.centerX + 150,
            buttonY,
            buttonWidth,
            buttonHeight,
            0x3498db
        );
        
        this.rightHandText = this.add.text(
            this.cameras.main.centerX + 150,
            buttonY,
            'RIGHT HAND',
            { fontSize: '24px', fill: '#ffffff', fontStyle: 'bold' }
        ).setOrigin(0.5);
        
        // Track hold times for each button
        this.leftHandHoldTime = 0;
        this.rightHandHoldTime = 0;
        this.handSelectionHoldRequired = 2.0; // 2 seconds to select
    }

    createReadyButton() {
        const buttonY = 380;
        const buttonWidth = 300;
        const buttonHeight = 80;
        
        this.readyButton = this.add.rectangle(
            this.cameras.main.centerX,
            buttonY,
            buttonWidth,
            buttonHeight,
            0x95a5a6
        );
        
        this.readyText = this.add.text(
            this.cameras.main.centerX,
            buttonY,
            'READY',
            { fontSize: '36px', fill: '#ffffff', fontStyle: 'bold' }
        ).setOrigin(0.5);
        
        this.readyButton.setAlpha(0.5);
    }

    selectHand(hand) {
        this.dominantHand = hand;
        
        // Update button colors
        if (hand === 'left') {
            this.leftHandButton.setFillStyle(0x27ae60);
            this.rightHandButton.setFillStyle(0x3498db);
        } else {
            this.leftHandButton.setFillStyle(0x3498db);
            this.rightHandButton.setFillStyle(0x27ae60);
        }
        
        // Enable ready button
        this.readyButton.setFillStyle(0x27ae60);
        this.readyButton.setAlpha(1.0);
        
        // Update hand tracker
        if (window.handTracker) {
            window.handTracker.setDominantHand(hand);
            window.handTracker.resetCursorHold()
        }
        
        this.statusText.setText(`${hand.toUpperCase()} hand selected. Hold your index finger on READY for 2 seconds.`);
        this.statusText.setColor('#27ae60');

        this.readyButtonHoldTime = 0;
        this.holdProgress.clear();

    }

    async initHandTracking() {
        window.handTracker = new HandTracking();
        
        window.handTracker.onCursorMove = (position) => {
            if (!this.cursor || !this.cameras.main) return; // SAFETY CHECK
            
            this.cursor.setVisible(true);
            this.cursor.setPosition(
                (1-position.x) * this.cameras.main.width,
                position.y * this.cameras.main.height
            );
            
            // Update cursor color based on which hand is controlling it
            if (window.handTracker.lastCursorHand === 'left') {
                this.cursor.setFillStyle(0xffff00); // Yellow for left
            } else if (window.handTracker.lastCursorHand === 'right') {
                this.cursor.setFillStyle(0x00ff00); // Green for right
            }
        };
        
        window.handTracker.onCursorHold = (position, duration) => {
            const cursorX = (1-position.x)* this.cameras.main.width;
            const cursorY = position.y * this.cameras.main.height;
            
            // Check hand selection buttons FIRST (allow switching anytime, until start)
            const leftBounds = this.leftHandButton.getBounds();
            const rightBounds = this.rightHandButton.getBounds();

            const isOverLeft = Phaser.Geom.Rectangle.Contains(leftBounds, cursorX, cursorY);
            const isOverRight = Phaser.Geom.Rectangle.Contains(rightBounds, cursorX, cursorY);

            if (isOverLeft) {
            this.leftHandHoldTime = duration;
            this.rightHandHoldTime = 0;

            // progress ring
            this.holdProgress.clear();
            this.holdProgress.lineStyle(6, 0x3498db);
            this.holdProgress.strokeCircle(this.leftHandButton.x, this.leftHandButton.y, 60);

            this.holdProgress.lineStyle(6, 0xffffff);
            this.holdProgress.beginPath();
            const progress = Math.min(duration / this.handSelectionHoldRequired, 1.0);
            this.holdProgress.arc(
                this.leftHandButton.x,
                this.leftHandButton.y,
                60,
                Phaser.Math.DegToRad(-90),
                Phaser.Math.DegToRad(-90 + 360 * progress)
            );
            this.holdProgress.strokePath();

            if (duration >= this.handSelectionHoldRequired && this.dominantHand !== 'left') {
                this.selectHand('left');

                // IMPORTANT: reset hold so READY doesn't instantly trigger
                this.readyButtonHoldTime = 0;
                this.calibrationComplete = false;
                if (window.handTracker?.resetCursorHold) window.handTracker.resetCursorHold();
                this.holdProgress.clear();
            }

            return; // don't also treat this as READY hold
            }

            if (isOverRight) {
            this.rightHandHoldTime = duration;
            this.leftHandHoldTime = 0;

            // progress ring
            this.holdProgress.clear();
            this.holdProgress.lineStyle(6, 0x3498db);
            this.holdProgress.strokeCircle(this.rightHandButton.x, this.rightHandButton.y, 60);

            this.holdProgress.lineStyle(6, 0xffffff);
            this.holdProgress.beginPath();
            const progress = Math.min(duration / this.handSelectionHoldRequired, 1.0);
            this.holdProgress.arc(
                this.rightHandButton.x,
                this.rightHandButton.y,
                60,
                Phaser.Math.DegToRad(-90),
                Phaser.Math.DegToRad(-90 + 360 * progress)
            );
            this.holdProgress.strokePath();

            if (duration >= this.handSelectionHoldRequired && this.dominantHand !== 'right') {
                this.selectHand('right');

                // IMPORTANT: reset hold so READY doesn't instantly trigger
                this.readyButtonHoldTime = 0;
                this.calibrationComplete = false;
                if (window.handTracker?.resetCursorHold) window.handTracker.resetCursorHold();
                this.holdProgress.clear();
            }

            return; // don't also treat this as READY hold
            }

            // If not hovering either hand button, clear their progress
            this.leftHandHoldTime = 0;
            this.rightHandHoldTime = 0;

            // Only allow READY after a hand is selected
            if (!this.dominantHand) {
            this.holdProgress.clear();
            return;
            }

            
            // Check ready button (only after hand is selected)
            const bounds = this.readyButton.getBounds();
            const isOverButton = Phaser.Geom.Rectangle.Contains(bounds, cursorX, cursorY);
            
            if (isOverButton) {
                this.readyButtonHoldTime = duration;
                
                // Draw hold progress
                this.holdProgress.clear();
                this.holdProgress.lineStyle(6, 0x27ae60);
                const progress = Math.min(duration / this.requiredHoldTime, 1.0);
                this.holdProgress.strokeCircle(
                    this.readyButton.x,
                    this.readyButton.y,
                    60
                );
                this.holdProgress.lineStyle(6, 0xffffff);
                this.holdProgress.beginPath();
                this.holdProgress.arc(
                    this.readyButton.x,
                    this.readyButton.y,
                    60,
                    Phaser.Math.DegToRad(-90),
                    Phaser.Math.DegToRad(-90 + 360 * progress)
                );
                this.holdProgress.strokePath();
                
                // Check if held long enough
                if (duration >= this.requiredHoldTime && !this.calibrationComplete) {
                    this.calibrationComplete = true;
                    this.startGame();
                }
            } else {
                this.readyButtonHoldTime = 0;
                if (this.dominantHand) {
                    this.holdProgress.clear();
                }
            }
        };
        
        try {
            await window.handTracker.init();
            console.log('Hand tracking initialized in calibration');
        } catch (err) {
            console.error('Hand tracking failed:', err);
            this.statusText.setText('Hand tracking failed. Using keyboard controls.');
            this.statusText.setColor('#e74c3c');
        }
    }

    startGame() {
        console.log('Starting game with dominant hand:', this.dominantHand);
        this.statusText.setText('Starting game...');
        this.statusText.setColor('#27ae60');
        
        // Transition to Room 1
        this.time.delayedCall(500, () => {
            this.scene.start('room1');
        });
    }

    update() {
        // Update handled by hand tracking callbacks
    }
}