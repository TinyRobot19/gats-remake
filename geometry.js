Math.dist = (p1, p2) => {
  const a = p1.x - p2.x;
  const b = p1.y - p2.y;

  return Math.hypot(a, b);
}

class Tree {
  constructor() {
    this.objects = [];
  }
  
  add(object) {
    this.objects.push(object);
  }
  
  remove(object) {
    const index = this.objects.findIndex(obj => obj.ID === object.ID);
    if(i >= 0) this.objects.slice(index, 1);
  }
  
  get(rect) {
    const objects = [];
    const length = this.objects.length;
    for(let i = 0; i < length; i++) {
      if(pointRect(this.objects[i], rect)) objects.push(this.objects[i]);
    }
    return objects;
  }
}

class Point {
  constructor(x, y) {
  	this.x = x;
  	this.y = y;
  }
  
  move() {
    if(arguments.length === 1) {
      this.x = arguments[0].x;
      this.y = arguments[0].y;
    } else if(arguments.length === 2) {
      this.x = arguments[0];
      this.y = arguments[1];
    }
  }
}

class Circle extends Point {
  constructor(x, y, radius) {
    super(x, y);
    this.radius = radius;
  }
}

class Rectangle extends Point {
  constructor(x, y, width, height) {
  	super(x, y);
  	this.width = width;
  	this.height = height;
  }
  
  size(width, height) {
    this.width = width;
  	this.height = height;
  }
}

function pointPoint(p1, p2) {
    return p1.x === p2.x && p1.y === p2.y;
}

function pointCircle(p, c) {
  const distance = Math.dist(p, c);

  return distance <= c.radius;
}

function circleCircle(c1, c2) {
  const distance = Math.dist(c1, c2);

  return distance <= c1.radius + c2.radius;
}

function pointRect(p, r) {
  return p.x >= r.x &&
    p.x <= r.x + r.width &&
    p.y >= r.y &&
    p.y <= r.y + r.height
}

function rectRect(r1, r2) {
  return r1.x + r1.width >= r2.x &&
    r1.x <= r2.x + r2.width &&
    r1.y + r1.height >= r2.y &&
    r1.y <= r2.y + r2.height
}

function circleRect(c, r) {
	let testX = c.x;
  let testY = c.y;
	
	if(c.x < r.x) testX = r.x;
		else if(c.x > r.x + r.width) testX = r.x + r.width;
	if(c.y < r.y) testY = r.y;
		else if(c.y > r.y + r.height) testY = r.y + r.height;
	
	const distance = Math.dist(c, new Point(testX, testY));
	
	return distance <= c.radius;
}