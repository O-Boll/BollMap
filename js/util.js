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



/* Used with the toolbox div. This enables us to move the toolbox by
   dragging it. */
function makeDraggable(element) {
    let x, y, xOffset, yOffset;
    element.onmousedown = startDragging;
    
    function startDragging(event) {
        x = event.clientX;
        y = event.clientY;
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDragging);
    }
    
    function drag(event) {
        xOffset = event.clientX - x;
        yOffset = event.clientY - y;
        x = event.clientX;
        y = event.clientY;
        element.style.top = (element.offsetTop + yOffset) + 'px';
        element.style.left = (element.offsetLeft + xOffset) + 'px';
    }
    
    function stopDragging(event) {
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDragging);
    }
}

function restrictToInterval(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

/**
*  Returns euclidean distance between points p and q. Works in any dimension.
*/
function distance(p, q) {
    let d = 0;
    for(let i = 0; i < p.length; i++)
        d += (q[i] - p[i]) * (q[i] - p[i]);
    return Math.sqrt(d);
}

/* Used with <input type="color"> so that opacity can be set
   (at least in the code). */
function hexToRGBA(hexColor, alpha) {
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
}

function extractFilename(url) {
    return url.substr(url.lastIndexOf('/') + 1);
}

function toRad(v) {
    return v * Math.PI / 180;
}

function toDeg(v) {
    return v * 180 / Math.PI;
}

/* Takes a latitude in radians and returns a pretty string. Used to display
   map coordinates. */
function latitudeToString(latitude) {
    latitude = toDeg(latitude);
    const l = Math.abs(latitude);
    let degrees = Math.floor(l);
    let minutes = Math.round(60 * (l - degrees));
    if(minutes == 60) {
        minutes = 0;
        degrees++;
    }
    const dir = latitude < 0 ? 'S' : 'N';
    return degrees + '°  ' + minutes + "' " + dir;
}

/* Takes a longitude in radians and returns a pretty string. Used to display
   map coordinates. */
function longitudeToString(longitude) {
    longitude = toDeg(longitude);
    const l = Math.abs(longitude);
    let degrees = Math.floor(l);
    let minutes = Math.round(60 * (l - degrees));
    if(minutes == 60) {
        minutes = 0;
        degrees++;
    }
    const dir = latitude < 0 ? 'W' : 'E';
    return degrees + '°  ' + minutes + "' " + dir;
}

/* Used for selecting etc. Might miss points on the boundary of the polygon. */
function pointInsidePolygon(x, y, xs, ys) {
    let intersections = 0;
    for(let i = 0; i < xs.length; i++) {
        const j = (i + 1) % xs.length;
        if(xs[i] == xs[j])
            continue;
        if( (xs[i] <= x && x < xs[j]) || (xs[j] <= x && x < xs[i]) ) {
            if( (x - [xs[i]]) / (xs[j] - xs[i]) * (ys[j] - ys[i]) + ys[i] < y)
                intersections++;
        }
        
    }
    return intersections % 2 == 1;
}

/**
*  Takes the longitude and latitude in radians and returns the corresponding 
*  Cartesian coordinates on the unit sphere in R^3.
*/
function longLatToXYZ(longitude, latitude) {
    const x = Math.cos(latitude) * Math.cos(longitude);
    const y = Math.cos(latitude) * Math.sin(longitude);
    const z = Math.sin(latitude);
    return [x, y, z];
}

/**
*  Takes a unit vector u = [x, y, z] and returns the corresponding longitude
*  and latitude.
*/
function xyzToLongLat(u) {
    const latitude = Math.asin(u[2]);
    let longitude = Math.atan(Math.abs(u[1] / u[0]));
    if(u[1] < 0 && u[0] > 0) {
        longitude = -longitude;
    } else if(u[1] >= 0 && u[0] < 0) {
        longitude = Math.PI - longitude;
    } else if(u[1] < 0 && u[0] < 0) {
        longitude = longitude - Math.PI;
    }
    return [longitude, latitude];
}

/**
*  Returns the cross product of the vectors u and v.
*/
function cross(u, v) {
    const x = u[1] * v[2] - u[2] * v[1];
    const y = u[2] * v[0] - u[0] * v[2];
    const z = u[0] * v[1] - u[1] * v[0];
    return [x, y, z];
}

/**
*  Returns the dot product of the vectors u and v. Works in any dimension.
*/
function dot(u, v) {
    let s = 0;
    for(let i = 0; i < u.length; i++)
      s += u[i] * v[i];
    return s;
}

/**
*  Returns the Euclidean norm of the vector u. Works in any dimension.
*/
function norm(u) {
    return Math.sqrt(dot(u, u));
}

/**
*  Returns the vector obtained by normalizing u. Works in any dimension.
*/
function normalize(u) {
    const d = norm(u);
    const v = [];
    for(let i = 0; i < u.length; i++)
        v[i] = u[i] / d;
    return v;
}

/**
*  Returns the angle (in radians) between the unit vectors u and v.
*  Works in any dimension.
*/
function angle(u, v) {
    return Math.acos(dot(u, v));
}

/**
*  Returns the vector obtained by rotating the vector u by a radians about the
*  axis defined by the vector v. Straightforward, hard-coded matrix
*  multiplication.
*/
function rotate(u, v, a) {
    const cosa = Math.cos(a);
    const sina = Math.sin(a);
    const x =   u[0] * ( cosa + v[0] * v[0] * (1 - cosa) )
              + u[1] * ( v[0] * v[1] * (1 - cosa) - v[2] * sina )
              + u[2] * ( v[0] * v[2] * (1 - cosa) + v[1] * sina );
    
    const y =   u[0] * ( v[0] * v[1] * (1 - cosa) + v[2] * sina )
              + u[1] * ( cosa + v[1] * v[1] * (1 - cosa) )
              + u[2] * ( v[1] * v[2] * (1 - cosa) - v[0] * sina );
    
    const z =   u[0] * ( v[0] * v[2] * (1 - cosa) - v[1] * sina )
              + u[1] * ( v[1] * v[2] * (1 - cosa) + v[0] * sina )
              + u[2] * ( cosa + v[2] * v[2] * (1 - cosa) );
    
    return [x, y, z];
}

/**
*  Takes a polygon and divides its segments into smaller pieces. This is
*  useful for obtaining accurate results when applying nonlinear
*  transformations to polygons.
*/
function subdividePolygon(xs, ys, maxSegmentLength) {
    let xso = [];
    let yso = [];
    for(let i = 0; i < xs.length - 1; i++) {
        xso.push(xs[i]);
        yso.push(ys[i]);
        const j = i + 1;
        const d = distance([xs[i], ys[i]], [xs[j], ys[j]]);
        const n = Math.ceil(d / maxSegmentLength);
        for(let k = 1; k < n; k++) {
            xso.push( xs[i] + (k / n) * (xs[j] - xs[i]) );
            yso.push( ys[i] + (k / n) * (ys[j] - ys[i]) );
        }
    }
    return { 'xs': xso, 'ys': yso };
}

const getNewID = (function() {
    var IDCounter = 0;
    return function() {
        return (IDCounter++).toString();
    };
})();
