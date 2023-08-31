const video = document.getElementById("video");
let isDetectionRunning = false;
let isMuted = false;

const toggleButton = document.getElementById("toggleButton");

const MODEL_URI = "/models";
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

let totalDetections = 0;

function playTick() {
  if (isMuted) {
    return; // Exit the function if muted.
  }
  const oscillator = audioContext.createOscillator();
  oscillator.type = "square"; // square wave
  oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // value in hertz
  oscillator.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.05); // stops the sound after 50ms
}

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI),
  faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URI),
])
  .then(playVideo)
  .catch((err) => {
    console.log(err);
  });

function playVideo() {
  if (!navigator.mediaDevices) {
    console.error("mediaDevices not supported");
    return;
  }
  navigator.mediaDevices
    .getUserMedia({
      video: {
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 360, ideal: 720, max: 1080 },
      },
      audio: false,
    })
    .then(function (stream) {
      video.srcObject = stream;
    })
    .catch(function (err) {
      console.log(err);
    });
}

let detectionInterval; // Declare this at the top of the script.

// Handle the mute button
document.getElementById("muteButton").addEventListener("click", function () {
  isMuted = !isMuted; // Toggle the mute state
  this.textContent = isMuted ? "Unmute" : "Mute";
});

toggleButton.addEventListener("click", function () {
  if (isDetectionRunning) {
    // If the detection is running, stop it.
    clearInterval(detectionInterval);
    this.textContent = "Start";
  } else {
    // If the detection is not running, start it.
    startDetection();
    this.textContent = "Stop";
  }
  isDetectionRunning = !isDetectionRunning; // Toggle the flag.
});

function startDetection() {
  detectionInterval = setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();

    const redCircle = document.getElementById("redCircle");
    let counter = 0;
    for (let detection of detections) {
      const landmarks = detection.landmarks;
      const noseTip = landmarks.getNose()[2];
      const leftEye = landmarks.getLeftEye()[0];
      const rightEye = landmarks.getRightEye()[3];

      if (noseTip.x > leftEye.x && noseTip.x < rightEye.x) {
        counter++;
      }
    }

    if (counter > 0) {
      totalDetections += counter;
      document.getElementById("faceCount").textContent = counter;
      document.getElementById("detectionCount").textContent = totalDetections;
      playTick();

      // Flash the red circle
      redCircle.classList.add("active-flash");
      setTimeout(() => redCircle.classList.remove("active-flash"), 50); // Remove the class after the animation's duration.
    }
  }, 200);
}
