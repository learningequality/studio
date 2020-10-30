const html2canvas = require('html2canvas');

let screenShot;
let takes = 0;

function emitScreenshot() {
  window.parent.postMessage({ __screenshotDataURI: screenShot });
}

function takeScreenshot() {
  html2canvas(document.body).then(canvas => {
    const capture = canvas.toDataURL();
    if (screenShot !== capture && takes < 10) {
      screenShot = capture;
      takes += 1;
      setTimeout(takeScreenshot, 500);
    } else {
      emitScreenshot();
    }
  });
}

window.addEventListener('load', takeScreenshot);
