let pid = 0;

const PROTOCOL = {
  PING: ++pid,
  MESSAGE: ++pid,
  SPAWN: ++pid,
  STATE: ++pid,
  INPUT: ++pid,
  DATA: ++pid
};

const Server = {
  ws: null,
  onopen(e) {
    alert('Connected');
  },
  onclose(e) {
    this.ws = null;
    alert('Disconnected');
  },
  onmessage(e) {
    const data = JSON.parse(e.data);
    switch(data.id) {
      case PROTOCOL.PING: {
        this.pinged = Date.now();
        this.ping();
        break;
      }
      case PROTOCOL.MESSAGE: {
        console.log(data.message);
        break;
      }
      case PROTOCOL.STATE: {
        player = data.self;
        players = data.players;
        break;
      }
      case PROTOCOL.DATA: {
        walls = data.walls;
        map = data.map;
        break;
      }
    }
  }
};

Server.connect = function() {
  if(!this.ws) this.ws = new WebSocket('wss://acidic-mini-bromine.glitch.me');
  this.ws.onopen = this.onopen.bind(this);
  this.ws.onclose = this.onclose.bind(this);
  this.ws.onmessage = this.onmessage.bind(this);
};

Server.disconnect = function() {
  if(this.ws && this.ws.readyState === 1) this.ws.close();
};

Server._send = function(data) {
  if(this.ws && this.ws.readyState === 1) this.ws.send(data);
};

Server.send = function(id, data) {
  const obj = {id: id};
  for(const prop in data) if(data.hasOwnProperty(prop)) obj[prop] = data[prop];
  this._send(JSON.stringify(obj));
};

Server.ping = function() {
  this.send(PROTOCOL.PING, {});
};

let map = {
  width: 0,
  height: 0
};
const cam = {x: 0, y: 0};

let interval = null;
let player = {x: 0, y: 0};
let players = [];
let walls = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  noLoop();
}

function draw() {
  try {
  cam.x = player.x;
  cam.y = player.y;
  
  clear();
  
  translate(width / 2, height / 2);
  
  fill('#efeff5');
  rect(0 - cam.x, 0 - cam.y, map.width, map.height);
  
  drawGrid();
  drawBorder();
  drawWalls();
  drawPlayers();
  drawPlayer(player);
  
  translate(0 - width / 2, 0 - height / 2);
  
  drawMinimap();
  
  rectMode(CORNER);
  
  textAlign(LEFT);
  textSize(14);
  textFont('Arial');
  
  noStroke();
  fill('green');
  
  text('Playing as ' + player.name, 5, 20);
  } catch(e){}
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
  rectMode(CENTER);
  
  stroke('#808080');
  strokeWeight(5);
  fill(wall.color);
  
  rect(wall.x - cam.x, wall.y - cam.y, wall.width, wall.height);
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
  
  circle(x, y, (radius / 2 - player.armor / 10 - 2) * (player.health / 100) * 2);
  
  textAlign(CENTER);
  textSize(14);
  textFont('Arial');
  
  fill('#666666');
  
  text(player.name, x, y + player.radius + 14);
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
  
  for(const player of players) {
    noStroke();
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
  Server.send(PROTOCOL.SPAWN, {
    armor: element("armor-select").value,
    name: element("name-input").value
  });
  
  interval = setInterval(function() {
    Server.send(PROTOCOL.INPUT, {
      input: [
        keyIsDown(65),
        keyIsDown(68),
        keyIsDown(87),
        keyIsDown(83),
      ]
    });
  }, 1000 / 60);
  
  element("menu-container").style.display = "none";
  
  loop();
}

function element(id) {
  return document.getElementById(id);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

Server.connect();
