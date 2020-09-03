let pid = 0;

const PROTOCOL = {
  PING: ++pid,
  MESSAGE: ++pid,
  SPAWN: ++pid,
  STATE: ++pid,
  INPUT: ++pid,
  DATA: ++pid
};

const WALL_TYPES = {
  RECTANGLE: 0,
  CIRCLE: 1,
  POLYGON: 2
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
        if(data.hasOwnProperty('walls')) walls = data.walls;
        if(data.hasOwnProperty('map')) map = data.map;
        break;
      }
    }
  }
};

Server.connect = function() {
  if(!this.ws) this.ws = new WebSocket('wss://acidic-mini-bromine.glitch.me/');
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
  cam.x = player.x + 20 * ((mouseX - width / 2) / (width / 2));
  cam.y = player.y + 20 * ((mouseY - height / 2) / (height / 2));
  
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
      stroke('#000');
      strokeWeight(2);
      line(0, 0, wall.width / 2, 0);
      rotate(0 - wall.angle);
      translate(0 - x, 0 - y);
      break
    }
    
    case WALL_TYPES.CIRCLE: {
      circle(x, y, wall.radius * 2);
      translate(x, y);
      rotate(wall.angle);
      stroke('#000');
      strokeWeight(2);
      line(0, 0, wall.radius, 0);
      rotate(0 - wall.angle);
      translate(0 - x, 0 - y);
      break
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
  
  circle(x, y, (radius / 2 - player.armor / 10 - 2) * (player.health / 100) * 2);
  
  textAlign(CENTER);
  textSize(14);
  textFont('Arial');
  
  noStroke();
  fill('#666666');
  
  text(player.name, x, y + player.radius + 14);
  
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
        angle(player.x - cam.x, player.y - cam.y, mouseX - width / 2, mouseY - height / 2)
      ]
    });
  }, 1000 / 60);
  
  element("menu-container").style.display = "none";
  
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

function element(id) {
  return document.getElementById(id);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

Server.connect();
