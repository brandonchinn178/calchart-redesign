var AnimationState = require("./AnimationState");
var errors = require("calchart/errors");

/**
 * A Dot object contains all the data for a marcher in a Show, containing the
 * following information:
 *  - the dot label
 *  - the information for marching the current Sheet (see Sheet.getInfoForDot)
 *
 * @param {string} label -- the label for the dot
 */
var Dot = function(label) {
    this._label = label;

    this._sheetInfo = null;
};

/**
 * Create a Dot from the given serialized data
 *
 * @param {object} data -- the JSON data to initialize the Dot with
 * @return {Dot} the Dot reconstructed from the given data
 */
Dot.deserialize = function(data) {
    return new Dot(data.label);
};

/**
 * Return the JSONified version of the Dot
 *
 * @return {object} a JSON object containing this Dot's data
 */
Dot.prototype.serialize = function() {
    return {
        label: this._label,
    };
};

/**
 * Compares this dot with the other dot, according to their labels.
 *
 * @param {Dot} other -- the other dot
 * @return {int} -1 if this dot's label is sorted before the other's dot,
 *   1 if this dot's label is sorted after, or 0 if the labels are the same.
 */
Dot.prototype.compareTo = function(other) {
    var label1 = this._label;
    var label2 = other.getLabel();

    // try to parse out numbers from labels
    var num1 = parseInt(label1);
    var num2 = parseInt(label2);
    if (num1 && num2) {
        label1 = num1;
        label2 = num2;
    }

    return label1 < label2 ? -1 : label1 > label2 ? 1 : 0;
};

/**
 * Get the label for this dot
 *
 * @return {string} the label for the dot
 */
Dot.prototype.getLabel = function() {
    return this._label;
};

/**** ANIMATION ****/

/**
 * Load the given Sheet to the Dot. This simulates a marcher "remembering"
 * the next stuntsheet in the show. Extracts the Dot's movements from
 * the stuntsheet and stores all necessary movements for the Dot to know
 * how to move in the stuntsheet.
 *
 * @param {Sheet} sheet -- the stuntsheet to load
 */
Dot.prototype.loadSheet = function(sheet) {
    this._sheetInfo = sheet.getInfoForDot(this._label);
};

/**
 * Returns an AnimationState object that describes the Dot's position,
 * orientation, etc. for the give stuntsheet
 *
 * @param {int} beatNum -- the beat of the current stuntsheet
 * @param {Sheet|undefined} sheet -- the sheet to get animation state in,
 *   defaulting to the currently loaded stuntsheet
 * @return {AnimationState} An AnimationState that describes the Dot at
 *   a moment of the show. If the Dot has no position at the specified beat,
 *   throws an AnimationStateError.
 */
Dot.prototype.getAnimationState = function(beatNum, sheet) {
    var movements = this.getSheetInfo(sheet).movements;
    var remaining = beatNum;

    for (var i = 0; i < movements.length; i++) {
        var movement = movements[i];
        var duration = movement.getDuration();
        if (remaining <= duration) {
            return movement.getAnimationState(remaining);
        } else {
            remaining -= duration;
        }
    }

    throw new errors.AnimationStateError(
        "Ran out of movements for " + this._label + ": " + remaining + " beats remaining"
    );
};

/**
 * Return the dot's dot type for the currently loaded stuntsheet
 *
 * @param {Sheet|undefined} sheet -- the sheet to get dot type in,
 *   defaulting to the currently loaded stuntsheet
 * @return {string} the dot type for the current stuntsheet
 */
Dot.prototype.getDotType = function(sheet) {
    return this.getSheetInfo(sheet).type;
};

/**
 * Get the position of the dot at the beginning of the currently loaded stuntsheet
 *
 * @param {Sheet|undefined} sheet -- the sheet to get the position of the dot in,
 *   defaulting to the currently loaded stuntsheet
 * @return {Coordinate} the initial position of the dot
 */
Dot.prototype.getFirstPosition = function(sheet) {
    return this.getSheetInfo(sheet).position;
}

/**
 * Get the position of the dot at the end of the currently loaded stuntsheet
 *
 * @param {Sheet|undefined} sheet -- the sheet to get the position of the dot in,
 *   defaulting to the currently loaded stuntsheet
 * @return {Coordinate} the final position of the dot
 */
Dot.prototype.getLastPosition = function(sheet) {
    var sheetInfo = this.getSheetInfo(sheet);
    var movements = sheetInfo.movements;
    if (movements.length === 0) {
        return sheetInfo.position;
    } else {
        return movements[movements.length - 1].getEndPosition();
    }
}

/**
 * Get the info for this dot in the given sheet.
 *
 * @param {Sheet|undefined} sheet -- the sheet to get the info in. Defaults
 *   to the currently loaded stuntsheet
 * @return {object} the info for this dot in the given sheet
 */
Dot.prototype.getSheetInfo = function(sheet) {
    if (sheet) {
        return sheet.getInfoForDot(this);
    } else if (this._sheetInfo) {
        return this._sheetInfo;
    } else {
        throw new Error("No sheet is currently loaded");
    }
};

module.exports = Dot;
