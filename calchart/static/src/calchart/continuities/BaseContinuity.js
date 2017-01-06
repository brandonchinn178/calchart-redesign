var CalchartUtils = require("utils/CalchartUtils");
var errors = require("calchart/errors");
var HTMLBuilder = require("utils/HTMLBuilder");
var JSUtils = require("utils/JSUtils");

/**
 * Represents a continuity for a dot type during a stuntsheet. This is
 * distinct from MovementCommands, as those are per-dot, and describe
 * the exact movement for the dot (e.g. 8E, 4S), whereas Continuities
 * describe movements for the dot type (e.g. EWNS to SS 2).
 *
 * @param {Sheet} sheet -- the sheet the continuity is for
 * @param {string} dotType -- the dot type the continuity is for
 * @param {object|undefined} options -- options for most/all continuities. Can either
 *   be the given type or the string "default", which will be resolved by getting
 *   the value from the Sheet. Possible options include:
 *   - {string} stepType -- the step type to march, like high step, show high
 *   - {int} beatsPerStep -- the number of beats per each step of the movement.
 *   - {string} orientation -- orientation, as either east or west. The meaning for
 *     this option is different for each continuity
 */
var BaseContinuity = function(sheet, dotType, options) {
    this._sheet = sheet;
    this._dotType = dotType;

    options = JSUtils.setDefaults(options, {
        stepType: "default",
        beatsPerStep: "default",
        orientation: "default",
    });
    this._stepType = options.stepType;
    this._beatsPerStep = options.beatsPerStep;
    this._orientation = options.orientation;
};

/**
 * Return the JSONified version of the BaseContinuity. The data needs
 * to define `type`, which is needed to deserialize (see
 * Continuity.deserialize)
 *
 * @return {object} a JSON object containing this Continuity's data
 */
BaseContinuity.prototype.serialize = function() {
    return {
        stepType: this._stepType,
        beatsPerStep: this._beatsPerStep,
        orientation: this._orientation,
    };
};

/**** INSTANCE METHODS ****/

/**
 * Get the number of beats per step for this continuity, resolving any defaults
 *
 * @return {int} beats per step
 */
BaseContinuity.prototype.getBeatsPerStep = function() {
    return this._beatsPerStep === "default" ? this._sheet.getBeatsPerStep() : this._beatsPerStep;
};

/**
 * Get the movements for the given dot for the given stuntsheet
 *
 * @param {Dot} dot -- the dot to get movements for
 * @param {object} data -- data about the Sheet at the beginning of the
 *   continuity. Includes:
 *     - {Coordinate} position -- the starting position of the dot
 *     - {int} remaining -- the number of beats left in the Sheet
 * @return {Array<MovementCommand>} the movements to do for the dot
 */
BaseContinuity.prototype.getMovements = function(dot, data) {
    throw new errors.NotImplementedError(this);
};

/**
 * Get this continuity's orientation, resolving any defaults
 *
 * @return {int} orientation, in Calchart degrees
 */
BaseContinuity.prototype.getOrientation = function() {
    switch (this._orientation) {
        case "default":
            return this._sheet.getOrientation();
        case "east":
            return 0;
        case "west":
            return 90;
        case "":
            // for EvenContinuity, moving in direction of travel
            return undefined;
    }
    throw new Error("Invalid orientation: " + this._orientation);
};

/**
 * Get this continuity's step type, resolving any defaults
 *
 * @return {string} step type (see CalchartUtils.STEP_TYPES)
 */
BaseContinuity.prototype.getStepType = function() {
    return this._stepType === "default" ? this._sheet.getStepType() : this._stepType;
};

/**
 * @param {EditorController} controller -- the controller for the editor application
 * @return {jQuery} the HTML element to add to the Edit Continuity panel
 */
BaseContinuity.prototype.panelHTML = function(controller) {
    throw new errors.NotImplementedError(this);
};

/**
 * @return {object} data to populate the Edit Continuity popup, with the values:
 *   - {string} name -- the name of the continuity
 *   - {Array<jQuery>} fields -- the fields to add to the form. The fields need
 *     to have their name match the instance variable, e.g. "orientation" for
 *     this._orientation
 */
BaseContinuity.prototype.popupHTML = function() {
    throw new errors.NotImplementedError(this);
};

/**
 * Update this continuity when saving the Edit Continuity popup
 *
 * @param {object} data -- the popup data
 * @return {object} the values that were changed, mapping name
 *   of field to the old value
 */
BaseContinuity.prototype.savePopup = function(data) {
    var _this = this;

    // validate beats per step
    if (data.beatsPerStep === "custom") {
        data.beatsPerStep = data.customBeatsPerStep;
    }

    var changed = {};
    $.each(data, function(key, val) {
        var old = _this["_" + key];
        if (old !== val) {
            changed[key] = old;
            _this["_" + key] = val;
        }
    });

    return changed;
};

/**** HELPERS ****/

/**
 * Update the movements for dots that use this continuity. Used in the
 * edit continuity context.
 *
 * @param {EditorController} controller -- the controller for the editor application
 */
BaseContinuity.prototype._updateMovements = function(controller) {
    this._sheet.updateMovements(this._dotType);
    controller.refresh();
};

/**
 * Get the form fields for the popup.
 *
 * @return {object} an object whose keys are the names of the fields and
 *   the values are the jQuery form fields.
 */
BaseContinuity.prototype._getPopupFields = function() {
    var fields = {};

    fields.stepType = HTMLBuilder.formfield("Step Type", HTMLBuilder.select({
        options: CalchartUtils.STEP_TYPES,
        initial: this._stepType,
    }));

    // beats per step is a select between default/custom, which disables/enables an
    // input for a custom beats per step
    fields.beatsPerStep = HTMLBuilder.formfield("Beats per Step", HTMLBuilder.select({
        options: {
            default: "Default",
            custom: "Custom",
        },
        change: function() {
            var disabled = $(this).val() !== "custom";
            $(this).parent()
                .find(".custom-beats-per-step")
                .prop("disabled", disabled);
        },
        initial: this._beatsPerStep === "default" ? "default" : "custom",
    }));
    HTMLBuilder.input({
        class: "custom-beats-per-step",
        name: "customBeatsPerStep",
        type: "number",
        initial: this.getBeatsPerStep(),
    }).appendTo(fields.beatsPerStep);
    fields.beatsPerStep.find("select").change();

    fields.orientation = HTMLBuilder.formfield("Orientation", HTMLBuilder.select({
        options: CalchartUtils.ORIENTATIONS,
        initial: this._orientation,
    }));

    return fields;
};

/**
 * Wrap the given contents to add to the edit continuity panel
 *
 * @param {string} type -- the type of the continuity to add
 * @param {Array<jQuery>} contents -- the jQuery contents
 * @return {jQuery} the HTML element to add to the panel, in the format:
 *
 *   <div class="continuity {type}">
 *       <div class="info">{contents}</div>
 *       <div class="actions">
 *           <i class="icon-pencil"></i>
 *           <i class="icon-times"></i>
 *       </div>
 *   </div>
 */
BaseContinuity.prototype._wrapPanel = function(type, contents) {
    var icon_edit = HTMLBuilder.icon("pencil", "edit");
    var icon_delete = HTMLBuilder.icon("times", "delete");
    var actions = HTMLBuilder.div("actions", [icon_edit, icon_delete]);
    var info = HTMLBuilder.div("info", contents);

    return HTMLBuilder.div("continuity " + type, [info, actions])
        .data("continuity", this);
};

module.exports = BaseContinuity;
