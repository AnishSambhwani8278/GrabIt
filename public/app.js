const socket = io();

const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');

const fileInput = document.getElementById('fileInput');
const uploadPrompt = document.getElementById('uploadPrompt');
const imageContainer = document.getElementById('imageContainer');
const sharedImage = document.getElementById('sharedImage');
const dropZone = document.getElementById('dropZone');
const downloadBtn = document.getElementById('downloadBtn');
const loadingOverlay = document.getElementById('loadingOverlay');

const gestureStateUI = document.getElementById('gestureState');
const sharingStateUI = document.getElementById('sharingState');
const statusIndicator = document.querySelector('.status-indicator');
const statusDot = document.getElementById('statusDot');

const themeToggle = document.getElementById('themeToggle');
const modeToggle = document.getElementById('modeToggle');

const roomSelection = document.getElementById('roomSelection');
const createRoomBtn = document.getElementById('createRoomBtn');
const roomCodeInput = document.getElementById('roomCodeInput');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomError = document.getElementById('roomError');
const mainHeader = document.getElementById('mainHeader');
const mainApp = document.getElementById('mainApp');
const currentRoomCodeDisplay = document.getElementById('currentRoomCodeDisplay');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');

let hasImageLocal = false;
let networkSharing = false;
let currentGesture = 'NONE';
let lastGestureTime = 0;
let gestureCooldown = 1000;
let isReceiving = false;
let currentMode = 'share';
let currentRoomCode = null;
let receivedViaNetwork = false;

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('grabIt-theme', theme);
}

const savedTheme = localStorage.getItem('grabIt-theme') || 'dark';
applyTheme(savedTheme);

themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
});

const modeButtons = modeToggle.querySelectorAll('.mode-toggle-btn');
modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const newMode = btn.dataset.mode;
        if (newMode === currentMode) return;


        if (currentMode === 'receive' && newMode === 'share' && hasImageLocal && receivedViaNetwork) {
            sharedImage.classList.add('anim-fade-vanish');
            imageContainer.style.display = 'flex';

            sharedImage.addEventListener('animationend', () => {
                sharedImage.classList.remove('anim-fade-vanish');
                hasImageLocal = false;
                receivedViaNetwork = false;
                sharedImage.src = '';
                imageContainer.style.display = 'none';
                downloadBtn.style.display = 'none';
                currentMode = newMode;
                updateModeButtons();
                updateUIMode();
            }, { once: true });
            return;
        }

        currentMode = newMode;
        updateModeButtons();
        updateUIMode();
    });
});

function updateModeButtons() {
    modeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === currentMode);
    });
}

function updateUIMode() {
    uploadPrompt.style.display = 'none';
    dropZone.style.display = 'none';
    imageContainer.style.display = 'none';
    downloadBtn.style.display = 'none';
    loadingOverlay.style.display = 'none';

    if (currentMode === 'share') {
        if (hasImageLocal) {
            imageContainer.style.display = 'flex';
        } else {
            uploadPrompt.style.display = 'flex';
        }
    } else {

        if (hasImageLocal) {
            imageContainer.style.display = 'flex';
            if (receivedViaNetwork) {
                downloadBtn.style.display = 'flex';
            }
        } else if (isReceiving) {
            loadingOverlay.style.display = 'flex';
        } else {
            dropZone.style.display = 'flex';
        }
    }


    if (networkSharing) {
        sharingStateUI.innerText = 'Image Nearby';
        if (statusDot) statusDot.classList.add('active');
    } else {
        sharingStateUI.innerText = 'Idle';
        if (statusDot) statusDot.classList.remove('active');
    }
}

createRoomBtn.addEventListener('click', () => {
    socket.emit('create_room');
});

joinRoomBtn.addEventListener('click', () => {
    const code = roomCodeInput.value.trim();
    if (code.length === 5) {
        socket.emit('join_room', { code });
        roomError.innerText = '';
    } else {
        roomError.innerText = 'Please enter a valid 5-digit code';
    }
});

leaveRoomBtn.addEventListener('click', () => {
    socket.emit('leave_room');
    currentRoomCode = null;
    showRoomSelection();
});

socket.on('room_created', (data) => {
    currentRoomCode = data.code;
    showMainApp();
});

socket.on('room_joined', (data) => {
    currentRoomCode = data.code;
    networkSharing = data.isSharing;
    showMainApp();
});

socket.on('room_error', (data) => {
    roomError.innerText = data.message;
});

function showRoomSelection() {
    roomSelection.style.display = 'flex';
    mainHeader.style.display = 'none';
    mainApp.style.display = 'none';

    hasImageLocal = false;
    networkSharing = false;
    isReceiving = false;
    receivedViaNetwork = false;
    roomCodeInput.value = '';
    sharedImage.src = '';

    updateUIMode();
}

function showMainApp() {
    roomSelection.style.display = 'none';
    mainHeader.style.display = 'flex';
    mainApp.style.display = 'flex';
    currentRoomCodeDisplay.innerText = currentRoomCode;
    updateUIMode();
}

socket.on('connect', () => {
    statusIndicator.classList.add('ready');
});

socket.on('disconnect', () => {
    statusIndicator.classList.remove('ready');
});

socket.on('sharing_state_update', (data) => {
    networkSharing = data.isSharing;
    updateUIMode();
});

socket.on('receive_image', (data) => {
    sharedImage.src = data.imageData;
    sharedImage.className = 'anim-drop';
    hasImageLocal = true;
    isReceiving = false;
    receivedViaNetwork = true;


    lastGestureTime = Date.now() + 2000;

    updateUIMode();

    setTimeout(() => {
        sharedImage.className = '';
    }, 600);
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width * 0.6;
                canvas.height = img.height * 0.6;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                sharedImage.src = canvas.toDataURL('image/jpeg', 0.8);
                hasImageLocal = true;
                receivedViaNetwork = false;

                sharedImage.className = 'anim-drop';
                updateUIMode();

                setTimeout(() => {
                    sharedImage.className = '';
                }, 600);
            };
            img.src = event.target.result;

        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }
});

const imageArea = document.getElementById('imageArea');

imageArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (currentMode === 'receive' && !hasImageLocal) {
        dropZone.classList.add('drag-over');
    }
});

imageArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
});

imageArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');

    if (currentMode !== 'receive' || hasImageLocal) return;

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width * 0.6;
                canvas.height = img.height * 0.6;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                sharedImage.src = canvas.toDataURL('image/jpeg', 0.8);
                hasImageLocal = true;
                receivedViaNetwork = true;

                sharedImage.className = 'anim-drop';
                updateUIMode();

                setTimeout(() => {
                    sharedImage.className = '';
                }, 600);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

downloadBtn.addEventListener('click', () => {
    if (!sharedImage.src) return;
    const a = document.createElement('a');
    a.href = sharedImage.src;
    a.download = 'grabit-image.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

function detectGesture(landmarks) {
    const wrist = landmarks[0];
    let openCount = 0;

    const fingers = [
        { tip: 8, mcp: 5 },
        { tip: 12, mcp: 9 },
        { tip: 16, mcp: 13 },
        { tip: 20, mcp: 17 }
    ];

    for (let f of fingers) {
        const tipDist = Math.hypot(landmarks[f.tip].x - wrist.x, landmarks[f.tip].y - wrist.y);
        const mcpDist = Math.hypot(landmarks[f.mcp].x - wrist.x, landmarks[f.mcp].y - wrist.y);
        if (tipDist > mcpDist * 1.5) {
            openCount++;
        }
    }

    if (openCount >= 3) return 'OPEN';
    if (openCount <= 1) return 'CLOSED';
    return 'UNKNOWN';
}

function processGesture(gesture) {
    const now = Date.now();
    gestureStateUI.innerText = gesture;

    if (gesture === 'UNKNOWN' || gesture === currentGesture) return;

    const previousGesture = currentGesture;
    currentGesture = gesture;

    if (now - lastGestureTime < gestureCooldown) return;


    if (previousGesture === 'OPEN' && currentGesture === 'CLOSED' && hasImageLocal && currentMode === 'share') {
        triggerGrab();
        lastGestureTime = now;
    }


    if ((previousGesture === 'CLOSED' || previousGesture === 'NONE') && currentGesture === 'OPEN' && networkSharing && !hasImageLocal && !isReceiving && currentMode === 'receive') {
        triggerDrop();
        lastGestureTime = now;
    }
}

function triggerGrab() {
    console.log("Triggered GRAB");
    sharedImage.className = 'anim-grab';

    setTimeout(() => {
        hasImageLocal = false;
        updateUIMode();
        socket.emit('image_grabbed', { imageData: sharedImage.src });
    }, 500);
}

function triggerDrop() {
    console.log("Triggered DROP");
    isReceiving = true;
    updateUIMode();
    socket.emit('image_claimed');
}

const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

hands.onResults((results) => {

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
            canvasCtx.restore();
            canvasCtx.save();
            const gesture = detectGesture(landmarks);
            processGesture(gesture);
        }
    } else {
        gestureStateUI.innerText = 'No Hand';
        currentGesture = 'NONE';
        canvasCtx.restore();
    }
});

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480
});

updateUIMode();
camera.start();
