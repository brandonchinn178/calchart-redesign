/**
 * @file Mutations that are not saved in History.
 */

/**
 * @param {Object} data
 */
export function setNewShowData(state, data) {
    state.newShowData = data;
}

/**
 * @param {String} snap
 */
export function setSnap(state, snap) {
    state.snap = parseInt(snap);
}
