// Main Variables
const RAD = Math.PI / 180;
const canvas = document.getElementById("canvas");
const canvasTx = canvas.getContext("2d");
canvasTx.tabIndex = 1;
let screenFrame = 0;
const player = {
  gameActive: true,
  gamePlaying: false,
};

// Main Functions
["keydown", "click"].forEach(event => {
  window.addEventListener(event, () => {
    if (player.gameActive) {
      player.gameActive = false;
      player.gamePlaying = true;
      pipe.pipe = [];
    }
    if (player.gamePlaying) {
      playingObject.flying();
      SFX.bg.play();
      SFX.start.play();
    } else {
      pipe.pipe = [];
      SFX.bg.currentTime = 0;
      playingObject.rotation = 0;
      playingObject.position.y = 50;
      UI.score[0].current = 0;
      player.gameActive = true;
    }
  }, true);
});

// Draw and Animate the Bird
const playingObject = {
  frames: 0,
  position: { x: 60, y: 50 },
  speed: 0,
  gravity: 0.125,
  thrust: 2.6,
  rotation: 0,
  imgAnimation: [
    { playObjectImg: new Image() },
    { playObjectImg: new Image() },
    { playObjectImg: new Image() }
  ],
  draw() {
    canvasTx.save();
    canvasTx.translate(this.position.x, this.position.y);
    canvasTx.rotate(this.rotation * RAD);
    canvasTx.drawImage(
      this.imgAnimation[this.frames].playObjectImg,
      -this.imgAnimation[this.frames].playObjectImg.width / 2,
      -this.imgAnimation[this.frames].playObjectImg.height / 2
    );
    canvasTx.restore();
  },
  updateFrames() {
    if (player.gameActive) {
      this.frames += screenFrame % 10 === 0 ? 1 : 0;
      this.position.y += screenFrame % 8 === 0 ? Math.sin(screenFrame * RAD) : 0;
    } else if (player.gamePlaying) {
      this.frames += screenFrame % 10 === 0 ? 1 : 0;
      this.position.y += this.speed;
      this.speed += this.gravity;
      this.updateRotation();
      this.checkCollision();
    } else {
      this.frames = 1;
      if (this.position.y + this.imgAnimation[0].playObjectImg.width / 2 < ground.position.y) {
        this.position.y += this.speed;
        this.updateRotation();
        this.speed += this.gravity * 2;
      }
    }
    this.frames %= this.imgAnimation.length;
  },
  flying() {
    if (this.position.y > 0) {
      SFX.flap.play();
      this.speed = -this.thrust;
    }
  },
  updateRotation() {
    if (this.speed <= 0) {
      this.rotation = Math.max(-25, (-25 * this.speed) / (-1 * this.thrust));
    } else {
      this.rotation = Math.min(90, (90 * this.speed) / (this.thrust * 2));
    }
  },
  checkCollision() {
    if (!pipe.pipe.length) return;
    const x = pipe.pipe[0].x;
    const y = pipe.pipe[0].y;
    const birdPro = this.imgAnimation[0].playObjectImg.width / 2;
    const groundPro = canvas.height - ground.groundImg.height;
    const pipeHeight = y + pipe.topPipe.pipeImg.height;
    const pipeWidth = pipe.topPipe.pipeImg.width;
    if (groundPro - birdPro <= this.position.y) {
      player.gamePlaying = false;
    }
    if (this.position.x + birdPro / 2 >= x && this.position.x + birdPro < x + pipeWidth) {
      if (this.position.y - birdPro <= pipeHeight || this.position.y + birdPro >= pipeHeight + pipe.pipeGap) {
        SFX.hit.play();
        SFX.bg.pause();
        player.gamePlaying = false;
      }
    }
  }
};

// Draw Background
const background = {
  backgroundImg: new Image(),
  position: { x: 0, y: 0 },
  draw() {
    canvasTx.drawImage(this.backgroundImg, this.position.x, canvas.height - this.backgroundImg.height);
  }
};

// Draw Ground
const ground = {
  groundImg: new Image(),
  dx: 2,
  position: { x: 0, y: 0 },
  draw() {
    canvasTx.drawImage(this.groundImg, this.position.x, canvas.height - this.groundImg.height);
  },
  update() {
    if (player.gamePlaying) {
      this.position.x -= this.dx;
      this.position.x %= this.groundImg.width / 14;
    }
  }
};

// Draw Pipes
const pipe = {
  topPipe: { pipeImg: new Image() },
  bottomPipe: { pipeImg: new Image() },
  pipe: [],
  pipeGap: 85,
  move: true,
  draw() {
    for (let i = 0; i < this.pipe.length; i++) {
      let p = this.pipe[i];
      canvasTx.drawImage(this.topPipe.pipeImg, p.x, p.y);
      canvasTx.drawImage(this.bottomPipe.pipeImg, p.x, p.y + this.topPipe.pipeImg.height + this.pipeGap);
    }
  },
  update() {
    if (player.gameActive) {
      if (screenFrame % 135 === 0) {
        let randY = -210 * Math.min(Math.random() + 0.9, 1.7);
        this.pipe.push({ x: canvas.width, y: randY });
        playingObject.position.y = randY + this.topPipe.pipeImg.height + this.pipeGap - 60;
      }
      this.pipe.forEach(pipe => pipe.x -= ground.dx);
    } else if (player.gamePlaying) {
      if (screenFrame % 100 === 0) {
        let randY = -210 * Math.min(Math.random() + 0.9, 1.7);
        this.pipe.push({ x: canvas.width, y: randY });
      }
      if (this.move) {
        UI.score[0].current++;
        SFX.score.play();
        this.move = false;
      }
      this.pipe.forEach(pipe => pipe.x -= ground.dx);
    }
    if (this.pipe.length && this.pipe[0].x < -this.topPipe.pipeImg.width) {
      this.pipe.shift();
      this.move = true;
    }
  }
};

// UI Elements
const UI = {
  frames: 0,
  game: [{ start: new Image() }, { over: new Image() }],
  tap: [{ tapImg: new Image() }, { tapImg: new Image() }],
  score: [{ current: 0, best: 0 }],
  draw() {
    if (player.gameActive) {
      canvasTx.fillStyle = "rgba(126, 255, 90, 0.3)";
      canvasTx.fillRect(0, 0, canvas.width, canvas.height);
      canvasTx.drawImage(this.game[0].start, (canvas.width - this.game[0].start.width) / 2, (canvas.height - this.game[0].start.height) / 3);
      canvasTx.drawImage(this.tap[this.frames].tapImg, (canvas.width - this.tap[this.frames].tapImg.width) / 2, (canvas.height - this.tap[this.frames].tapImg.height) / 1.7);
    }
    if (!player.gamePlaying && !player.gameActive) {
      canvasTx.fillStyle = "rgba(60, 100, 20, 0.2)";
      canvasTx.fillRect(0, 0, canvas.width, canvas.height);
      canvasTx.drawImage(this.game[1].over, (canvas.width - this.game[1].over.width) / 2, (canvas.height - this.game[1].over.height) / 2);
      canvasTx.drawImage(this.tap[this.frames].tapImg, (canvas.width - this.tap[this.frames].tapImg.width) / 2, (canvas.height - this.tap[this.frames].tapImg.height) / 1.7);
      SFX.bg.pause();
    }
    this.drawScore();
  },
  drawScore() {
    canvasTx.fillStyle = "#2d8b26";
    canvasTx.font = "20px monospace";
    if (player.gamePlaying) {
      canvasTx.fillText(`Skóre: ${this.score[0].current}`, canvas.width / 20, canvas.height - 60);
      canvasTx.strokeText(`Skóre: ${this.score[0].current}`, canvas.width / 20, canvas.height - 60);
    } else if (player.gameActive) {
      canvasTx.fillText(`Největší skóre: ${localStorage.getItem("best")}`, canvas.height / 20, canvas.height - 60);
      canvasTx.strokeText(`Největší skóre: ${localStorage.getItem("best")}`, canvas.height / 20, canvas.height - 60);
    } else {
      canvasTx.fillText(`TVOJE SKÓRE: ${this.score[0].current}`, canvas.height / 20, canvas.height - 60);
      canvasTx.strokeText(`TVOJE SKÓRE: ${this.score[0].current}`, canvas.height / 20, canvas.height - 60);
    }
  },
  update() {
    if (player.gamePlaying) {
      this.score[0].best = Math.max(this.score[0].current, localStorage.getItem("best"));
      localStorage.setItem("best", this.score[0].best);
    }
    this.frames += screenFrame % 20 === 0 ? 1 : 0;
    this.frames %= this.tap.length;
  }
};

// Audio Setup
const SFX = {
  start: new Audio(),
  flap: new Audio(),
  score: new Audio(),
  hit: new Audio(),
  bg: new Audio()
};

// Update Elements
const updateElements = () => {
  playingObject.updateFrames();
  ground.update();
  pipe.update();
  UI.update();
};

// Draw Elements
const drawElements = () => {
  canvas.height = 450;
  canvas.width = 250;
  canvasTx.fillStyle = "#47f0a9";
  canvasTx.fillRect(0, 0, canvas.width, canvas.height);
  background.draw();
  pipe.draw();
  ground.draw();
  playingObject.draw();
  UI.drawScore();
  UI.draw();
};

// Game Loop
const gameLoop = () => {
  screenFrame++;
  updateElements();
  drawElements();
  requestAnimationFrame(gameLoop);
};

gameLoop();

// Assets Loading
playingObject.imgAnimation[0].playObjectImg.src = "assets/images/brid_img/1_brid.png";
playingObject.imgAnimation[1].playObjectImg.src = "assets/images/brid_img/2_brid.png";
playingObject.imgAnimation[2].playObjectImg.src = "assets/images/brid_img/3_brid.png";
background.backgroundImg.src = "assets/images/ground/background.png";
ground.groundImg.src = "assets/images/ground/1_ground.png";
pipe.topPipe.pipeImg.src = "assets/images/pipe_img/toppipe.png";
pipe.bottomPipe.pipeImg.src = "assets/images/pipe_img/botpipe.png";
UI.game[0].start.src = "assets/images/start&over_game_img/getready.png";
UI.game[1].over.src = "assets/images/start&over_game_img/gameOver.png";
UI.tap[0].tapImg.src = "assets/images/start&over_game_img/1_tap.png";
UI.tap[1].tapImg.src = "assets/images/start&over_game_img/2_tap.png";
SFX.start.src = "assets/audio/Main_sounds/start.wav";
SFX.flap.src = "assets/audio/Main_sounds/flap.wav";
SFX.score.src = "assets/audio/Main_sounds/score.wav";
SFX.hit.src = "assets/audio/Main_sounds/hit.wav";

// Load YouTube Background Music
let youtubeAudioElement = document.createElement("audio");
let youtubeVideoId = "hLlDwPkSajo"; // Replace with your YouTube video ID
let youtubeAudioUrl = `https://www.youtubeinmp3.com/fetch/?video=https://www.youtube.com/watch?v=${youtubeVideoId}`;
youtubeAudioElement.src = youtubeAudioUrl;
SFX.bg = youtubeAudioElement;

// Set Audio Properties
SFX.start.volume = 0.2;
SFX.flap.volume = 0.2;
SFX.score.volume = 0.2;
SFX.hit.volume = 0.2;
SFX.bg.volume = 0.2;
