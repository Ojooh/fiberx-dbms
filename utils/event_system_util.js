// EventSystem class for managing custom events
class EventSystemUtil {
    constructor() {
        this.events = {};
    }

    // Register an event listener for a specific event
    on(event, listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    // Trigger an event and call all listeners
    emit(event, data, options) {
        if (this.events[event]) {
            this.events[event].forEach(listener => listener(data, options));
        }
    }

    // Remove a specific listener for an event
    off(event, listener) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(l => l !== listener);
        }
    }
}

module.exports = EventSystemUtil;
