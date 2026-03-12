class CalibrationScene extends Phaser.Scene {
    constructor() {
        super("calibrationScene");
    }

    init() {
        console.log('=== CALIBRATION SCENE INIT ===');
        this.dominantHand = null;
        this.calibrationComplete = false;
        this.readyButtonHoldTime = 0;
        this.requiredHoldTime = 2.0;
        this.bg1X = 0;
        this.bg2X = 0; // set after create()
        // For rightOpen circular motion demo
        this._circleAngle = 0;
        this._circleRadius = 28;
    }

    create() {
        console.log('=== CALIBRATION SCENE CREATE ===');

        showHandTrackingUI();

        const W = this.scale.width;
        const H = this.scale.height;
        const cx = W / 2;

        // ── PARALLAX BACKGROUND ──────────────────────────────────────────────
        this.bg1 = this.add.image(0, 0, 'polkabg').setOrigin(0, 0).setDepth(0).setAlpha(0.35);
        const bgScale = H / this.bg1.height;
        this.bg1.setScale(bgScale);
        // bg2 starts immediately after bg1 — use displayWidth which is post-scale
        this.bg2 = this.add.image(this.bg1.displayWidth, 0, 'polkabg')
            .setOrigin(0, 0).setDepth(0).setAlpha(0.35).setScale(bgScale);
        // Store independent x positions so each tile wraps on its own
        this.bg1X = 0;
        this.bg2X = this.bg1.displayWidth;

        // ── TITLE ────────────────────────────────────────────────────────────
        this.add.text(cx, 38, 'HAND CALIBRATION', {
            fontSize: '42px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5).setDepth(10);

        // ── VERTICAL DIVIDER ─────────────────────────────────────────────────
        const divider = this.add.graphics().setDepth(9);
        divider.lineStyle(1, 0x555555, 0.6);
        divider.lineBetween(cx, 80, cx, H - 10);

        // ── LEFT HALF — INSTRUCTIONS ──────────────────────────────────────────
        const leftCx = cx / 2;
        let y = 105;

        // ── SECTION 1: HOW TO SELECT ──────────────────────────────────────────
        this.add.text(leftCx, y - 20, 'How to Select', {
            fontSize: '32px', fill: '#ffe066', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(10);
        y += 60;

        // rightPoint and leftPoint images side by side with "or" between
        const imgScale = 2.5;
        const imgSpacing = 80;
        this.add.image(leftCx - imgSpacing, y + 20, 'rightPoint')
            .setScale(2.5).setDepth(10).setOrigin(0.5);
        this.add.text(leftCx, y + 20, 'or', {
            fontSize: '24px', fill: '#ffffff',
            stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(10);
        this.add.image(leftCx + imgSpacing, y + 20, 'leftPoint')
            .setScale(2.5).setDepth(10).setOrigin(0.5);
        y += 100;

        // Numbered list — how to select
        const selectSteps = [
            '1. Raise hand to camera',
            '2. Point index finger at a button',
            '3. Hold still for 2 seconds'
        ];
        selectSteps.forEach(step => {
            this.add.text(leftCx, y + 10, step, {
                fontSize: '24px', fill: '#ffffff', align: 'center-left',
                stroke: '#000000', strokeThickness: 5,
                wordWrap: { width: cx - 32 }
            }).setOrigin(0.5).setDepth(10);
            y += 24;
        });
        y += 14;

        // ── SECTION 2: GAME INSTRUCTIONS ─────────────────────────────────────
        this.add.text(leftCx, y + 10, 'Game Controls', {
            fontSize: '32px', fill: '#ffe066', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(10);
        y += 36;

        // ── ROW A: Player movement — rightOpen orbiting a fixed centre ────────
        const moveRowY = y + 60;
        const moveCentreX = leftCx - 60;

        // Orbit path hint (faint circle)
        const orbitGraphic = this.add.graphics().setDepth(9);
        orbitGraphic.lineStyle(1, 0x888888, 0.4);
        orbitGraphic.strokeCircle(moveCentreX, moveRowY, this._circleRadius);

        // The moving sprite — store ref + orbit centre so update() can reposition it
        this._moveCentreX = moveCentreX;
        this._moveCentreY = moveRowY;
        this.moveSprite = this.add.image(
            moveCentreX + this._circleRadius, moveRowY, 'rightOpen'
        ).setScale(2.5).setDepth(10).setOrigin(0.5);

        this.add.text(moveCentreX + this._circleRadius * 2 + 80, moveRowY,
            'Player\nMovement', {
                fontSize: '24px', fill: '#ffffffff', align: 'left',
                stroke: '#000000', strokeThickness: 5,
                lineSpacing: 3
            }
        ).setOrigin(0, 0.5).setDepth(10);

        y += 86;

        // ── ROW B: Pickup & Drop — leftGrab animation ─────────────────────────
        const grabRowY = y + 120;
        this.grabSprite = this.add.sprite(leftCx - 60, grabRowY, 'leftGrab1')
            .setScale(2.5).setDepth(10).setOrigin(0.5);
        this.grabSprite.play('leftGrab');

        this.add.text(leftCx - 60 + this._circleRadius * 2 + 80, grabRowY,
            'Pickup &\nDrop Item', {
                fontSize: '24px', fill: '#ffffffff', align: 'left',
                stroke: '#000000', strokeThickness: 5,
                lineSpacing: 3
            }
        ).setOrigin(0, 0.5).setDepth(10);

        // ── RIGHT HALF — CALIBRATION BUTTONS ─────────────────────────────────
        const rightCx = cx + (W - cx) / 2;

        this.add.text(rightCx, 150, 'Select your\ndominant hand', {
            fontSize: '32px', fill: '#ecf0f1', align: 'center',
            stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(10);

        this.createHandButtons();
        this.createReadyButton();

        this.statusText = this.add.text(rightCx, 460, '', {
            fontSize: '18px', fill: '#e74c3c', align: 'center',
            wordWrap: { width: W - cx - 40 }
        }).setOrigin(0.5).setDepth(10);

        this.add.text(rightCx, 520, 'Point finger at a button\nand hold for 2 seconds', {
            fontSize: '24px', fill: '#ffe329', align: 'center',
            stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(10);

        // ── CAMERA FLANKING SPRITES ───────────────────────────────────────────
        this._createCameraFlankers();

        // ── CURSOR ────────────────────────────────────────────────────────────
        this.cursor = this.add.image(0, 0, 'rightOpen')
            .setScale(3).setDepth(1000).setVisible(false).setOrigin(0.5);

        this.holdProgress = this.add.graphics().setDepth(999);

        // ── HAND TRACKING ─────────────────────────────────────────────────────
        this.initHandTracking();
    }

    _createCameraFlankers() {
        const camContainer = document.getElementById('camera-container');
        if (!camContainer) return;

        const makeFlank = (side, texKeys) => {
            const wrap = document.createElement('div');
            Object.assign(wrap.style, {
                position:      'absolute',
                top:           '50%',
                transform:     'translateY(-50%)',
                [side]:        '8px',
                display:       'flex',
                flexDirection: 'column',
                alignItems:    'center',
                gap:           '6px',
                zIndex:        '20',
                pointerEvents: 'none'
            });

            const canvas = document.createElement('canvas');
            canvas.width  = 64;
            canvas.height = 64;
            Object.assign(canvas.style, {
                imageRendering: 'pixelated',
                width: '64px', height: '64px'
            });

            const label = document.createElement('div');
            Object.assign(label.style, {
                color: '#ffffff', fontSize: '11px',
                fontFamily: 'Arial, sans-serif', textAlign: 'center',
                textShadow: '0 0 4px #000', maxWidth: '72px', lineHeight: '1.3'
            });
            label.textContent = side === 'left'
                ? 'non-dominant\nfist = pick up'
                : 'dominant\nopen = move';

            wrap.appendChild(canvas);
            wrap.appendChild(label);
            camContainer.style.position = 'relative';
            camContainer.appendChild(wrap);
            return { canvas, texKeys };
        };

        const flankers = [
            makeFlank('left',  ['leftGrab1',  'leftGrab2']),
            makeFlank('right', ['rightGrab1', 'rightGrab2'])
        ];

        let frame = 0;
        this._flankerInterval = setInterval(() => {
            flankers.forEach(({ canvas, texKeys }) => {
                const key = texKeys[frame % 2];
                const tex = this.textures.get(key);
                if (!tex || tex.key === '__MISSING') return;
                const src = tex.getSourceImage();
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
            });
            frame++;
        }, 350);

        this._flankerWraps = flankers.map(f => f.canvas.parentNode);
    }

    createHandButtons() {
        const W       = this.scale.width;
        const cx      = W / 2;
        const rightCx = cx + (W - cx) / 2;
        const buttonY = 265;
        const btnW    = 180;
        const btnH    = 60;
        const gap     = 110;

        this.leftHandButton = this.add.rectangle(
            rightCx - gap, buttonY, btnW, btnH, 0x3498db
        ).setDepth(10);
        this.leftHandText = this.add.text(
            rightCx - gap, buttonY, 'LEFT\nHAND',
            { fontSize: '20px', fill: '#ffffff', fontStyle: 'bold', align: 'center' }
        ).setOrigin(0.5).setDepth(11);

        this.rightHandButton = this.add.rectangle(
            rightCx + gap, buttonY, btnW, btnH, 0x3498db
        ).setDepth(10);
        this.rightHandText = this.add.text(
            rightCx + gap, buttonY, 'RIGHT\nHAND',
            { fontSize: '20px', fill: '#ffffff', fontStyle: 'bold', align: 'center' }
        ).setOrigin(0.5).setDepth(11);

        this.leftHandHoldTime  = 0;
        this.rightHandHoldTime = 0;
        this.handSelectionHoldRequired = 2.0;
    }

    createReadyButton() {
        const W       = this.scale.width;
        const cx      = W / 2;
        const rightCx = cx + (W - cx) / 2;

        this.readyButton = this.add.rectangle(
            rightCx, 370, 260, 70, 0x95a5a6
        ).setDepth(10);
        this.readyText = this.add.text(
            rightCx, 370, 'READY',
            { fontSize: '32px', fill: '#ffffff', fontStyle: 'bold' }
        ).setOrigin(0.5).setDepth(11);

        this.readyButton.setAlpha(0.5);
    }

    selectHand(hand) {
        this.dominantHand = hand;

        if (hand === 'left') {
            this.leftHandButton.setFillStyle(0x27ae60);
            this.rightHandButton.setFillStyle(0x3498db);
        } else {
            this.leftHandButton.setFillStyle(0x3498db);
            this.rightHandButton.setFillStyle(0x27ae60);
        }

        this.readyButton.setFillStyle(0x27ae60);
        this.readyButton.setAlpha(1.0);

        if (window.handTracker) {
            window.handTracker.setDominantHand(hand);
            window.handTracker.resetCursorHold();
        }

        this.statusText.setText(`${hand.toUpperCase()} hand selected.\nHold index finger on READY for 2s.`);
        this.statusText.setColor('#27ae60');

        this.readyButtonHoldTime = 0;
        this.holdProgress.clear();
    }

    async initHandTracking() {
        window.handTracker = new HandTracking();

        window.handTracker.onCursorMove = (position, isPointing) => {
            if (!this.cursor || !this.cameras.main) return;
            this.cursor.setVisible(true);
            this.cursor.setPosition(
                (1 - position.x) * this.cameras.main.width,
                position.y * this.cameras.main.height
            );
            const hand = window.handTracker.lastCursorHand;
            if (hand === 'left') {
                this.cursor.setTexture(isPointing ? 'leftPoint' : 'leftOpen');
            } else {
                this.cursor.setTexture(isPointing ? 'rightPoint' : 'rightOpen');
            }
        };

        window.handTracker.onCursorHold = (position, duration) => {
            const cursorX = (1 - position.x) * this.cameras.main.width;
            const cursorY = position.y * this.cameras.main.height;

            // While holding still the hand is pointing — keep cursor texture correct
            if (this.cursor) {
                const holdHand = window.handTracker.lastCursorHand;
                this.cursor.setTexture(holdHand === 'left' ? 'leftPoint' : 'rightPoint');
            }

            const leftBounds  = this.leftHandButton.getBounds();
            const rightBounds = this.rightHandButton.getBounds();
            const isOverLeft  = Phaser.Geom.Rectangle.Contains(leftBounds,  cursorX, cursorY);
            const isOverRight = Phaser.Geom.Rectangle.Contains(rightBounds, cursorX, cursorY);

            if (isOverLeft) {
                this.leftHandHoldTime  = duration;
                this.rightHandHoldTime = 0;
                this._drawHoldRing(this.leftHandButton, duration, this.handSelectionHoldRequired, 0x3498db);
                if (duration >= this.handSelectionHoldRequired && this.dominantHand !== 'left') {
                    this.selectHand('left');
                    if (window.handTracker?.resetCursorHold) window.handTracker.resetCursorHold();
                    this.holdProgress.clear();
                }
                return;
            }

            if (isOverRight) {
                this.rightHandHoldTime = duration;
                this.leftHandHoldTime  = 0;
                this._drawHoldRing(this.rightHandButton, duration, this.handSelectionHoldRequired, 0x3498db);
                if (duration >= this.handSelectionHoldRequired && this.dominantHand !== 'right') {
                    this.selectHand('right');
                    if (window.handTracker?.resetCursorHold) window.handTracker.resetCursorHold();
                    this.holdProgress.clear();
                }
                return;
            }

            this.leftHandHoldTime  = 0;
            this.rightHandHoldTime = 0;

            if (!this.dominantHand) {
                this.holdProgress.clear();
                return;
            }

            const bounds      = this.readyButton.getBounds();
            const isOverReady = Phaser.Geom.Rectangle.Contains(bounds, cursorX, cursorY);

            if (isOverReady) {
                this.readyButtonHoldTime = duration;
                this._drawHoldRing(this.readyButton, duration, this.requiredHoldTime, 0x27ae60);
                if (duration >= this.requiredHoldTime && !this.calibrationComplete) {
                    this.calibrationComplete = true;
                    this.startGame();
                }
            } else {
                this.readyButtonHoldTime = 0;
                this.holdProgress.clear();
            }
        };

        try {
            await window.handTracker.init();
            console.log('Hand tracking initialized in calibration');
        } catch (err) {
            console.error('Hand tracking failed:', err);
            this.statusText.setText('Hand tracking failed.\nUsing keyboard controls.');
            this.statusText.setColor('#e74c3c');
        }
    }

    _drawHoldRing(target, duration, required, color) {
        const progress = Math.min(duration / required, 1.0);
        this.holdProgress.clear();
        this.holdProgress.lineStyle(5, color, 0.4);
        this.holdProgress.strokeCircle(target.x, target.y, 52);
        this.holdProgress.lineStyle(5, 0xffffff, 1);
        this.holdProgress.beginPath();
        this.holdProgress.arc(
            target.x, target.y, 52,
            Phaser.Math.DegToRad(-90),
            Phaser.Math.DegToRad(-90 + 360 * progress)
        );
        this.holdProgress.strokePath();
    }

    startGame() {
        console.log('Starting game with dominant hand:', this.dominantHand);
        this.statusText.setText('Starting game...');
        this.statusText.setColor('#27ae60');
        this.time.delayedCall(500, () => {
            this.scene.start('room1');
        });
    }

    update(time, delta) {
        // ── Infinite parallax scroll — each tile wraps independently ───────
        const speed = 0.4;
        const tileW = this.bg1.displayWidth;

        this.bg1X -= speed;
        this.bg2X -= speed;

        // Wrap whichever tile has scrolled fully off the left edge
        if (this.bg1X + tileW <= 0) this.bg1X += tileW * 2;
        if (this.bg2X + tileW <= 0) this.bg2X += tileW * 2;

        this.bg1.x = this.bg1X;
        this.bg2.x = this.bg2X;

        // ── Circular orbit of rightOpen sprite ───────────────────────────────
        if (this.moveSprite && this._moveCentreX !== undefined) {
            this._circleAngle += delta * 0.002; // ~1 full revolution per ~3 seconds
            this.moveSprite.x = this._moveCentreX + Math.cos(this._circleAngle) * this._circleRadius;
            this.moveSprite.y = this._moveCentreY + Math.sin(this._circleAngle) * this._circleRadius;
        }
    }

    shutdown() {
        if (this._flankerInterval) clearInterval(this._flankerInterval);
        if (this._flankerWraps) {
            this._flankerWraps.forEach(el => el?.parentNode?.removeChild(el));
        }
    }
}
