import { NotImplementedError } from "utils/errors";
import HTMLBuilder from "utils/HTMLBuilder";

/**
 * The base class for any popups in Calchart.
 */
export default class BasePopup {
    constructor() {
        this._popup = null;
    }

    /**
     * @return {object} meta info for this popup, including the following keys:
     *   - {string} name - The short, unique name of the popup; e.g. "create-show"
     */
    get info() {
        throw new NotImplementedError(this);
    }

    /**
     * Display this popup.
     */
    show() {
        let content = this.getContent();
        let popupBox = HTMLBuilder.div("popup-box", content);
        this._popup = HTMLBuilder.div(`popup ${this.info.name}`, [popupBox]);

        this.onInit();

        this._popup.appendTo("body");

        // event listeners to close popup
        this._popup.click(e => {
            if ($(e.target).is("button.cancel") || $(e.target).is(this._popup)) {
                this.hide();
            }
        });

        // ESC closes popup
        $(window).on("keydown.popup", e => {
            if (e.which === 27) {
                this.hide();
            }
        });
    }

    /**
     * Hide this popup.
     */
    hide() {
        this._popup.remove();
        this._popup = null;

        $(window).off(".popup");
    }

    /**** METHODS ****/

    /**
     * @return {jQuery[]} The content of the popup.
     */
    getContent() {
        throw new NotImplementedError(this);
    }

    /**
     * Any actions to run after the popup is built but before it is displayed.
     */
    onInit() {}
}
