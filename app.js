let id = 0;

const PROTOCOL = {
  PING: ++id,
  MESSAGE: ++id,
  SPAWN: ++id,
  STATE: ++id,
  INPUT: ++id,
  WALLS: ++id
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
      case PROTOCOL.WALLS: {
        walls = data.walls;
        break;
      }
    }
  }
};

Server.connect = function() {
  if(!this.ws) this.ws = new WebSocket('wss://gats-server.herokuapp.com/');
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

const canvas = element("canvas");
const ctx = canvas.getContext("2d");

const map = {
  width: 2000,
  height: 2000
};
const cam = new Point(0, 0);
const keys = new Set();

let interval = null;
let player = null;
let players = [];
let walls = [];

const minimap = new Rectangle(5, 30, 150, 150);
minimap.render = function() {
  ctx.save();
  ctx.translate(-(ctx.canvas.width / 2), -(ctx.canvas.height / 2));
  
  ctx.beginPath();
  ctx.rect(this.x, this.y, this.width, this.height);
  ctx.closePath();
  
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#000";
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.stroke();
  ctx.fill();
  
  for(let i = 0; i < players.length; i++) {
    if(!players[i].spawned) continue;
    ctx.beginPath();
    ctx.arc(
      this.x + this.width * (players[i].x / map.width),
      this.y + this.height * (players[i].y / map.height),
      2 + this.width / 150,
      0,
      2 * Math.PI
    );
    ctx.closePath();
    ctx.fillStyle = "rgb(" + players[i].color + ")";
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(
    this.x + this.width * (player.x / map.width),
    this.y + this.height * (player.y / map.height),
    3 + this.width / 150,
    0,
    2 * Math.PI
  );
  ctx.closePath();
  ctx.fillStyle = "rgb(255, 241, 51)";
  ctx.fill();
  
  ctx.restore();
};

function renderGrid() {
  let offsetX = cam.x % 20;
  let offsetY = cam.y % 20;
  
  ctx.beginPath();
  
  for(
    let i = -(canvas.height / 2 / 20);
    i < canvas.height / 2 / 20;
    i++
  ) {
    ctx.moveTo(-(canvas.width / 2), i * 20 - offsetY);
    ctx.lineTo(canvas.width / 2, i * 20 - offsetY);
  }
  
  for(
    let i = -(canvas.width / 2 / 20);
    i < canvas.width / 2 / 20 + 2;
    i++
  ) {
    ctx.moveTo(i * 20 - offsetX, -(canvas.height / 2));
    ctx.lineTo(i * 20 - offsetX, canvas.height / 2);
  }
  
  ctx.closePath();
    
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
  ctx.stroke();
};

function renderBorder() {
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 10;
  ctx.strokeRect(0 - cam.x, 0 - cam.y, map.width, map.height);
}

function renderWall(wall) {
  ctx.fillStyle = "rgb(" + wall.color + ")";
  ctx.strokeStyle = "#808080";
  ctx.beginPath();
  ctx.rect(wall.x - cam.x, wall.y - cam.y, wall.width, wall.height);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
}

function renderPlayer(player) {
  if(!player || !player.spawned) return;
  const x = player.x - cam.x;
  const y = player.y - cam.y;
    
  ctx.beginPath();
  ctx.arc(x, y, player.radius, 0, 2 * Math.PI);
  ctx.closePath();
  
  ctx.fillStyle = "rgb(102, 102, 102)";
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(x, y, (player.radius - player.armor / 10 - 2), 0, 2 * Math.PI);
  ctx.closePath();
  
  ctx.fillStyle = "rgb(" + player.color + ")";
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(x, y, (player.radius - player.armor / 10 - 2), 0, 2 * Math.PI);
  ctx.closePath();
  
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(
    x,
    y,
    (player.radius - player.armor / 10 - 2) * (player.health / 100),
    0,
    2 * Math.PI
  );
  ctx.closePath();
  
  ctx.fillStyle = "rgb(" + player.color + ")";
  ctx.fill();
  
  if(!player.moved) {
    ctx.beginPath();
    ctx.arc(x, y, player.radius, 0, 2 * Math.PI);
    ctx.closePath();
  
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fill();
  }
  
  ctx.fillStyle = "#666666";
  ctx.textAlign = "center";
  ctx.font = "600 14px Arial";
  
  ctx.fillText(
    player.name,
    x,
    y + player.radius + 14
  );
}

function render() {  
  if(keys.has(77)) {
    minimap.size(ctx.canvas.height - 200, ctx.canvas.height - 200);
    minimap.move(ctx.canvas.width / 2 - minimap.width / 2, ctx.canvas.height / 2 - minimap.height / 2);
  } else {
    minimap.move(5, 30);
    minimap.size(150, 150);
  }
  Server.send(PROTOCOL.INPUT, {
    input: [keys.has(65), keys.has(68), keys.has(87), keys.has(83)]
  });
  cam.move(player ? player : new Point(0, 0));
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
	ctx.translate(canvas.width / 2, canvas.height / 2);
  
  renderGrid();
  renderBorder();
  for(const wall of walls) renderWall(wall);
  for(const player of players) renderPlayer(player);
  renderPlayer(player);
  minimap.render();
  ctx.restore();
  
  if(!player) return;
  
  ctx.fillStyle = "green";
  ctx.textAlign = "left";
  ctx.font = "600 14px Arial";
  ctx.fillText("Playing as " + player.name, 5, 20);
}

function play() {
  Server.send(PROTOCOL.SPAWN, {
    armor: element("armor-select").value,
    name: element("name-input").value
  });
  
  interval = setInterval(() => {
		render(ctx);
	}, 1000 / 60);
  
  element("menu-container").style.display = "none";
}

function element(id) {
  return document.getElementById(id);
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function resize() {
	canvas.width = innerWidth;
	canvas.height = innerHeight;
}

addEventListener('resize', resize);
addEventListener('keydown', e => keys.add(e.keyCode));
addEventListener('keyup', e => keys.delete(e.keyCode));

resize();

Server.connect();
