// By Simon Sarris
// www.simonsarris.com
// sarris@acm.org
//
// Last update December 2011
//
// Free to use and distribute at will
// So long as you are nice to people, etc

// Constructor for Shape objects to hold data for all drawn objects.
// For now they will just be defined as rectangles.

//By garychen
//gchen@mozilla.com
//Last update November 2012
//add rotate feature
//add layer feature
//change image.load rank
var TO_RADIANS = Math.PI/180,
    pubs;
    
$(function(){
  init();
  $('#del_bt').on('click', function(){
    removesel();
  });
  
  $('#left_bt').on('click',function(){
    rotateBox(-1);
  });
  
  $('#right_bt').on('click',function(){
    rotateBox(1);
  });
  
  $('#save_bt').on('click', function(){
    var canvas = pubs.canvas;
    pubs.selection = null;
    pubs.valid = false;
    pubs.draw();
    var dataimgurl = canvas.toDataURL("image/png");
    $.post('savepic.php',{dataurl:dataimgurl},function(data){
     //$('#test').html(data);
     $('#okimage').attr('src', data).css('display','block');
    });
    
  });
})

function removesel(){
  var shapes = pubs.shapes;
  var del = shapes.pop();
  pubs.selection = null;
  pubs.valid = false;
  pubs.draw();
}

function rotateBox(direct){
  var selobj = pubs.selection;
  selobj.angle = selobj.angle+20*direct+360;
  //console.log(direct);
  pubs.valid = false;
  pubs.draw();
}


function Shape(x, y, w, h, angle, label, rotate, image, fill) {
  // This is a very simple and unsafe constructor. All we're doing is checking if the values exist.
  // "x || 0" just means "if there is a value for x, use that. Otherwise use 0."
  // But we aren't checking anything else! We could put "Lalala" for the value of x 
  this.x = x || 0;
  this.y = y || 0;
  this.w = w || 1;
  this.h = h || 1;
  this.fill = fill || '#AAAAAA';
  this.label = label || 'noname';
  this.rotate = rotate || false;
  this.angle = angle || 0;
  this.img = image;
}

// Draws this shape to a given context
Shape.prototype.draw = function(ctx) {
  var locx = this.x;
  var locy = this.y;
  var locw = this.w;
  var loch = this.h;
  var angle = this.angle;
  var rotate =this.rotate;
  var imgsrc= this.src;
  var img = this.img; 
  ctx.save(); 
  ctx.translate(locx+locw/2, locy+loch/2);
  ctx.rotate(angle * TO_RADIANS);
  ctx.drawImage(img, -(locw/2), -(loch/2));
  ctx.restore(); 
}

// Determine if a point is inside the shape's bounds
Shape.prototype.contains = function(mx, my) {
  // All we have to do is make sure the Mouse X,Y fall in the area between
  // the shape's X and (X + Height) and its Y and (Y + Height)
  return  (this.x <= mx) && (this.x + this.w >= mx) &&
          (this.y <= my) && (this.y + this.h >= my);
}

function CanvasState(canvas, bgimage) {
  // **** First some setup! ****
  
  this.canvas = canvas;
  this.width = canvas.width;
  this.height = canvas.height;
  this.ctx = canvas.getContext('2d');
  this.toolbox = document.getElementById('tool') ;
  this.BG = bgimage;
  
  // This complicates things a little but but fixes mouse co-ordinate problems
  // when there's a border or padding. See getMouse for more detail
  var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
  if (document.defaultView && document.defaultView.getComputedStyle) {
    this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10)      || 0;
    this.stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10)       || 0;
    this.styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10)  || 0;
    this.styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10)   || 0;
  }
  // Some pages have fixed-position bars (like the stumbleupon bar) at the top or left of the page
  // They will mess up mouse coordinates and this fixes that
  var html = document.body.parentNode;
  this.htmlTop = html.offsetTop;
  this.htmlLeft = html.offsetLeft;

  // **** Keep track of state! ****
  
  this.valid = false; // when set to false, the canvas will redraw everything
  this.shapes = [];  // the collection of things to be drawn
  this.dragging = false; // Keep track of when we are dragging
  // the current selected object. In the future we could turn this into an array for multiple selection
  this.selection = null;
  this.dragoffx = 0; // See mousedown and mousemove events for explanation
  this.dragoffy = 0;
  
  // **** Then events! ****
  
  // This is an example of a closure!
  // Right here "this" means the CanvasState. But we are making events on the Canvas itself,
  // and when the events are fired on the canvas the variable "this" is going to mean the canvas!
  // Since we still want to use this particular CanvasState in the events we have to save a reference to it.
  // This is our reference!
  var myState = this;
  
  this.selectstart = function selectstart (e){
    e.preventDefault(); return false; 
  } 
  
  this.touch_mousedown = function touch_mousedown (e){
    var mouse = myState.getMouse(e);
    var mx = mouse.x;
    var my = mouse.y;
    var shapes = myState.shapes;
    var l = shapes.length;
    for (var i = l-1; i >= 0; i--) {
      if (shapes[i].contains(mx, my)) {
        var mySel = shapes[i];
        shapes.splice(i, 1);
        shapes.push(mySel);
        // Keep track of where in the object we clicked
        // so we can move it smoothly (see mousemove)
        myState.dragoffx = mx - mySel.x;
        myState.dragoffy = my - mySel.y;
        myState.dragging = true;
        myState.selection = mySel;
        myState.valid = false;
        myState.draw(); //redraw
        return;
      }
    }
    // havent returned means we have failed to select anything.
    // If there was an object selected, we deselect it
    if (myState.selection) {
      myState.selection = null;
      myState.valid = false; // Need to clear the old selection border
      myState.draw(); //redraw
    }
  } 
  
  this.touch_mousemove = function touch_mousemove(e) {
    if (myState.dragging){
      var mouse = myState.getMouse(e);
      // We don't want to drag the object by its top-left corner, we want to drag it
      // from where we clicked. Thats why we saved the offset and use it here
      myState.selection.x = mouse.x - myState.dragoffx;
      myState.selection.y = mouse.y - myState.dragoffy;   
      myState.valid = false; // Something's dragging so we must redraw
      myState.draw(); //redraw
    }
  } 
  
  this.touch_mouse_end = function touch_mouse_end(e) {
    myState.dragging = false;
  }
  
  /*
  this.db_touch_mouse = function db_touch_mouse(e) {
    //add new icon
    //var mouse = myState.getMouse(e);
    //myState.addShape(new Shape(mouse.x - 10, mouse.y - 10, 20, 20, '', false, 'rgba(0,255,0,.6)'));
    //myState.cleanSelborder();
  }
  */
  
  //fixes a problem where double clicking causes text to get selected on the canvas
  canvas.addEventListener('selectstart', this.selectstart, false);
  
  // Up, down, and move are for dragging
  canvas.addEventListener('mousedown', this.touch_mousedown, true);
  canvas.addEventListener("touchstart", this.touch_mousedown, false);
  
  canvas.addEventListener('mousemove', this.touch_mousemove, true);
  canvas.addEventListener("touchmove", this.touch_mousemove, false);
  
  
  canvas.addEventListener('mouseup', this.touch_mouse_end, true);
  canvas.addEventListener("touchend", this.touch_mouse_end, false);
  canvas.addEventListener("touchcancel", this.touch_mouse_end, false);
  canvas.addEventListener("touchleave", this.touch_mouse_end, false);
  
  // double click for making new shapes
  //canvas.addEventListener('dblclick', this.db_touch_mouse, true);
  
  // **** Options! ****
  
  this.selectionColor = '#CC0000';
  this.selectionWidth = 2;
  /*  
  this.interval = 30;
  setInterval(function() { myState.draw(); }, myState.interval);
  */
}

CanvasState.prototype.addShape = function(shape) {
  this.shapes.push(shape);
  this.valid = false;
}

CanvasState.prototype.clear = function() {
  this.ctx.clearRect(0, 0, this.width, this.height);
}

CanvasState.prototype.cleanSelborder = function() {
  if (this.selection != null) {
    this.selection = null;
    this.valid = false;
  }
}

CanvasState.prototype.showtool = function(posx, posy){
  this.toolbox.style.display = 'block';
  this.toolbox.style.top = posy+10+'px';
  this.toolbox.style.left = posx+'px';
  //console.log(posx+":"+posy);
}

CanvasState.prototype.hidetool = function(){
  this.toolbox.style.display = 'none';
}
// While draw is called as often as the INTERVAL variable demands,
// It only ever does something if the canvas gets invalidated by our code
CanvasState.prototype.g_draw = function() {
  var ctx = this.ctx;
  var gctx = this.gctx;
  var canvas = this.canvas;
  
  var imgData=ctx.getImageData(0,0, canvas.width, canvas.height);
  gctx.putImageData(imgData,0,0);
}

CanvasState.prototype.drawBG = function() {
  var bg = this.BG;
  var ctx = this.ctx;
  ctx.drawImage(bg, 0, 0);
  //console.log('draw bg');
}

CanvasState.prototype.draw = function() {
  // if our state is invalid, redraw and validate!
  if (!this.valid) {
    //console.log('redraw');
    var ctx = this.ctx;
    var shapes = this.shapes;
    this.clear(); //reset canvas
    this.drawBG();// set default bg
    
    // ** Add stuff you want drawn in the background all the time here **
    
    // draw all shapes
    var l = shapes.length;
    for (var i = 0; i < l; i++) {
      var shape = shapes[i];
      // We can skip the drawing of elements that have moved off the screen:
      if (shape.x > this.width || shape.y > this.height ||
          shape.x + shape.w < 0 || shape.y + shape.h < 0) continue;
      shapes[i].draw(ctx);
    }
    // draw selection
    // right now this is just a stroke along the edge of the selected Shape
    if (this.selection != null) {
      ctx.strokeStyle = this.selectionColor;
      ctx.lineWidth = this.selectionWidth;
      var mySel = this.selection;
      ctx.strokeRect(mySel.x,mySel.y,mySel.w,mySel.h);
      //console.log("select:"+mySel.label);
      this.showtool(mySel.x, (mySel.y+mySel.h));
    }else{
      //console.log("select null");
      this.hidetool();
    }
    // ** Add stuff you want drawn on top all the time here **
    this.valid = true;
  }
}


// Creates an object with x and y defined, set to the mouse position relative to the state's canvas
// If you wanna be super-correct this can be tricky, we have to worry about padding and borders
CanvasState.prototype.getMouse = function(e) {
  var element = this.canvas, offsetX = 0, offsetY = 0, mx, my,touches = e.changedTouches;
  
  var _pageX = e.pageX || touches[0].pageX;
  var _pageY = e.pageY || touches[0].pageY;
  // Compute the total offset
  if (element.offsetParent !== undefined) {
    do {
      offsetX += element.offsetLeft;
      offsetY += element.offsetTop;
    } while ((element = element.offsetParent));
  }

  // Add padding and border style widths to offset
  // Also add the <html> offsets in case there's a position:fixed bar
  offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
  offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;

  mx = _pageX - offsetX;
  my = _pageY - offsetY;
  
  // We return a simple javascript object (a hash) with x and y defined
  return {x: mx, y: my};
}

// If you dont want to use <body onLoad='init()'>
// You could uncomment this init() reference and place the script reference inside the body tag
//init();

function init() {
  var BGimage = new Image();
  BGimage.src = document.getElementById('bgimage').src;
  BGimage.onload = function(){
    console.log(BGimage.src);
    pubs = new CanvasState(document.getElementById('pad'), BGimage);
  }
  
  var aurora= new Image();
  aurora.src = 'aurora.png';
  aurora.onload = function(){ 
    pubs.addShape(new Shape(100,100,128,128,0,'aurora', false, aurora)); // The default is gray
    pubs.valid = false;
    pubs.draw();
  }
  
  var firefox = new Image();
  firefox.src = 'firefox.png';
  firefox.onload = function(){ 
    pubs.addShape(new Shape(300,100,128,128,0, 'firefox',false ,firefox,'lightskyblue'));
    pubs.valid = false;
    pubs.draw();
  }
  
  var nightly = new Image();
  nightly.src = 'nightly.png';
  nightly.onload = function(){ 
    pubs.addShape(new Shape(500,100,128,128,0, 'nightly',false ,nightly,'lightskyblue'));
    pubs.valid = false;
    pubs.draw();
  }
  
  var nightly2 = new Image();
  nightly2.src = 'logo.png';
  nightly2.onload = function(){ 
    pubs.addShape(new Shape(700,100,128,128,0, 'nightly',false ,nightly2,'lightskyblue'));
    pubs.valid = false;
    pubs.draw();
  }
  
  // Lets make some partially transparent
  //s.addShape(new Shape(500,100,128,128,0, 'nightly',false,'nightly.png', 'rgba(127, 255, 212, .5)'));
  //s.addShape(new Shape(700,100,128,128,0, 'js',false,'logo.png', 'rgba(245, 222, 179, .7)'));

}

// Now go make something amazing!