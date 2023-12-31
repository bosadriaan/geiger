const video = document.getElementById("video");
let isDetectionRunning = false;
let isMuted = false;
let detectionInterval;
let totalDetections = 0;
let totalDetectionsf = 0;
const toggleButton = document.getElementById("toggleButton");
toggleButton.textContent = "Loading..";
const MODEL_URI = "/models";
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const supportsVibration = "vibrate" in navigator;

let tightnessFactor = 0.8;
document.getElementById('accuracySlider').value = tightnessFactor;
document.getElementById('sliderValue').textContent = tightnessFactor.toFixed(2);

document.getElementById('accuracySlider').addEventListener('input', function(event) {
  tightnessFactor = parseFloat(event.target.value);
  document.getElementById('sliderValue').textContent = tightnessFactor.toFixed(2);  // Displaying the value to 2 decimal places
});

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI),
  // faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URI),
  faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URI),
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
        facingMode: "environment",
        advanced: [{ zoom: 2 }],
      },
      audio: false,
    })
    .then(function (stream) {
      video.srcObject = stream;

      // Warm-up the detector after a slight delay to ensure we have video frames
      setTimeout(async () => {
        await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          // .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks(true); // true means use TinyModel
        console.log("Warm-up detection completed.");
        toggleButton.textContent = "Start";
      }, 200);
    })
    .catch(function (err) {
      console.log(err);
    });
}

// Handle the mute button
document.getElementById("muteButton").addEventListener("click", function () {
  isMuted = !isMuted; // Toggle the mute state
  this.textContent = isMuted ? "Unmute" : "Mute";
});

toggleButton.addEventListener("click", function () {
  // Toggle the flag at the start
  isDetectionRunning = !isDetectionRunning;
  
  if (isDetectionRunning) {
    // If the detection is now running, start it.
    startDetection();
    if (supportsVibration) {
      navigator.vibrate(50); // Vibrate for 200 milliseconds
    }
    this.textContent = "Stop";
  } else {
    // If the detection has been stopped, reflect that.
    this.textContent = "Start";
  }
});


function processFrame() {
  console.log('Processing Frame..')
  // Start asynchronous face detection for the current frame
  faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.2, inputSize: 800 }))
      // .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.2 }))
      .withFaceLandmarks(true)
      .then(detections => {
          let counterf = 0;
          let counter = 0;
          for (let detection of detections) {
              const landmarks = detection.landmarks;
              const noseTip = landmarks.getNose()[2];
              const leftEye = landmarks.getLeftEye()[0];
              const rightEye = landmarks.getRightEye()[3];
              counterf++;
              // let tightnessFactor = 0.3;
              const middlePoint = leftEye.x + (rightEye.x - leftEye.x) / 2;
              const allowedDeviation = ((rightEye.x - leftEye.x) / 2) * tightnessFactor;
              if (
                  noseTip.x > middlePoint - allowedDeviation &&
                  noseTip.x < middlePoint + allowedDeviation
              ) {
                  counter++;
              }
          }
          totalDetections += counter;
          totalDetectionsf += counterf;
          document.getElementById("faceCountf").textContent = counterf;
          document.getElementById("faceCount").textContent = counter;
          document.getElementById("detectionCountf").textContent = totalDetectionsf;
          document.getElementById("detectionCount").textContent = totalDetections;
          if (counter > 0) {
              playTick(counter);
              if (supportsVibration) {
                  navigator.vibrate([50, 20]);
              }

              const redCircle = document.getElementById("redCircle");
              redCircle.classList.add("active-flash");
              setTimeout(() => redCircle.classList.remove("active-flash"), 50);
          }

          // Schedule next frame processing
          console.log(isDetectionRunning)
          if (isDetectionRunning) {
              setTimeout(processFrame, 350);
          }
      })
      .catch(err => {
          console.error("Error processing frame:", err);
      });
}

// Modify the startDetection function to initiate the recursive mechanism
function startDetection() {
  isDetectionRunning = true;
  processFrame();
}


function playTick(beepCount) {
  if (isMuted) {
    return; // Exit the function if muted.
  }
  for (let i = 0; i < beepCount; i++) {
    setTimeout(() => {
      const oscillator = audioContext.createOscillator();
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      oscillator.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.05);
    }, i * 80);
  }
}
