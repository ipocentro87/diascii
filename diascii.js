// Diascii

(function() {
    const _lib = {
        regexp: {
            box: {
                top:    /^\.-+(#(?<id>\w+))?-*(?<classes>((\w+)-*)*)-\./,
                middle: /^[\|\+].*[\|\+]$/,
                bottom: /^'-+'$/
            },
            text: /^:?\b(([\w\.\,]+ ?)+)\b:?/
        },
        classes: {
            debug: "DIASCII_DEBUG",
            align: {
                border: "DIASCII_ALIGN_BORDER",
                right:  "DIASCII_ALIGN_RIGHT",
                left:   "DIASCII_ALIGN_LEFT",
                top:    "DIASCII_ALIGN_TOP",
                bottom: "DIASCII_ALIGN_BOTTOM",
                hcenterish: "DIASCII_ALIGN_HCENTERISH",
                hcenter:    "DIASCII_ALIGN_HCENTER",
                vcenterish: "DIASCII_ALIGN_VCENTERISH",
                vcenter:    "DIASCII_ALIGN_VCENTER",
                centerish:  "DIASCII_ALIGN_CENTERISH",
                center:     "DIASCII_ALIGN_CENTER"
            },
            text: {
                normal: "DIASCII_TEXT",
                lcolon: "DIASCII_TEXT_LCOLON",
                rcolon: "DIASCII_TEXT_RCOLON",
                colons: "DIASCII_TEXT_COLONS"
            },
            box:    "DIASCII_BOX",
            id:     "DIASCII_ID",
            class0: "DIASCII_CLASS0"
        },
        arrow: {
            patternLR:      ["<-", "<.", "<'",
                             "--", "-.", "-'", "->",
                             ".-", ".'", ".>",
                             "'-", "'.", "'>",
                             //
                             "<+", "-+", "+-", "+>",
                             ".+", "+.", "'+", "+'"],
            patternLRJump: ["-|",
                            "|-"],
            // patternLRMaybe: ["..", "''"],
            patternTB:      ["||", "|'", "|v",
                             ".|", ".v", ".'",
                             "^|", "^'",
                             //
                             "+|", "|+", "+'", "+v",
                             ".+", "^+"],
            patternTBJump: ["-|", "-'",
                            ".-", "|-"],
        }
    };

    var _diascii_last_id = -1;

    function getID() {
        _diascii_last_id++;
        return _diascii_last_id;
    }

    function getX(parseObj, i) {
        var iScaled = parseObj.config.scaleX * i;
        return iScaled.toString();
    }

    function getY(parseObj, i) {
        var iScaled = parseObj.config.scaleY * i;
        return iScaled.toString();
    }

    function getWidth(m) {
        var width = 0;
        for (var r=0, rlen=m.length; r<rlen; r++) {
            width = Math.max(width, m[r].length);
        }
        return width;
    }

    function loadConfig(elem) {
        var style = window.getComputedStyle(elem, null);
        return {
            scaleX:        parseInt(style.getPropertyValue("--diascii-scale-x"), 10),
            scaleY:        parseInt(style.getPropertyValue("--diascii-scale-y"), 10),
            scaleArrowGap: parseInt(style.getPropertyValue("--diascii-scale-arrow-gap"), 10)
        }
    }

    function parseArrow(parseObj, point, opts) {
        function getSurroundingPoints(parseObj, point) {
            var r = point.r;
            var c = point.c;
            var m = parseObj.m;

            var rm1 = r-1;
            var rp1 = r+1;
            var cm1 = c-1;
            var cp1 = c+1;
            var ret = {};
            if (rm1 >= 0 && c < m[rm1].length)       {ret.top = m[rm1][c];}
            else                                     {ret.top = "";}
            if (rp1 < m.length && c < m[rp1].length) {ret.bottom = m[rp1][c];}
            else                                     {ret.bottom = "";}
            if (cm1 >= 0)                            {ret.left = m[r][cm1];}
            else                                     {ret.left = "";}
            if (cp1 < m[r].length)                   {ret.right = m[r][cp1];}
            else                                     {ret.right = "";}
            ret.center = m[r][c];
            return ret;
        }

        function copyPathObj(pathObj) {
            var copiedPathObj = {points: [], path: []};
            for (var i=0, ilen=pathObj.points.length; i<ilen; i++) {
                copiedPathObj.points.push({r: pathObj.points[i].r,
                                           c: pathObj.points[i].c,
                                           jump: pathObj.points[i].jump});
            }
            copiedPathObj.path = [...pathObj.path];
            return copiedPathObj;
        }

        function getArrows(parseObj, pathObj, from=null)
        {
            var arrows = [];
            var lastPoint = pathObj.points[pathObj.points.length-1];
            var m = parseObj.m;
            var r = lastPoint.r;
            var c = lastPoint.c;

            var p = getSurroundingPoints(parseObj, lastPoint);

            if (p.center == "+") {
                var substituteChars = ".-'|";
                var retList = [];
                for (var i=0, ilen=substituteChars.length; i<ilen; i++) {
                    var parseObjCopy = copyParseObj(parseObj);
                    var pathObjCopy =  copyPathObj(pathObj);
                    parseObjCopy.m[r] = parseObjCopy.m[r].substring(0, c)
                                      + substituteChars[i]
                                      + parseObjCopy.m[r].substring(c+1);
                    ret = getArrows(parseObjCopy, pathObjCopy, from);
                    if (ret.length > 0) {
                        retList.push.apply(retList, ret);
                    }
                }
                return retList;
            }

            var fromLeft   = (from == null || from == "left"   || from == "left-jump");
            var fromRight  = (from == null || from == "right"  || from == "right-jump");
            var fromBottom = (from == null || from == "bottom" || from == "bottom-jump");
            var fromTop    = (from == null || from == "top"    || from == "top-jump");

            var theresLeft   = (from == "left-jump")   || _lib.arrow.patternLR.includes(p.left + p.center);
            var theresRight  = (from == "right-jump")  || _lib.arrow.patternLR.includes(p.center + p.right);
            var theresBottom = (from == "bottom-jump") || _lib.arrow.patternTB.includes(p.center + p.bottom);
            var theresTop    = (from == "top-jump")    || _lib.arrow.patternTB.includes(p.top + p.center);

            var theresLeftJump   = (from == "left-jump" && (p.left + p.center) == "||")     || _lib.arrow.patternLRJump.includes(p.left + p.center);
            var theresRightJump  = (from == "right-jump" && (p.center + p.right) == "||")   || _lib.arrow.patternLRJump.includes(p.center + p.right);
            var theresBottomJump = (from == "bottom-jump" && (p.center + p.bottom) == "--") || _lib.arrow.patternTBJump.includes(p.center + p.bottom);
            var theresTopJump    = (from == "top-jump" && (p.top + p.center) == "--")       || _lib.arrow.patternTBJump.includes(p.top + p.center);

            var theresOnlyLeft   =  theresLeft && !theresRight && !theresBottom && !theresTop;
            var theresOnlyRight  = !theresLeft &&  theresRight && !theresBottom && !theresTop;
            var theresOnlyBottom = !theresLeft && !theresRight &&  theresBottom && !theresTop;
            var theresOnlyTop    = !theresLeft && !theresRight && !theresBottom &&  theresTop;

            var theresOnlyAny    = theresOnlyLeft || theresOnlyRight || theresOnlyBottom || theresOnlyTop;

            var theresOnlyLeftJump   = !theresOnlyAny &&  theresLeftJump && !theresRightJump && !theresBottomJump && !theresTopJump;
            var theresOnlyRightJump  = !theresOnlyAny && !theresLeftJump &&  theresRightJump && !theresBottomJump && !theresTopJump;
            var theresOnlyBottomJump = !theresOnlyAny && !theresLeftJump && !theresRightJump &&  theresBottomJump && !theresTopJump;
            var theresOnlyTopJump    = !theresOnlyAny && !theresLeftJump && !theresRightJump && !theresBottomJump &&  theresTopJump;

            var checkLeft   = fromLeft   && (from ? theresLeft   : (theresOnlyRight  || theresOnlyRightJump));
            var checkRight  = fromRight  && (from ? theresRight  : (theresOnlyLeft   || theresOnlyLeftJump));
            var checkBottom = fromBottom && (from ? theresBottom : (theresOnlyTop    || theresOnlyTopJump));
            var checkTop    = fromTop    && (from ? theresTop    : (theresOnlyBottom || theresOnlyBottomJump));


            var goLeft   = ((c-1 >= 0) && theresLeft)           || ((c-2 >= 0)          && (from ? theresLeftJump   : theresOnlyLeftJump));
            var goRight  = ((c+1 < m[r].length) && theresRight) || ((c+2 < m[r].length) && (from ? theresRightJump  : theresOnlyRightJump));
            var goBottom = ((r+1 < m.length) && theresBottom)   || ((r+2 < m.length)    && (from ? theresBottomJump : theresOnlyBottomJump));
            var goTop    = ((r-1 >= 0) && theresTop)            || ((r-2 >= 0)          && (from ? theresTopJump    : theresOnlyTopJump));

            var size      = Math.min(parseObj.config.scaleX, parseObj.config.scaleY);
            var scaleDiff = Math.abs(parseObj.config.scaleX-parseObj.config.scaleY);
            var scaleXltY = parseObj.config.scaleX < parseObj.config.scaleY;
            var scaleXgtY = parseObj.config.scaleX > parseObj.config.scaleY;
            var done = true;
            var draw = true;
            var go = null;

            var x = function(i) {return getX(parseObj, i)};
            var y = function(i) {return getY(parseObj, i)};

            if (p.center == "|" && from == "left-jump") {
                pathObj.path.push("h {Math.max(0, " + x(0.5) + "- 0.5*strokeWidth - parseObj.config.scaleArrowGap)}");
                pathObj.path.push("m {Math.min(2 * parseObj.config.scaleArrowGap + strokeWidth," + x(1) + ")} 0");
                pathObj.path.push("h {Math.max(0, " + x(0.5) + "- 0.5*strokeWidth - parseObj.config.scaleArrowGap)}");
                go = "right-jump";
                draw = false;
            }
            else if (p.center == "|" && from == "right-jump") {
                pathObj.path.push("h {-Math.max(0, " + x(0.5) + "- 0.5*strokeWidth - parseObj.config.scaleArrowGap)}");
                pathObj.path.push("m {-Math.min(2 * parseObj.config.scaleArrowGap + strokeWidth," + x(1) + ")} 0");
                pathObj.path.push("h {-Math.max(0, " + x(0.5) + "- 0.5*strokeWidth - parseObj.config.scaleArrowGap)}");
                go = "left-jump";
                draw = false;
            }
            else if (p.center == "-" && from == "bottom-jump") {
                pathObj.path.push("v   {-Math.max(0, " + y(0.5) + "- 0.5*strokeWidth - parseObj.config.scaleArrowGap)}");
                pathObj.path.push("m 0 {-Math.min(2 * parseObj.config.scaleArrowGap + strokeWidth," + y(1) + ")}");
                pathObj.path.push("v   {-Math.max(0, " + y(0.5) + "- 0.5*strokeWidth - parseObj.config.scaleArrowGap)}");
                go = "top-jump";
                draw = false;
            }
            else if (p.center == "-" && from == "top-jump") {
                pathObj.path.push("v   {Math.max(0, " + y(0.5) + "- 0.5*strokeWidth - parseObj.config.scaleArrowGap)}");
                pathObj.path.push("m 0 {Math.min(2 * parseObj.config.scaleArrowGap + strokeWidth," + y(1) + ")}");
                pathObj.path.push("v   {Math.max(0, " + y(0.5) + "- 0.5*strokeWidth - parseObj.config.scaleArrowGap)}");
                go = "bottom-jump";
                draw = false;
            }
            else if (p.center == "-" && checkLeft && goRight) {
                pathObj.path.push("h " + x(1));
                go = theresRightJump ? "right-jump" : "right";
            }
            else if (p.center == "-" && checkRight && goLeft) {
                if (from == null)
                    pathObj.path.push("m " + x(1) + " 0");
                pathObj.path.push("h " + x(-1));
                go = theresLeftJump ? "left-jump" : "left";
            }
            else if (p.center == "|" && checkBottom && goTop) {
                if (from == null)
                    pathObj.path.push("m " + x(0.5) + " " + y(0.5));
                pathObj.path.push("v " + y(-1));
                go = theresTopJump ? "top-jump" : "top";
            }
            else if (p.center == "|" && checkTop && goBottom) {
                if (from == null)
                    pathObj.path.push("m " + x(0.5) + " " + y(-0.5));
                pathObj.path.push("v " + y(1));
                go = theresBottomJump ? "bottom-jump" : "bottom";
            }
            else if (p.center == "." && checkRight && goBottom) {
                // .-
                // v
                if (scaleXgtY) {
                    pathObj.path.push("h " + (-0.5 * scaleDiff).toString());
                }
                pathObj.path.push("q " + [-0.5*size, 0].join(",") + " " + [-0.5*size, +0.5*size].join(","));
                if (scaleXltY) {
                    pathObj.path.push("v " + (0.5 * scaleDiff).toString());
                }
                go = theresBottomJump ? "bottom-jump" : "bottom";
            }
            else if (p.center == "." && checkLeft && goBottom) {
                // -.
                //  v
                if (scaleXgtY) {
                    pathObj.path.push("h " + (0.5 * scaleDiff).toString());
                }
                pathObj.path.push("q " + [0.5*size, 0].join(",") + " " + [0.5*size, +0.5*size].join(","));
                if (scaleXltY) {
                    pathObj.path.push("v " + (0.5 * scaleDiff).toString());
                }
                go = theresBottomJump ? "bottom-jump" : "bottom";
            }
            else if (p.center == "." && checkTop && goBottom) {
                // .
                // |
                if (from == null)
                    pathObj.path.push("m " + x(0.5) + " 0");
                pathObj.path.push("v " + y(0.5));
                go = theresBottomJump ? "bottom-jump" : "bottom";
            }
            else if ((p.center == "." && checkBottom && goRight)
                     || (p.center == "." && checkLeft   && goRight && from == null)) {
                // .>
                // |
                if (from == null)
                    pathObj.path.push("m " + x(0.5) + " " + y(0.5));
                if (scaleXltY) {
                    pathObj.path.push("v " + (-0.5 * scaleDiff).toString());
                }
                pathObj.path.push("q " + [0, -0.5*size].join(",") + " " + [0.5*size, -0.5*size].join(","));
                if (scaleXgtY) {
                    pathObj.path.push("h " + (0.5 * scaleDiff).toString());
                }
                go = theresRightJump ? "right-jump" : "right";
            }
            else if ((p.center == "." && checkBottom && goLeft)
                     || (p.center == "." && checkRight  && goLeft && from == null)) {
                // <.
                //  |
                if (from == null)
                    pathObj.path.push("m " + x(0.5) + " " + y(0.5));
                if (scaleXltY) {
                    pathObj.path.push("v " + (-0.5 * scaleDiff).toString());
                }
                pathObj.path.push("q " + [0, -0.5*size].join(",") + " " + [-0.5*size, -0.5*size].join(","));
                if (scaleXgtY) {
                    pathObj.path.push("h " + (-0.5 * scaleDiff).toString());
                }
                go = theresLeftJump ? "left-jump" : "left";
            }
            else if (p.center == "'" && checkLeft && goTop) {
                //  ^
                // -'
                if (scaleXgtY) {
                    pathObj.path.push("h " + (0.5 * scaleDiff).toString());
                }
                pathObj.path.push("q " + [0.5*size, 0].join(",") + " " + [0.5*size, -0.5*size].join(","));
                if (scaleXltY) {
                    pathObj.path.push("v " + (-0.5 * scaleDiff).toString());
                }
                go = theresTopJump ? "top-jump" : "top";
            }
            else if (p.center == "'" && checkRight && goTop) {
                // ^
                // '-
                if (scaleXgtY) {
                    pathObj.path.push("h " + (-0.5 * scaleDiff).toString());
                }
                pathObj.path.push("q " + [-0.5*size, 0].join(",") + " " + [-0.5*size, -0.5*size].join(","));
                if (scaleXltY) {
                    pathObj.path.push("v " + (-0.5 * scaleDiff).toString());
                }
                go = theresTopJump ? "top-jump" : "top";
            }
            else if ((p.center == "'" && checkTop   && goLeft)
                     || (p.center == "'" && checkRight && goLeft && from == null)) {
                if (from == null)
                    pathObj.path.push("m " + x(0.5) + " " + y(-0.5));
                //   |
                // <-'
                if (scaleXltY) {
                    pathObj.path.push("v " + (0.5 * scaleDiff).toString());
                }
                pathObj.path.push("q " + [0, 0.5*size].join(",") + " " + [-0.5*size, 0.5*size].join(","));
                if (scaleXgtY) {
                    pathObj.path.push("h " + (-0.5 * scaleDiff).toString());
                }
                go = theresLeftJump ? "left-jump" : "left";
            }
            else if ((p.center == "'" && checkTop  && goRight)
                     || (p.center == "'" && checkLeft && goRight && from == null)) {
                // |
                // '->
                if (from == null)
                    pathObj.path.push("m " + x(0.5) + " " + y(-0.5));
                if (scaleXltY) {
                    pathObj.path.push("v " + (0.5 * scaleDiff).toString());
                }
                pathObj.path.push("q " + [0, 0.5*size].join(",") + " " + [0.5*size, 0.5*size].join(","));
                if (scaleXgtY) {
                    pathObj.path.push("h " + (0.5 * scaleDiff).toString());
                }
                go = theresRightJump ? "right-jump" : "right";
            }
            else if (p.center == "'" && checkBottom && goTop) {
                // |
                // '
                if (from == null)
                    pathObj.path.push("m " + x(0.5) + " 0");
                pathObj.path.push("v " + y(-0.5));
                go = theresTopJump ? "top-jump" : "top";
            }
            else {
                done = false;
                draw = false;
            }

            if (done) {

                var fromRet = null;

                switch (go) {
                case "left":        fromRet = "right";        break;
                case "left-jump":   fromRet = "right-jump";   break;
                case "right":       fromRet = "left";         break;
                case "right-jump":  fromRet = "left-jump";    break;
                case "top":         fromRet = "bottom";       break;
                case "top-jump":    fromRet = "bottom-jump";  break;
                case "bottom":      fromRet = "top";          break;
                case "bottom-jump": fromRet = "top-jump";     break;
                }

                if (go) {
                    pathObj.points[pathObj.points.length-1].jump = !draw;
                }

                switch (go) {
                case "left":        pathObj.points.push({r:r  , c:c-1, jump: null}); break;
                case "left-jump":   pathObj.points.push({r:r  , c:c-1, jump: null}); break;
                case "right":       pathObj.points.push({r:r  , c:c+1, jump: null}); break;
                case "right-jump":  pathObj.points.push({r:r  , c:c+1, jump: null}); break;
                case "top":         pathObj.points.push({r:r-1, c:c  , jump: null}); break;
                case "top-jump":    pathObj.points.push({r:r-1, c:c  , jump: null}); break;
                case "bottom":      pathObj.points.push({r:r+1, c:c  , jump: null}); break;
                case "bottom-jump": pathObj.points.push({r:r+1, c:c  , jump: null}); break;
                }

                if (go) {
                    return getArrows(parseObj, pathObj, from=fromRet);
                }
            }
            else if (from) {
                if (p.center == ">" && checkLeft) {
                    pathObj.points[pathObj.points.length-1].jump = false;
                    // TODO Go backward to support big strokes
                    pathObj.path.push("h -{Math.max(0.00001, strokeWidth - parseObj.config.scaleX)}");
                    pathObj.path.push("h {Math.max(0.00001, parseObj.config.scaleX - strokeWidth)}");
                    return [pathObj];
                }
                else if (p.center == "<" && checkRight) {
                    pathObj.points[pathObj.points.length-1].jump = false;
                    pathObj.path.push("h -{Math.max(0.00001, parseObj.config.scaleX - strokeWidth)}")
                    return [pathObj];
                }
                else if (p.center == "^" && checkBottom) {
                    pathObj.points[pathObj.points.length-1].jump = false;
                    pathObj.path.push("v -{Math.max(0.00001, parseObj.config.scaleY - strokeWidth)}");
                    return [pathObj];
                }
                else if (p.center == "v" && checkTop) {
                    pathObj.points[pathObj.points.length-1].jump = false;
                    pathObj.path.push("v {Math.max(0.00001, parseObj.config.scaleY - strokeWidth)}");
                    return [pathObj];
                }
            }
            return [];
        }


        var pathObj = {points: [{r:point.r, c:point.c, jump:null}],
                       path:   []};

        var pathObjList = getArrows(parseObj, pathObj, from=null);

        var ret = [];
        for (var i=0, ilen=pathObjList.length; i<ilen; i++) {
            for (var j=0, jlen=pathObjList[i].points.length; j<jlen; j++) {
                if (!pathObjList[i].points[j].jump) {
                    parseObj.exclude.push([pathObjList[i].points[j].r, pathObjList[i].points[j].c]);
                }
            }

            var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.classList.add("DIASCII_ARROW");
            svg.style.top      = getY(parseObj, point.r+0.5+opts.padding) + "px";
            svg.style.left     = getX(parseObj, point.c+opts.padding) + "px";
            svg.setAttributeNS("http://www.w3.org/2000/xmlns/",
                               "xmlns:xlink",
                               "http://www.w3.org/1999/xlink");

            var svgDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            svg.appendChild(svgDefs);

            var markerID = "diascii_arrow_id" + getID().toString();

            var svgMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
            svgMarker.setAttribute("id", markerID);
            svgMarker.setAttribute("markerWidth",  "1");
            svgMarker.setAttribute("markerHeight", "2");
            svgMarker.setAttribute("refX", "0");
            svgMarker.setAttribute("refY", "1");
            svgMarker.setAttribute("orient", "auto");

            var svgPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            svgPolygon.setAttribute("points", "0,0 1,1 0,2");
            svgMarker.appendChild(svgPolygon);
            svgDefs.appendChild(svgMarker);

            svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            svgPath.setAttribute("marker-end", "url(#" + markerID + ")");

            svg.appendChild(svgPath);

            callback = {
                parseObj: parseObj,
                pathObj: pathObjList[i],
                svgPath: svgPath,
                svgMarker: svgMarker,
                run: function() {
                    var cssObj      = window.getComputedStyle(this.svgPath, null);
                    var strokeWidth = parseInt(cssObj.strokeWidth, 10);
                    var strokeColor = cssObj.stroke;

                    this.svgMarker.style.fill = strokeColor;

                    for (var i=0, ilen=this.pathObj.path.length; i<ilen; i++) {
                        regExp = this.pathObj.path[i].match(/(^.*){([^}]*)}(.*$)/);
                        if (regExp) {
                            expr = regExp[2];
                            f = window.Function('"use strict"; return function(parseObj, strokeWidth){return (' + expr + ')}')();
                            exprEval = f(this.parseObj, strokeWidth);
                            this.pathObj.path[i] = regExp[1] + exprEval + regExp[3];
                        }
                    }
                    this.svgPath.setAttribute("d", "m 0 0 " + this.pathObj.path.join(" "));
                }
            }
            ret.push({elem: svg, callback: callback})
        }
        return ret;
    }

    function setAlignClasses(parseObj, elem, coord) {
        var align_right  = coord[1].c == getWidth(parseObj.m) - 1;
        var align_left   = coord[0].c == 0;
        var align_top    = coord[0].r == 0;
        var align_bottom = coord[1].r == parseObj.m.length-1;

        var width  = coord[1].c - coord[0].c + 1;
        var height = coord[1].r - coord[0].r + 1;

        if (align_right ) elem.classList.add(_lib.classes.align.right);
        if (align_left  ) elem.classList.add(_lib.classes.align.left);
        if (align_top   ) elem.classList.add(_lib.classes.align.top);
        if (align_bottom) elem.classList.add(_lib.classes.align.bottom);

        if (align_right || align_left || align_top || align_bottom) {
            elem.classList.add(_lib.classes.align.border);
        }

        var diffSpaceLR = Math.abs((parseObj.m[point.r].length-1-coord[1].c) - coord[0].c);
        var diffSpaceTB = Math.abs((parseObj.m.length-1-coord[1].r)-coord[0].r);

        if (diffSpaceLR <= 1) elem.classList.add(_lib.classes.align.hcenterish);
        if (diffSpaceLR == 0) elem.classList.add(_lib.classes.align.hcenter);
        if (diffSpaceTB <= 1) elem.classList.add(_lib.classes.align.vcenterish);
        if (diffSpaceTB == 0) elem.classList.add(_lib.classes.align.vcenter);

        if (diffSpaceLR + diffSpaceTB <= 1) elem.classList.add(_lib.classes.align.centerish);
        if (diffSpaceLR + diffSpaceTB == 0) elem.classList.add(_lib.classes.align.center);
    }

    function parseText(parseObj, point, opts) {
        var textSlice = parseObj.m[point.r].slice(point.c);
        var textMatch = textSlice.match(_lib.regexp.text);
        if (textMatch) {
            var tmatch = textMatch[0];
            var lcolon = tmatch.startsWith(":");
            var rcolon = tmatch.endsWith(":");
            var coord  = [{r: point.r, c: point.c},
                          {r: point.r, c: point.c+tmatch.length-1}]

            var left   = 0.5 * (coord[0].c + coord[1].c) + 0.5 + opts.padding;
            var top    = coord[0].r + 0.5 + opts.padding;

            var span = document.createElement("span");
            span.classList.add(_lib.classes.text.normal);
            if      ( lcolon && !rcolon) span.classList.add(_lib.classes.text.lcolon);
            else if (!lcolon &&  rcolon) span.classList.add(_lib.classes.text.rcolon);
            else if ( lcolon &&  rcolon) span.classList.add(_lib.classes.text.colons);

            setAlignClasses(parseObj, span, coord);

            span.textContent    = textMatch[1];
            span.style.top      = getY(parseObj, top) + "px";
            span.style.left     = getX(parseObj, left) + "px";
            for (var c=point.c, clen=point.c+tmatch.length; c<clen; c++) {
                parseObj.exclude.push([point.r, c]);
            }
            return [{elem: span, callback: null}];
        }
        return []
    }

    function parseBox(parseObj, point, opts) {
        var rowSlice = parseObj.m[point.r].slice(point.c);
        var topMatch = rowSlice.match(_lib.regexp.box.top);

        if (topMatch) {
            var tmatch = topMatch[0];
            var coord  = [{r: point.r,   c: point.c},
                          {r: point.r+1, c: point.c+tmatch.length-1}];
            for (var rmax=parseObj.m.length; coord[1].r<rmax; coord[1].r++) {
                var rowSlice    = parseObj.m[coord[1].r].slice(coord[0].c, coord[1].c+1);
                var middleMatch = rowSlice.match(_lib.regexp.box.middle);
                var bottomMatch = rowSlice.match(_lib.regexp.box.bottom);
                if (!middleMatch && !bottomMatch) {
                    break;
                }
                if (middleMatch && middleMatch[0].length == tmatch.length) {
                    continue;
                }
                if (bottomMatch && bottomMatch[0].length == tmatch.length) {
                    var width  = coord[1].c - coord[0].c;
                    var left   = coord[0].c + 0.5 + opts.padding;
                    var height = coord[1].r - coord[0].r;
                    var top    = coord[0].r + 0.5 + opts.padding;

                    // return
                    var box = document.createElement("div");
                    box.classList.add(_lib.classes.box);
                    box.style.top    = getY(parseObj, top)    + "px";
                    box.style.height = getY(parseObj, height) + "px";
                    box.style.left   = getX(parseObj, left)   + "px";
                    box.style.width  = getX(parseObj, width)  + "px";

                    setAlignClasses(parseObj, box, coord);

                    // Retrieve internal content
                    var m = [];
                    for (var r=point.r; r<point.r+height+1; r++) {
                        if (r > point.r && r < point.r+height) {
                            m.push(parseObj.m[r].slice(coord[0].c+1, coord[1].c));
                        }
                        for (var c=point.c; c<point.c+width+1; c++) {
                            parseObj.exclude.push([r, c]);
                        }
                    }
                    box.textContent = "";
                    var parseObjInner = {
                        config:  parseObj.config,
                        m:       m,
                        width:   width,
                        height:  height,
                        exclude: []
                    }
                    var parsedElems = parse(parseObjInner, opts={padding:0.5});
                    for (var i=0, len=parsedElems.length; i<len; i++) {
                        box.appendChild(parsedElems[i].elem);
                    }

                    var parseElemsCallback = {
                        parsedElems: parsedElems,
                        run : function() {
                            for (var i=0, len=this.parsedElems.length; i<len; i++) {
                                if (this.parsedElems[i].callback) {
                                    this.parsedElems[i].callback.run();
                                }
                            }
                        }
                    };

                    if ("id" in topMatch.groups && topMatch.groups.id) {
                        if (topMatch.groups.id.length > 0) {
                            box.id = topMatch.groups.id;
                            var span = document.createElement("span");
                            span.classList.add(_lib.classes.id);
                            span.textContent = box.id;
                            box.appendChild(span);
                        }
                    }

                    if ("classes" in topMatch.groups && topMatch.groups.classes) {
                        classes = topMatch.groups.classes.split("-");
                        for (var i=0, clen=classes.length; i<clen; i++) {
                            if (classes[i].length > 0) {
                                if (i == 0) {
                                    var span = document.createElement("span");
                                    span.classList.add(_lib.classes.class0);
                                    span.textContent = classes[i];
                                    box.appendChild(span);
                                }
                                box.classList.add(classes[i]);
                            }
                        }
                    }

                    return [{elem: box, callback: parseElemsCallback}];
                }
            }

        }
        return [];
    }

    function parse(parseObj, opts={padding:0}) {
        var parseFuncList = [parseBox,
                             parseArrow,
                             parseText];

        var parsedObjList = [];

        for (var p=0, plen=parseFuncList.length; p<plen; p++) {
            for (var r=0, rlen=parseObj.m.length; r<rlen; r++) {
                for (var c=0, clen=parseObj.m[r].length; c<clen; c++) {
                    if (parseObj.exclude.some(i => {return i[0] == r && i[1] == c})) continue;
                    point = {r:r, c:c};
                    parsedObjList.push.apply(parsedObjList, parseFuncList[p](parseObj, point, opts));
                }
            }
        }

        return parsedObjList;
    }

    function copyParseObj(parseObj) {
        return {
            config:  {...parseObj.config},
            m:       [...parseObj.m],
            width:   parseObj.width,
            height:  parseObj.height,
            exclude: [...parseObj.exclude]
        }
    }

    function resize(elem) {
        return function() {
            scale = Math.min(1, elem.parentElement.offsetWidth / elem.origWidth);
            newWidth  = elem.origWidth  * scale;
            newHeight = elem.origHeight * scale;
            elem.style.transform = "scale(" + scale.toString() + ")";
            elem.style.transformOrigin = "left";
        }
    }

    function main() {
        var elems = document.getElementsByTagName("diascii");
        for (var i=0, ilen=elems.length; i<ilen; i++) {
            var elem = elems[i];

            // Delete the first and the last new lines (if any)
            elem.textContent = elem.textContent.replace(/(^\n)|(\n *$)/g,"");

            var m = elem.textContent.split("\n");
            elem.textContent = "";
            var height = m.length;
            var trimSpacesIndex = getWidth(m);
            for (var r=0; r<height; r++) {
                trimSpacesIndex = Math.min(trimSpacesIndex, m[r].search(/\S|$/));
            }
            for (var r=0; r<height; r++) {
                m[r] = m[r].slice(trimSpacesIndex);
            }

            var width  = getWidth(m);

            var parseObj = {
                config:  loadConfig(elem),
                m:       m,
                width:   width,
                height:  height,
                exclude: []
            }

            elem.style.width  = getX(parseObj, width)  + "px";
            elem.style.height = getY(parseObj, height) + "px";

            elem.origWidth  = parseInt(elem.style.width);
            elem.origHeight = parseInt(elem.style.height);

            resizeCallback = resize(elem);
            window.addEventListener('resize', resizeCallback);
            window.addEventListener('load',   resizeCallback);

            var parsedObjList = parse(parseObj);
            for (var j=0, jlen=parsedObjList.length; j<jlen; j++) {
                elem.appendChild(parsedObjList[j].elem);
                if (parsedObjList[j].callback) {
                    parsedObjList[j].callback.run();
                }
            }
        }

    }

    document.addEventListener('DOMContentLoaded', main);
})();