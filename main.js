// Phaser Configuration

let config = {
    parent: 'phaser-game',
    type: Phaser.CANVAS,
    render: {
        pixelArt: true // prevent pixel art from getting crunchy during scaling
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false, // Set to true to see collision boxes
            gravity: {
                x: 0,
                y: 0
            }
        }
    },
    width: 1440,
    height: 690, // Reduced to fit with camera view
    scene: [
        LoadAssets,
        StartScreen,
        CalibrationScene,
        Room1,
        CutScene1,
        Room2,
        CutScene2,
        Room3,
        CutScene3,
        EndScreen
    ]
};

// Global constants
const SCALE = 3.0;
var my = { sprite: {}, text: {}, vfx: {} };

// Create game
const game = new Phaser.Game(config);

// Update camera status when hand tracking initializes
window.addEventListener('load', () => {
    const statusElement = document.getElementById('camera-status');
    
    // Check for hand tracking status periodically
    setInterval(() => {
        if (window.handTracker && window.handTracker.initialized) {
            statusElement.textContent = '● Hand Tracking Active';
            statusElement.className = 'status-active';
        } else {
            statusElement.textContent = '● Hand Tracking Inactive';
            statusElement.className = 'status-inactive';
        }
    }, 1000);
});
