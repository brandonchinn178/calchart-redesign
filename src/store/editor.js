/**
 * @file Defines the Vuex module containing state relating to the editor.
 *
 * The mutations and actions are broken up into submodules in this directory
 * to distinguish between mutations and actions that should be recorded in
 * the History.
 */

import { clone, defaultTo, each } from 'lodash';

import Show from 'calchart/Show';
import ContextType from 'editor/ContextType';
import EditDotTool from 'editor/tools/EditDotTool';
import sendAction from 'utils/ajax';
import History from 'utils/History';

let history = null;

/**
 * Get the History currently in use by the editor.
 *
 * @return {History}
 */
export function getHistory() {
    return history;
}

const initialState = {
    // {ContextType} The currently active context
    context: ContextType.FORMATION,
    // {?Formation} The currently active formation
    formation: null,
    // {EditTool} The currently active edit tool
    tool: EditDotTool,
};

export default {
    namespaced: true,
    state: clone(initialState),
    mutations: {
        /**
         * Modify the Show with the given arguments.
         *
         * Takes in an object in the Show to be updated. The target should have
         * been freshly retrieved from the store and be part of the Show in the
         * store. In other words, modifying the target in place should modify
         * the Show in the store, but this is not checked.
         *
         * @param {Object}
         *  | {Any} [target=show]
         *  | {string} func
         *  | {Array} args
         *  | {Show} show
         */
        modifyShow(state, { target, func, args, show }) {
            target = target || show;
            target[func].apply(target, args);
            history.addState(func, show.serialize());
        },
        /**
         * @param {ContextType} context
         */
        setContext(state, context) {
            state.context = context;
        },
        /**
         * @param {Formation} formation
         */
        setFormation(state, formation) {
            state.formation = formation;
        },
        /**
         * @param {EditTool} tool
         */
        setTool(state, tool) {
            state.tool = tool;
        },
    },
    actions: {
        /**
         * Modify the Show with the given args. See the `modifyShow` mutation.
         *
         * @param {Object} args
         */
        modifyShow(context, args) {
            args.show = context.rootState.show;
            context.commit('modifyShow', args);
        },
        /**
         * Redo an action.
         */
        redo(context) {
            let state = history.redo();
            let show = Show.deserialize(state);
            context.commit('setShow', show, {
                root: true,
            });
        },
        /**
         * Reset the state for the editor.
         */
        reset(context) {
            let show = context.rootState.show;

            history = new History(show.serialize());
            context.commit('setContext', initialState.context);

            if (show.formations.length > 0) {
                context.commit('setFormation', show.formations[0]);
            } else {
                context.commit('setFormation', initialState.formation);
            }

            context.commit('setTool', initialState.tool);
        },
        /**
         * Save the current show to the server.
         *
         * @param {Object} options - Options to pass to AJAX.
         */
        saveShow(context, options) {
            context.dispatch('messages/showMessage', 'Saving...', {
                root: true,
            });

            options = options || {};
            let oldSuccess = defaultTo(options.success, () => {});
            options.success = () => {
                oldSuccess();
                context.dispatch('messages/showMessage', 'Saved!', {
                    root: true,
                });
            };

            let data = context.rootState.show.serialize();
            sendAction('save_show', data, options);
        },
        /**
         * Undo an action.
         */
        undo(context) {
            let state = history.undo();
            let show = Show.deserialize(state);
            context.commit('setShow', show, {
                root: true,
            });
        },
    },
};
