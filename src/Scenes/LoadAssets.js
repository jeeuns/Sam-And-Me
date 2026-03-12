class LoadAssets extends Phaser.Scene {
    constructor() {
        super("loadAssets");
    }

    preload() {
        console.log('=== PRELOAD STARTED ===');
        
        // Set base path
        this.load.setPath("./assets/");
        
        // Error handlers
        this.load.on('loaderror', (file) => {
            console.error('ERROR loading file:', file.key, file.url);
        });
        
        this.load.on('filecomplete', (key) => {
            console.log('✓ Loaded:', key);
        });
        
        // Load player sprite (idle fallback)
        this.load.spritesheet('player', 'down1.png', {
            frameWidth: 16,
            frameHeight: 16
        });

        //individual loads
        this.load.image('down1', 'down1.png');
        this.load.image('down2', 'down2.png');
        this.load.image('down3', 'down3.png');
        this.load.image('down4', 'down4.png');
        this.load.image('down5', 'down5.png');
        this.load.image('down6', 'down6.png');

        this.load.image('up1', 'up1.png');
        this.load.image('up2', 'up2.png');
        this.load.image('up3', 'up3.png');
        this.load.image('up4', 'up4.png');
        this.load.image('up5', 'up5.png');
        this.load.image('up6', 'up6.png');

        this.load.image('left1', 'left1.png');
        this.load.image('left2', 'left2.png');
        this.load.image('left3', 'left3.png');
        this.load.image('left4', 'left4.png');
        this.load.image('left5', 'left5.png');
        this.load.image('left6', 'left6.png');
        
        this.load.image('right1', 'right1.png');
        this.load.image('right2', 'right2.png');
        this.load.image('right3', 'right3.png');
        this.load.image('right4', 'right4.png');
        this.load.image('right5', 'right5.png');
        this.load.image('right6', 'right6.png');

        //RIGHT GRAB
        this.load.image('rightGrab1', 'rightOpen.png');
        this.load.image('rightGrab2', 'rightClosed.png');

        //LEFT GRAB
        this.load.image('leftGrab1', 'leftOpen.png');
        this.load.image('leftGrab2', 'leftClosed.png');

        //POINTER
        this.load.image('leftPoint', 'leftPoint.png');
        this.load.image('rightPoint', 'rightPoint.png');

        //POLKA BG
        this.load.image('polkabg', 'polkabg.png');
        this.load.image('rightOpen', 'rightOpen.png');
        this.load.image('leftOpen', 'leftOpen.png');

        // Load tilemap
        this.load.tilemapTiledJSON('Room1', 'room1.tmj');
        this.load.tilemapTiledJSON('Room2', 'room2.tmj');
        this.load.tilemapTiledJSON('Room3', 'room3.tmj');
        
        // Load tilesets as spritesheets
        this.load.spritesheet('roomTiles', 'Top-Down_Retro_Interior/TopDownHouse_FloorsAndWalls.png', {
            frameWidth: 16,
            frameHeight: 16
        });
        
        this.load.spritesheet('furnitureSet1', 'Top-Down_Retro_Interior/TopDownHouse_FurnitureState1.png', {
            frameWidth: 16,
            frameHeight: 16
        });
        
        this.load.spritesheet('furnitureSet2', 'Top-Down_Retro_Interior/TopDownHouse_FurnitureState2.png', {
            frameWidth: 16,
            frameHeight: 16
        });
        
        this.load.spritesheet('deco1', 'Top-Down_Retro_Interior/TopDownHouse_SmallItems.png', {
            frameWidth: 16,
            frameHeight: 16
        });
        
        this.load.spritesheet('deco2', 'Interior Tileset Pack - Essentials/16x16/vectoraith_tileset_interior_essentials_MAIN_ATLAS.png', {
            frameWidth: 16,
            frameHeight: 16
        });
        
        // Load interactables spritesheet
        // This should have: open_box (frame 0), box (frame 1), tape (frame 2), books (frame 3)
        this.load.spritesheet('interactables', 'interactables1.png', {
            frameWidth: 16,
            frameHeight: 16
        });
        
        // Placeholder image for cutscenes/end screen
        this.load.image('placeholder', 'placeholder.png');

        // Sound effects
        this.load.audio('sfx_pickup',    'audio/pickup.mp3');
        this.load.audio('sfx_drop',      'audio/drop.mp3');
        this.load.audio('sfx_boxseal',   'audio/boxseal.mp3');
        this.load.audio('sfx_roomFin',   'audio/roomFin.mp3');
        this.load.audio('sfx_nextscene', 'audio/nextscene.mp3');

        //background music
        this.load.audio('bgm_room1', 'audio/whitenoise.mp3');
        this.load.audio('bgm_room2', 'audio/clocktick.mp3');
        this.load.audio('bgm_room3', 'audio/ambient1.mp3');
        
        // Loading text
        this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 'Loading...', {
            fontSize: '48px',
            fill: '#00ff00',
            backgroundColor: '#000000',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

    }

    create() {
        console.log('=== LOAD ASSETS CREATE ===');

        this.anims.create({
            key: 'idle',
            frames: [
                { key: 'down1' },
            ],
            frameRate: 1,
            repeat: -1
        });

        this.anims.create({
            key: 'down',
            frames: [
                { key: 'down1' },
                { key: 'down2' },
                { key: 'down3' },
                { key: 'down4' },
                { key: 'down5' },
                { key: 'down6' }
            ],
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'up',
            frames: [
                { key: 'up1' },
                { key: 'up2' },
                { key: 'up3' },
                { key: 'up4' },
                { key: 'up5' },
                { key: 'up6' }
            ],
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'left',
            frames: [
                { key: 'left1' },
                { key: 'left2' },
                { key: 'left3' },
                { key: 'left4' },
                { key: 'left5' },
                { key: 'left6' }
            ],
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'right',
            frames: [
                { key: 'right1' },
                { key: 'right2' },
                { key: 'right3' },
                { key: 'right4' },
                { key: 'right5' },
                { key: 'right6' }
            ],
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'rightGrab',
            frames: [
                { key: 'rightGrab1' },
                { key: 'rightGrab2' }
            ],
            frameRate: 2,
            repeat: -1
        });

        this.anims.create({
            key: 'leftGrab',
            frames: [
                { key: 'leftGrab1' },
                { key: 'leftGrab2' }
            ],
            frameRate: 2,
            repeat: -1
        });

        console.log('All assets loaded successfully!');
        
        // Start with the start screen
        this.scene.start("startScreen");
    }
}
