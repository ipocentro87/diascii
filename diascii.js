// Diascii

const DD_ROUNDED_BOX = {"top":    /^\.-+(#(?<id>\w+))?-*(?<classes>((\w+)-*)*)-\./,
                        "middle": /^[\|\+].*[\|\+]$/,
                        "bottom": /^'-+'$/};

const DD_STRAIGHT_ARROW = /^[^\-](-+>)/;

const DD_PLAIN_TEXT = /^:?\b([\w\.\,]+ ?)+\b:?/;

const DD_SCALE_X = 10;
const DD_SCALE_Y = 25;
const DD_ARROW_CROSS_GAP = 2;

const DD_SCALE_ARROW = 0.75;

var DD_ID_NUM = 0;

var DD_SVG;

function getXdim(i)
{
    var iScaled = DD_SCALE_X * i;
    return iScaled.toString();
}

function getYdim(i)
{
    var iScaled = DD_SCALE_Y * i;
    return iScaled.toString();
}

function addExclude(excludes, r, c)
{
    excludes.push([r, c]);
}

function concatExclude(excludes, lst)
{
    excludes.push.apply(excludes, lst);
}

function ddParseRoundedBox(elem, m, r, c, zindex, excludes, orig)
{
    var tslice   = m[r].slice(c);
    var tmatches = tslice.match(DD_ROUNDED_BOX["top"]);

    if (tmatches != null) {
        var tmatch = tmatches[0];
        var boxCoord = [[r, c], [r, c+tmatch.length-1]];
        for (var rbox=r; rbox<m.length; rbox++) {
            var bslice = m[rbox].slice(boxCoord[0][1], boxCoord[1][1]+1);
            var bmatches = bslice.match(DD_ROUNDED_BOX["middle"]);
            if (bmatches != null && bmatches[0].length == tmatch.length) {
                boxCoord[1][0]++;
            }
            var bmatches = bslice.match(DD_ROUNDED_BOX["bottom"]);
            if (bmatches != null && bmatches[0].length == tmatch.length) {
                boxCoord[1][0]++;
                var width  = boxCoord[1][1] - boxCoord[0][1];
                var left   = boxCoord[0][1] + 0.5 + orig[0];
                var height = boxCoord[1][0] - boxCoord[0][0];
                var top    = boxCoord[0][0] + 0.5 + orig[1];

                // return
                boxElem = document.createElement("div");
                boxElem.classList.add("DD_ROUNDED_BOX");
                boxElem.style.top      = getYdim(top) + "px";
                boxElem.style.height   = getYdim(height) + "px";
                boxElem.style.left     = getXdim(left) + "px";
                boxElem.style.width    = getXdim(width) + "px";
                boxElem.style.zIndex   = zindex;
                elem.appendChild(boxElem);

                var textContent = [];
                for (var rbox=r; rbox<r+height+1; rbox++) {
                    if (rbox > r && rbox < r+height) {
                        textContent.push(m[rbox].slice(boxCoord[0][1]+1, boxCoord[1][1]));
                    }
                    for (var cbox=c; cbox<c+width+1; cbox++) {
                        addExclude(excludes, rbox, cbox);
                    }
                }
                boxElem.textContent = textContent.join("\n");
                ddParseInnerText(boxElem, zindex+1, [0.5, 0.5]);

                if ("id" in tmatches.groups && tmatches.groups.id) {
                    if (tmatches.groups.id.length > 0) {
                        boxElem.id = tmatches.groups.id;
                        spanElem = document.createElement("span");
                        spanElem.classList.add("DD_ID");
                        spanElem.textContent    = boxElem.id;
                        spanElem.style.top      = getYdim(-0.5) + "px";
                        spanElem.style.zIndex   = zindex;
                        boxElem.appendChild(spanElem);
                    }
                }

                if ("classes" in tmatches.groups && tmatches.groups.classes) {
                    clsList = tmatches.groups.classes.split("-");
                    for (var cls=0; cls<clsList.length; cls++) {
                        if (clsList[cls].length > 0)
                            boxElem.classList.add(clsList[cls]);
                    }
                }


                return true;
            }
        }

    }
    return false;
}

function getPoints(m, r, c) {
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

function getArrowList(m, r, c, pathList, excludes, excludesLocal, from=null)
{
    // Find startpoint
    var p = getPoints(m, r, c);
    var fromLeft   = (from == null || from == "left"   || from == "left-jump");
    var fromRight  = (from == null || from == "right"  || from == "right-jump");
    var fromBottom = (from == null || from == "bottom" || from == "bottom-jump");
    var fromTop    = (from == null || from == "top"    || from == "top-jump");

    var patternLR = ["<-", "<.", "<'",
                     "--", "-.", "-'", "->",
                     ".-", ".'", ".>",
                     "'-", "'.", "'>"];
    var patternMaybeLR = ["..", "''"];
    var patternTB = ["||", "|'", "|v",
                     ".|", ".v", ".'",
                     "^|", "^'"];
    var theresLeft   = (from == "left-jump")
                    || patternLR.includes(p.left + p.center);
    var theresRight  = (from == "right-jump")
                    || patternLR.includes(p.center + p.right);
    var theresBottom = (from == "bottom-jump")
                    || patternTB.includes(p.center + p.bottom);
    var theresTop    = (from == "top-jump")
                    || patternTB.includes(p.top + p.center);

    if (patternLR.includes(p.left + p.center) && !theresRight)
        theresLeft = true;
    if (patternLR.includes(p.center + p.right) && !theresLeft)
        theresRight = true;

    var theresOnlyLeft   =  theresLeft && !theresRight && !theresBottom && !theresTop;
    var theresOnlyRight  = !theresLeft &&  theresRight && !theresBottom && !theresTop;
    var theresOnlyBottom = !theresLeft && !theresRight &&  theresBottom && !theresTop;
    var theresOnlyTop    = !theresLeft && !theresRight && !theresBottom &&  theresTop;

    var pBegin = (pathList.length == 0);

    var checkLeft   = fromLeft   && (pBegin ? theresOnlyRight  : theresLeft);
    var checkRight  = fromRight  && (pBegin ? theresOnlyLeft   : theresRight);
    var checkBottom = fromBottom && (pBegin ? theresOnlyTop    : theresBottom);
    var checkTop    = fromTop    && (pBegin ? theresOnlyBottom : theresTop);

    var theresLeftJump   = (p.center == "-" || (from == "right-jump"  && p.center == "|")) && p.left  == "|";
    var theresRightJump  = (p.center == "-" || (from == "left-jump"   && p.center == "|")) && p.right == "|";
    var theresBottomJump = (p.center == "|" || p.center == "." || (from == "bottom-jump" && p.center == "-")) && p.bottom == "-";
    var theresTopJump    = (p.center == "|" || p.center == "'" || (from == "top-jump"    && p.center == "-")) && p.top == "-";

    var goLeft   = ((c-1 >= 0) && theresLeft)           || ((c-2 >= 0) && theresLeftJump);
    var goRight  = ((c+1 < m[r].length) && theresRight) || ((c+2 < m[r].length) && theresRightJump);
    var goBottom = ((r+1 < m.length) && theresBottom)   || ((r+2 < m.length) && theresBottomJump);
    var goTop    = ((r-1 >= 0) && theresTop)            || ((r-2 >= 0) && theresTopJump);

    var size = Math.min(DD_SCALE_X, DD_SCALE_Y);
    var done = true;
    var draw = true;
    var go = "";

    if (p.center == "|" && from == "left-jump") {
        pathList.push("h {Math.max(0, " + getXdim(0.5) + "- 0.5*strokeWidth - DD_ARROW_CROSS_GAP)}");
        pathList.push("m {Math.min(2 * DD_ARROW_CROSS_GAP + strokeWidth," + getXdim(1) + ")} 0");
        pathList.push("h {Math.max(0, " + getXdim(0.5) + "- 0.5*strokeWidth - DD_ARROW_CROSS_GAP)}");
        go = "right-jump";
        draw = false;
    }
    else if (p.center == "|" && from == "right-jump") {
        pathList.push("h {-Math.max(0, " + getXdim(0.5) + "- 0.5*strokeWidth - DD_ARROW_CROSS_GAP)}");
        pathList.push("m {-Math.min(2 * DD_ARROW_CROSS_GAP + strokeWidth," + getXdim(1) + ")} 0");
        pathList.push("h {-Math.max(0, " + getXdim(0.5) + "- 0.5*strokeWidth - DD_ARROW_CROSS_GAP)}");
        go = "left-jump";
        draw = false;
    }
    else if (p.center == "-" && from == "bottom-jump") {
        pathList.push("v   {-Math.max(0, " + getYdim(0.5) + "- 0.5*strokeWidth - DD_ARROW_CROSS_GAP)}");
        pathList.push("m 0 {-Math.min(2 * DD_ARROW_CROSS_GAP + strokeWidth," + getYdim(1) + ")}");
        pathList.push("v   {-Math.max(0, " + getYdim(0.5) + "- 0.5*strokeWidth - DD_ARROW_CROSS_GAP)}");
        go = "top-jump";
        draw = false;
    }
    else if (p.center == "-" && from == "top-jump") {
        pathList.push("v   {Math.max(0, " + getYdim(0.5) + "- 0.5*strokeWidth - DD_ARROW_CROSS_GAP)}");
        pathList.push("m 0 {Math.min(2 * DD_ARROW_CROSS_GAP + strokeWidth," + getYdim(1) + ")}");
        pathList.push("v   {Math.max(0, " + getYdim(0.5) + "- 0.5*strokeWidth - DD_ARROW_CROSS_GAP)}");
        go = "bottom-jump";
        draw = false;
    }
    else if (p.center == "-" && checkLeft && goRight) {
        pathList.push("h " + getXdim(1));
        go = theresRightJump ? "right-jump" : "right";
    }
    else if (p.center == "-" && checkRight && goLeft) {
        if (from == null)
            pathList.push("m " + getXdim(1) + " 0");
        pathList.push("h " + getXdim(-1));
        go = theresLeftJump ? "left-jump" : "left";
    }
    else if (p.center == "|" && checkBottom && goTop) {
        if (from == null)
            pathList.push("m " + getXdim(0.5) + " " + getYdim(0.5));
        pathList.push("v " + getYdim(-1));
        go = theresTopJump ? "top-jump" : "top";
    }
    else if (p.center == "|" && checkTop && goBottom) {
        if (from == null)
            pathList.push("m " + getXdim(0.5) + " " + getYdim(-0.5));
        pathList.push("v " + getYdim(1));
        go = theresBottomJump ? "bottom-jump" : "bottom";
    }
    else if ((p.center == "." && checkBottom && goRight)
          || (p.center == "." && checkLeft   && goRight)) {
        // .>
        // |
        if (from == null)
            pathList.push("m " + getXdim(0.5) + " " + getYdim(0.5));
        if (DD_SCALE_X < DD_SCALE_Y) {
            pathList.push("v " + (-0.5 * (DD_SCALE_Y-DD_SCALE_X)).toString());
        }
        pathList.push("q " + [0, -0.5*size].join(",") + " " + [0.5*size, -0.5*size].join(","));
        if (DD_SCALE_X > DD_SCALE_Y) {
            pathList.push("h " + (0.5 * (DD_SCALE_X-DD_SCALE_Y)).toString());
        }
        go = "right";
    }
    else if ((p.center == "." && checkBottom && goLeft)
          || (p.center == "." && checkRight  && goLeft)) {
        // <.
        //  |
        if (from == null)
            pathList.push("m " + getXdim(0.5) + " " + getYdim(0.5));
        if (DD_SCALE_X < DD_SCALE_Y) {
            pathList.push("v " + (-0.5 * (DD_SCALE_Y-DD_SCALE_X)).toString());
        }
        pathList.push("q " + [0, -0.5*size].join(",") + " " + [-0.5*size, -0.5*size].join(","));
        if (DD_SCALE_X > DD_SCALE_Y) {
            pathList.push("h " + (-0.5 * (DD_SCALE_X-DD_SCALE_Y)).toString());
        }
        go = "left";
    }
    else if (p.center == "." && checkRight && goBottom) {
        // .-
        // v
        if (DD_SCALE_X > DD_SCALE_Y) {
            pathList.push("h " + (-0.5 * (DD_SCALE_X-DD_SCALE_Y)).toString());
        }
        pathList.push("q " + [-0.5*size, 0].join(",") + " " + [-0.5*size, +0.5*size].join(","));
        if (DD_SCALE_X < DD_SCALE_Y) {
            pathList.push("v " + (0.5 * (DD_SCALE_Y-DD_SCALE_X)).toString());
        }
        go = "bottom";
    }
    else if (p.center == "." && checkLeft && goBottom) {
        // -.
        //  v
        if (DD_SCALE_X > DD_SCALE_Y) {
            pathList.push("h " + (0.5 * (DD_SCALE_X-DD_SCALE_Y)).toString());
        }
        pathList.push("q " + [0.5*size, 0].join(",") + " " + [0.5*size, +0.5*size].join(","));
        if (DD_SCALE_X < DD_SCALE_Y) {
            pathList.push("v " + (0.5 * (DD_SCALE_Y-DD_SCALE_X)).toString());
        }
        go = "bottom";
    }
    else if (p.center == "." && checkTop && goBottom) {
        // .
        // |
        if (from == null)
            pathList.push("m " + getXdim(0.5) + " " + getYdim(0));
        pathList.push("v " + getYdim(0.5));
        go = theresBottomJump ? "bottom-jump" : "bottom";
    }
    else if (p.center == "'" && checkLeft && goTop) {
        //  ^
        // -'
        if (DD_SCALE_X > DD_SCALE_Y) {
            pathList.push("h " + (0.5 * (DD_SCALE_X-DD_SCALE_Y)).toString());
        }
        pathList.push("q " + [0.5*size, 0].join(",") + " " + [0.5*size, -0.5*size].join(","));
        if (DD_SCALE_X < DD_SCALE_Y) {
            pathList.push("v " + (-0.5 * (DD_SCALE_Y-DD_SCALE_X)).toString());
        }
        go = "top";
    }
    else if (p.center == "'" && checkRight && goTop) {
        // ^
        // '-
        if (DD_SCALE_X > DD_SCALE_Y) {
            pathList.push("h " + (-0.5 * (DD_SCALE_X-DD_SCALE_Y)).toString());
        }
        pathList.push("q " + [-0.5*size, 0].join(",") + " " + [-0.5*size, -0.5*size].join(","));
        if (DD_SCALE_X < DD_SCALE_Y) {
            pathList.push("v " + (-0.5 * (DD_SCALE_Y-DD_SCALE_X)).toString());
        }
        go = "top";
    }
    else if ((p.center == "'" && checkTop   && goLeft)
          || (p.center == "'" && checkRight && goLeft)) {
        if (from == null)
            pathList.push("m " + getXdim(0.5) + " " + getYdim(-0.5));
        //   |
        // <-'
        if (DD_SCALE_X < DD_SCALE_Y) {
            pathList.push("v " + (0.5 * (DD_SCALE_Y-DD_SCALE_X)).toString());
        }
        pathList.push("q " + [0, 0.5*size].join(",") + " " + [-0.5*size, 0.5*size].join(","));
        if (DD_SCALE_X > DD_SCALE_Y) {
            pathList.push("h " + (-0.5 * (DD_SCALE_X-DD_SCALE_Y)).toString());
        }
        go = "left";
    }
    else if ((p.center == "'" && checkTop  && goRight)
          || (p.center == "'" && checkLeft && goRight)) {
        // |
        // '->
        if (from == null)
            pathList.push("m " + getXdim(0.5) + " " + getYdim(-0.5));
        if (DD_SCALE_X < DD_SCALE_Y) {
            pathList.push("v " + (0.5 * (DD_SCALE_Y-DD_SCALE_X)).toString());
        }
        pathList.push("q " + [0, 0.5*size].join(",") + " " + [0.5*size, 0.5*size].join(","));
        if (DD_SCALE_X > DD_SCALE_Y) {
            pathList.push("h " + (0.5 * (DD_SCALE_X-DD_SCALE_Y)).toString());
        }
        go = "right";
    }
    else if (p.center == "'" && checkBottom && goTop) {
        // |
        // '
        if (from == null)
            pathList.push("m " + getXdim(0.5) + " " + getYdim(0));
        pathList.push("v " + getYdim(-0.5));
        go = theresTopJump ? "top-jump" : "top";
    }
    else {
        done = false;
        draw = false;
    }

    if (done) {
        if (draw)
            excludesLocal.push([r, c]);
        switch (go) {
        case "left":
            return getArrowList(m, r,   c-1, pathList, excludes, excludesLocal, from="right");
        case "left-jump":
            return getArrowList(m, r,   c-1, pathList, excludes, excludesLocal, from="right-jump");
        case "right":
            return getArrowList(m, r,   c+1, pathList, excludes, excludesLocal, from="left");
        case "right-jump":
            return getArrowList(m, r,   c+1, pathList, excludes, excludesLocal, from="left-jump");
        case "top":
            return getArrowList(m, r-1, c  , pathList, excludes, excludesLocal, from="bottom");
        case "top-jump":
            return getArrowList(m, r-1, c  , pathList, excludes, excludesLocal, from="bottom-jump");
        case "bottom":
            return getArrowList(m, r+1, c  , pathList, excludes, excludesLocal, from="top");
        case "bottom-jump":
            return getArrowList(m, r+1, c  , pathList, excludes, excludesLocal, from="top-jump");
        }
    }
    else if (!pBegin) {
        if (p.center == ">" && checkLeft) {
            excludesLocal.push([r, c]);
            concatExclude(excludes, excludesLocal);
            return [p.center, pathList];
        }
        else if (p.center == "<" && checkRight) {
            excludesLocal.push([r, c]);
            concatExclude(excludes, excludesLocal);
            return [p.center, pathList];
        }
        else if (p.center == "^" && checkBottom) {
            excludesLocal.push([r, c]);
            concatExclude(excludes, excludesLocal);
            return [p.center, pathList];
        }
        else if (p.center == "v" && checkTop) {
            excludesLocal.push([r, c]);
            concatExclude(excludes, excludesLocal);
            return [p.center, pathList];
        }
    }
    return ["", null];
}

function ddParseArrow(elem, m, r, c, zindex, excludes, orig)
{
    let lastString, pList;
    [lastString, pList] = getArrowList(m, r, c, [], excludes, []);
    if (pList != null) {
        svgElem = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgElem.classList.add("DD_ARROW");
        svgElem.style.display  = "block";
        svgElem.style.overflow = "visible";
        svgElem.style.position = "absolute";
        svgElem.style.top      = getYdim(r+0.5+orig[1]) + "px";
        svgElem.style.left     = getXdim(c+orig[0]) + "px";
        svgElem.setAttributeNS("http://www.w3.org/2000/xmlns/",
                               "xmlns:xlink",
                               "http://www.w3.org/1999/xlink");

        svgDefs   = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        svgElem.appendChild(svgDefs);

        svgMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        svgMarker.setAttribute("id", "arrowhead" + DD_ID_NUM.toString());
        svgMarker.setAttribute("markerWidth",  "1");
        svgMarker.setAttribute("markerHeight", "2");
        svgMarker.setAttribute("refX", "0");
        svgMarker.setAttribute("refY", "1");
        svgMarker.setAttribute("orient", "auto");
        svgPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        svgPolygon.setAttribute("points", "0,0 1,1 0,2");
        svgMarker.appendChild(svgPolygon);
        svgDefs.appendChild(svgMarker);

        svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        svgPath.setAttribute("marker-end", "url(#arrowhead" + DD_ID_NUM.toString() + ")");

        DD_ID_NUM++;

        svgElem.appendChild(svgPath);
        elem.appendChild(svgElem);

        var cssObj      = window.getComputedStyle(svgPath, null);
        var strokeWidth = parseInt(cssObj.strokeWidth, 10);
        var strokeColor = cssObj.stroke;

        svgMarker.style.fill = strokeColor;

        if (DD_SCALE_X-strokeWidth > 0) {
            if (lastString == ">") pList.push("h " + (DD_SCALE_X-strokeWidth).toString());
            if (lastString == "<") pList.push("h " + (-(DD_SCALE_X-strokeWidth)).toString());
        }
        if (DD_SCALE_Y-strokeWidth > 0) {
            if (lastString == "^") pList.push("v " + (-(DD_SCALE_Y-strokeWidth)).toString());
            if (lastString == "v") pList.push("v " + (DD_SCALE_Y-strokeWidth).toString());
        }

        for (var i=0; i<pList.length; i++) {
            regExp = pList[i].match(/(^.*){([^}]*)}(.*$)/);
            if (regExp) {
                expr = regExp[2];
                console.log(expr);
                f = window.Function('"use strict"; return function(strokeWidth){return (' + expr + ')}')();
                exprEval = f(strokeWidth=strokeWidth);
                pList[i] = regExp[1] + exprEval + regExp[3];
            }
        }

        svgPath.setAttribute("d", "m 0 0 " + pList.join(" "));

        return true;
    }
    return false;
}

function ddParseText(elem, m, r, c, zindex, excludes, orig)
{
    var tcontent = m[r].slice(c);
    var tmatches = tcontent.match(DD_PLAIN_TEXT);
    if (tmatches != null) {
        var tmatch = tmatches[0];
        var ldots = tmatches[0].startsWith(":");
        var rdots = tmatches[0].endsWith(":");
        var spanCenter = [r+0.5+orig[0], c+(tmatch.length/2)+orig[1]];

        spanElem = document.createElement("span");
        spanElem.classList.add("DD_PLAIN_TEXT");
        if (ldots && !rdots)
            spanElem.classList.add("DD_LDOTS");
        else if (!ldots && rdots)
            spanElem.classList.add("DD_RDOTS");
        else if (ldots && rdots)
            spanElem.classList.add("DD_DOTS");

        if (c+tmatch.length==m[r].length)
            spanElem.classList.add("DD_ALIGN_RIGHT");
        if (c==0)
            spanElem.classList.add("DD_ALIGN_LEFT");
        if (r==0)
            spanElem.classList.add("DD_ALIGN_TOP");
        if (r==m.length-1)
            spanElem.classList.add("DD_ALIGN_BOTTOM");

        diffSpaceLR = Math.abs((m[r].length-(tmatch.length+c)) - c);
        diffSpaceTB = Math.abs((m.length-r-1)-r);

        if (diffSpaceLR <= 1)
            spanElem.classList.add("DD_ALIGN_HCENTRISH");
        if (diffSpaceLR == 0)
            spanElem.classList.add("DD_ALIGN_HCENTER");

        if (diffSpaceTB <= 1)
            spanElem.classList.add("DD_ALIGN_VCENTRISH");
        if (diffSpaceTB == 0)
            spanElem.classList.add("DD_ALIGN_VCENTER");

        if (diffSpaceLR + diffSpaceTB <= 1)
            spanElem.classList.add("DD_ALIGN_CENTERISH");
        if (diffSpaceLR + diffSpaceTB == 0)
            spanElem.classList.add("DD_ALIGN_CENTER");

        spanElem.style.position = "absolute";
        spanElem.textContent    = tmatches[1];
        spanElem.style.top      = getYdim(spanCenter[0]) + "px";
        spanElem.style.left     = getXdim(spanCenter[1]) + "px";
        spanElem.style.zIndex   = zindex;
        elem.appendChild(spanElem);
        for (var cbox=c; cbox<c+tmatch.length; cbox++) {
            addExclude(excludes, r, cbox);
        }
    }
}

function ddParseInnerText(elem, zindex, orig)
{
    // Get string matrix and initialise dimensions
    var m = elem.textContent.split("\n");
    elem.textContent = "";

    var excludes = [];

    var parseList = [ddParseRoundedBox,
                     ddParseArrow,
                     ddParseText];

    for (var p=0; p<parseList.length; p++) {
        for (var r=0; r<m.length; r++) {
            for (var c=0; c<m[r].length; c++) {
                if (excludes.some(i => {return i[0] == r && i[1] == c})) continue;
//                if (r==7 && c==20 && parseList[p] == ddParseArrow && excludes.length > 0) debugger;
                parseList[p](elem, m, r, c, zindex, excludes, orig);
            }
        }
    }
}

function diasciiParse(elem)
{
    elem.textContent = elem.textContent.replace(/(^\n)|(\n *$)/g,"");
    var m = elem.textContent.split("\n");
    var elemWidth   = 0;
    var elemHeight  = m.length;
    for (var r=0; r<m.length; r++) {
        elemWidth = Math.max(elemWidth, m[r].length);
    }
    elem.style.width  = getXdim(elemWidth)  + "px";
    elem.style.height = getYdim(elemHeight) + "px";

    ddParseInnerText(elem, 0, [0, 0]);
}

var diasciiList = document.getElementsByTagName("diascii");

for (var i=0; i<diasciiList.length; i++) {
    diasciiParse(diasciiList[i]);
}
