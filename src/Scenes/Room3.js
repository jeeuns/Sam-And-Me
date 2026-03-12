class Room3 extends Phaser.Scene {
    constructor() {
        super("room3");
    }

    init() {
        console.log('=== ROOM3 INIT ===');

        this.playerSpeed = 60;

        // Hand tracking state
        this.handMovement = { x: 0, y: 0, magnitude: 0 };
        this.nonDominantGrabbing = false;
        this.dominantHandOpen = false;
        this.useHandTracking = true;

        // Edge triggers (prevents spam)
        this.prevNonDominantGrabbing = false;
        this.prevDominantHandOpen = false;

        // SIMPLE INVENTORY
        this.heldItemType = null;
        this.heldItemSprite = null;

        // Interaction state
        this.boxInteractionTime = 0;
        this.nearbyInteractable = null;

        // Room goal state
        this.openBox = null;
        this.itemsStored = 0;
        this.maxItemsToStore = 8;
        this.boxSealed = false;

        this.playerDirection = 'down';
        this.isMoving = false;

        // Items in world
        this.interactables = [];

        // Tutorial / gating
        this.tutorialStep = 0;
        this.tutorialComplete = false;

        // Transition guard
        this.doorTransitioning = false;
    }

    create() {
        console.log('=== ROOM3 CREATE STARTED ===');

        showHandTrackingUI(); // SHOW UI

        // Background
        this.cameras.main.setBackgroundColor('#000000ff');

        // Create tilemap
        this.map = this.make.tilemap({ key: 'Room3' });
        console.log('Map size:', this.map.width, 'x', this.map.height, 'tiles');

        // Add tilesets
        const tilesetKeyByName = {
            "TopDownHouse_FloorsAndWalls": "roomTiles",
            "TopDownHouse_FurnitureState1": "furnitureSet1",
            "TopDownHouse_FurnitureState2": "furnitureSet2",
            "TopDownHouse_SmallItems": "deco1",
            "vectoraith_tileset_interior_essentials_MAIN_ATLAS": "deco2",
            "interactables": "interactables"
        };

        const tilesets = this.map.tilesets
            .map(ts => {
                const key = tilesetKeyByName[ts.name];
                if (!key) {
                    console.warn(`No texture mapped for tileset "${ts.name}"`);
                    return null;
                }
                return this.map.addTilesetImage(ts.name, key);
            })
            .filter(Boolean);

        // Set zoom before computing view size
        this.cameras.main.setZoom(SCALE);

        const mapW = this.map.widthInPixels;
        const mapH = this.map.heightInPixels;

        const viewW = this.cameras.main.width / this.cameras.main.zoom;
        const viewH = this.cameras.main.height / this.cameras.main.zoom;

        // Pad world if map is smaller than view
        const padX = Math.max(0, (viewW - mapW) / 2);
        const padY = Math.max(0, (viewH - mapH) / 2);

        const offsetX = padX;
        const offsetY = padY;

        const worldW = Math.max(mapW, viewW);
        const worldH = Math.max(mapH, viewH);

        this.physics.world.setBounds(0, 0, worldW, worldH);
        this.cameras.main.setBounds(0, 0, worldW, worldH);

        // Create layers
        this.layers = [];
        this.wallLayers = [];
        this.doorLayer = null;

        this.map.layers.forEach((layerData, index) => {
            const layer = this.map.createLayer(index, tilesets, offsetX, offsetY);
            if (!layer) return;

            this.layers.push(layer);

            let isWall = false;
            let isDoor = false;
            if (layerData.properties) {
                layerData.properties.forEach(prop => {
                    if (prop.name === 'wall' && prop.value === true) isWall = true;
                    if (prop.name === 'door' && prop.value === true) isDoor = true;
                });
            }

            if (isDoor) {
                this.doorLayer = layer;
                console.log(`Door layer found: "${layerData.name}"`);
            }

            if (isWall && !isDoor) {
                layer.setCollisionByExclusion([-1]);
                this.wallLayers.push(layer);
                console.log(`Collision enabled for layer "${layerData.name}"`);
            }
        });

        // Spawn player
        const spawnLayer = this.map.getObjectLayer('Spawn');

        let spawnX = offsetX + this.map.widthInPixels / 2;
        let spawnY = offsetY + this.map.heightInPixels / 2;

        if (spawnLayer && spawnLayer.objects && spawnLayer.objects.length > 0) {
            const spawnObj =
                spawnLayer.objects.find(o => o.name === 'playerSpawn') ||
                spawnLayer.objects[0];

            spawnX = offsetX + spawnObj.x;
            spawnY = offsetY + spawnObj.y;
        }

        this.player = this.physics.add.sprite(spawnX, spawnY, 'down1');
        this.player.play('idle');
        this.player.setDepth(100);
        this.player.setCollideWorldBounds(true);

        // Collisions
        this.wallLayers.forEach(layer => {
            this.physics.add.collider(this.player, layer);
        });

        // Create interactables
        this.createInteractables(offsetX, offsetY);

        // Main camera follows player
        this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
        this.cameras.main.setZoom(SCALE);

        // --- UI CAMERA (NOT zoomed) ---
        this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
        this.uiCamera.setScroll(0, 0);
        this.uiCamera.setZoom(1);

        // Create inventory UI
        this.createInventoryUI();

        // Make cameras ignore opposite layers
        this.cameras.main.ignore([
            this.inventoryBg,
            this.inventoryLabel,
            this.inventoryDivider,
            this.inventorySprite,
            this.inventoryEmptyText,
            this.boxCounterText
        ]);

        this.uiCamera.ignore(this.layers);
        this.uiCamera.ignore(this.wallLayers);
        this.uiCamera.ignore(this.player);
        this.uiCamera.ignore(this.interactablesGroup);

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys({
            w: Phaser.Input.Keyboard.KeyCodes.W,
            a: Phaser.Input.Keyboard.KeyCodes.A,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            d: Phaser.Input.Keyboard.KeyCodes.D,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE
        });

        // DEV SHORTCUTS — remove before shipping
        this.input.keyboard.on('keydown-ONE',   () => this.scene.start('room1'));
        this.input.keyboard.on('keydown-TWO',   () => this.scene.start('room2'));
        this.input.keyboard.on('keydown-THREE', () => this.scene.start('room3'));
        this.input.keyboard.on('keydown-FOUR',  () => this.scene.start('cutScene1'));
        this.input.keyboard.on('keydown-FIVE',  () => this.scene.start('cutScene2'));
        this.input.keyboard.on('keydown-SIX',   () => this.scene.start('cutScene3'));
        this.input.keyboard.on('keydown-SEVEN',   () => this.scene.start('endScreen'));

        // UI
        this.createUI();
        this.cameras.main.ignore([this.tutorialBg, this.tutorialLabel, this.tutorialDivider, this.tutorialText, this.statusText, this.interactionPrompt, this.holdProgressBar]);

        // Hand tracking
        this.setupHandTracking();

        if (window.handTracker) {
            window.handTracker.onCursorMove = null;
            window.handTracker.onCursorHold = null;
        }

        console.log('=== ROOM3 CREATE COMPLETE ===');
    }

    createInventoryUI() {
        const W = this.scale.width;
        const H = this.scale.height;

        // RIGHT PANEL — anchored to right edge, vertically centred to game height
        const panelW = 200;
        const panelH = 220;
        const panelX = W - panelW / 2 - 16;   // 16px from right edge
        const panelY = H / 2 - panelH / 2;     // vertically centred

        // Panel background
        this.inventoryBg = this.add.rectangle(panelX, panelY + panelH / 2, panelW, panelH, 0x000000, 0.75)
            .setScrollFactor(0)
            .setDepth(2000)
            .setOrigin(0.5);

        // "HOLDING" label at top of panel
        this.inventoryLabel = this.add.text(panelX, panelY + 18, 'HOLDING', {
            fontSize: '32px',
            fill: '#aaaaaa',
            fontStyle: 'bold',
            letterSpacing: 3
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(2001);

        // Divider line under label
        this.inventoryDivider = this.add.graphics()
            .setScrollFactor(0)
            .setDepth(2001);
        this.inventoryDivider.lineStyle(1, 0x555555, 1);
        this.inventoryDivider.lineBetween(
            panelX - panelW / 2 + 12, panelY + 34,
            panelX + panelW / 2 - 12, panelY + 34
        );

        // Item sprite (centred in panel)
        this.inventorySprite = this.add.sprite(panelX, panelY + 95, 'interactables', 0)
            .setScale(5)
            .setScrollFactor(0)
            .setDepth(2001)
            .setVisible(false);

        // "EMPTY" text
        this.inventoryEmptyText = this.add.text(panelX, panelY + 95, 'EMPTY', {
            fontSize: '20px',
            fill: '#555555',
            fontStyle: 'italic'
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(2001);

        // Box counter below the item display
        this.boxCounterText = this.add.text(panelX, panelY + 200, '', {
            fontSize: '20px',
            fill: '#cccccc',
            align: 'center',
            wordWrap: { width: panelW - 24 }
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(2001);

        // Store panel anchor for later reference
        this._invPanelX = panelX;
        this._invPanelY = panelY;
        this._invPanelW = panelW;
        this._invPanelH = panelH;
    }


    createInteractables(offsetX, offsetY) {
        console.log('=== CREATING INTERACTABLES ===');

        const objectsLayer = this.map.getObjectLayer('Objects');
        if (!objectsLayer) {
            console.error('❌ No "Objects" layer found!');
            return;
        }

        this.interactablesGroup = this.physics.add.staticGroup();

        objectsLayer.objects.forEach(obj => {
            let itemType = 'unknown';
            if (obj.properties) {
                const typeProp = obj.properties.find(p => p.name === 'itemType');
                if (typeProp) itemType = String(typeProp.value).trim();
            }

            if (!obj.gid) return;

            // Find tileset & local frame
            let tileset = null;
            let localTileId = obj.gid;

            for (let ts of this.map.tilesets) {
                if (obj.gid >= ts.firstgid && obj.gid < ts.firstgid + ts.total) {
                    tileset = ts;
                    localTileId = obj.gid - ts.firstgid;
                    break;
                }
            }
            if (!tileset) return;

            const textureKey = this.getTilesetTextureKey(tileset.name);

            const sprite = this.interactablesGroup.create(
                obj.x + offsetX,
                obj.y + offsetY,
                textureKey,
                localTileId
            );

            sprite.setOrigin(0, 1);
            sprite.setDepth(50);

            sprite.itemType = itemType;
            sprite.itemId = obj.id;
            sprite.isBox = (itemType === 'open_box' || itemType === 'box');

            sprite.canPickup = this.isPickupableType(itemType);

            // Storage metadata for the open box
            sprite.storedItems = [];
            sprite.maxStorage = this.maxItemsToStore;

            this.interactables.push(sprite);

            if (itemType === 'open_box') {
                this.openBox = sprite;
            }
        });

        this.physics.add.overlap(
            this.player,
            this.interactablesGroup,
            this.handleInteractableOverlap,
            null,
            this
        );
    }

    getTilesetTextureKey(tilesetName) {
        const mapping = {
            'TopDownHouse_FloorsAndWalls': 'roomTiles',
            'TopDownHouse_FurnitureState1': 'furnitureSet1',
            'TopDownHouse_FurnitureState2': 'furnitureSet2',
            'TopDownHouse_SmallItems': 'deco1',
            'vectoraith_tileset_interior_essentials_MAIN_ATLAS': 'deco2',
            'interactables': 'interactables',
            'interactables1': 'interactables'  // alias in case tmj uses this name
        };

        const key = mapping[tilesetName];
        if (!key) {
            console.warn(`⚠️ Unknown tileset "${tilesetName}", using as-is`);
            return tilesetName;
        }

        return key;
    }

    getFrameForType(type) {
        const frameMap = {
            'open_box': 0,
            'box': 1,
            'tape': 2,
            'books': 3,
            'knife': 4
        };

        const frame = frameMap[type];
        if (frame === undefined) {
            console.warn(`Unknown item type: "${type}", using frame 0`);
            return 0;
        }

        return frame;
    }

    handleInteractableOverlap(player, interactable) {
        if (!this.nearbyInteractable) {
            this.nearbyInteractable = interactable;
        } else if (interactable.itemType === 'open_box' && this.heldItemType === 'tape') {
            // When holding tape, always prefer the open_box so the seal timer can fire.
            this.nearbyInteractable = interactable;
        } else if (interactable.canPickup && !this.nearbyInteractable.canPickup) {
            // Prefer pickupable items, but don't displace the open_box when holding tape.
            const holdingTape = this.heldItemType === 'tape';
            const currentIsBox = this.nearbyInteractable.itemType === 'open_box';
            if (!(holdingTape && currentIsBox)) {
                this.nearbyInteractable = interactable;
            }
        }
    }

    createUI() {
        const W = this.scale.width;
        const H = this.scale.height;

        // LEFT PANEL — tutorial text anchored to left edge, vertically centred
        const panelW = 220;
        const panelH = 220;
        const panelX = 16;                      // 16px from left edge
        const panelY = H / 2 - panelH / 2;      // vertically centred

        // Panel background
        this.tutorialBg = this.add.rectangle(
            panelX + panelW / 2, panelY + panelH / 2,
            panelW, panelH, 0x000000, 0.75
        ).setScrollFactor(0).setDepth(2099).setOrigin(0.5);

        // "GUIDE" label
        this.tutorialLabel = this.add.text(panelX + panelW / 2, panelY + 18, 'GUIDE', {
            fontSize: '32px',
            fill: '#aaaaaa',
            fontStyle: 'bold',
            letterSpacing: 3
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2100);

        // Divider
        this.tutorialDivider = this.add.graphics().setScrollFactor(0).setDepth(2100);
        this.tutorialDivider.lineStyle(1, 0x555555, 1);
        this.tutorialDivider.lineBetween(
            panelX + 12, panelY + 34,
            panelX + panelW - 12, panelY + 34
        );

        // Tutorial text inside panel
        this.tutorialText = this.add.text(panelX + panelW / 2, panelY + 44, '', {
            fontSize: '24px',
            fill: '#ffffff',
            align: 'center',
            wordWrap: { width: panelW - 24 },
            lineSpacing: 4
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(2100);

        // Status text (hand tracking mode) — small, bottom-left
        this.statusText = this.add.text(panelX + panelW / 2, panelY + panelH - 14, '', {
            fontSize: '12px',
            fill: '#00cc66',
            align: 'center'
        }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(2100);

        // Interaction prompt — bottom-centre of screen
        this.interactionPrompt = this.add.text(
            W / 2, H - 36, '',
            {
                fontSize: '20px',
                fill: '#ffff00',
                backgroundColor: '#000000bb',
                padding: { x: 16, y: 8 },
                align: 'center'
            }
        ).setScrollFactor(0).setDepth(2100).setOrigin(0.5).setVisible(false);

        this.holdProgressBar = this.add.graphics().setScrollFactor(0).setDepth(2099);

        this.updateBoxCounterUI();
        this.updateTutorial();
    }


    updateBoxCounterUI() {
        const stored = this.itemsStored;
        const max = this.maxItemsToStore;

        if (this.boxSealed) {
            this.boxCounterText.setText(`BOX: SEALED ✅\nGo to the DOOR`);
            return;
        }

        if (stored < max) {
            this.boxCounterText.setText(`BOX: ${stored}/${max}\nStore all books`);
        } else {
            this.boxCounterText.setText(`BOX: ${stored}/${max} ✅\nPick up TAPE\nTape the box`);
        }
    }

    setupHandTracking() {
        if (!window.handTracker || !window.handTracker.initialized) {
            console.warn('Hand tracker not initialized');
            this.useHandTracking = false;
            return;
        }

        console.log('=== HAND TRACKING SETUP ===');
        console.log('  Dominant hand:', window.handTracker.dominantHand);

        // Movement callback
        window.handTracker.onHandUpdate = (movement) => {
            this.handMovement = movement;
        };

        // Gesture callback
        window.handTracker.onGestureChange = (gestures) => {
            this.nonDominantGrabbing = gestures.nonDominant;
            this.dominantHandOpen = gestures.dominantOpen;

            if (gestures.nonDominant || gestures.dominantOpen) {
                console.log('GESTURE:', {
                    nonDom: gestures.nonDominant,
                    domOpen: gestures.dominantOpen
                });
            }
        };

        console.log('✓ Callbacks configured');
    }

    updateTutorial() {
        const tutorials = [
            "Finally, the last room! You can't wait to take a break",
            "Pick up BOOKS with your non-dominant fist. Carry them to the OPEN BOX.",
            "Open your non-dominant fist near the box to store the books.",
            "Once all books are stored, pick up the TAPE and seal the box.",
            "Box sealed! Head to the DOOR — you're almost done!"
        ];

        if (this.tutorialStep < tutorials.length) {
            this.tutorialText.setText(tutorials[this.tutorialStep]);
        } else {
            this.tutorialComplete = true;
            this.tutorialText.setText('');
        }
    }

    update(time, delta) {
        if (!this.player) return;

        this.updatePlayerMovement();
        this.updateInteractions(delta);
        this.checkDoorTransition();

        // Clear nearby interactable after logic runs
        this.nearbyInteractable = null;
    }

    updatePlayerMovement() {
        this.player.setVelocity(0);

        let vx = 0;
        let vy = 0;

        const handActive =
            this.useHandTracking &&
            window.handTracker?.initialized &&
            this.handMovement &&
            this.handMovement.magnitude > 0.05;  // add a small deadzone

        if (handActive) {
            const m = this.handMovement;

            // Mirror X to match camera view (keep your existing behavior)
            vx = -m.x * this.playerSpeed * m.magnitude;
            vy = -m.y * this.playerSpeed * m.magnitude;

            this.player.setVelocity(vx, vy);
        } else {
            // Keyboard fallback
            let moveX = 0, moveY = 0;
            if (this.cursors.left.isDown || this.keys.a.isDown) moveX = -1;
            if (this.cursors.right.isDown || this.keys.d.isDown) moveX =  1;
            if (this.cursors.up.isDown || this.keys.w.isDown) moveY = -1;
            if (this.cursors.down.isDown || this.keys.s.isDown) moveY =  1;

            if (moveX !== 0 || moveY !== 0) {
                const angle = Math.atan2(moveY, moveX);
                vx = Math.cos(angle) * this.playerSpeed;
                vy = Math.sin(angle) * this.playerSpeed;
                this.player.setVelocity(vx, vy);
            }
        }

        // --- Animation + direction ---
        const moving = (Math.abs(vx) + Math.abs(vy)) > 0.01;
        this.isMoving = moving;

        if (moving) {
            // Choose dominant axis to pick direction (feels most stable)
            if (Math.abs(vx) > Math.abs(vy)) {
                this.playerDirection = (vx > 0) ? 'right' : 'left';
            } else {
                this.playerDirection = (vy > 0) ? 'down' : 'up';
            }

            // Your animation keys are exactly: 'up','down','left','right'
            const animKey = this.playerDirection;
            if (this.player.anims.currentAnim?.key !== animKey) {
                this.player.play(animKey, true);
            }
        } else {
            // Not moving → play idle
            if (this.player.anims.currentAnim?.key !== 'idle') {
                this.player.play('idle', true);
            }
        }
    }

    updateInteractions(delta) {
        const deltaSeconds = delta / 1000;

        // PICKUP: non-dominant hand closes into fist (rising edge)
        const nonDomJustClosed =
            this.nonDominantGrabbing && !this.prevNonDominantGrabbing;

        // DROP/STORE: non-dominant hand opens from fist (falling edge)
        const nonDomJustOpened =
            !this.nonDominantGrabbing && this.prevNonDominantGrabbing;

        const openBox = this.getOpenBox();
        const near = this.nearbyInteractable;

        // --- PICKUP (edge) ---
        if (near && !this.heldItemType && nonDomJustClosed) {
            if (near.canPickup && this.isPickupableType(near.itemType)) {
                this.pickupItem(near);
            }
        }

        // --- STORE OR DROP (edge: non-dominant hand opens) ---
        if (this.heldItemType && nonDomJustOpened) {
            if (openBox && near && near === openBox && this.heldItemType === 'books') {
                this.storeItemInBox(openBox);
            } else {
                this.dropItem();
            }
        }

        // --- TAPE THE BOX (distance-based, not overlap-based) ---
        // Use a direct distance check so the timer isn't reset by missed overlap frames.
        const TAPE_RADIUS = 32;
        const nearBox = openBox && this.heldItemType === 'tape' && !this.boxSealed;
        const inTapeRange = nearBox && (
            Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                openBox.x, openBox.y
            ) < TAPE_RADIUS
        );

        if (inTapeRange) {
            if (this.itemsStored >= this.maxItemsToStore) {
                this.boxInteractionTime += deltaSeconds;

                this.interactionPrompt.setText(`Hold to TAPE the box (${this.boxInteractionTime.toFixed(1)} / 2.0s)`);
                this.interactionPrompt.setVisible(true);

                if (this.boxInteractionTime >= 2.0) {
                    this.sealBox(openBox);
                    this.boxInteractionTime = 0;
                    this.interactionPrompt.setVisible(false);
                }
            } else {
                this.boxInteractionTime = 0;
                this.interactionPrompt.setText('Fill the box with books first!');
                this.interactionPrompt.setVisible(true);
            }
        } else {
            if (this.boxInteractionTime > 0) {
                this.boxInteractionTime = 0;
            }
        }

        // Save previous gesture states
        this.prevNonDominantGrabbing = this.nonDominantGrabbing;
        this.prevDominantHandOpen = this.dominantHandOpen;
    }

    isPickupableType(type) {
        if (!type) return false;
        if (type === 'open_box' || type === 'box') return false;

        if (type === 'books') return true;

        if (type === 'tape') {
            return (this.itemsStored >= this.maxItemsToStore) && !this.boxSealed;
        }

        return false;
    }

    refreshPickupStates() {
        for (const sprite of this.interactables) {
            if (sprite.active) {
                sprite.canPickup = this.isPickupableType(sprite.itemType);
            }
        }
    }

    getOpenBox() {
        if (this.openBox && this.openBox.active) return this.openBox;
        this.openBox = this.interactables.find(o => o.itemType === 'open_box') || null;
        return this.openBox;
    }

    pickupItem(item) {
        if (!item) return;

        if (!item.canPickup || !this.isPickupableType(item.itemType)) {
            console.warn('⚠️ Cannot pick up:', item.itemType);
            return;
        }

        if (this.heldItemType) return;

        this.heldItemType = item.itemType;
        this.heldItemSprite = item;

        item.setVisible(false);
        item.canPickup = false;
        if (item.body) item.body.enable = false;

        this.sound.play('sfx_pickup', { volume: 0.8 });
        this.updateInventoryUI();
    }

    dropItem() {
        if (!this.heldItemType || !this.heldItemSprite) return;

        const sprite = this.heldItemSprite;

        // Candidate drop position: just in front of the player
        const dropX = this.player.x;
        const dropY = this.player.y + 16;

        // Check all wall layers — if any tile exists at the drop position, abort
        for (const layer of this.wallLayers) {
            const tileX = Math.floor((dropX - layer.x) / this.map.tileWidth);
            const tileY = Math.floor((dropY - layer.y) / this.map.tileHeight);
            const tile = layer.getTileAt(tileX, tileY);

            if (tile && tile.index > -1) {
                // Drop position is inside a wall — show a warning and cancel
                this.interactionPrompt.setText("Can't drop here!");
                this.interactionPrompt.setVisible(true);
                this.time.delayedCall(800, () => {
                    if (this.interactionPrompt) this.interactionPrompt.setVisible(false);
                });
                return;
            }
        }

        // Position is clear — drop the item
        sprite.setPosition(dropX, dropY);
        sprite.setVisible(true);
        sprite.canPickup = this.isPickupableType(sprite.itemType);
        if (sprite.body) {
            sprite.body.enable = true;
            sprite.refreshBody(); // re-sync static body to new position
        }

        this.heldItemType = null;
        this.heldItemSprite = null;

        this.sound.play('sfx_drop', { volume: 0.8 });
        this.updateInventoryUI();
    }

    sealBox(box) {
        if (!box || box.itemType !== 'open_box') return;
        if (this.heldItemType !== 'tape') return;
        if (this.itemsStored < this.maxItemsToStore) return;

        box.itemType = 'box';
        box.setFrame(this.getFrameForType('box'));

        this.boxSealed = true;

        if (this.heldItemSprite) this.heldItemSprite.destroy();
        this.heldItemType = null;
        this.heldItemSprite = null;

        this.updateInventoryUI();
        this.updateBoxCounterUI();

        this.sound.play('sfx_boxseal', { volume: 0.9 });
        this.time.delayedCall(800, () => {
            this.sound.play('sfx_roomFin', { volume: 0.9 });
        });

        this.interactionPrompt.setText('Box SEALED ✅ Go to the DOOR');
        this.interactionPrompt.setVisible(true);
    }

    storeItemInBox(box) {
        if (!box || box.itemType !== 'open_box') return;
        if (this.heldItemType !== 'books') return;

        if (this.itemsStored >= this.maxItemsToStore) {
            this.interactionPrompt.setText('Box is FULL!');
            this.interactionPrompt.setVisible(true);
            return;
        }

        box.storedItems.push(this.heldItemType);
        this.itemsStored = box.storedItems.length;

        if (this.heldItemSprite) {
            this.heldItemSprite.destroy();
        }

        this.heldItemType = null;
        this.heldItemSprite = null;

        this.updateInventoryUI();
        this.updateBoxCounterUI();
        this.refreshPickupStates(); // tape becomes pickupable when box is full

        this.interactionPrompt.setText(`Stored BOOKS (${this.itemsStored}/${this.maxItemsToStore})`);
        this.interactionPrompt.setVisible(true);

        this.time.delayedCall(900, () => {
            if (this.interactionPrompt) this.interactionPrompt.setVisible(false);
        });
    }

    updateInventoryUI() {
        if (!this.inventorySprite || !this.inventoryEmptyText) return;

        if (this.heldItemType && this.heldItemSprite) {
            this.inventorySprite.setVisible(true);
            this.inventoryEmptyText.setVisible(false);

            this.inventorySprite.setTexture(this.heldItemSprite.texture.key);
            this.inventorySprite.setFrame(this.heldItemSprite.frame.name);

            console.log('Inventory:', this.heldItemType);
        } else {
            this.inventorySprite.setVisible(false);
            this.inventoryEmptyText.setVisible(true);

            console.log('Inventory empty');
        }
    }

    checkDoorTransition() {
        if (!this.doorLayer) return;

        // Only allow exit once box is sealed
        if (!this.boxSealed) return;

        const playerTileX = Math.floor((this.player.x - this.doorLayer.x) / this.map.tileWidth);
        const playerTileY = Math.floor((this.player.y - this.doorLayer.y) / this.map.tileHeight);

        const tile = this.doorLayer.getTileAt(playerTileX, playerTileY);

        if (tile && tile.index > 0) {
            console.log('Door exit → cutScene3');
            if (!this.doorTransitioning) {
                this.doorTransitioning = true;
                this.sound.play('sfx_nextscene', { volume: 1.0 });
                this.time.delayedCall(500, () => this.scene.start('cutScene3'));
            }
        }
    }
}
