# GrabIt

GrabIt is an innovative, gesture-based image sharing application that allows users to seamlessly transfer images across devices using hand motions. 

## Features

- **Gesture Control**: Use simple hand gestures (like opening and closing your hand) to "grab" an image from your screen and "drop" it onto another device.
- **Real-Time Sharing**: Connect devices and share images instantly using low-latency WebSockets. 
- **Session Support**: Create isolated 5-digit session rooms to securely pair your devices without overlap or confusion.
- **Responsive UI**: Elegant and highly responsive design with an integrated light/dark mode toggle.

## Technology Stack

- **Frontend**: HTML5, Vanilla JavaScript, CSS3
- **Computer Vision**: [Google MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html) for fast and purely client-side hand tracking 
- **Backend / Networking**: Node.js, Express, Socket.IO

## Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. Clone or download the repository to your local machine.
2. Navigate to the project directory and install the necessary dependencies:
   ```bash
   npm install
   ```

### Running the Application

1. Start the application server:
   ```bash
   node server.js
   ```
2. Open your web browser and navigate to `http://localhost:3000`.

## How to use

1. **Create or Join a Session**: Open the application on two separate devices. Click "Create New Session" on the first device, and use the generated 5-digit code to join the room on the second device.
2. **Share Mode**: On the first device, make sure you are in "Share" mode and upload an image. Once it appears, place your open hand in front of the camera and close your fist directly to "grab" the image. The image will vanish from your local screen and be temporarily held in the network.
3. **Receive Mode**: On the second device, make sure you are in "Receive" mode. You will see a notification indicating an image is floating nearby. Place your closed fist in front of the camera and open your hand to "drop" and successfully receive the image!
