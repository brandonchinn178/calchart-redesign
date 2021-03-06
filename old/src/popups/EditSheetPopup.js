import UploadBackgroundAction from "actions/UploadBackgroundAction";
import FormPopup from "popups/FormPopup";

import { DEFAULT_CUSTOM, FIELD_TYPES, STEP_TYPES, ORIENTATIONS } from "utils/CalchartUtils";
import { CharField, ChoiceField, ChoiceOrNumberField, NumberField } from "utils/fields";
import HTMLBuilder from "utils/HTMLBuilder";
import { promptFile } from "utils/UIUtils";

/**
 * The popup to edit a sheet.
 */
export default class EditSheetPopup extends FormPopup {
    /**
     * @param {GraphContext} context
     */
    constructor(context) {
        super();

        this._context = context;
    }

    get info() {
        return {
            name: "edit-sheet",
        };
    }

    getFields() {
        let sheet = this._context.activeSheet;

        return [
            new CharField("label", {
                label: "Label (opt.)",
                initial: _.defaultTo(sheet.label, ""),
                required: false,
            }),
            new NumberField("numBeats", {
                label: "Number of beats",
                initial: sheet.getDuration(),
                positive: true,
            }),
            new ChoiceField("fieldType", FIELD_TYPES, {
                initial: sheet.fieldType,
            }),
            new ChoiceOrNumberField("beatsPerStep", DEFAULT_CUSTOM, {
                initial: {
                    choice: sheet.beatsPerStep === "default" ? "default" : "custom",
                    number: sheet.getBeatsPerStep(),
                },
                positive: true,
            }),
            new ChoiceField("stepType", STEP_TYPES, {
                initial: sheet.stepType,
            }),
            new ChoiceField("orientation", ORIENTATIONS, {
                initial: sheet.orientation,
            }),
        ];
    }

    onInit() {
        let backgroundImage = HTMLBuilder.div("field background-image")
            .text("Background image: ");

        HTMLBuilder.span("", "background-url")
            .appendTo(backgroundImage);

        let editIcon = HTMLBuilder.icon("pencil", "edit-link").click(e => {
            promptFile(file => {
                new UploadBackgroundAction(this, this._context).send({
                    sheet: this._context.activeSheet.getIndex(),
                    image: file,
                });
            });
        });

        let moveIcon = HTMLBuilder.icon("arrows", "move-link hide-if-none").click(e => {
            this._context.controller.loadContext("background", {
                previousContext: this._context.name,
            });
            this.hide();
        });

        let clearIcon = HTMLBuilder.icon("times", "clear-link hide-if-none").click(e => {
            this._context.activeSheet.removeBackground();
            this.updateBackgroundInfo();
        });

        HTMLBuilder.div("icons", [editIcon, moveIcon, clearIcon]).appendTo(backgroundImage);

        this._popup.find("form").prepend(backgroundImage);
        this.updateBackgroundInfo();
    }

    onSave(data) {
        if (data.label === "") {
            data.label = null;
        }

        this._context.controller.doAction("saveSheetProperties", [data]);
    }

    /**
     * Update the background information in the popup.
     */
    updateBackgroundInfo() {
        let background = this._context.activeSheet.getBackground();
        let fileText;
        if (_.isUndefined(background)) {
            fileText = "none selected";
            this._popup.find(".hide-if-none").hide();
        } else {
            fileText = _.last(background.url.split("/"));
            this._popup.find(".hide-if-none").show();
        }
        this._popup.find(".background-image .background-url").text(fileText);
    }
}
