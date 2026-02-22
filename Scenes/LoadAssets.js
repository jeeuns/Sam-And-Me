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
        
        // Load player sprite
        this.load.image('player', 'sprite(18x24).png');
        
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
        console.log('All assets loaded successfully!');
        
        // Start with the start screen
        this.scene.start("startScreen");
    }
}
