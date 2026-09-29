const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const backgroundMusic = document.getElementById('backgroundMusic');
const videoSource = 'video.mp4';
const animalSets = [
  {
    name: 'zorro',
    sources: [
      'zorro 1.png',
      'zorro 2.png',
      'zorro 3.png',
      'zorro 4.png',
      'zorro 5.png',
      'zorro 6.png'
    ],
    images: []
  },
  {
    name: 'tiburon',
    sources: [
      'tiburón 1.png',
      'tiburón 2.png',
      'tiburón 3.png',
      'tiburón 4.png',
      'tiburón 5.png',
      'tiburón 6.png'
    ],
    images: []
  },
  {
    name: 'aguila',
    sources: [
      'aguila 1.png',
      'aguila 2.png',
      'aguila 3.png',
      'aguila 4.png',
      'aguila 5.png',
      'aguila 6.png'
    ],
    images: []
  }
];
let poseDetector;
let loadedCount = 0;
const totalImages = 18;

// =====================================================
// CARGAR IMÁGENES
// =====================================================

animalSets.forEach(set => {
  set.sources.forEach(src => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      loadedCount++;
    };
    img.onerror = () => {
      console.error('No se pudo cargar:', src);
    };
    set.images.push(img);
  });
});

// =====================================================
// CONFIGURAR VÍDEO
// =====================================================

async function setupVideo() {
  video.src = videoSource;
  return new Promise(resolve => {
    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      resolve();
    };
  });
}

// =====================================================
// CONFIGURAR MODELO
// =====================================================

async function initModels() {
  await tf.ready();
  poseDetector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    {
      modelType:
        poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING
    }
  );
}

// =====================================================
// DIBUJAR ANIMAL
// =====================================================

function drawAnimal(
  x,
  y,
  size,
  imgIndex,
  animalSetIndex,
  time
) {
  if (loadedCount < totalImages) return;
  const set = animalSets[animalSetIndex];
  const img =
    set.images[imgIndex % set.images.length];
  const angle =
    Math.sin(time / 600 + imgIndex) * 0.08;
  const pulse =
    1 + Math.sin(time / 900 + imgIndex) * 0.04;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const finalSize =
    size * 0.38 * pulse;
  ctx.drawImage(
    img,
    -finalSize / 2,
    -finalSize / 2,
    finalSize,
    finalSize
  );
  ctx.restore();
}

// =====================================================
// PROCESAR CADA FRAME
// =====================================================

async function processFrame(timestamp) {
  if (video.paused || video.ended) {
    return;
  }

  // Dibujar vídeo

  ctx.drawImage(
    video,
    0,
    0,
    canvas.width,
    canvas.height
  );

  // Detectar personas

  if (
    poseDetector &&
    loadedCount === totalImages
  ) {
    const poses =
      await poseDetector.estimatePoses(video);
    poses.forEach((pose, index) => {
      const kp = {};
      pose.keypoints.forEach(k => {
        kp[k.name] = k;
      });
      const thresh = 0.3;

      // Cada persona recibe un animal diferente

      const animalIdx =
        index % animalSets.length;

      // =================================================
      // COMPROBAR TORSO
      // =================================================

      if (
        kp.left_shoulder?.score > thresh &&
        kp.right_shoulder?.score > thresh &&
        kp.left_hip?.score > thresh &&
        kp.right_hip?.score > thresh
      ) {
        const bodyWidth =
          Math.hypot(
            kp.left_shoulder.x -
              kp.right_shoulder.x,

            kp.left_shoulder.y -
              kp.right_shoulder.y
          );


        // =================================================
        // TORSO
        // =================================================

        for (let i = 0; i <= 4; i++) {
          const t = i / 4;
          const xL =
            kp.left_shoulder.x * (1 - t) +
            kp.left_hip.x * t;
          const xR =
            kp.right_shoulder.x * (1 - t) +
            kp.right_hip.x * t;
          const y =
            kp.left_shoulder.y * (1 - t) +
            kp.left_hip.y * t;
          drawAnimal(
            xL,
            y,
            bodyWidth,
            i,
            animalIdx,
            timestamp
          );
          drawAnimal(
            xR,
            y,
            bodyWidth,
            i + 1,
            animalIdx,
            timestamp
          );
          drawAnimal(
            (xL + xR) / 2,
            y,
            bodyWidth,
            i + 2,
            animalIdx,
            timestamp
          );
        }

        // =================================================
        // PIERNA IZQUIERDA
        // =================================================

        if (kp.left_knee?.score > thresh) {
          for (let j = 1; j <= 3; j++) {
            const t = j / 3;
            const px =
              kp.left_hip.x * (1 - t) +
              kp.left_knee.x * t;
            const py =
              kp.left_hip.y * (1 - t) +
              kp.left_knee.y * t;
            drawAnimal(
              px,
              py,
              bodyWidth * 0.6,
              j + 10,
              animalIdx,
              timestamp
            );
          }
        }

        // =================================================
        // PIERNA DERECHA
        // =================================================

        if (kp.right_knee?.score > thresh) {
          for (let j = 1; j <= 3; j++) {
            const t = j / 3;
            const px =
              kp.right_hip.x * (1 - t) +
              kp.right_knee.x * t;
            const py =
              kp.right_hip.y * (1 - t) +
              kp.right_knee.y * t;
            drawAnimal(
              px,
              py,
              bodyWidth * 0.6,
              j + 15,
              animalIdx,
              timestamp
            );
          }
        }
      }
    });
  }
  requestAnimationFrame(processFrame);
}

// =====================================================
// BOTÓN DE MÚSICA
// =====================================================

function createMusicButton() {
  const button = document.createElement('button');
  button.textContent = '▶ Música';
  button.style.position = 'fixed';
  button.style.bottom = '20px';
  button.style.right = '20px';
  button.style.zIndex = '9999';
  button.style.padding = '12px 20px';
  button.style.border = 'none';
  button.style.borderRadius = '8px';
  button.style.background = '#ffffff';
  button.style.color = '#000000';
  button.style.fontSize = '16px';
  button.style.cursor = 'pointer';
  button.addEventListener('click', async () => {
    if (backgroundMusic.paused) {
      try {
        await backgroundMusic.play();
        button.textContent = '❚❚ Música';
      } catch (error) {
        console.error(
          'No se pudo reproducir la música:',
          error
        );
      }
    } else {
      backgroundMusic.pause();
      button.textContent = '▶ Música';
    }
  });
  document.body.appendChild(button);
}

// =====================================================
// INICIO
// =====================================================

(async () => {
  await setupVideo();
  await initModels();
  createMusicButton();
  video.play();
  requestAnimationFrame(processFrame);
})();