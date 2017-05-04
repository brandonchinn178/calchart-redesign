import BaseContinuity from "calchart/continuities/BaseContinuity";
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
export default class TwoStepContinuity extends BaseContinuity {
    /**
     * @param {Sheet} sheet
     * @param {DotType} dotType
     * @param {int[]} order - The order of dots (as IDs) in the line. order[0] is
     *   the first dot in the path.
     * @param {Continuity[]} continuities - The continuities each dot should execute
     *   after waiting the appropriate amount of time.
     * @param {object} [options] - Options for the continuity, including:
     *   - {string} stepType
     *   - {int} beatsPerStep
     */
    constructor(sheet, dotType, order, continuities, options) {
        super(sheet, dotType, options);

        this._order = order;
        this._continuities = continuities;
    }

    static deserialize(sheet, dotType, data) {
        let continuities = data.continuities.map(
            continuity => Continuity.deserialize(sheet, dotType, continuity)
        );
        return new TwoStepContinuity(sheet, dotType, data.order, continuities, data);
    }

    serialize() {
        let continuities = this._continuities.map(continuity => continuity.serialize());
        return super.serialize("TWO", {
            order: this._order,
            continuities: continuities,
        });
    }

    get name() {
        return "two";
    }

    get continuities() { return this._continuities; }
    get order() { return this._order; }

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
        // TODO
        return [];
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

    panelHTML(controller) {
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

        return this._wrapPanel(label, editLabel, editDots, editContinuities);
    }

    popupHTML() {
        let { stepType, beatsPerStep, customText } = this._getPopupFields();

        return {
            name: "Two Step",
            fields: [stepType, beatsPerStep, customText],
        };
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

    _getPopupFields() {
        let fields = super._getPopupFields();

        delete fields.orientation;

        return fields;
    }
}