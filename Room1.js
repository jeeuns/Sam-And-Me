class Room1 extends Phaser.Scene {
    constructor() {
        super("room1");
    }

    init() {
        console.log('=== ROOM1 INIT ===');
        this.playerSpeed = 100;

        // Door transition state debug
        this.doorWarningShown = false;
        
        // Hand tracking state
        this.handMovement = { x: 0, y: 0, magnitude: 0 };
        this.bothHandsGrabbing = false;
        this.nonDominantGrabbing = false;
        this.dominantHandOpen = false;
        this.useHandTracking = true;
        
        // Interaction state
        this.boxInteractionTime = 0; // Track hold time for tape/knife
        this.heldItem = null;
        this.heldItemSprite = null;
        this.nearbyInteractable = null;
        this.interactionHoldTime = 0;
        this.requiredHoldTime = 3.0; // seconds for tape/knife actions
        
        // Items in world
        this.interactables = [];
        this.openBoxes = []; // Track open boxes and their contents
        
        // Tutorial state
        this.tutorialStep = 0;
        this.tutorialComplete = false;
    }

    create() {
        console.log('ROOM1 CREATE STARTED');
        
        // Background
        this.cameras.main.setBackgroundColor('#6e9d46');
        
        // Create tilemap
        this.map = this.make.tilemap({ key: 'Room1' });
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

        // If the map is smaller than the view, pad the world so the map can be centered
        const padX = Math.max(0, (viewW - mapW) / 2);
        const padY = Math.max(0, (viewH - mapH) / 2);

        // Place the map inside a larger "world" area
        const offsetX = padX;
        const offsetY = padY;

        const worldW = Math.max(mapW, viewW);
        const worldH = Math.max(mapH, viewH);

        // World bounds should include padding
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
            
            // Check for wall property
            let isWall = false;
            let isDoor = false;
            if (layerData.properties) {
                layerData.properties.forEach(prop => {
                    if (prop.name === 'wall' && prop.value === true) {
                        isWall = true;
                    }
                    if (prop.name === 'door' && prop.value === true) {
                        isDoor = true;
                    }
                });
            }
            
            if (isDoor) {
                this.doorLayer = layer;
                console.log(`Door layer found: "${layerData.name}"`);
            }
            // Only enable collision if it's a wall and NOT a door
            if (isWall && !isDoor) {
                layer.setCollisionByExclusion([-1]);
                this.wallLayers.push(layer);
                console.log(`Collision enabled for layer "${layerData.name}"`);
            }

        });
        
        // Create player w/ Tiled Spawn Point
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

        this.player = this.physics.add.sprite(spawnX, spawnY, 'player');
        this.player.setDepth(100);
        this.player.setCollideWorldBounds(true);
        
        // Collisions
        this.wallLayers.forEach(layer => {
            this.physics.add.collider(this.player, layer);
        });

        // Create interactable objects from object layer
        this.createInteractables(offsetX, offsetY);
        
        // Camera
        this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
        this.cameras.main.setZoom(SCALE);
        
        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys({
            w: Phaser.Input.Keyboard.KeyCodes.W,
            a: Phaser.Input.Keyboard.KeyCodes.A,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            d: Phaser.Input.Keyboard.KeyCodes.D,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE
        });
        
        // UI
        this.createUI();
        
        // Hand tracking
        this.setupHandTracking();

        if (window.handTracker) {
            window.handTracker.onCursorMove = null;
            window.handTracker.onCursorHold = null;
        }
        
        console.log('=== ROOM1 CREATE COMPLETE ===');
    }

    // COMPLETE WORKING createInteractables METHOD
    // Replace the entire method in Room1.js (starting around line 185)

    createInteractables(offsetX, offsetY) {
        console.log('=== CREATING INTERACTABLES ===');
        
        const objectsLayer = this.map.getObjectLayer('Objects');
        
        if (!objectsLayer) {
            console.error('❌ No "Objects" layer found!');
            console.log('Available layers:', this.map.objects.map(l => l.name));
            return;
        }
        
        console.log('✓ Found Objects layer with', objectsLayer.objects.length, 'objects');
        
        this.interactablesGroup = this.physics.add.staticGroup();
        
        objectsLayer.objects.forEach(obj => {
            // Read itemType from properties
            let itemType = 'unknown';
            if (obj.properties) {
                const typeProp = obj.properties.find(p => p.name === 'itemType');
                if (typeProp) {
                    itemType = typeProp.value;
                }
            }
            
            console.log(`Object ${obj.id}: type="${itemType}" gid=${obj.gid} at (${obj.x}, ${obj.y})`);
            
            if (!obj.gid) {
                console.warn(`  ⚠️ Object ${obj.id} has no GID, skipping`);
                return;
            }
            
            // Find which tileset this GID belongs to
            let tileset = null;
            let localTileId = obj.gid;
            
            for (let ts of this.map.tilesets) {
                if (obj.gid >= ts.firstgid && obj.gid < ts.firstgid + ts.total) {
                    tileset = ts;
                    localTileId = obj.gid - ts.firstgid;
                    break;
                }
            }
            
            if (!tileset) {
                console.error(`  ❌ Could not find tileset for GID ${obj.gid}`);
                return;
            }
            
            console.log(`  Using tileset "${tileset.name}" (firstgid=${tileset.firstgid}) frame=${localTileId}`);
            
            // Get the texture key for this tileset
            // This needs to match what you used in LoadAssets.js
            const textureKey = this.getTilesetTextureKey(tileset.name);
            
            // Create sprite
            const sprite = this.interactablesGroup.create(
                obj.x + offsetX,
                obj.y + offsetY,
                textureKey,
                localTileId
            );
            
            sprite.setOrigin(0, 1); // Tiled bottom-left origin
            sprite.setDepth(50);
            
            // Store metadata
            sprite.itemType = itemType;
            sprite.itemId = obj.id;
            sprite.canPickup = (itemType !== 'unknown');
            sprite.isBox = (itemType === 'open_box' || itemType === 'box');
            sprite.storedItems = [];
            sprite.maxStorage = 3;
            sprite.originalGid = obj.gid;
            sprite.originalTileset = tileset.name;
            
            this.interactables.push(sprite);
            
            console.log(`  ✅ Created ${itemType} from tileset "${tileset.name}" frame ${localTileId}`);
        });
        
        console.log(`=== CREATED ${this.interactables.length} interactables ===`);
        
        // Add overlap detection
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
            'interactables': 'interactables'
        };
        
        return mapping[tilesetName] || tilesetName;
    }

    // ADD THIS NEW METHOD to Room1.js (after createInteractables)
    getTilesetTextureKey(tilesetName) {
        // Map Tiled tileset names to Phaser texture keys from LoadAssets.js
        const mapping = {
            'TopDownHouse_FloorsAndWalls': 'roomTiles',
            'TopDownHouse_FurnitureState1': 'furnitureSet1',
            'TopDownHouse_FurnitureState2': 'furnitureSet2',
            'TopDownHouse_SmallItems': 'deco1',
            'vectoraith_tileset_interior_essentials_MAIN_ATLAS': 'deco2',
            'interactables': 'interactables'
        };
        
        const key = mapping[tilesetName];
        if (!key) {
            console.warn(`⚠️ Unknown tileset "${tilesetName}", using as-is`);
            return tilesetName;
        }
        
        return key;
    }

    //HELPER FUNCTION
    getItemTypeFromTiledObject(obj) {
        // Preferred: object custom property type="tape"/"books"/...
        let type = 'unknown';

        if (obj.properties?.length) {
            // Standard schema: property named "type"
            const pType = obj.properties.find(p => p.name === 'type');
            if (pType?.value) {
            return String(pType.value).trim();
            }

            // Fallback schema you currently have in "interact":
            // property name is the type (e.g., "tape") and value is "".
            // So if we see a known type as a property name, use it.
            const known = new Set(['open_box', 'box', 'tape', 'books', 'knife']);
            for (const p of obj.properties) {
            if (known.has(String(p.name).trim())) {
                return String(p.name).trim();
            }
            }
        }

        // Fallback: object name / built-in type fields
        if (obj.name) type = String(obj.name).trim();
        if (type === 'unknown' && obj.type) type = String(obj.type).trim();

        return type;
    }

    getFrameForType(type) {
        // interactables1.png has 4 frames (0-3)
        const frameMap = {
            'open_box': 0,  // Frame 0: open box
            'box': 1,       // Frame 1: sealed box
            'tape': 2,      // Frame 2: tape
            'books': 3,     // Frame 3: books
            'knife': 4      // Frame 4: knife (if you add it)
        };
        
        const frame = frameMap[type];
        if (frame === undefined) {
            console.warn(`Unknown item type: "${type}", using frame 0`);
            return 0;
        }
        
        return frame;
    }

    handleInteractableOverlap(player, interactable) {
        this.nearbyInteractable = interactable;
        console.log('👋 Overlapping:', interactable.itemType);
    }

    createUI() {
        // Tutorial text
        this.tutorialText = this.add.text(20, 20, '', {
            fontSize: '20px',
            fill: '#ffffff',
            backgroundColor: '#000000aa',
            padding: { x: 15, y: 10 },
            wordWrap: { width: 500 }
        }).setScrollFactor(0).setDepth(1000);
        
        // Status text
        this.statusText = this.add.text(20, 100, '', {
            fontSize: '18px',
            fill: '#00ff00',
            backgroundColor: '#000000aa',
            padding: { x: 10, y: 5 }
        }).setScrollFactor(0).setDepth(1000);
        
        // Interaction prompt
        this.interactionPrompt = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.height - 50,
            '',
            {
                fontSize: '24px',
                fill: '#ffff00',
                backgroundColor: '#000000aa',
                padding: { x: 15, y: 10 }
            }
        ).setScrollFactor(0).setDepth(1000).setOrigin(0.5).setVisible(false);
        
        // Hold progress bar
        this.holdProgressBar = this.add.graphics();
        this.holdProgressBar.setScrollFactor(0).setDepth(999);
        
        // Start tutorial
        this.updateTutorial();
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
        
        // Gesture callback with LOGGING
        window.handTracker.onGestureChange = (gestures) => {
            this.bothHandsGrabbing = gestures.bothHands;
            this.nonDominantGrabbing = gestures.nonDominant;
            this.dominantHandOpen = gestures.dominantOpen;
            
            // LOG EVERY GESTURE CHANGE
            if (gestures.nonDominant || gestures.bothHands || gestures.dominantOpen) {
                console.log('GESTURE:', {
                    nonDom: gestures.nonDominant,
                    both: gestures.bothHands,
                    domOpen: gestures.dominantOpen
                });
            }
        };
        
        console.log('✓ Callbacks configured');
    }

    updateTutorial() {
        const tutorials = [
            "Welcome to Room 1! Move around using your dominant hand (or WASD keys).",
            "Approach the TAPE on the floor. Make a fist with your non-dominant hand to pick it up.",
            "Good! Now find the OPEN BOX. Hold the TAPE near it for 3 seconds to seal it.",
            "Great! Now grab the sealed BOX with BOTH hands (both fists) to carry it.",
            "Carry the box to the DOOR and hold it there. Let's move to the next room!",
            "Tutorial complete! Ready for Room 2?"
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
        
        // Reset nearby each frame (IMPORTANT!)
        this.nearbyInteractable = null;
        
        // Player movement
        this.updatePlayerMovement();
        
        // Interactions (this will set nearbyInteractable via overlap callback)
        this.updateInteractions(delta);
        
        // Update held item position (follows player)
        if (this.heldItemSprite) {
            this.heldItemSprite.setPosition(
                this.player.x,
                this.player.y - 24
            );
        }
    }

    updatePlayerMovement() {
        this.player.setVelocity(0);

        const handActive = this.useHandTracking && 
                        window.handTracker?.initialized && 
                        this.handMovement && 
                        this.handMovement.magnitude > 0;

        if (handActive) {
            const m = this.handMovement;
            
            // Mirror X to match camera view
            this.player.setVelocity(
                -m.x * this.playerSpeed * m.magnitude,  // NEGATIVE X mirrors it
                -m.y * this.playerSpeed * m.magnitude
            );
        } else {
            // Keyboard fallback
            let moveX = 0, moveY = 0;
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
    }

    updateInteractions(delta) {
        const deltaSeconds = delta / 1000;
        
        // LOG what's happening
        if (this.nearbyInteractable) {
            console.log('📍 Near:', this.nearbyInteractable.itemType, 
                        '| Held:', this.heldItem ? this.heldItem.itemType : 'nothing',
                        '| NonDom:', this.nonDominantGrabbing,
                        '| DomOpen:', this.dominantHandOpen);
        }
        
        // CASE 1: Holding item + dominant hand opens = DROP
        if (this.heldItem && this.dominantHandOpen) {
            console.log('💧 Dropping item!');
            this.dropItem();
            return;
        }
        
        // CASE 2: Near item + not holding anything + non-dominant fist = PICKUP
        if (this.nearbyInteractable && !this.heldItem && this.nonDominantGrabbing) {
            console.log('✊ Picking up with non-dominant hand!');
            this.pickupItem(this.nearbyInteractable);
            return;
        }
        
        // CASE 3: Holding tape/knife near box = TRANSFORM
        if (this.heldItem && this.nearbyInteractable) {
            const heldType = this.heldItem.itemType;
            const nearType = this.nearbyInteractable.itemType;
            
            // Tape + open_box
            if (heldType === 'tape' && nearType === 'open_box') {
                this.boxInteractionTime += deltaSeconds;
                console.log(`📦 Sealing box: ${this.boxInteractionTime.toFixed(1)}s / 2s`);
                
                if (this.boxInteractionTime >= 2.0) {
                    this.sealBox(this.nearbyInteractable);
                }
            }
            // Knife + box
            else if (heldType === 'knife' && nearType === 'box') {
                this.boxInteractionTime += deltaSeconds;
                console.log(`🔪 Opening box: ${this.boxInteractionTime.toFixed(1)}s / 2s`);
                
                if (this.boxInteractionTime >= 2.0) {
                    this.openBox(this.nearbyInteractable);
                }
            }
            else {
                this.boxInteractionTime = 0;
            }
        } else {
            this.boxInteractionTime = 0;
        }
    }

    handleItemInteraction(item, deltaSeconds) {
    // CASE 1: Player is holding an item
        if (this.heldItem) {
            this.handleHeldItemInteraction(item, deltaSeconds);
            return;
        }
        
        // CASE 2: Player wants to pick up an item
        this.handlePickupInteraction(item, deltaSeconds);
    }

    handlePickupInteraction(item, deltaSeconds) {
        // Can't pick up if not a pickupable item
        if (!item.canPickup) {
            return;
        }
        
        // Boxes require both hands
        if (item.isBox) {
            if (this.bothHandsGrabbing) {
                this.interactionPrompt.setText(`Hold BOTH hands to carry ${item.itemType.toUpperCase()}`);
                this.interactionPrompt.setVisible(true);
                
                this.interactionHoldTime += deltaSeconds;
                this.drawHoldProgress(this.interactionHoldTime / 1.0);
                
                if (this.interactionHoldTime >= 1.0) {
                    this.pickupItem(item);
                    this.interactionHoldTime = 0;
                    this.holdProgressBar.clear();
                    
                    // Tutorial progression
                    if (this.tutorialStep === 3 && item.itemType === 'box') {
                        this.tutorialStep = 4;
                        this.updateTutorial();
                    }
                }
            } else {
                this.interactionPrompt.setText('Use BOTH hands (closed fists) to carry box');
                this.interactionPrompt.setVisible(true);
                this.interactionHoldTime = 0;
                this.holdProgressBar.clear();
            }
        }
        // Small items require non-dominant hand
        else {
            if (this.nonDominantGrabbing) {
                this.interactionPrompt.setText(`Hold to pick up ${item.itemType.toUpperCase()}`);
                this.interactionPrompt.setVisible(true);
                
                this.interactionHoldTime += deltaSeconds;
                this.drawHoldProgress(this.interactionHoldTime / 1.0);
                
                if (this.interactionHoldTime >= 1.0) {
                    this.pickupItem(item);
                    this.interactionHoldTime = 0;
                    this.holdProgressBar.clear();
                    
                    // Tutorial progression
                    if (this.tutorialStep === 1 && item.itemType === 'tape') {
                        this.tutorialStep = 2;
                        this.updateTutorial();
                    }
                }
            } else {
                this.interactionPrompt.setText(`Make fist with NON-DOMINANT hand to grab ${item.itemType.toUpperCase()}`);
                this.interactionPrompt.setVisible(true);
                this.interactionHoldTime = 0;
                this.holdProgressBar.clear();
            }
        }
    }

    handleHeldItemInteraction(nearbyItem, deltaSeconds) {
        const heldType = this.heldItem.itemType;
        const nearbyType = nearbyItem.itemType;
        
        // CASE A: Holding TAPE near OPEN BOX → seal it
        if (heldType === 'tape' && nearbyType === 'open_box') {
            this.interactionPrompt.setText('Hold for 3 seconds to SEAL box with tape');
            this.interactionPrompt.setVisible(true);
            
            this.interactionHoldTime += deltaSeconds;
            this.drawHoldProgress(this.interactionHoldTime / this.requiredHoldTime);
            
            if (this.interactionHoldTime >= this.requiredHoldTime) {
                this.sealBox(nearbyItem);
                this.interactionHoldTime = 0;
                this.holdProgressBar.clear();
            }
        }
        // CASE B: Holding KNIFE near SEALED BOX → open it
        else if (heldType === 'knife' && nearbyType === 'box') {
            this.interactionPrompt.setText('Hold for 3 seconds to OPEN box with knife');
            this.interactionPrompt.setVisible(true);
            
            this.interactionHoldTime += deltaSeconds;
            this.drawHoldProgress(this.interactionHoldTime / this.requiredHoldTime);
            
            if (this.interactionHoldTime >= this.requiredHoldTime) {
                this.openBox(nearbyItem);
                this.interactionHoldTime = 0;
                this.holdProgressBar.clear();
            }
        }
        // CASE C: Holding other item near OPEN BOX → store it
        else if (nearbyType === 'open_box' && heldType !== 'tape' && heldType !== 'knife') {
            if (nearbyItem.storedItems.length < nearbyItem.maxStorage) {
                this.interactionPrompt.setText(`Open hand to store ${heldType.toUpperCase()} in box (${nearbyItem.storedItems.length}/${nearbyItem.maxStorage})`);
                this.interactionPrompt.setVisible(true);
                
                if (this.dominantHandOpen) {
                    this.storeItemInBox(nearbyItem);
                }
            } else {
                this.interactionPrompt.setText('Box is FULL!');
                this.interactionPrompt.setVisible(true);
            }
        }
        // CASE D: Not near anything special → can drop
        else {
            this.interactionPrompt.setText(`Open hand to DROP ${heldType.toUpperCase()}`);
            this.interactionPrompt.setVisible(true);
            this.interactionHoldTime = 0;
            this.holdProgressBar.clear();
        }
    }

    handleBoxInteraction(box, deltaSeconds) {
        const heldType = this.heldItem.itemType;
        const boxType = box.itemType;
        
        // Tape + open_box = seal it
        if (heldType === 'tape' && boxType === 'open_box') {
            this.boxInteractionTime += deltaSeconds;
            
            if (this.boxInteractionTime >= 2.0) {
                // Transform to sealed box
                box.setFrame(this.getFrameForType('box'));
                box.itemType = 'box';
                
                // Use up the tape
                this.heldItemSprite.destroy();
                this.heldItemSprite = null;
                this.heldItem.originalSprite.destroy();
                this.heldItem = null;
                
                this.boxInteractionTime = 0;
                console.log('✓ Box sealed with tape');
            }
        }
        // Knife + box = open it
        else if (heldType === 'knife' && boxType === 'box') {
            this.boxInteractionTime += deltaSeconds;
            
            if (this.boxInteractionTime >= 2.0) {
                // Transform to open box
                box.setFrame(this.getFrameForType('open_box'));
                box.itemType = 'open_box';
                
                // Keep the knife
                this.boxInteractionTime = 0;
                console.log('✓ Box opened with knife');
            }
        } else {
            this.boxInteractionTime = 0;
        }
    }

    pickupItem(item) {
        if (!item.canPickup) {
            console.warn('⚠️ Item cannot be picked up');
            return;
        }
        
        if (this.heldItem) {
            console.warn('⚠️ Already holding an item!');
            return;
        }
        
        console.log('✅ PICKING UP:', item.itemType);
        
        this.heldItem = {
            itemType: item.itemType,
            originalSprite: item
        };
        
        // Hide the ground sprite
        item.setVisible(false);
        item.canPickup = false;
        if (item.body) {
            item.body.enable = false;
        }
        
        // Create sprite above player's head
        this.heldItemSprite = this.add.sprite(
            this.player.x,
            this.player.y - 24,
            item.texture.key,  // Use same texture
            item.frame.name    // Use same frame
        );
        this.heldItemSprite.setDepth(150);
        this.heldItemSprite.setScale(1.2);
        
        console.log('  Item is now held above player');
    }

    dropItem() {
        if (!this.heldItem) return;
        
        console.log('✓ Dropping:', this.heldItem.itemType);
        
        // Drop at player's current position
        const originalSprite = this.heldItem.originalSprite;
        originalSprite.setPosition(this.player.x, this.player.y + 16);
        originalSprite.setVisible(true);
        originalSprite.body.enable = true;
        
        // Remove held sprite
        this.heldItemSprite.destroy();
        this.heldItemSprite = null;
        this.heldItem = null;
    }

    sealBox(box) {
        console.log('✓ Sealing box with tape');
        
        // Instead of setFrame(), we need to swap the sprite
        // Find the GID for sealed box in your tileset
        // For now, just change the itemType
        box.itemType = 'box';
        
        // Visual feedback - you may need to replace the sprite entirely
        // or update based on your tileset structure
        
        // Use up the tape
        if (this.heldItemSprite) {
            this.heldItemSprite.destroy();
            this.heldItemSprite = null;
        }
        this.heldItem.originalSprite.destroy();
        this.heldItem = null;
        
        this.boxInteractionTime = 0;
        console.log('  Box sealed (visual update needed)');
    }

    openBox(box) {
        console.log('✓ Opening box with knife');
        
        box.itemType = 'open_box';
        
        this.boxInteractionTime = 0;
        console.log('  Box opened (visual update needed)');
    }

    storeItemInBox(box) {
        console.log('Storing item in box:', this.heldItem.itemType);
        
        // Add to box's storage
        box.storedItems.push(this.heldItem.itemType);
        console.log(`  Box now contains: [${box.storedItems.join(', ')}]`);
        
        // Remove the item completely
        if (this.heldItemSprite) {
            this.heldItemSprite.destroy();
            this.heldItemSprite = null;
        }
        this.heldItem.originalSprite.destroy();
        this.heldItem = null;
        
        console.log(`  Item stored (${box.storedItems.length}/${box.maxStorage})`);
    }

    drawHoldProgress(progress) {
        this.holdProgressBar.clear();
        
        const barWidth = 200;
        const barHeight = 20;
        const barX = this.cameras.main.centerX - barWidth / 2;
        const barY = this.cameras.main.height - 100;
        
        // Background
        this.holdProgressBar.fillStyle(0x000000, 0.7);
        this.holdProgressBar.fillRect(barX, barY, barWidth, barHeight);
        
        // Progress
        this.holdProgressBar.fillStyle(0x27ae60);
        this.holdProgressBar.fillRect(barX, barY, barWidth * Math.min(progress, 1.0), barHeight);
        
        // Border
        this.holdProgressBar.lineStyle(2, 0xffffff);
        this.holdProgressBar.strokeRect(barX, barY, barWidth, barHeight);
    }

    updateStatusDisplay() {
        const lines = [];
        
        if (this.useHandTracking && window.handTracker?.initialized) {
            lines.push('🖐️ HAND TRACKING MODE');
        } else {
            lines.push('⌨️ KEYBOARD MODE (WASD)');
        }
        
        if (this.heldItem) {
            lines.push(`Holding: ${this.heldItem.itemType.toUpperCase()}`);
        }
        
        lines.push(`Position: ${Math.round(this.player.x)}, ${Math.round(this.player.y)}`);
        
        this.statusText.setText(lines);
    }

    checkDoorTransition() {
        if (!this.doorLayer) {
            console.warn('No door layer found');
            return;
        }
        
        // Get player's tile position
        const playerTileX = Math.floor((this.player.x - this.doorLayer.x) / this.map.tileWidth);
        const playerTileY = Math.floor((this.player.y - this.doorLayer.y) / this.map.tileHeight);
        
        // Check if tile exists and has a door
        const tile = this.doorLayer.getTileAt(playerTileX, playerTileY);
        
        console.log('Door check:', {
            playerTileX,
            playerTileY,
            tile: tile ? tile.index : 'null',
            tutorialStep: this.tutorialStep
        });
        
        if (tile && tile.index > 0) {
            // Player is on door tile
            if (this.tutorialStep >= 4) {
                console.log('Moving to cutscene');
                this.scene.start('cutScene1');
            } else {
                if (!this.doorWarningShown) {
                    this.interactionPrompt.setText('Complete the tutorial first!');
                    this.interactionPrompt.setVisible(true);
                    this.doorWarningShown = true;
                    
                    this.time.delayedCall(2000, () => {
                        this.interactionPrompt.setVisible(false);
                        this.doorWarningShown = false;
                    });
                }
            }
        }
    }
}