class HandTracking {
    constructor() {
        this.hands = null;
        this.camera = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.canvasCtx = null;
        this.initialized = false;
        
        // Hand state
        this.dominantHand = 'right'; // 'right' or 'left'
        this.handData = {
            left: { detected: false, landmarks: null, grabbing: false },
            right: { detected: false, landmarks: null, grabbing: false }
        };
        
        // Movement control (circular zone)
        this.controlCenter = { x: 0.5, y: 0.5 }; // normalized center position
        this.controlRadius = 0.2;
        this.deadZoneRadius = 0.08; // no movement inside this radius
        this.movement = { x: 0, y: 0, magnitude: 0 };
        
        // Gesture detection
        this.bothHandsGrabbing = false;
        this.nonDominantGrabbing = false;
        this.dominantHandOpen = false;
        
        // Cursor positioning for UI
        this.cursorHoldStartTime = null;
        this.cursorHoldDuration = 0;
        this.cursorPosition = { x: 0, y: 0 };
        this.lastCursorHand = null; // Track which hand is being used for cursor
        
        // Callbacks
        this.onHandUpdate = null;
        this.onGestureChange = null;
        this.onCursorMove = null;
        this.onCursorHold = null;
    }

    async init() {
        console.log('Initializing hand tracking...');
        
        // Create video element
        this.videoElement = document.createElement('video');
        this.videoElement.style.display = 'none';
        document.body.appendChild(this.videoElement);
        
        // Create canvas for drawing
        this.canvasElement = document.getElementById('camera-canvas');
        if (!this.canvasElement) {
            this.canvasElement = document.createElement('canvas');
            this.canvasElement.id = 'camera-canvas';
            document.body.appendChild(this.canvasElement);
        }
        this.canvasCtx = this.canvasElement.getContext('2d');
        
        // Initialize MediaPipe Hands
        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });
        
        this.hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        this.hands.onResults(results => this.onResults(results));
        
        // Start camera
        const camera = new Camera(this.videoElement, {
            onFrame: async () => {
                await this.hands.send({ image: this.videoElement });
            },
            width: 640,
            height: 480
        });
        
        this.camera = camera;
        await camera.start();
        
        this.initialized = true;
        console.log('Hand tracking initialized successfully');
    }

    onResults(results) {
        if (!this.canvasElement || !this.canvasCtx) return;
        
        // Set canvas size
        this.canvasElement.width = results.image.width;
        this.canvasElement.height = results.image.height;
        
        // Draw video frame
        this.canvasCtx.save();
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        this.canvasCtx.drawImage(results.image, 0, 0, this.canvasElement.width, this.canvasElement.height);
        
        // Reset hand data
        this.handData.left.detected = false;
        this.handData.right.detected = false;
        
        // Process detected hands
        if (results.multiHandLandmarks && results.multiHandedness) {
            for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                const landmarks = results.multiHandLandmarks[i];
                const handedness = results.multiHandedness[i].label.toLowerCase() === 'left' ? 'right' : 'left';
                
                // Store hand data
                this.handData[handedness].detected = true;
                this.handData[handedness].landmarks = landmarks;
                this.handData[handedness].grabbing = this.isHandGrabbing(landmarks);
                
                // Draw hand landmarks
                this.drawLandmarks(landmarks, handedness);
            }

            this.canvasCtx.restore();
    
            // Draw movement circle overlay
            this.drawMovementCircle();
        }
        
        // Update gestures
        this.updateGestures();
        
        // Update movement (based on dominant hand)
        this.updateMovement();
        
        // Update cursor (based on dominant hand index finger)
        this.updateCursor();
        
        this.canvasCtx.restore();
    }

    drawLandmarks(landmarks, handedness) {
        const color = handedness === this.dominantHand ? '#00ff00' : '#ffff00';
        
        // Draw connections
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4], // thumb
            [0, 5], [5, 6], [6, 7], [7, 8], // index
            [0, 9], [9, 10], [10, 11], [11, 12], // middle
            [0, 13], [13, 14], [14, 15], [15, 16], // ring
            [0, 17], [17, 18], [18, 19], [19, 20], // pinky
            [5, 9], [9, 13], [13, 17] // palm
        ];
        
        this.canvasCtx.strokeStyle = color;
        this.canvasCtx.lineWidth = 2;
        
        for (const [start, end] of connections) {
            const startPoint = landmarks[start];
            const endPoint = landmarks[end];
            
            this.canvasCtx.beginPath();
            this.canvasCtx.moveTo(startPoint.x * this.canvasElement.width, startPoint.y * this.canvasElement.height);
            this.canvasCtx.lineTo(endPoint.x * this.canvasElement.width, endPoint.y * this.canvasElement.height);
            this.canvasCtx.stroke();
        }
        
        // Draw points
        this.canvasCtx.fillStyle = color;
        for (const landmark of landmarks) {
            this.canvasCtx.beginPath();
            this.canvasCtx.arc(
                landmark.x * this.canvasElement.width,
                landmark.y * this.canvasElement.height,
                5, 0, 2 * Math.PI
            );
            this.canvasCtx.fill();
        }
        
        // Draw label
        const wrist = landmarks[0];
        this.canvasCtx.fillStyle = color;
        this.canvasCtx.font = '16px Arial';
        const label = handedness === this.dominantHand ? `${handedness.toUpperCase()} (DOMINANT)` : handedness.toUpperCase();
        this.canvasCtx.fillText(
            label,
            wrist.x * this.canvasElement.width,
            wrist.y * this.canvasElement.height - 10
        );
    }

    drawMovementCircle() {
        const centerX = this.canvasElement.width * this.controlCenter.x;
        const centerY = this.canvasElement.height * this.controlCenter.y;
        const outerRadius = this.canvasElement.width * this.controlRadius;
        
        // Draw outer circle (movement boundary)
        this.canvasCtx.strokeStyle = '#00ff00';
        this.canvasCtx.lineWidth = 3;
        this.canvasCtx.beginPath();
        this.canvasCtx.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI);
        this.canvasCtx.stroke();
        
        // Draw center dot
        this.canvasCtx.fillStyle = '#00ff00';
        this.canvasCtx.beginPath();
        this.canvasCtx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
        this.canvasCtx.fill();
        
        // Label
        this.canvasCtx.fillStyle = '#00ff00';
        this.canvasCtx.font = '14px Arial';
        this.canvasCtx.fillText('MOVEMENT ZONE', centerX - 60, centerY - outerRadius - 10);
    }

    isHandGrabbing(landmarks) {
        // Check if hand is in fist position
        // Compare fingertip distances to palm
        const palm = landmarks[0];
        const fingers = [
            landmarks[8],  // index tip
            landmarks[12], // middle tip
            landmarks[16], // ring tip
            landmarks[20]  // pinky tip
        ];
        
        let closedCount = 0;
        for (const finger of fingers) {
            const distance = Math.sqrt(
                Math.pow(finger.x - palm.x, 2) +
                Math.pow(finger.y - palm.y, 2) +
                Math.pow(finger.z - palm.z, 2)
            );
            
            if (distance < 0.15) {
                closedCount++;
            }
        }
        
        return closedCount >= 3; // At least 3 fingers closed
    }

    isHandOpen(landmarks) {
        // Check if hand is open
        const palm = landmarks[0];
        const fingers = [
            landmarks[8],  // index tip
            landmarks[12], // middle tip
            landmarks[16], // ring tip
            landmarks[20]  // pinky tip
        ];
        
        let openCount = 0;
        for (const finger of fingers) {
            const distance = Math.sqrt(
                Math.pow(finger.x - palm.x, 2) +
                Math.pow(finger.y - palm.y, 2) +
                Math.pow(finger.z - palm.z, 2)
            );
            
            if (distance > 0.2) {
                openCount++;
            }
        }
        
        return openCount >= 3; // At least 3 fingers open
    }

    updateGestures() {
        // Both hands grabbing
        this.bothHandsGrabbing = 
            this.handData.left.detected && this.handData.left.grabbing &&
            this.handData.right.detected && this.handData.right.grabbing;
        
        // Non-dominant hand grabbing
        const nonDominant = this.dominantHand === 'right' ? 'left' : 'right';
        this.nonDominantGrabbing = 
            this.handData[nonDominant].detected && 
            this.handData[nonDominant].grabbing;
        
        // Dominant hand open
        if (this.handData[this.dominantHand].detected && 
            this.handData[this.dominantHand].landmarks) {
            this.dominantHandOpen = this.isHandOpen(this.handData[this.dominantHand].landmarks);
        } else {
            this.dominantHandOpen = false;
        }
        
        // CRITICAL: Call the callback!
        if (this.onGestureChange) {
            this.onGestureChange({
                bothHands: this.bothHandsGrabbing,
                nonDominant: this.nonDominantGrabbing,
                dominantOpen: this.dominantHandOpen
            });
        }
    }

    updateMovement() {
        if (!this.handData[this.dominantHand].detected || !this.handData[this.dominantHand].landmarks) {
            this.movement = { x: 0, y: 0, magnitude: 0 };
            if (this.onHandUpdate) {
                this.onHandUpdate(this.movement);
            }
            return;
        }
        
        const landmarks = this.handData[this.dominantHand].landmarks;
        const palm = landmarks[9];
        
        // Calculate position relative to control center
        const dx = palm.x - this.controlCenter.x;
        const dy = palm.y - this.controlCenter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // OUTSIDE circle = deadzone (no movement)
        if (distance > this.controlRadius) {
            this.movement = { x: 0, y: 0, magnitude: 0 };
            if (this.onHandUpdate) {
                this.onHandUpdate(this.movement);
            }
            return;
        }
        
        // Calculate magnitude (0 at center, 1 at edge)
        const magnitude = distance / this.controlRadius;
        
        // Calculate direction
        const dirX = dx / (distance || 0.001);
        const dirY = dy / (distance || 0.001);
        
        this.movement = {
            x: dirX,
            y: dirY,
            magnitude: magnitude
        };
        
        if (this.onHandUpdate) {
            this.onHandUpdate(this.movement);
        }
    }

    updateCursor() {
        let handToUse = this.dominantHand;
        let landmarks = null;
        
        if (this.handData[handToUse].detected && this.handData[handToUse].landmarks) {
            landmarks = this.handData[handToUse].landmarks;
            this.lastCursorHand = handToUse;
        } else {
            // Fall back to whichever hand is detected
            if (this.handData.left.detected && this.handData.left.landmarks) {
                landmarks = this.handData.left.landmarks;
                this.lastCursorHand = 'left';
            } else if (this.handData.right.detected && this.handData.right.landmarks) {
                landmarks = this.handData.right.landmarks;
                this.lastCursorHand = 'right';
            }
        }
        
        if (!landmarks) {
            this.cursorHoldDuration = 0;
            this.cursorHoldStartTime = null;
            this.lastCursorHand = null;
            return;
        }
        
        const indexTip = landmarks[8]; // Index finger tip
        
        // Update cursor position (normalized)
        this.cursorPosition = {
            x: indexTip.x,
            y: indexTip.y
        };
        
        if (this.onCursorMove) {
            this.onCursorMove(this.cursorPosition);
        }
        
        // Check if cursor is holding on a position
        // Use the hand that's controlling the cursor
        const controllingHand = this.lastCursorHand;
        const isHolding = this.handData[controllingHand] && 
                         (this.handData[controllingHand].grabbing || 
                          !this.isHandOpen(landmarks));
        
        if (isHolding) {
            if (this.cursorHoldStartTime === null) {
                this.cursorHoldStartTime = Date.now();
            }
            this.cursorHoldDuration = (Date.now() - this.cursorHoldStartTime) / 1000;
            
            if (this.onCursorHold) {
                this.onCursorHold(this.cursorPosition, this.cursorHoldDuration);
            }
        } else {
            this.cursorHoldStartTime = null;
            this.cursorHoldDuration = 0;
        }
    }
updateMovement() {
    if (!this.handData[this.dominantHand].detected || !this.handData[this.dominantHand].landmarks) {
        this.movement = { x: 0, y: 0, magnitude: 0 };
        if (this.onHandUpdate) {
            this.onHandUpdate(this.movement);
        }
        return;
    }
    
    const landmarks = this.handData[this.dominantHand].landmarks;
    const palm = landmarks[9]; // Middle of palm
    
    // Calculate position relative to control center
    const dx = palm.x - this.controlCenter.x;
    const dy = palm.y - this.controlCenter.y;
    
    // Calculate distance from center
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Apply deadzone - no movement if within deadzone radius
    if (distance < this.deadZoneRadius) {
        this.movement = { x: 0, y: 0, magnitude: 0 };
        if (this.onHandUpdate) {
            this.onHandUpdate(this.movement);
        }
        return;
    }
    
    // Calculate magnitude (0 at deadzone edge, 1 at control radius edge)
    const adjustedDistance = distance - this.deadZoneRadius;
    const adjustedRadius = this.controlRadius - this.deadZoneRadius;
    const magnitude = Math.min(adjustedDistance / adjustedRadius, 1.0);
    
    // Calculate direction (invert Y for natural movement)
    const dirX = dx / (distance || 1);
    const dirY = -dy / (distance || 1); // Invert Y
    
    this.movement = {
        x: dirX,
        y: dirY,
        magnitude: magnitude
    };
    
    if (this.onHandUpdate) {
        this.onHandUpdate(this.movement);
    }
}
    setDominantHand(hand) {
        this.dominantHand = hand;
        console.log(`Dominant hand set to: ${hand}`);
    }

    cleanup() {
        if (this.camera) {
            this.camera.stop();
        }
        if (this.videoElement) {
            this.videoElement.remove();
        }
        this.initialized = false;
    }

    resetCursorHold() {
        this.cursorHoldStartTime = null;
        this.cursorHoldDuration = 0;
    }

}

// Make it available globally
window.HandTracking = HandTracking;