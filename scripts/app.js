function el(e = document, startNode = document) {
  return typeof e !== 'string' ? e : startNode.querySelector(e);
}

function on(e, t, c) {
  el(e).addEventListener(t, c, !1);
}

function show(e) {
  el(e).style.display = 'block';
}

function hide(e) {
  el(e).style.display = 'none';
}

const _ = undefined;

let pid = 0;
let chatting = false;

const SERVER_URL = 'gats-server.herokuapp.com';
const PROTOCOL = {
  PING: ++pid,
  DATA: ++pid,
  STATE: ++pid,
  SPAWN: ++pid,
  INPUT: ++pid,
  CHAT: ++pid
};
let socket, interval;
let map = { width: 0, height: 0 };
let cam = { x: 0, y: 0 };
let player = { x: 0, y: 0, color: [0, 0, 0], message: '' };
let players = [];
let walls = [];
let keys = new Set();
let WALL_TYPES = { RECTANGLE: 0, CIRCLE: 1 };
let encoder = new TextEncoder(), decoder = new TextDecoder();

function connect() {
  socket = new WebSocket('wss://' + SERVER_URL);
  socket.binaryType = 'arraybuffer';
  
  on(socket, 'open', () => {
    show('#menu-container');
    hide('#helper-text');
  });
  
  on(socket, 'close', () => {
    hide('#menu-container');
    hide('canvas');
    hide('#chat-input');
    show('#helper-text');
    
    el('#helper-text').innerText = 'Disconnected. Click to reload';
    
    on(_, 'click', () => { location.reload(); });
  });
  
  on(socket, 'message', message);
}

function message(e) {
  let data = e.data;
  
  data = JSON.parse(decoder.decode(data));
  
  switch(data.id) {
    case PROTOCOL.PING: {
      send({ id: PROTOCOL.PING });
      break;
    }
    
    case PROTOCOL.DATA: {
      if(data.hasOwnProperty('arena')) map = data.arena;
      if(data.hasOwnProperty('walls')) walls = data.walls;
      break;
    }
    
    case PROTOCOL.STATE: {
      player = data.self;
      players = data.players;
      break;
    }
  }
}

function _send(data) {
  if(socket.readyState === 1) socket.send(data);
}

function send(data) {
  _send(encoder.encode(JSON.stringify(data)).buffer);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  hide('canvas');
  
  noLoop();
}

function draw() {
  cam.x = player.x + 40 * ((mouseX - width / 2) / (width / 2));
  cam.y = player.y + 40 * ((mouseY - height / 2) / (height / 2));
  
  clear();
  
  translate(width / 2, height / 2);
  //scale(0.5);
  
  noStroke();
  fill('#efeff5');
  rect(0 - cam.x, 0 - cam.y, map.width, map.height);
  
  drawGrid();
  drawBorder();
  drawWalls();
  drawPlayers();
  drawPlayer(player);
  
  let point = findPoint(player.x, player.y, player.angle, 60);
  
  let preview = {
    angle: 0,
    color: [0, 0, 0, 0],
    height: 40,
    type: 0,
    width: 40,
    x: point.x,
    y: point.y
  };

  drawWall(preview);
  
  //scale(2);
  
  translate(0 - width / 2, 0 - height / 2);
  
  drawMinimap();
  
  textAlign(LEFT, BASELINE);
  textSize(14);
  textFont('Arial');
  textStyle(BOLD);
  
  noStroke();
  fill('green');
  
  text('Playing as ' + player.name, 5, 20);
}

function drawGrid() {
  const size = 20;
  
  stroke([0, 0, 0, 0.1 * 255]);
  strokeWeight(1);
  noFill();
  
  for(let i = 0; i < map.height / size; i++) {
    line(0 - cam.x, i * size - cam.y, map.width - cam.x, i * size - cam.y);
  }
  for(let i = 0; i < map.width / size; i++) {
    line(i * size - cam.x, 0 - cam.y, i * size - cam.x, map.height - cam.y);
  }
}

function drawBorder() {
  rectMode(CORNER);
  
  stroke('#000');
  strokeWeight(4);
  noFill();
  
  rect(0 - cam.x, 0 - cam.y, map.width, map.height);
}

function drawWalls() {
  for(const wall of walls) drawWall(wall);
}

function drawWall(wall) {
  const x = wall.x - cam.x;
  const y = wall.y - cam.y;
  
  angleMode(DEGREES);
  rectMode(CENTER);
  
  stroke('#808080');
  strokeWeight(5);
  fill(wall.color);
  
  switch(wall.type) {
    case WALL_TYPES.RECTANGLE: {
      translate(x, y);
      rotate(wall.angle);
      rect(0, 0, wall.width, wall.height);
      rotate(0 - wall.angle);
      translate(0 - x, 0 - y);
      break;
    }
    
    case WALL_TYPES.CIRCLE: {
      circle(x, y, wall.radius * 2);
      break;
    }
  }
}

function drawPlayers() {
  for(const player of players) drawPlayer(player);
}

function drawPlayer(player) {
  const x = player.x - cam.x;
  const y = player.y - cam.y;
  
  const radius = player.radius;
  
  noStroke();
  fill([102, 102, 102]);
  
  circle(x, y, radius * 2);
  
  fill(player.color);
  
  circle(x, y, (radius - player.armor / 10 - 2) * 2);
  
  fill([255, 255, 255, 0.5]);
  
  circle(x, y, (radius / 2 - player.armor / 10 - 2) * 2);
  
  fill(player.color);
  
  circle(x, y, (radius / 2 - player.armor / 10 - 2) * (player.health / player.maxHealth) * 2);
  
  textAlign(CENTER, TOP);
  textSize(14);
  textFont('Arial');
  textStyle(BOLD);
  
  noStroke();
  fill('#666666');
  
  text('[' + player.id + '] ' + player.name + ' ' + player.cooldown, x, y + player.radius + 5);
  
  if(player.message.length) {
    rectMode(CENTER);
    
    noStroke();
    fill([157, 157, 159]);
    
    rect(x, y + player.radius + 30, textWidth(player.message) + 10, 20);
    
    textAlign(CENTER, CENTER);
    
    fill('#fff');
    
    text(player.message, x, y + player.radius + 30);
  } else if(player.input[6]) {
    rectMode(CENTER);
    
    noStroke();
    fill([157, 157, 159]);
    
    rect(x, y + player.radius + 30, textWidth('...') + 10, 20);
    
    textAlign(CENTER, CENTER);
    
    fill('#fff');
    
    text('...', x, y + player.radius + 30);
  }
  
  stroke('#000');
  strokeWeight(2);
  
  angleMode(DEGREES);
  translate(x, y);
  rotate(player.angle);
  line(0, 0, player.radius, 0);
  rotate(0 - player.angle);
  translate(0 - x, 0 - y);
}

function drawMinimap() {
  const x = 5;
  const y = 30;
  const width = 150;
  const height = 150;
  
  rectMode(CORNER);
  
  stroke('#000');
  strokeWeight(2);
  fill([0, 0, 0, 0.3 * 255]);
  
  rect(x, y, width, height);
  
  noStroke();
  
  for(const player of players) {
    fill(player.color);
    
    circle(
      x + width * (player.x / map.width),
      y + height * (player.y / map.height),
      7
    );
  }
  
  fill([255, 241, 51]);
    
  circle(
    x + width * (player.x / map.width),
    y + height * (player.y / map.height),
    7
  );
}

function play() {
  send({
    id: PROTOCOL.SPAWN,
    armor: el('#armor-select').value,
    name: el('#name-input').value
  });
  
  interval = setInterval(function(){
    send({
    id: PROTOCOL.INPUT,
    input: [
      !chatting && keys.has(65),
      !chatting && keys.has(68),
      !chatting && keys.has(87),
      !chatting && keys.has(83),
      angle(player.x - cam.x, player.y - cam.y, mouseX - width / 2, mouseY - height / 2),
      !chatting && keys.has(32),
      chatting
    ]
  });
  })
  
  hide('#menu-container');
  show('canvas');
  
  on(_, 'keypress', chat);
  
  loop();
}

function angle(cx, cy, ex, ey) {
  var dy = ey - cy;
  var dx = ex - cx;
  var theta = Math.atan2(dy, dx); // range (-PI, PI]
  theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
  //if (theta < 0) theta = 360 + theta; // range [0, 360)
  return theta;
}

function findPoint(x, y, angle, distance) {
  let result = {};
  
  result.x = Math.round(Math.cos(angle * Math.PI / 180) * distance + x);
  result.y = Math.round(Math.sin(angle * Math.PI / 180) * distance + y);

  return result;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function chat(e) {
  if(e.keyCode !== 13) return;
  if(chatting) {
    chatting = false;
    hide('#chat-input');
    
    let message = el('#chat-input').value;
    
    if(message !== '') {
      send({ id: PROTOCOL.CHAT, message: message })
    }
    
    el('#chat-input').value = '';
  } else {
    chatting = true;
    show('#chat-input');
    el('#chat-input').focus();
  }
}

document.addEventListener('keydown', function(e) {
  keys.add(e.keyCode);
});

document.addEventListener('keyup', function(e) {
  keys.delete(e.keyCode);
});

on('#play-button', 'click', play);

connect();
