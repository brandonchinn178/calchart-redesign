import { defaults, isNull, isNumber } from 'lodash';

import FieldType from 'calchart/FieldType';
import Orientation from 'calchart/Orientation';
import StepType from 'calchart/StepType';

/**
 * A song represents a collection of Sheets that comprise a Song. Songs can be
 * used to set defaults for continuities, such as west-facing songs.
 */
export default class Song {
    /**
     * @param {Show} show
     * @param {string} name - The name of the song
     * @param {(number[]|Sheet[])} sheets - The sheets contained in this song.
     * @param {Object} [options] - Optional information about the song, such as:
     *   - {FieldType} fieldType - The default field type for continuities in
     *     the Song.
     *   - {?int} beatsPerStep - The default number of beats per step for
     *       continuities in the Song, or null to get the number of beats per
     *       step from the Show.
     *   - {Orientation} orientation - The default orientation for continuities
     *       in the Song.
     *   - {StepType} stepType - The default step type for continuities in the
     *       Song.
     */
    constructor(show, name, sheets, options={}) {
        this._show = show;
        this._name = name;

        if (sheets.length > 0) {
            if (isNumber(sheets[0])) {
                sheets = sheets.map(i => this._show.getSheet(i));
            }
        }
        this._sheets = new Set(sheets);

        options = defaults({}, options, {
            fieldType: null,
            beatsPerStep: null,
            orientation: Orientation.DEFAULT,
            stepType: StepType.DEFAULT,
        });

        this._fieldType = FieldType.fromValue(options.fieldType);
        this._beatsPerStep = options.beatsPerStep;
        this._orientation = options.orientation;
        this._stepType = options.stepType;
    }

    /**
     * Create a song with the given name.
     *
     * @param {Show} show
     * @param {string} name
     * @return {Song}
     */
    static create(show, name) {
        return new Song(show, name, []);
    }

    /**
     * Create a Song from the given serialized data
     *
     * @param {Show} show
     * @param {Object} data - The JSON data to initialize the Song with.
     * @return {Song}
     */
    static deserialize(show, data) {
        data.orientation = Orientation.fromValue(data.orientation);
        data.stepType = StepType.fromValue(data.stepType);
        return new Song(show, data.name, data.sheets, data);
    }

    /**
     * Return the JSONified version of the Song.
     *
     * @return {Object}
     */
    serialize() {
        let data = {
            name: this._name,
            fieldType: this._fieldType.value,
            beatsPerStep: this._beatsPerStep,
            stepType: this._stepType.value,
            orientation: this._orientation.value,
        };

        data.sheets = [];
        this._sheets.forEach(sheet => {
            let index = sheet.getIndex();
            data.sheets.push(index);
        });

        return data;
    }

    // getter methods to access raw properties instead of resolving defaults
    get beatsPerStep() { return this._beatsPerStep; }
    get fieldType() { return this._fieldType; }
    get orientation() { return this._orientation; }
    get stepType() { return this._stepType; }

    get show() {
        return this._show;
    }

    /**** METHODS ****/

    /**
     * Add the given Sheet to the song, removing it from any other
     * songs it may be a part of.
     *
     * @param {Sheet} sheet
     */
    addSheet(sheet) {
        this._sheets.add(sheet);

        // tell song's previous song of its removal
        let song = sheet.getSong();
        if (song) {
            song.removeSheet(sheet);
        }
        sheet.setSong(this);
    }

    /**
     * Get the number of beats per step for this song, resolving any defaults.
     *
     * @return {int}
     */
    getBeatsPerStep() {
        return isNull(this._beatsPerStep) ?
            this.show.getBeatsPerStep() :
            this._beatsPerStep;
    }

    /**
     * @return {BaseFieldType} The field type for the song, resolving any
     *   defaults.
     */
    getFieldType() {
        return this._fieldType === FieldType.DEFAULT ?
            this.show.getFieldType() :
            this._fieldType;
    }

    /**
     * @return {string}
     */
    getName() {
        return this._name;
    }

    /**
     * @return {int} The song's orientation, resolving any defaults.
     */
    getOrientationDegrees() {
        if (this._orientation === Orientation.DEFAULT) {
            return this.show.getOrientationDegrees();
        } else {
            return this._orientation.angle;
        }
    }

    /**
     * @return {Set<Sheet>}
     */
    getSheets() {
        return this._sheets;
    }

    /**
     * @return {BaseStepType} The song's step type, resolving any defaults.
     */
    getStepType() {
        return this._stepType === StepType.DEFAULT ?
            this.show.getStepType() :
            this._stepType;
    }

    /**
     * @param {Sheet} sheet
     * @return {boolean} true if the given sheet is in this song
     */
    hasSheet(sheet) {
        return this._sheets.has(sheet);
    }

    /**
     * Remove the given Sheet from the song.
     *
     * @param {Sheet} sheet
     */
    removeSheet(sheet) {
        this._sheets.delete(sheet);
        sheet.setSong(null);
    }

    /**
     * Update movements for all sheets in the song.
     */
    updateMovements() {
        this._sheets.forEach(sheet => {
            sheet.updateMovements();
        });
    }
}
