/**
 * Subclasses of this class define how the mouse cursor interacts with
 * the editor application.
 */
var BaseContext = function(grapher) {
    this._grapher = grapher;
};

/**
 * Shortcuts that the user can press to run actions in the EditorController
 */
BaseContext.prototype.shortcuts = {};

/**
 * Add the given events to the workspace
 *
 * @param {object} events -- the events to add, mapping event name to handler
 */
BaseContext.prototype.addEvents = function(events) {
    // add namespace to each event
    $.each(events, function(name, handler) {
        events[name + ".app-context"] = handler;
        delete events[name];
    });

    $(".workspace").on(events);
};

/**
 * Add the given events to the context
 *
 * @param {object} events -- the events to add, mapping event name to handler
 */
BaseContext.prototype.addGlobalEvents = function(events) {
    // add namespace to each event
    $.each(events, function(name, handler) {
        events[name + ".app-context"] = handler;
        delete events[name];
    });

    $(document).on(events);
};

/**
 * Runs any actions to initialize this context
 */
BaseContext.prototype.load = function() {
    throw new Error(this.constructor.name + " did not define load");
};

/**
 * Remove all events from the .workspace element
 */
BaseContext.prototype.removeEvents = function() {
    $(document).off(".app-context");
};

/**
 * Runs any necessary actions to unload the context
 */
BaseContext.prototype.unload = function() {
};

module.exports = BaseContext;