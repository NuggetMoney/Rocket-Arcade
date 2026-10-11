const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");

const healthDisplay = document.querySelector("#health-display");
const scoreDisplay = document.querySelector("#score-display");
const playButton = document.querySelector("#play-button");
const resetButton = document.querySelector("#reset-button");
const arenaSection = document.querySelector("#arena-section");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const keys = new Set();
const mouse = { x: WIDTH / 2 + 100, y: HEIGHT / 2, down: false };

let tank;
let rockets;
let bots;
let particles;
let score;
let lastTime = 0;
let elapsed = 0;
let animationId;
let running = true;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const random = (min, max) => Math.random() * (max - min) + min;

function makeTank() {
  return {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    angle: 0,
    turretAngle: 0,
    speed: 190,
    health: 100,
    cooldown: 0,
    invulnerable: 0,
    radius: 21
  };
}

function makeBot(index) {
  const side = index % 4;
  let x = random(70, WIDTH - 70);
  let y = random(70, HEIGHT - 70);

  if (side === 0) x = 45;
  if (side === 1) x = WIDTH - 45;
  if (side === 2) y = 45;
  if (side === 3) y = HEIGHT - 45;

  if (Math.hypot(x - WIDTH / 2, y - HEIGHT / 2) < 130) {
    x = index % 2 ? WIDTH - 65 : 65;
    y = index % 2 ? 65 : HEIGHT - 65;
  }

  return {
    x,
    y,
    angle: random(0, Math.PI * 2),
    speed: random(24, 42),
    radius: 18,
    health: 2,
    wobble: random(0, 6),
    fireCooldown: random(1, 3)
  };
}

function resetGame() {
  tank = makeTank();
  rockets = [];
  bots = Array.from({ length: 5 }, (_, i) => makeBot(i));
  particles = [];
  score = 0;
  elapsed = 0;
  running = true;
  mouse.down = false;
  updateDisplays();
  draw();
}

function updateDisplays() {
  healthDisplay.textContent = `ARMOR: ${Math.max(0, Math.ceil(tank.health))}`;
  scoreDisplay.textContent = `SCORE: ${score}`;
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: (event.clientX - rect.left) * WIDTH / rect.width,
    y: (event.clientY - rect.top) * HEIGHT / rect.height
  };
}

canvas.addEventListener("pointermove", (event) => {
  const point = canvasPoint(event);
  mouse.x = point.x;
  mouse.y = point.y;
});

canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  event.preventDefault();
  canvas.focus();
  const point = canvasPoint(event);
  mouse.x = point.x;
  mouse.y = point.y;
  mouse.down = true;
});

window.addEventListener("pointerup", () => {
  mouse.down = false;
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (
    ["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)
  ) {
    event.preventDefault();
  }

  keys.add(key);

  if (key === " " && !event.repeat) {
    fireRocket();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

window.addEventListener("blur", () => {
  keys.clear();
  mouse.down = false;
});

playButton.addEventListener("click", () => {
  arenaSection.scrollIntoView({ behavior: "smooth", block: "start" });
  canvas.focus({ preventScroll: true });
});

resetButton.addEventListener("click", resetGame);

function fireRocket() {
  if (!running || tank.cooldown > 0) return;

  const angle = tank.turretAngle;
  const startDistance = 32;

  rockets.push({
    x: tank.x + Math.cos(angle) * startDistance,
    y: tank.y + Math.sin(angle) * startDistance,
    vx: Math.cos(angle) * 420,
    vy: Math.sin(angle) * 420,
    life: 1.6,
    radius: 5,
    owner: "player"
  });

  tank.cooldown = 0.28;

  for (let i = 0; i < 4; i++) {
    addParticle(
      tank.x + Math.cos(angle) * 30,
      tank.y + Math.sin(angle) * 30,
      "#c8ff52",
      0.25
    );
  }
}

function fireBotRocket(bot) {
  const angle = Math.atan2(tank.y - bot.y, tank.x - bot.x);
  const speed = 240;

  rockets.push({
    x: bot.x + Math.cos(angle) * 25,
    y: bot.y + Math.sin(angle) * 25,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 2.2,
    radius: 4,
    owner: "bot"
  });
}

function addParticle(x, y, color, life = 0.5) {
  particles.push({
    x,
    y,
    vx: random(-100, 100),
    vy: random(-100, 100),
    life,
    maxLife: life,
    size: random(2, 5),
    color
  });
}

function explode(x, y, color = "#ff784c", count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = random(35, 160);

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: random(0.25, 0.65),
      maxLife: 0.65,
      size: random(2, 6),
      color
    });
  }
}

function update(dt) {
  if (!running) return;

  elapsed += dt;
  tank.cooldown = Math.max(0, tank.cooldown - dt);
  tank.invulnerable = Math.max(0, tank.invulnerable - dt);

  let dx = 0;
  let dy = 0;

  if (keys.has("w") || keys.has("arrowup")) dy -= 1;
  if (keys.has("s") || keys.has("arrowdown")) dy += 1;
  if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
  if (keys.has("d") || keys.has("arrowright")) dx += 1;

  if (dx || dy) {
    const length = Math.hypot(dx, dy);
    dx /= length;
    dy /= length;

    tank.x += dx * tank.speed * dt;
    tank.y += dy * tank.speed * dt;
    tank.angle = Math.atan2(dy, dx);
  }

  tank.x = clamp(tank.x, 28, WIDTH - 28);
  tank.y = clamp(tank.y, 28, HEIGHT - 28);
  tank.turretAngle = Math.atan2(mouse.y - tank.y, mouse.x - tank.x);

  if (mouse.down) fireRocket();

  for (const bot of bots) {
    bot.wobble += dt * 2;
    bot.fireCooldown -= dt;

    const distance = Math.hypot(tank.x - bot.x, tank.y - bot.y);

    if (distance > 120) {
      const chaseAngle = Math.atan2(tank.y - bot.y, tank.x - bot.x);
      bot.x += Math.cos(chaseAngle) * bot.speed * dt;
      bot.y += Math.sin(chaseAngle) * bot.speed * dt;
      bot.angle = chaseAngle;
    } else {
      bot.angle += Math.sin(bot.wobble) * dt * 0.7;
    }

    if (distance < 360 && bot.fireCooldown <= 0) {
      fireBotRocket(bot);
      bot.fireCooldown = random(2.1, 3.5);
    }

    bot.x = clamp(bot.x, 30, WIDTH - 30);
    bot.y = clamp(bot.y, 30, HEIGHT - 30);
  }

  for (const rocket of rockets) {
    rocket.x += rocket.vx * dt;
    rocket.y += rocket.vy * dt;
    rocket.life -= dt;

    if (
      rocket.x < 10 ||
      rocket.x > WIDTH - 10 ||
      rocket.y < 10 ||
      rocket.y > HEIGHT - 10
    ) {
      rocket.life = 0;
      explode(rocket.x, rocket.y, "#ffb15c", 5);
      continue;
    }

    if (rocket.owner === "player") {
      for (const bot of bots) {
        if (
          bot.health > 0 &&
          Math.hypot(rocket.x - bot.x, rocket.y - bot.y) <
            bot.radius + rocket.radius
        ) {
          rocket.life = 0;
          bot.health -= 1;
          explode(rocket.x, rocket.y, "#ffb15c", 7);

          if (bot.health <= 0) {
            score += 100;
            explode(bot.x, bot.y, "#ff784c", 18);
          }
          break;
        }
      }
    } else if (
      tank.invulnerable <= 0 &&
      Math.hypot(rocket.x - tank.x, rocket.y - tank.y) <
        tank.radius + rocket.radius
    ) {
      rocket.life = 0;
      tank.health -= 15;
      tank.invulnerable = 0.6;
      explode(tank.x, tank.y, "#ff784c", 10);

      if (tank.health <= 0) {
        tank.health = 0;
        running = false;
      }
    }
  }

  rockets = rockets.filter((rocket) => rocket.life > 0);
  bots = bots.filter((bot) => bot.health > 0);

  while (bots.length < 5 && running) {
    bots.push(makeBot(Math.floor(Math.random() * 4)));
  }

  for (const particle of particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
    particle.vx *= 0.98;
    particle.vy *= 0.98;
  }

  particles = particles.filter((particle) => particle.life > 0);
  updateDisplays();
}

function drawBackground() {
  ctx.fillStyle = "#202c3b";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const gradient = ctx.createRadialGradient(
    WIDTH / 2, HEIGHT / 2, 20,
    WIDTH / 2, HEIGHT / 2, WIDTH * 0.7
  );

  gradient.addColorStop(0, "#344254");
  gradient.addColorStop(1, "#1b2431");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = "#a7b7cc12";
  ctx.lineWidth = 1;

  for (let x = 0; x <= WIDTH; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }

  for (let y = 0; y <= HEIGHT; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "#c8ff5255";
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, WIDTH - 24, HEIGHT - 24);

  // Decorative cover blocks
  const blocks = [
    [125, 115, 65, 38],
    [WIDTH - 190, 105, 70, 42],
    [150, HEIGHT - 145, 85, 40],
    [WIDTH - 210, HEIGHT - 155, 70, 45]
  ];

  for (const [x, y, w, h] of blocks) {
    ctx.fillStyle = "#485669";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#64748a";
    ctx.fillRect(x, y, w, 5);
    ctx.strokeStyle = "#111923";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
  }

  ctx.fillStyle = "#ffffff18";
  ctx.font = "800 12px Inter, sans-serif";
  ctx.fillText("BLASTBOUND TRAINING ZONE", 28, 36);
}

function drawTank(x, y, angle, turretAngle, isPlayer = false, flashing = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Tracks
  ctx.fillStyle = "#151b25";
  roundedRect(-23, -18, 46, 36, 7);
  ctx.fill();

  ctx.fillStyle = "#596477";
  for (let i = -15; i <= 15; i += 10) {
    ctx.beginPath();
    ctx.arc(i, -10, 3.5, 0, Math.PI * 2);
    ctx.arc(i, 10, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Main body
  ctx.fillStyle = flashing ? "#ffffff" : isPlayer ? "#a7d948" : "#ff8055";
  ctx.strokeStyle = "#171e27";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-18, -13, 36, 26, 5);
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  // Turret and barrel point toward the mouse or target.
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(turretAngle);

  ctx.fillStyle = "#202630";
  ctx.fillRect(0, -5, 29, 10);

  ctx.fillStyle = isPlayer ? "#d9ff7b" : "#ffac83";
  ctx.fillRect(4, -3, 26, 6);

  ctx.fillStyle = isPlayer ? "#a7d948" : "#ff8055";
  ctx.strokeStyle = "#171e27";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  if (isPlayer) {
    ctx.fillStyle = "#ffffffaa";
    ctx.font = "800 10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("YOU", x, y + 34);
    ctx.textAlign = "left";
  }
}

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function draw() {
  drawBackground();

  // Small arena decorations
  for (let i = 0; i < 12; i++) {
    const x = (i * 137 + 45) % WIDTH;
    const y = (i * 83 + 65) % HEIGHT;

    ctx.fillStyle = "#c8ff521c";
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const bot of bots) {
    drawTank(bot.x, bot.y, bot.angle, Math.atan2(tank.y - bot.y, tank.x - bot.x));
    ctx.fillStyle = "#121722";
    ctx.fillRect(bot.x - 17, bot.y - 29, 34, 4);
    ctx.fillStyle = "#ff8055";
    ctx.fillRect(bot.x - 17, bot.y - 29, 34 * (bot.health / 2), 4);
  }

  drawTank(
    tank.x,
    tank.y,
    tank.angle,
    tank.turretAngle,
    true,
    tank.invulnerable > 0 && Math.floor(elapsed * 15) % 2 === 0
  );

  for (const rocket of rockets) {
    ctx.save();
    ctx.translate(rocket.x, rocket.y);
    ctx.rotate(Math.atan2(rocket.vy, rocket.vx));

    ctx.fillStyle = rocket.owner === "player" ? "#d7ff70" : "#ff8055";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 12;
    ctx.fillRect(-8, -3, 16, 6);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(5, -2, 3, 4);
    ctx.restore();
  }

  for (const particle of particles) {
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (!running) {
    ctx.fillStyle = "#080b12c9";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.textAlign = "center";
    ctx.fillStyle = "#ff8055";
    ctx.font = "900 48px 'Barlow Condensed', sans-serif";
    ctx.fillText("TANK DISABLED", WIDTH / 2, HEIGHT / 2 - 16);

    ctx.fillStyle = "#f4f5fb";
    ctx.font = "600 16px Inter, sans-serif";
    ctx.fillText(`FINAL SCORE: ${score}`, WIDTH / 2, HEIGHT / 2 + 20);

    ctx.fillStyle = "#c8ff52";
    ctx.font = "800 12px Inter, sans-serif";
    ctx.fillText("PRESS RESTART TO PLAY AGAIN", WIDTH / 2, HEIGHT / 2 + 55);
    ctx.textAlign = "left";
  }
}

function frame(time) {
  const dt = Math.min((time - lastTime) / 1000 || 0, 0.035);
  lastTime = time;

  update(dt);
  draw();
  animationId = requestAnimationFrame(frame);
}

resetGame();
cancelAnimationFrame(animationId);
animationId = requestAnimationFrame(frame);
