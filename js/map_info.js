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



/* Info about the maps goes here. This includes info about author and licence of
   the image file etc., as well a description of the projection used. */
const mapInfo = {
    "mercator": {
        "imgID": "mercatorImg",
        "author": "Daniel R. Strebe",
        "authorURL": "https://commons.wikimedia.org/wiki/User:Strebe",
        "license": "CC BY-SA 3.0",
        "licenseURL": "https://creativecommons.org/licenses/by-sa/3.0/",
        "date": "15 August 2011",
        "projection": {
            "type": "mercator",
            "topLatitude": 82,
            "bottomLatitude": -82,
            "centralMeridian": 0
        }
    }
};
