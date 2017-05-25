import HiddenGraphContext from "calchart/contexts/HiddenContext";
import Coordinate from "calchart/Coordinate";

import HTMLBuilder from "utils/HTMLBuilder";
import { round } from "utils/MathUtils";

/**
 * The Context that allows a user to define the reference point
 * in a GateTurnContinuity
 */
export default class GateReferenceContext extends HiddenGraphContext {
    constructor(controller) {
        super(controller);

        // GateTurnContinuity
        this._continuity = null;

        // helpers
        this._svg = this._grapher.getSVG();
        this._helper = null;
        this._reference = null;
    }

    static get actions() {
        return ContextActions;
    }

    static get info() {
        return {
            name: "gate-reference",
        };
    }

    /**
     * @param {Object} options - Options to customize loading the Context:
     *    - {GateTurnContinuity} continuity - The gate turn continuity being edited
     */
    load(options) {
        super.load(options);

        this._continuity = options.continuity;

        let scale = this._grapher.getScale();
        let dotRadius = this._grapher.getDotRadius();

        // the dot that follows the cursor
        this._helper = this._svg.append("circle")
            .classed("gate-reference-helper", true)
            .attr("r", dotRadius);

        // the current reference point
        this._reference = this._svg.append("circle")
            .classed("gate-reference-point", true)
            .attr("r", dotRadius);

        this._addEvents(this._workspace, {
            mousemove: e => {
                let steps = this._eventToSnapSteps(e);
                let coord = scale.toDistance(steps);
                this._helper.attr("cx", coord.x).attr("cy", coord.y);
            },
            click: e => {
                let steps = this._eventToSnapSteps(e);
                this._controller.doAction("setReference", [steps]);
            },
        });
    }

    unload() {
        super.unload();

        // remove helpers
        this._helper.remove();
        this._reference.remove();

        this.checkContinuities({
            dots: this._continuity.dotType,
        });
    }

    refreshGrapher() {
        super.refreshGrapher();

        // highlight dots
        let dots = $(`.dot.${this._continuity.dotType}`);
        this.selectDots(dots);

        // position reference point
        let scale = this._grapher.getScale();
        let point = scale.toDistance(this._continuity.reference);
        this._reference.attr("cx", point.x).attr("cy", point.y);
    }

    /**
     * Load continuity context if the user is done with this context.
     */
    exit() {
        this._controller.loadContext("continuity", {
            dotType: this._continuity.dotType,
        });
    }

    /**
     * Convert a MouseEvent into a coordinate for the current mouse position,
     * rounded to the nearest step.
     *
     * @param {Event} e
     * @return {Coordinate}
     */
    _eventToSnapSteps(e) {
        let [x, y] = this._workspace.makeRelative(e.pageX, e.pageY);
        let steps = this._grapher.getScale().toSteps({x, y});
        return new Coordinate(round(steps.x, 1), round(steps.y, 1));
    }
}

class ContextActions {
    /**
     * Set the reference point to the given point
     *
     * @param {Coordinate} point
     * @param {GateTurnContinuity} [continuity=this._continuity]
     */
    static setReference(point, continuity=this._continuity) {
        let old = continuity.reference;
        continuity.setReference(point);
        continuity.sheet.updateMovements(continuity.dotType);
        this.refresh("grapher");

        return {
            data: [point, continuity],
            undo: function() {
                continuity.setReference(old);
                continuity.sheet.updateMovements(continuity.dotType);
                this.refresh("grapher");
            },
        };
    }
}
