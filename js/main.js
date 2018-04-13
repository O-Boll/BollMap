/*
This file is part of BollMap.

Copyright 2018 Olle Eriksson

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/



'use strict';

function init() {
    const canvas = document.getElementById('mapCanvas');
    const context = canvas.getContext('2d');
    const mercatorImage = document.getElementById('mercatorImg');
    
    const mapList = document.getElementById("mapList");
    const i = mapList.selectedIndex;
    const mapID = mapList[i].id;
    let map = new Map(canvas, context, mapID);//(canvas, context, mercatorImage);
    
    window.addEventListener('resize', () => {map.update();} );
    canvas.addEventListener('mousedown', (event) => {canvasMouseDown(event, map);} );
    canvas.addEventListener('wheel', (event) => {canvasWheel(event, map);} );
    
    canvas.addEventListener('mousemove', (event) => {updateCoordinates(event, map)});
    
    initToolboxes(map);
    map.update();
}

/* mapID should be a key in mapInfo. All necessary info is found there. */
function Map(canvas, context, mapID) {
    this.canvas = canvas;
    this.context = context;
    this.info = mapInfo[mapID];
    this.P = this.setProjection(this.info.projection);
    this.image = document.getElementById(this.info.imgID);
    this.author = 'author';
    this.license = 'licence';
    this.aspectRatio = this.image.width / this.image.height;
    this.width = this.image.width;
    this.height = this.image.height;
    this.zoomFactor = 1;
    this.maxZoom = 100;
    this.minZoom = 0.1;
    this.centeredAt = [0, 0];
    this.shapes = {};
    this.selectedShape = null;
}

/* Update footer (necessary when changing maps) and set width and height
   (necessary when resizing browser window etc.). */
Map.prototype.update = function() {
    document.getElementById('fileInfo').innerHTML = extractFilename(this.image.src);
    document.getElementById('fileInfo').href = this.image.src;
    document.getElementById('authorInfo').href = this.info.authorURL;
    document.getElementById('authorInfo').innerHTML = this.info.author;
    document.getElementById('licenseInfo').href = this.info.licenseURL;
    document.getElementById('licenseInfo').innerHTML = this.info.license;
    document.getElementById('createdInfo').innerHTML = this.info.date;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.draw();
}

/**
*  Takes "document coordinates" and returns normalized canvas coordinates
*  (from -1 to 1 on both axes).
*/
Map.prototype.documentToCanvasCoords = function(x, y) {
    const rect = this.canvas.getBoundingClientRect();
    const canvX = 2 * x / rect.width - 1;
    const canvY = 1 - 2 * y / rect.height;
    return [canvX, canvY];
}

/**
*  Takes "canvas coordinates" and returns normalized map coordinates
*  (from -1 to 1 on both axes).
*/
Map.prototype.canvasToMapCoords = function(x, y) {
    const canvasAR = this.canvas.width / this.canvas.height;
    const mapX = this.centeredAt[0]
                 + x * canvasAR / (this.zoomFactor * this.aspectRatio);
    const mapY = this.centeredAt[1] + y / this.zoomFactor;
    return [mapX, mapY];
}

/**
*  Takes "document coordinates" and returns normalized map coordinates
*  (from -1 to 1 on both axes).
*/
Map.prototype.documentToMapCoords = function(x, y) {
    return this.canvasToMapCoords.apply(this, this.documentToCanvasCoords(x, y));
}

Map.prototype.mapToCanvasCoords = function(x, y) {
    const canvasAR = this.canvas.width / this.canvas.height;
    const canvX = (x - this.centeredAt[0]) * this.zoomFactor * this.aspectRatio
                  / canvasAR;
    const canvY = (y - this.centeredAt[1]) * this.zoomFactor;
    return [canvX, canvY];
}

Map.prototype.canvasToDocumentCoords = function(x, y) {
    const docX = this.canvas.width * (x + 1) / 2;
    const docY = this.canvas.height * (1 - y) / 2;
    return [docX, docY];
}

Map.prototype.mapToDocumentCoords = function(x, y) {
    return this.canvasToDocumentCoords.apply(this, this.mapToCanvasCoords(x, y));
}

/* Precomputes values that will be used to compute projections. Sets projection
   and inverse projection methods to the approriate functions. */
Map.prototype.setProjection = function(projectionInfo) {
    const type = projectionInfo.type;
    let out = {};
    if(type == 'mercator') {
        const topLat = toRad(projectionInfo.topLatitude);
        const bottomLat = toRad(projectionInfo.bottomLatitude);
        out.vTop = Math.log(Math.tan((Math.PI + 2 * topLat) / 4));
        out.vBottom = Math.log(Math.tan((Math.PI + 2 * bottomLat) / 4));
        out.hCenter = toRad(projectionInfo.centralMeridian);
        out.projection = this.mercatorProjection;
        out.inverseProjection = this.inverseMercatorProjection;
    }
    return out;
}

/* From map to spherical coordinates. */
Map.prototype.mercatorProjection = function(lambda, phi) {
    const x = (lambda - this.P.hCenter) / Math.PI;
    const y = Math.log( Math.tan( (Math.PI + 2 * phi) / 4 ) );
    const y_ = 2 * (y - this.P.vBottom) / (this.P.vTop - this.P.vBottom) - 1;
    return [x, y_];
}

/* From sperical to map coordinates. */
Map.prototype.inverseMercatorProjection = function(x, y) {
    const x_ = x * Math.PI;
    const y_ = ((y + 1) / 2) * (this.P.vTop - this.P.vBottom) + this.P.vBottom;
    const lambda = x_ + this.P.hCenter;
    const phi = Math.atan(Math.sinh(y_));
    return [lambda, phi];
}

/* Keeps (x, y) fixed as it zooms by a given factor. (x, y) are
  screen coordinates. */
Map.prototype.zoom = function(x, y, factor) {
    if(    (factor <= 1 && this.zoomFactor <= this.minZoom)
        || (factor >= 1 && this.zoomFactor >= this.maxZoom) )
        return;
    const mapCoords = this.canvasToMapCoords(x, y);
    const mapX = mapCoords[0];
    const mapY = mapCoords[1];
    const deltaX = mapX - this.centeredAt[0];
    const deltaY = mapY - this.centeredAt[1];
    const invf = 1 / factor;
    this.centeredAt[0] = this.centeredAt[0] * invf + mapX * (1 - invf);
    this.centeredAt[1] = this.centeredAt[1] * invf + mapY * (1 - invf);
    this.zoomFactor = restrictToInterval(this.zoomFactor, this.minZoom, this.maxZoom);
    this.zoomFactor *= factor;
    this.draw();
}

/* Sets the zoom so that the map fills the entire height of the screen. */
/* FIX: Should use zoom box method, which in turn should be a method of Map. */
Map.prototype.resetZoom = function() {
    const canvasAR = this.canvas.width / this.canvas.height;
    this.zoomFactor = 1;
    this.centeredAt = [0, 0];
    this.draw();
}

Map.prototype.addShape = function(shape) {
    this.shapes[getNewID()] = shape;
    this.draw();
}

Map.prototype.deleteShape = function(shape) {
    for(const key in this.shapes) {
        if(this.shapes[key] == shape) {
            delete this.shapes[key];
            break;
        }
    }
    this.draw();
}

/**
*  Returns the first shape that is found among those at map coordinates (x, y).
*  If no shapes are found null is returned.
*/
Map.prototype.getShapeAt = function(x, y) {
    for(const key in this.shapes) {
        const shape = this.shapes[key];
        if(pointInsidePolygon(x, y, shape.xs, shape.ys)) {
            return shape;
        }
    }
    return null;
}

/**
*  Hovering over a shape changes its border color. This function is used
*  for that.
*/
Map.prototype.selectShapeAt = function(x, y) {
    for(const key in this.shapes) {
        const shape = this.shapes[key];
        if(pointInsidePolygon(x, y, shape.xs, shape.ys)) {
            if(this.selectedShape != shape) {
                this.selectedShape = shape;
                this.draw();
            }
            return;
        }
    }
    if(this.selectedShape != null) {
        this.selectedShape = null;
        this.draw();
    }
}

/* Draws the map as well as the shapes that are associated to it. */
Map.prototype.draw = function() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const w = this.zoomFactor * this.canvas.height * this.aspectRatio;
    const h = this.zoomFactor * this.canvas.height;
    const x = this.canvas.width / 2 - ((this.centeredAt[0] + 1) / 2) * w;
    const y = this.canvas.height / 2 - ((1 - this.centeredAt[1]) / 2) * h;
    this.context.drawImage(this.image, x, y, w, h);
    for(const key in this.shapes) {
        this.shapes[key].draw(this.selectedShape);
    }
}

function Shape(map, xs, ys) {
    this.map = map;
    this.xs = xs.slice(); /* We use slice() to create a copy. */
    this.ys = ys.slice();
    this.fillColor = this.activeDrawColor;
    this.hidden = false;
}

/* We need clones, not references, sometimes. This one is for such occasions. */
Shape.prototype.clone = function() {
    let newShape = new Shape(this.map, this.xs, this.ys);
    newShape.fillColor = this.fillColor;
    newShape.hidden = this.hidden;
    return newShape;
}

/* Copies this to targetShape. */
Shape.prototype.copyTo = function(targetShape) {
    targetShape.map = this.map;
    targetShape.xs = this.xs.slice();
    targetShape.ys = this.ys.slice();
    targetShape.fillColor = this.fillColor;
    targetShape.hidden = this.hidden;
}

/* This one is updated by the color input in the toolbox. New shapes are given
   the color that is found here at the time of their construction. */
Shape.prototype.activeDrawColor = 'rgba(0, 0, 0, 0)';

/* We sometimes want to hide shapes. See functions startMoving and startRotating
   for explanation. */
Shape.prototype.hide = function() {
    this.hidden = true;
    this.map.draw();
}

/* The style of the shapes is mostly hard-coded here. Might change this, but
   it's low priority. */
Shape.prototype.draw = function(selectedShape) {
    if(this.hidden)
        return;
    const context = this.map.context;
    context.beginPath();
    context.setLineDash([]);
    context.lineWidth = 2;
    context.strokeStyle = '#000000';
    if(selectedShape == this)
        context.strokeStyle = '#FF0000';
    context.fillStyle = this.fillColor;
    let coords = this.map.mapToDocumentCoords(this.xs[0], this.ys[0]);
    context.moveTo(coords[0], coords[1]);
    for(let i = 1; i < this.xs.length; i++) {
        coords = this.map.mapToDocumentCoords(this.xs[i], this.ys[i]);
        context.lineTo(coords[0], coords[1]);
    }
    context.closePath();
    context.fill();
    context.stroke();
}

/**
*  Moves the shape (this) from uMap to vMap (both arrays with [long, lat])
*  by rotating every vertex around the origin, and stores the result in shape.
*/
Shape.prototype.moveAndAssign = function(shape, uMap, vMap) {
    const u = longLatToXYZ.apply(null, uMap);
    const v = longLatToXYZ.apply(null, vMap);
    const w = normalize(cross(u, v));
    const a = angle(v, u);
    for(let i = 0; i < this.xs.length; i++) {
        let vertex = this.map.P.inverseProjection.call(this.map, this.xs[i], this.ys[i]);
        vertex = longLatToXYZ.apply(null, vertex);
        vertex = rotate(vertex, w, a);
        vertex = xyzToLongLat(vertex);
        vertex = this.map.P.projection.apply(this.map, vertex);
        shape.xs[i] = vertex[0];
        shape.ys[i] = vertex[1];
    }
}

/**
*  Rotates the shape (this) around uMap = [long, lat] by a radians and stores
*  stores the result in shape, where a is the angle between vMap and [1, 0].
*/
Shape.prototype.rotateAndAssign = function(shape, uMap, vMap) {
    const u = longLatToXYZ.apply(null, uMap);
    let a = angle([1, 0], normalize([vMap[0] - uMap[0], vMap[1] - uMap[1]]));
    if(vMap[1] - uMap[1] < 0)
        a = 2 * Math.PI - a;
    for(let i = 0; i < this.xs.length; i++) {
        let vertex = this.map.P.inverseProjection.call(this.map, this.xs[i], this.ys[i]);
        vertex = longLatToXYZ.apply(null, vertex);
        vertex = rotate(vertex, u, a);
        vertex = xyzToLongLat(vertex);
        vertex = this.map.P.projection.apply(this.map, vertex);
        shape.xs[i] = vertex[0];
        shape.ys[i] = vertex[1];
    }
}
