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



/* This function keeps track of the event listeners that are activated and
   deactivated by clicking the various buttons in the toolbox. */
function initToolboxes(map) {
    const toolbox = document.getElementById('toolbox');        
    makeDraggable(toolbox);
    
    /* Some buttons carry out straightforward tasks. We deal with them here. */
    const zoomIn = document.getElementById('zoomIn');
    zoomIn.addEventListener('click', (event) => { map.zoom(0, 0, 1.3); } );
    const zoomOut = document.getElementById('zoomOut');
    zoomOut.addEventListener('click', (event) => { map.zoom(0, 0, 1 / 1.3); } );
    const zoomReset = document.getElementById('zoomReset');
    zoomReset.addEventListener('click', (event) => {map.resetZoom();} );
    const colorSelector = document.getElementById('colorSelector');
    Shape.prototype.activeDrawColor = hexToRGBA(colorSelector.value, 0.5);
    colorSelector.addEventListener
    ('input',
      () => {
        Shape.prototype.activeDrawColor = hexToRGBA(colorSelector.value, 0.5)});
    
    /* Tools that can be toggled (on or off) need to be dealt with a bit more
       carefully. Only one tool can be active at a time, so we need to remove
       as well as add event listeners when we pick a such tool. */
    const tools = document.getElementsByClassName('tool toggleable');
    for(let i = 0; i < tools.length; i++)
        tools[i].addEventListener('click', (event) => {toggleTool(tools[i]);} );
    let activeTool = null;
    toggleTool(activeTool);
    
    
    function toggleTool(tool) {
        map.canvas.style.cursor = ''; /* Resets cursor to default arrow. */
        
        /* Only one tool at a time can be used. We remove all event listeners
           for the toggleable tools before adding a new one. Ugly but works.
           Should probably be fixed at some point... */
        map.canvas.removeEventListener('mousedown', pan);
        map.canvas.removeEventListener('mousedown', zoomBox);
        map.canvas.removeEventListener('click', deleteShape);
        map.canvas.removeEventListener('mousedown', move);
        map.canvas.removeEventListener('mousedown', rotate);
        map.canvas.removeEventListener('mousedown', draw);
        
        /* Active tool is null at start. Don't know if this is a good thing. */
        if(activeTool != null)
            activeTool.style.background = '';
        activeTool = tool;
        if(tool == null)
            return;
        
        /* Just so that we remember what we are currently using. */
        activeTool.style.background = '#FFCC00';
        
        /* We use the HTML id-tags to identify the various tools. */
        if(tool.id == 'pan') {
            
            map.canvas.style.cursor = 'grab';
            map.canvas.addEventListener('mousedown', pan);
            
        } else if(tool.id == 'zoomBox') {
            
            map.canvas.style.cursor = 'zoom-in';
            map.canvas.addEventListener('mousedown', zoomBox);
            
        } else if(tool.id == 'delete') {
            
            map.canvas.style.cursor = '';
            map.canvas.addEventListener('click', deleteShape);
            
        } else if(tool.id == 'move') {
            
            map.canvas.style.cursor = 'move';
            map.canvas.addEventListener('mousedown', move);
            
        } else if(tool.id == 'rotate') {
            
            map.canvas.style.cursor = '´';
            map.canvas.addEventListener('mousedown', rotate);
            
        } else if(tool.id == 'draw') {
            
            map.canvas.style.cursor = 'crosshair';
            map.canvas.addEventListener('mousedown', draw);
            
        }
    }
    
    /* We add event listeners to the following methods in order to check if
      "conditions are perfect". If so, we can safely get to work with each tool!
    */
    
    function pan(event) {
        /* Left mouse button. */
        if(event.button == 0)
            startPanning(event, map);
    }
    
    function zoomBox(event) {
        /* Left mouse button. */
        if(event.button == 0)
            startBoxZooming(event, map);
    }
    
    function deleteShape(event) {
        /* Left mouse button. */
        if(event.button == 0) {
            const coords = map.documentToMapCoords(event.clientX, event.clientY);
            /* Did we click on something deletable? */
            const shape = map.getShapeAt(coords[0], coords[1]);
            if(shape != null)
                map.deleteShape(shape);
        }
    }
    
    function move(event) {
        /* Left mouse button. */
        if(event.button == 0) {
            const coords = map.documentToMapCoords(event.clientX, event.clientY);
            /* Did we click on something moveable? */
            const shape = map.getShapeAt(coords[0], coords[1]);
            if(shape != null)
                startMoving(event, map, shape);
        }
    }
    
    function rotate(event) {
        /* Left mouse button. */
        if(event.button == 0) {
            const coords = map.documentToMapCoords(event.clientX, event.clientY);
            /* Did we click on something rotateable? */
            const shape = map.getShapeAt(coords[0], coords[1]);
            if(shape != null)
                startRotating(event, map, shape);
        }
    }
    
    function draw(event) {
        /* Left mouse button. */
        if(event.button == 0)
            startDrawing(event, map);
    }
}

/* If possible, update the coordinates that are shown in the toolbox. */
function updateCoordinates(event, map) {
    const latitudeHolder = document.getElementById('latitude');
    const longitudeHolder = document.getElementById('longitude');
    const mapCoords = map.documentToMapCoords(event.clientX, event.clientY);
    const x = mapCoords[0];
    const y = mapCoords[1];
    if(-1 < x && x < 1 && -1 < y & y < 1) {
        map.selectShapeAt(x, y);
        const coords = map.P.inverseProjection.apply(map, mapCoords);
        const latitude = latitudeToString(coords[1]);
        const longitude = longitudeToString(coords[0]);
        latitudeHolder.innerHTML = latitude;
        longitudeHolder.innerHTML = longitude;
    }
}

/* Panning, i.e. navigating around the map by clicking and dragging. */
function startPanning(event, map) {
    const prevCursor = map.canvas.style.cursor;
    map.canvas.style.cursor = 'grabbing';
    let x0 = event.clientX;
    let y0 = event.clientY;
    let x1, y1;
    document.addEventListener('mousemove', pan);
    document.addEventListener('mouseup', stopPanning);
    
    function pan(event) {
        x1 = x0;
        y1 = y0;
        x0 = event.clientX;
        y0 = event.clientY;
        const coords0 = map.documentToMapCoords(x0, y0);
        const coords1 = map.documentToMapCoords(x1, y1);
        map.centeredAt[0] += coords1[0] - coords0[0];
        map.centeredAt[1] += coords1[1] - coords0[1];
        map.update();
    }
    
    function stopPanning(event) {
        if(prevCursor == undefined)
            map.canvas.style.cursor = '';
        else
            map.canvas.style.cursor = prevCursor;
        document.removeEventListener('mousemove', pan);
        document.removeEventListener('mouseup', stopPanning);
    }
}

/* Controls for moving shapes with the mouse. */
function startMoving(event, map, shape) {
    let movingShape = shape.clone();
    shape.hide();
    movingShape.draw();
    let xTemp = event.clientX;
    let yTemp = event.clientY;
    let uMap = map.documentToMapCoords(xTemp, yTemp);
    uMap = map.P.inverseProjection.apply(map, uMap);
    let vMap = uMap;
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', stopMoving);
    
    function move(event) {
        xTemp = event.clientX;
        yTemp = event.clientY;
        const vMapTemp = map.documentToMapCoords(xTemp, yTemp);
        const x = vMapTemp[0];
        const y = vMapTemp[1];
        if(-1 < x && x < 1 && -1 < y && y < 1) {
            vMap = map.P.inverseProjection.apply(map, vMapTemp);
            shape.moveAndAssign(movingShape, uMap, vMap);
        }
        map.draw();
        movingShape.draw();
    }
    
    function stopMoving(event) {
        movingShape.copyTo(shape);
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', stopMoving);
        map.draw();
    }
}

/* Controls for rotating shapes with the mouse. */
function startRotating(event, map, shape) {
    let rotatingShape = shape.clone();
    shape.hide();
    rotatingShape.draw();
    let xTemp = event.clientX;
    let yTemp = event.clientY;
    let uMap = map.documentToMapCoords(xTemp, yTemp);
    uMap = map.P.inverseProjection.apply(map, uMap);
    let vMap = uMap;
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', stopMoving);
    
    function move(event) {
        xTemp = event.clientX;
        yTemp = event.clientY;
        const vMapTemp = map.documentToMapCoords(xTemp, yTemp);
        const x = vMapTemp[0];
        const y = vMapTemp[1];
        if(-1 < x && x < 1 && -1 < y && y < 1) {
            vMap = map.P.inverseProjection.apply(map, vMapTemp);
            shape.rotateAndAssign(rotatingShape, uMap, vMap);
        }
        map.draw();
        rotatingShape.draw();
    }
    
    function stopMoving(event) {
        rotatingShape.copyTo(shape);
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', stopMoving);
        map.draw();
    }
}

/* Controls for box zooming, i.e. click and drag to create a box, than zoom as
   much as possible wile keeping the box inside the viewport. Centers the
   viewport on the center of the box. */
function startBoxZooming(event, map) {
    let x0 = event.clientX;
    let x1 = x0;
    let y0 = event.clientY;
    let y1 = y0;
    document.addEventListener('mousemove', drawBox);
    document.addEventListener('mouseup', zoomBox);
    
    /* Click and drag to make a box... */
    function drawBox(event) {
        x1 = event.clientX;
        y1 = event.clientY;
        let x, y;
        if(x0 < x1) {
            x = x0;
        } else {
            x = x1;
        }
        if(y0 < y1) {
            y = y0;
        } else {
            y = y1;
        }
        map.update();
        map.context.beginPath();
        map.context.setLineDash([5, 5]);
        map.context.lineWidth = 2;
        map.context.strokeStyle = '#FF0000';
        map.context.rect(x, y, Math.abs(x1 - x0), Math.abs(y1 - y0));
        map.context.stroke();
    }
    
    /* ...then compute how much to zoom. */
    /* FIX: The zoom box method should belong to Map. */
    function zoomBox(event) {
        
        const x = (x0 + x1) / 2;
        const y = (y0 + y1) / 2;
        map.centeredAt = map.documentToMapCoords(x, y);
        
        const coords0 = map.documentToCanvasCoords(x0, y0);
        const coords1 = map.documentToCanvasCoords(x1, y1);
        const w = Math.abs(coords0[0] - coords1[0]);
        const h = Math.abs(coords0[1] - coords1[1]);
        const aspectAR = map.canvas.width / map.canvas.height;
        if(w / h >  1) {
            map.zoomFactor /= w / 2;
        } else {
            map.zoomFactor /= h / 2;
        }
        document.removeEventListener('mousemove', drawBox);
        document.removeEventListener('mouseup', zoomBox);
        map.update();
    }
}

/* Drawing as in drawing a shape. Click and hold to draw, release to finish
   shape. */
function startDrawing(event, map) {
    const minSegmentLength = 10;
    let xs = [event.clientX];
    let ys = [event.clientY];
    document.addEventListener('mousemove', draw);
    document.addEventListener('mouseup', stopDrawing);
    
    function draw(event) {
        const x = event.clientX;
        const y = event.clientY;
        let n = xs.length;
        if(distance([x, y], [xs[n - 1], ys[n - 1]]) >= minSegmentLength) {
            xs.push(x);
            ys.push(y);
            n++;
        }
        /* We want to see what we are drawing. */
        map.draw();
        map.context.beginPath();
        map.context.setLineDash([5, 5]);
        map.context.lineWidth = 2;
        map.context.strokeStyle = '#000000';
        map.context.moveTo(xs[0], ys[0]);
        for(let i = 1; i < n; i++)
            map.context.lineTo(xs[i], ys[i]);
        map.context.lineTo(x, y);
        map.context.stroke();
    }
    
    /* When done, set level of detail and save shape. */
    function stopDrawing(event) {
        for(let i = 0; i < xs.length; i++) {
            const coords = map.documentToMapCoords(xs[i], ys[i]);
            xs[i] = coords[0];
            ys[i] = coords[1];
        }
        xs.push(xs[0]);
        ys.push(ys[0]);
        /* We make the max length of line segments short so that we get smooth
           shapes when we apply nonlinear coordinate transfomration. */
        const polygon = subdividePolygon(xs, ys, 0.01);
        let shape = new Shape(map, polygon.xs, polygon.ys);
        map.addShape(shape);
        document.removeEventListener('mousemove', draw);
        document.removeEventListener('mouseup', stopDrawing);
    }
}

function canvasMouseDown(event, map) {
    /* The mouse wheel can be used for panning (click and drag). */
    if(event.button == 1) {
        startPanning(event, map);
    }
}

function canvasWheel(event, map) {
    /* Zooming with the mouse wheel. */
    if(event.deltaY != 0) {
        let zoomFactor = 1.3;
        if(event.deltaY > 0) {
            zoomFactor =  1 / zoomFactor;
        }
        const coords = map.documentToCanvasCoords(event.clientX, event.clientY);
        const x = coords[0];
        const y = coords[1];
        map.zoom(x, y, zoomFactor);
    }
}