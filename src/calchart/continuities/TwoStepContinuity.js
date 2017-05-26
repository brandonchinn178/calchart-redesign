import OrderedDotsContinuity from "calchart/continuities/OrderedDotsContinuity";
import Continuity from "calchart/Continuity";
import MovementCommandMove from "calchart/movements/MovementCommandMove";
import MovementCommandStop from "calchart/movements/MovementCommandStop";

import HTMLBuilder from "utils/HTMLBuilder";
import { moveElem } from "utils/JSUtils";
import { setupTooltip } from "utils/UIUtils";

/**
 * A two step continuity, where each dot in a line does a given set of
 * continuities 2 beats after the previous dot.
 */
export default class TwoStepContinuity extends OrderedDotsContinuity {
    /**
     * @param {Sheet} sheet
     * @param {DotType} dotType
     * @param {Dot[]} order
     * @param {Continuity[]} continuities - The continuities each dot should execute
     *   after waiting the appropriate amount of time.
     * @param {object} [options] - Options for the continuity, including:
     *   - {string} stepType
     *   - {int} beatsPerStep
     *   - {string} orientation - The direction to face in the beginning.
     *   - {boolean} [isMarktime=true] - true if mark time during step two, false for close
     */
    constructor(sheet, dotType, order, continuities, options) {
        super(sheet, dotType, order, options);

        options = _.defaults({}, options, {
            isMarktime: true,
        });

        this._continuities = continuities;
        this._isMarktime = options.isMarktime;
    }

    static deserialize(sheet, dotType, data) {
        let show = sheet.getShow();
        let order = data.order.map(dotId => show.getDot(dotId));
        let continuities = data.continuities.map(
            continuity => Continuity.deserialize(sheet, dotType, continuity)
        );
        return new TwoStepContinuity(sheet, dotType, order, continuities, data);
    }

    serialize() {
        let order = this._order.map(dot => dot.id);
        let continuities = this._continuities.map(continuity => continuity.serialize());
        return super.serialize({
            order: order,
            continuities: continuities,
            isMarktime: this._isMarktime,
        });
    }

    get info() {
        return {
            type: "two",
            name: "Two Step",
        };
    }

    get continuities() {
        return this._continuities;
    }

    /**
     * Add the given continuity to the two-step drill.
     *
     * @param {Continuity} continuity
     */
    addContinuity(continuity) {
        this._continuities.push(continuity);
        this._sheet.updateMovements(this._dotType);
    }

    getMovements(dot, data) {
        // number of steps to wait
        let options = {
            beatsPerStep: this.getBeatsPerStep(),
        };
        let wait = this._order.indexOf(dot) * 2;
        let stop = new MovementCommandStop(
            data.position.x,
            data.position.y,
            this.getOrientationDegrees(),
            wait,
            this._isMarktime,
            options
        );

        data.remaining -= stop.getDuration();

        // copied from Sheet.updateMovements
        let movements = _.flatMap(this._continuities, continuity => {
            let moves = continuity.getMovements(dot, _.clone(data));
            moves.forEach(movement => {
                data.position = movement.getEndPosition();
                data.remaining -= movement.getDuration();
            });
            return moves;
        });

        return [stop].concat(movements);
    }

    /**
     * Move the given continuity by the given amount in the two-step drill.
     *
     * @param {Continuity} continuity
     * @param {int} delta
     * @return {boolean} true if successful
     */
    moveContinuity(continuity, delta) {
        let index = this._continuities.indexOf(continuity);
        let newIndex = index + delta;
        
        if (newIndex < 0 || newIndex >= continuities.length) {
            return false;
        }

        moveElem(this._continuities, index, newIndex);
        this._sheet.updateMovements(this._dotType);
        return true;
    }

    getPanel(controller) {
        let label = HTMLBuilder.span("2-Step");

        let editLabel = HTMLBuilder.label("Edit:");

        let editDots = HTMLBuilder.icon("ellipsis-h").click(() => {
            controller.loadContext("continuity-dots", {
                continuity: this,
            });
        });
        setupTooltip(editDots, "Dots");

        let editContinuities = HTMLBuilder.icon("map-signs").click(() => {
            controller.loadContext("two-step", {
                continuity: this,
            });
        });
        setupTooltip(editContinuities, "Continuities");

        return [label, editLabel, editDots, editContinuities];
    }

    getPopup() {
        let [stepType, orientation, beatsPerStep, customText] = super.getPopup();

        let isMarktime = HTMLBuilder.formfield("Marktime first", HTMLBuilder.input({
            type: "checkbox",
            initial: this._isMarktime,
        }), "isMarktime");

        return [isMarktime, stepType, beatsPerStep, customText];
    }

    /**
     * Remove the given continuity from the two-step drill.
     *
     * @param {Continuity} continuity
     */
    removeContinuity(continuity) {
        _.pull(this._continuities, continuity);
        this._sheet.updateMovements(this._dotType);
    }
}
