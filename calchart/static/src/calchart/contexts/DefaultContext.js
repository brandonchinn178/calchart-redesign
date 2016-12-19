var BaseContext = require("./BaseContext");
var JSUtils = require("../../utils/JSUtils");

/**
 * The default editor context, that allows a user to select dots with a rectangular
 * selection box, and also to drag and drop dots on the grid.
 */
var DefaultContext = function(grapher) {
    BaseContext.call(this, grapher);

    // number of steps to snap dots to when dragging: null, 1, 2, 4
    this._grid = 2;
};

JSUtils.extends(DefaultContext, BaseContext);

DefaultContext.prototype.shortcuts = {
    "ctrl+a": "selectAll",
};

DefaultContext.prototype.load = function() {
    var _this = this;
    var controller = window.controller;
    var svgOrigin = $("svg.graph").position();

    var dragState = "none"; // none, drag, select
    var dragStart = null; // event object on mousedown

    this.addEvents({
        contextmenu: function(e) {
            e.preventDefault();

            // TODO: custom context menu
        },
        mousedown: function(e) {
            var target = $(e.target);

            if (target.is(".dot-marker")) {
                var dot = target.parent();

                if (e.shiftKey || e.ctrlKey || e.metaKey) {
                    controller.toggleDots(dot);
                } else {
                    controller.selectDots(dot, {
                        append: false,
                    });
                }

                dragState = "drag";
            } else {
                controller.deselectDots();
                $("<div>")
                    .addClass("selection-box")
                    .appendTo("body");
                dragState = "select";
            }

            dragStart = e;
        },
    });

    this.addGlobalEvents({
        mousemove: function(e) {
            if (dragState === "none") {
                return;
            }

            e.preventDefault();

            var deltaX = e.pageX - dragStart.pageX;
            var deltaY = e.pageY - dragStart.pageY;

            switch (dragState) {
                case "drag":
                    controller.moveSelection(deltaX, deltaY, {
                        snap: _this._grid,
                    });
                    break;
                case "select":
                    // relative to page
                    var width = Math.abs(deltaX);
                    var height = Math.abs(deltaY);
                    var minX = Math.min(e.pageX, dragStart.pageX);
                    var minY = Math.min(e.pageY, dragStart.pageY);
                    var maxX = minX + width;
                    var maxY = minY + height;

                    $(".selection-box").css({
                        top: minY,
                        left: minX,
                        width: width,
                        height: height,
                    });

                    // relative to svgOrigin
                    minX -= svgOrigin.left;
                    minY -= svgOrigin.top;
                    maxX -= svgOrigin.left;
                    maxY -= svgOrigin.top;

                    controller.deselectDots();
                    _this._grapher.getDots().each(function() {
                        var dot = $(this);
                        var position = dot.data("position");
                        if (
                            position.x >= minX &&
                            position.x <= maxX &&
                            position.y >= minY &&
                            position.y <= maxY
                        ) {
                            controller.selectDots(dot);
                        }
                    });

                    break;
            }
        },
        mouseup: function() {
            switch (dragState) {
                case "drag":
                    var hasMoved = false;
                    controller.getSelectedDots().each(function() {
                        if (_this._grapher.hasMoved(this)) {
                            hasMoved = true;
                            // break loop
                            return false;
                        }
                    });
                    if (hasMoved) {
                        controller.doAction("saveSelectionPositions");
                    }
                    break;
                case "select":
                    $(".selection-box").remove();
                    break;
            }

            dragState = "none";
        },
    });

    $(".toolbar .edit-dots").addClass("active");
};

DefaultContext.prototype.unload = function() {
    this.removeEvents();
    $(".toolbar .edit-dots").removeClass("active");
};

/**** ACTIONS ****/

/**
 * Select all dots in the graph
 */
DefaultContext.prototype.selectAll = function() {
    window.controller.selectDots(this._grapher.getDots());
};

module.exports = DefaultContext;
