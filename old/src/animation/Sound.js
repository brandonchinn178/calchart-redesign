if (_.isUndefined(soundManager)) {
    console.error("Sound Manager is not loaded!");
}
soundManager.setup({
    // debugMode: false,
    html5PollingInterval: 20,
    flashPollingInterval: 20,
});

/**
 * A class that can play an audio file and register callbacks
 * to fire upon events.
 */
export default class Sound {
    /**
     * @param {string} audio - The URL to an audio file.
     * @param {object} events - Callbacks to run on certain sound
     *   events. See runEvent.
     */
    constructor(audio, events) {
        this._events = events;
        this._sound = null;

        if (audio) {
            // TODO: Not working, specifically starting to play in the middle of the audio.
            // Possible bug: https://github.com/scottschiller/SoundManager2/issues/169
            this.loadSound(audio);
        }
    }

    /**** METHODS ****/

    /**
     * Set events in the sound according to the given beats data.
     *
     * @param {number[]} beats - The beats data, where the i-th number is
     *   the number of milliseconds from beat (i-1) to beat i.
     */
    loadBeats(beats) {
        if (_.isNull(this._sound)) {
            return;
        }

        let cumulative = 0;
        _.each(beats, ms => {
            cumulative += ms;
            this._sound.onPosition(cumulative, () => {
                this.runEvent("nextBeat");
            });
        });
    }

    /**
     * Load the given sound
     *
     * @param {string} audio - The URL of the audio file.
     */
    loadSound(audio) {
        this._sound = soundManager.createSound({
            url: audio,
            onload: () => {
                this.runEvent("onload");
            },
            onfinish: () => {
                this.runEvent("finished");
            },
        });
        this._sound.load();
    }

    /**
     * Play the audio starting at the given time.
     *
     * @param {number} start - The start time in milliseconds.
     */
    play(start) {
        if (this._sound) {
            this._sound.play({
                position: start,
            });
        }
    }

    /**
     * Run the event with the given name. Available events:
     *   - onload - Run when the sound has loaded.
     *   - nextBeat - Run when the next beat is played in the sound.
     *   - finished - Run when the sound finishes.
     */
    runEvent(name) {
        let event = this._events[name];
        if (event) {
            event();
        }
    }

    /**
     * Stop playing the audio.
     */
    stop() {
        if (this._sound) {
            this._sound.stop();
        }
    }
}
