import HiddenGraphContext from "editor/contexts/HiddenContext";

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
        this._helper = null;
        this._reference = null;
    }

    static get actions() {
        return ContextActions;
    }

    static get name() {
        return "gate-reference";
    }

    /**
     * @param {Object} options - Options to customize loading the Context:
     *    - {GateTurnContinuity} continuity - The gate turn continuity being edited
     */
    load(options) {
        super.load(options);

        this._continuity = options.continuity;

        let dotRadius = this.grapher.getDotRadius();
        let svg = this.grapher.getSVG();
        let scale = this.grapher.getScale();

        // the dot that follows the cursor
        this._helper = svg.append("circle")
            .classed("gate-reference-helper", true)
            .attr("r", dotRadius);

        // the current reference point
        this._reference = svg.append("circle")
            .classed("gate-reference-point", true)
            .attr("r", dotRadius);

        this._addEvents(this.workspace, {
            mousemove: e => {
                let steps = this._eventToSnapSteps(e);
                let coord = scale.toDistance(steps);
                this._helper.attr("cx", coord.x).attr("cy", coord.y);
            },
            click: e => {
                let steps = this._eventToSnapSteps(e);
                this.controller.doAction("setReference", [steps]);
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
        let scale = this.grapher.getScale();
        let point = scale.toDistance(this._continuity.getReference());
        this._reference.attr("cx", point.x).attr("cy", point.y);
    }

    /**
     * Load continuity context if the user is done with this context.
     */
    exit() {
        this.controller.loadContext("continuity", {
            dotType: this._continuity.dotType,
        });
    }
}

class ContextActions extends HiddenGraphContext.actions {
    /**
     * Set the reference point to the given point
     *
     * @param {Coordinate} point
     * @param {GateTurnContinuity} [continuity=this._continuity]
     */
    static setReference(point, continuity=this._continuity) {
        let old = continuity.getReference();
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
