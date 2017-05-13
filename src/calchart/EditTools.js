/**
 * @file This file contains all the classes that handle mouse events
 * in the DotContext.
 */

import { NotImplementedError } from "utils/errors";
import HTMLBuilder from "utils/HTMLBuilder";
import {
    calcAngle,
    calcDistance,
    calcRotatedXPos,
    calcRotatedYPos,
    getDimensions,
    round,
    roundSmall,
} from "utils/MathUtils";
import { addHandles, resizeHandles } from "utils/UIUtils";

/**
 * The proxy class that can load any tools used to edit dots
 * in the workspace.
 */
export default class EditTools {
    /**
     * Load the tool with the given name.
     *
     * @param {DotContext} context
     * @param {string} name
     * @return {BaseTool}
     */
    static load(context, name) {
        let EditTool;
        switch (name) {
            case "selection":
                EditTool = SelectionTool;
                break;
            case "lasso":
                EditTool = LassoTool;
                break;
            case "swap":
                EditTool = SwapTool;
                break;
            case "stretch":
                EditTool = StretchTool;
                break;
            case "line":
                EditTool = LineTool;
                break;
            case "arc":
                EditTool = ArcTool;
                break;
            case "block":
                EditTool = BlockTool;
                break;
            case "circle":
                EditTool = CircleTool;
                break;
            default:
                throw new Error(`No tool named: ${name}`);
        }

        let tool = new EditTool(context);

        if (tool instanceof BaseSelection) {
            this._lastSelectionTool = name;
        }

        if (tool instanceof BaseEdit) {
            $(".workspace").addClass("edit-tools-active");
        } else {
            $(".workspace").removeClass("edit-tools-active");
        }

        $(".toolbar .edit-tools li").removeClass("active");
        $(`.toolbar .${name}`).addClass("active");

        tool.load();
        return tool;
    }

    /**
     * @return {string} The name of the last selection tool used.
     */
    static get lastSelectionTool() {
        return this._lastSelectionTool;
    }
}

/**
 * The superclass for all EditTool classes.
 *
 * Method handlers:
 * - User clicks tool in toolbar: load()
 * - User clicks down in workspace: mousedown(). Start listening
 *   for mousemove and mouseup events
 * - User moves mouse (dragging): mousemove()
 * - User clicks up: mouseup()
 * - If isDone() returns true, stop listening for mousemove and
 *   mouseup events
 * - User clicks another tool in toolbar: unload()
 */
class BaseTool {
    /**
     * @param {DotContext} context
     */
    constructor(context) {
        this.context = context;
        this.controller = context.getController();
        this.grapher = context.getGrapher();
    }

    /**
     * Runs any actions when the tool is loaded from the toolbar.
     */
    load() {}

    /**
     * Runs any actions whenever the context is refreshed.
     */
    refresh() {}

    /**
     * Runs any actions when the tool is unloaded from the toolbar.
     */
    unload() {}

    /**
     * @return {boolean} true if mousemove/mouseup events should
     *   stop being listened for.
     */
    isDone() {
        return true;
    }

    /**
     * The function to run when the mousedown event is triggered
     * in the workspace.
     *
     * @param {Event} e
     */
    mousedown(e) {}

    /**
     * The function to run when the mousemove event is triggered
     * in the workspace.
     *
     * @param {Event} e
     */
    mousemove(e) {}

    /**
     * The function to run when the mouseup event is triggered
     * in the workspace.
     *
     * @param {Event} e
     */
    mouseup(e) {}

    /**
     * @return {number} the snap grid
     */
    _getSnap() {
        let grid = this.context.getGrid();
        if (grid === 0) {
            return null;
        } else {
            return this.grapher.getScale().toDistance(grid);
        }
    }

    /**
     * Convert the given (x,y) coordinates on the page to be relative to
     * the workspace. Can also pass in an Event object, which will have
     * its pageX and pageY values taken.
     *
     * Usage:
     * let [x, y] = this._makeRelative(e);
     * let [x, y] = this._makeRelative(pageX, pageY);
     *
     * @param {Event} [e]
     * @param {number} [pageX]
     * @param {number} [pageY]
     * @return {number[]} The coordinates as [x, y].
     */
    _makeRelative(pageX, pageY) {
        if (arguments.length === 1) {
            let e = arguments[0];
            pageX = e.pageX;
            pageY = e.pageY;
        }

        return $(".workspace").makeRelative(pageX, pageY);
    }

    /**
     * Same as _makeRelative, except the returned values are snapped
     * to the grid, if applicable.
     */
    _makeRelativeSnap() {
        let [x, y] = this._makeRelative.apply(this, arguments);

        let grid = this.context.getGrid();
        if (grid !== 0) {
            let scale = this.grapher.getScale();
            let steps = scale.toStepCoordinates({x, y});
            let distance = scale.toDistanceCoordinates({
                x: round(steps.x, grid),
                y: round(steps.y, grid),
            });
            x = distance.x;
            y = distance.y;
        }

        return [x, y];
    }
}

/**
 * A superclass for all tools that select dots
 */
class BaseSelection extends BaseTool {
}

/**
 * The default edit tool that can either move dots or draw a rectangular
 * selection box that mass selects dots.
 */
class SelectionTool extends BaseSelection {
    mousedown(e) {
        this._metaKey = e.shiftKey || e.ctrlKey || e.metaKey;

        if ($(e.target).is(".dot-marker")) {
            if (this._metaKey) {
                this._dragType = "none";
                let dot = $(e.target).parent();
                this.context.toggleDots(dot);
            } else {
                this._dragType = "dot";
                this.mousedownDot(e);
            }
        } else {
            this._dragType = "select";
            this.mousedownSelect(e);
        }

        this._dragStart = e;
    }

    mousedownDot(e) {
        let dot = $(e.target).parent();

        if (!this.grapher.isSelected(dot)) {
            this.context.selectDots(dot, {
                append: false,
            });
        }

        this._scale = this.grapher.getScale();
        this._scrollOffset = {
            top: 0,
            left: 0,
        };
        this._moveOffset = {
            x: 0,
            y: 0,
        };
    }

    mousedownSelect(e) {
        if (this._metaKey) {
            let selectedDots = this.controller.getSelectedDots().map(dot => dot.id);
            this._selected = new Set(selectedDots);
        } else {
            this.context.deselectDots();
        }

        this._box = HTMLBuilder.div("selection-box", null, ".workspace");
        this._scrollOffset = {
            top: 0,
            left: 0,
        };
    }

    mousemove(e) {
        switch (this._dragType) {
            case "dot":
                this.mousemoveDot(e);
                break;
            case "select":
                this.mousemoveSelect(e);
                break;
        }
    }

    mousemoveDot(e) {
        let scale = this.grapher.getScale();

        // change from beginning of move to now
        let deltaX = this._scrollOffset.left + e.pageX - this._dragStart.pageX;
        let deltaY = this._scrollOffset.top + e.pageY - this._dragStart.pageY;

        // snap overall movement to grid; dots can themselves be off
        // the grid, but they move in a consistent interval
        let snap = this._getSnap();
        if (!_.isNull(snap)) {
            deltaX = round(deltaX, snap);
            deltaY = round(deltaY, snap);
        }

        let sheet = this.controller.getActiveSheet();
        this.controller.getSelection()
            .each((i, dot) => {
                let dotPosition = sheet.getPosition($(dot).data("dot"));
                let position = scale.toDistanceCoordinates(dotPosition);
                this.grapher.moveDotTo(dot, position.x + deltaX, position.y + deltaY);
            })
            .scrollIntoView({
                parent: ".workspace",
                tolerance: 10,
                callback: (deltaX, deltaY) => {
                    this._scrollOffset.left += deltaX;
                    this._scrollOffset.top += deltaY;
                },
            });

        this._moveOffset.x = deltaX;
        this._moveOffset.y = deltaY;
    }

    mousemoveSelect(e) {
        let {x, y, width, height} = getDimensions(
            e.pageX,
            e.pageY,
            this._dragStart.pageX - this._scrollOffset.left,
            this._dragStart.pageY - this._scrollOffset.top
        );
        let [minX, minY] = this._makeRelative(x, y);
        let maxX = minX + width;
        let maxY = minY + height;

        // update dimensions of the selection box
        this._box
            .css({
                top: minY,
                left: minX,
                width: width,
                height: height,
            })
            .scrollIntoView({
                parent: ".workspace",
                callback: (dx, dy) => {
                    this._scrollOffset.left += dx;
                    this._scrollOffset.top += dy;
                },
            });

        let options = {
            refresh: false,
        };

        if (!this._metaKey) {
            this.context.deselectDots(undefined, options);
        }

        // select dots within the selection box
        this.grapher.getDots().each((i, dot) => {
            dot = $(dot);
            let id = dot.data("dot").id;
            let position = dot.data("position");
            let inRange = (
                _.inRange(position.x, minX, maxX) &&
                _.inRange(position.y, minY, maxY)
            );

            if (this._metaKey) {
                if (inRange) {
                    if (this._selected.has(id)) {
                        this.context.deselectDots(dot, options);
                    } else {
                        this.context.selectDots(dot, options);
                    }
                } else if (this._selected.has(id)) {
                    this.context.selectDots(dot, options);
                } else {
                    this.context.deselectDots(dot, options);
                }
            } else if (inRange) {
                this.context.selectDots(dot, options);
            }
        });
    }

    mouseup(e) {
        switch (this._dragType) {
            case "dot":
                this.mouseupDot(e);
                break;
            case "select":
                this.mouseupSelect(e);
                break;
        }

        // update panel
        this.context.refresh();
    }

    mouseupDot(e) {
        let scale = this.grapher.getScale();
        let deltaX = scale.toSteps(this._moveOffset.x);
        let deltaY = scale.toSteps(this._moveOffset.y);

        if (deltaX !== 0 || deltaY !== 0) {
            this.controller.doAction("moveDots", [deltaX, deltaY]);
        }
    }

    mouseupSelect(e) {
        this._box.remove();
    }
}

/**
 * Select dots within an arbitrary path drawn by the user.
 */
class LassoTool extends BaseSelection {
    mousedown(e) {
        this.context.deselectDots();

        let [startX, startY] = this._makeRelative(e);
        let path = this.grapher.getSVG()
            .append("path")
            .classed("edit-tool-path lasso-path", true)
            .attr("d", `M ${startX} ${startY}`);

        this._path = $.fromD3(path);
    }

    mousemove(e) {
        let [x, y] = this._makeRelative(e);
        let pathDef = this._path.attr("d") + ` L ${x} ${y}`;

        this._path
            .attr("d", pathDef)
            .scrollIntoView({
                parent: ".workspace",
            });
    }

    mouseup(e) {
        this.grapher.getDots().each((i, dot) => {
            dot = $(dot);
            let marker = dot.find(".dot-marker");
            let offset = marker.offset();
            let dimensions = marker.getDimensions();
            let topElem = document.elementFromPoint(
                offset.left + dimensions.width / 2,
                offset.top + dimensions.height / 2
            );
            if ($(topElem).is(this._path)) {
                this.context.selectDots(dot, {
                    refresh: false,
                });
            }
        });

        this.controller.refresh("context");
        this._path.remove();
    }
}

/**
 * Swap two dots' positions
 */
class SwapTool extends BaseTool {
    load() {
        let selection = this.controller.getSelection();
        selection = selection.not(selection.last());
        this.context.deselectDots(selection);
    }

    mousedown(e) {
        if ($(e.target).is(".dot-marker")) {
            let selection = this.controller.getSelection();
            let dot = $(e.target).parent();

            if (selection.length === 0) {
                this.context.selectDots(dot);
            } else {
                let dot1 = selection.data("dot");
                let dot2 = dot.data("dot");
                this.controller.doAction("swapDots", [dot1, dot2]);
                this.context.deselectDots();
            }
        } else {
            this.context.deselectDots();
        }
    }
}

/**
 * Stretch and rotate the selected dots.
 */
class StretchTool extends BaseTool {
    load() {
        this._box = HTMLBuilder.div("stretch-box", null, ".workspace");
        addHandles(this._box);

        // margin between dots and box
        this.MARGIN = 5;

        this.refresh();

        let bounds = this._getDotBounds();

        this._positions = [];
        this.controller.getSelection().each((i, $dot) => {
            let dot = $($dot).data("dot");
            let position = $($dot).data("position");

            // dot ID to ratio of position to top/left of box
            this._positions.push({
                top: (position.y - bounds.top) / bounds.height,
                left: (position.x - bounds.left) / bounds.width,
            });
        });
    }

    refresh() {
        let bounds = this.controller.getSelection().getBounds();
        let offset = $(".workspace").offset();
        let top = $(".workspace").scrollTop() + bounds.top - offset.top;
        let left = $(".workspace").scrollLeft() + bounds.left - offset.left;

        this._box.css({
            top: top - this.MARGIN,
            left: left - this.MARGIN,
            height: (bounds.bottom - bounds.top) + 2 * this.MARGIN,
            width: (bounds.right - bounds.left) + 2 * this.MARGIN,
        });
    }

    unload() {
        this._box.remove();
    }

    mousedown(e) {
        // TODO: rotate

        if (!$(e.target).is(".handle")) {
            this._handle = null;
            return;
        }

        this._handle = $(e.target).data("handle-id");
        this._start = {
            event: e,
            width: this._box.outerWidth(),
            height: this._box.outerHeight(),
        };
    }

    mousemove(e) {
        if (_.isNull(this._handle)) {
            return;
        }

        let data = resizeHandles(
            this._handle,
            this._start.width,
            this._start.height,
            this._start.event,
            e
        );

        this._box.css(data);

        let bounds = this._getDotBounds();

        this.controller.getSelection().each((i, $dot) => {
            let ratio = this._positions[i];
            let x = ratio.left * bounds.width + bounds.left;
            let y = ratio.top * bounds.height + bounds.top;
            this.grapher.moveDotTo($dot, x, y);
        });
    }

    mouseup(e) {
        // TODO: doAction to save
    }

    /**
     * @return {object} The bounds for the dots relative to the helper box.
     */
    _getDotBounds() {
        return {
            top: parseInt(this._box.css("top")) + this.MARGIN,
            left: parseInt(this._box.css("left")) + this.MARGIN,
            width: parseInt(this._box.css("width")) - 2 * this.MARGIN,
            height: parseInt(this._box.css("height")) - 2 * this.MARGIN,
        };
    }
}

/**
 * A superclass for all tools that edit dots.
 */
class BaseEdit extends BaseTool {
    mouseup(e) {
        this._saveDotPositions();
        this.context.loadTool(EditTools.lastSelectionTool);
    }

    /**
     * Save the currently selected dots' positions.
     */
    _saveDotPositions() {
        let scale = this.grapher.getScale();
        let data = _.map(this.controller.getSelection(), dot => {
            let position = scale.toStepCoordinates($(dot).data("position"));
            return {
                dot: $(dot).data("dot"),
                x: roundSmall(position.x),
                y: roundSmall(position.y),
            };
        })
        this.controller.doAction("moveDotsTo", [data]);
    }
}

/**
 * Arrange the selected dots in a line, where the user defines the
 * interval and angle at which to draw the line.
 */
class LineTool extends BaseEdit {
    mousedown(e) {
        let [startX, startY] = this._makeRelativeSnap(e);
        this._startX = startX;
        this._startY = startY;

        // the helper line
        let line = this.grapher.getSVG()
            .append("line")
            .classed("edit-tool-path", true)
            .attr("x1", this._startX)
            .attr("y1", this._startY);
        this._line = $.fromD3(line);

        this.mousemove(e);
    }

    mousemove(e) {
        let [x, y] = this._makeRelativeSnap(e);

        this._line
            .attr("x2", x)
            .attr("y2", y);

        let deltaX = x - this._startX;
        let deltaY = y - this._startY;

        let selection = this.controller.getSelection();
        let total = selection.length - 1;
        selection.each((i, dot) => {
            // selection originally in reverse order
            let x = this._startX + (total - i) * deltaX;
            let y = this._startY + (total - i) * deltaY;
            this.grapher.moveDotTo(dot, x, y);
        });
    }

    mouseup(e) {
        super.mouseup(e);
        this._line.remove();
    }
}

/**
 * Arrange the selected dots in an arc, where the user defines the
 * origin of the circle and the start/end of the arc. The tool is
 * used with two mouse events: click and drag from the origin to the
 * start position, and then click again for the end position.
 */
class ArcTool extends BaseEdit {
    load() {
        // true if user is about to select the end point
        this._drawEnd = false;
    }

    isDone() {
        this._drawEnd = !this._drawEnd;
        return !this._drawEnd;
    }

    mousedown(e) {
        if (this._drawEnd) {
            return;
        }

        let [startX, startY] = this._makeRelativeSnap(e);
        this._startX = startX;
        this._startY = startY;

        // after clicking and dragging for the first time, will contain the
        // path definition for the helper line going from origin to start.
        this._radiusPath = "";
        this._radius = 0;

        // angle of the start point
        this._startAngle = 0;
        // angle of the last point seen (when drawing arc)
        this._lastAngle = 0;

        // helper path

        let path = this.grapher.getSVG()
            .append("path")
            .classed("edit-tool-path", true);
        this._path = $.fromD3(path);

        this._snap = this._getSnap();

        this.mousemove(e);
    }

    mousemove(e) {
        if (this._drawEnd) {
            this.mousemoveArc(e);
        } else {
            this.mousemoveRadius(e);
        }
    }

    mousemoveRadius(e) {
        // radius
        let [x, y] = this._makeRelative(e);
        this._radius = calcDistance(this._startX, this._startY, x, y);
        if (!_.isNull(this._snap)) {
            this._radius = round(this._radius, this._snap);
        }

        let angle = this._snapAngle(this._startX, this._startY, x, y);

        // helper path
        x = this._startX + calcRotatedXPos(angle) * this._radius;
        y = this._startY + calcRotatedYPos(angle) * this._radius;
        this._path.attr("d", `M ${this._startX} ${this._startY} L ${x} ${y}`);

        this._startAngle = angle;

        this.controller.getSelection().each((i, dot) => {
            this.grapher.moveDotTo(dot, x, y);
        });

        this._lastAngle = angle;
    }

    mousemoveArc(e) {
        let [x, y] = this._makeRelative(e);
        let angle = this._snapAngle(this._startX, this._startY, x, y);

        x = this._startX + calcRotatedXPos(angle) * this._radius;
        y = this._startY + calcRotatedYPos(angle) * this._radius;

        let arc = this._getArcData(angle);
        let arcPath = `A ${this._radius} ${this._radius} 0 ${arc.largeArcFlag} ${arc.sweepFlag} ${x} ${y}`;
        this._path.attr("d", `${this._radiusPath} ${arcPath} Z`);

        let selection = this.controller.getSelection();
        let total = selection.length - 1;
        let delta = arc.length / total;
        selection.each((i, dot) => {
            // selection originally in reverse order
            let angle = delta * (total - i) + this._startAngle;
            let x = this._startX + calcRotatedXPos(angle) * this._radius;
            let y = this._startY + calcRotatedYPos(angle) * this._radius;
            this.grapher.moveDotTo(dot, x, y);
        });
    }

    mouseup(e) {
        if (this._drawEnd) {
            super.mouseup(e);
            this._path.remove();
        } else {
            this._radiusPath = this._path.attr("d");
        }
    }

    /**
     * Get the data for the arc path, where the arc goes from this._startAngle to the given angle.
     * Documentation: https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths#Arcs
     *
     * @param {int} angle - The angle to end at, in Calchart degrees.
     * @return {Object} An object with the keys `length`, `largeArcFlag`, and `sweepFlag`.
     */
    _getArcData(angle) {
        let diff = Math.abs(angle - this._lastAngle);

        if (diff === 180) {
            // 180deg continues in same CW/CCW direction
            if (this._lastAngle < this._startAngle) {
                this._lastAngle -= 180;
            } else {
                this._lastAngle += 180;
            }
        } else {
            // find closest angle among equivalent angles
            this._lastAngle = _.minBy(
                [angle, angle - 360, angle + 360],
                angle => Math.abs(angle - this._lastAngle) - diff
            );
        }

        let length = this._lastAngle - this._startAngle;

        while (length <= -360) {
            this._lastAngle += 360;
            length += 360;
        }
        while (length >= 360) {
            this._lastAngle -= 360;
            length -= 360;
        }

        return {
            // positive if CW, negative if CCW
            length: length,
            // <180: 0, >180: 1
            largeArcFlag: Math.abs(length) < 180 ? 0 : 1,
            // CCW: 0, CW: 1
            sweepFlag: length < 0 ? 0 : 1,
        };
    }

    /**
     * Calculate the angle between the given points and snap to
     * 45 degree intervals;
     *
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @return {number}
     */
    _snapAngle(x1, y1, x2, y2) {
        let angle = calcAngle(x1, y1, x2, y2);
        angle = round(angle, 45);
        return angle === 360 ? 0 : angle;
    }
}

/**
 * Arrange the selected dots in a block, where the user defines
 * the top-left corner and either the number of rows or the number
 * of columns as dragged, snapping to the grid.
 *
 * If the grid is not set, the user can drag a box shape and the block
 * will fill in.
 */
class BlockTool extends BaseEdit {
    mousedown(e) {
        let [startX, startY] = this._makeRelativeSnap(e);
        this._startX = startX;
        this._startY = startY;

        // always make sure there's a grid; default to 2
        this._snap = this._getSnap();
        if (_.isNull(this._snap)) {
            let scale = this.grapher.getScale();
            this._snap = scale.toDistance(2);
        }

        // helper path
        let line = this.grapher.getSVG()
            .append("line")
            .classed("edit-tool-path", true)
            .attr("x1", this._startX)
            .attr("y1", this._startY);
        this._line = $.fromD3(line);

        this.mousemove(e);
    }

    mousemove(e) {
        let [endX, endY] = this._makeRelativeSnap(e);
        let selection = this.controller.getSelection();

        let deltaX = endX - this._startX;
        let deltaY = endY - this._startY;

        if (deltaX < 0 && deltaY < 0) {
            return;
        }

        let numCols;
        if (deltaX > deltaY) {
            endY = this._line.attr("y1");
            // include last column
            numCols = deltaX / this._snap + 1;
        } else {
            endX = this._line.attr("x1");
            // include last row
            let numRows = deltaY / this._snap + 1;
            numCols = Math.ceil(selection.length / numRows);
        }

        this._line.attr("x2", endX).attr("y2", endY);

        // move dots
        selection.get().reverse().forEach((dot, i) => {
            let dotX = this._startX + (i % numCols) * this._snap;
            let dotY = this._startY + Math.floor(i / numCols) * this._snap;
            this.grapher.moveDotTo(dot, dotX, dotY);
        });
    }

    mouseup(e) {
        super.mouseup(e);
        this._line.remove();
    }
}

/**
 * Arrange the selected dots in a circle, where the user defines
 * the origin and radius of the circle.
 */
class CircleTool extends BaseEdit {
    mousedown(e) {
        let [startX, startY] = this._makeRelativeSnap(e);
        this._startX = startX;
        this._startY = startY;

        // helper paths

        let svg = this.grapher.getSVG();

        let line = svg.append("line")
            .classed("edit-tool-path", true)
            .attr("x1", this._startX)
            .attr("y1", this._startY);
        this._line = $.fromD3(line);

        let circle = svg.append("circle")
            .classed("edit-tool-path", true)
            .attr("cx", this._startX)
            .attr("cy", this._startY);
        this._circle = $.fromD3(circle);

        this._snap = this._getSnap();

        this.mousemove(e);
    }

    mousemove(e) {
        // radius
        let [x, y] = this._makeRelative(e);
        let radius = calcDistance(this._startX, this._startY, x, y);
        if (!_.isNull(this._snap)) {
            radius = round(radius, this._snap);
        }

        // helper paths, snap radius line to 45 degree angles
        let angle = calcAngle(this._startX, this._startY, x, y);
        angle = round(angle, 45);
        let rx = calcRotatedXPos(angle) * radius;
        let ry = calcRotatedYPos(angle) * radius;
        this._line.attr("x2", this._startX + rx).attr("y2", this._startY + ry);
        this._circle.attr("r", radius);

        let selection = this.controller.getSelection();
        let delta = 360 / selection.length;
        selection.each((i, dot) => {
            let rx = calcRotatedXPos(delta * i) * radius;
            let ry = calcRotatedYPos(delta * i) * radius;
            this.grapher.moveDotTo(dot, this._startX + rx, this._startY + ry);
        });
    }

    mouseup(e) {
        super.mouseup(e);
        this._line.remove();
        this._circle.remove();
    }
}
