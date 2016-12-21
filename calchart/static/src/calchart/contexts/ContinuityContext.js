var BaseContext = require("./BaseContext");
var Continuity = require("../Continuity");
var JSUtils = require("../../utils/JSUtils");
var UIUtils = require("../../utils/UIUtils");

/**
 * The default editor context, that allows a user to edit dot
 * continuities and step through marching
 */
var ContinuityContext = function(grapher, sheet) {
    BaseContext.call(this, grapher, sheet);

    this._panel = $(".panel.edit-continuity");
};

JSUtils.extends(ContinuityContext, BaseContext);

ContinuityContext.prototype.shortcuts = {
};

ContinuityContext.prototype.load = function() {
    var _this = this;

    UIUtils.setupPanel(this._panel, {
        top: "25%",
        right: 20,
        onInit: function(panel) {
            panel.on(".tab", function() {
                _this._changeTab(this);
            });

            panel.show()
                .find(".add-continuity select")
                .dropdown({
                    placeholder_text_single: "Add continuity...",
                    disable_search_threshold: false,
                })
                .change(function() {
                    _this._addContinuity($(this).val());

                    $(this).val("")
                        .trigger("chosen:updated");
                });

            // TODO: delete continuity
        },
    });
    this._updatePanel();
    this._panel.show();
    
    $(".toolbar .edit-continuity").addClass("active");
};

ContinuityContext.prototype.loadSheet = function(sheet) {
    BaseContext.prototype.loadSheet.call(this, sheet);

    this._updatePanel();
};

ContinuityContext.prototype.unload = function() {
    this._panel.hide();
    // this.removeEvents();

    $(".toolbar .edit-continuity").removeClass("active");
};

/**** HELPERS ****/

/**
 * Add the continuity with the given code
 *
 * @param {string} type -- the type of Continuity to add (see Continuity)
 */
ContinuityContext.prototype._addContinuity = function(type) {
    var continuity = new Continuity(type);

    continuity.html().appendTo(this._panel.find(".continuities"));

    // TODO: add to Sheet
};

/**
 * Change the currently active dot type
 *
 * @param {jQuery} tab -- the tab for the dot type to select
 */
ContinuityContext.prototype._changeTab = function(tab) {
    $(tab).addClass("active")
        .siblings().removeClass("active");

    // TODO: show continuities
    var continuities = $(tab).data("continuities");

    // TODO: show continuity errors (dots not make their spot, not enough continuities)
};

/**
 * Updates the panel with information from the currently active
 * sheet
 */
ContinuityContext.prototype._updatePanel = function() {
    var _this = this;
    var tabs = this._panel.find(".dot-types");
    var path = tabs.data("path");
    $.each(this._sheet.getDotTypes(), function(i, dotType) {
        var dot = $("<img>").attr("src", path.replace("DOT_TYPE", dotType));
        $("<li>")
            .addClass("tab")
            .append(dot)
            .data("continuities", _this._sheet.getContinuities(dotType))
            .appendTo(tabs);
    });

    this._changeTab(this._panel.find(".dot-types li:first"));
};

module.exports = ContinuityContext;
