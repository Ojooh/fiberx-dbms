
// EventSystem class for managing custom events
class EventSystem {
    private events: Record<string, Array<Function>>;

    constructor() { this.events = {}; }

    // Register an event listener for a specific event
    on(event: string, listener: Function) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    // Trigger an event and call all listeners
    emit(event: string, data?: any, options?: object) {
        if (this.events[event]) {
            this.events[event].forEach(listener => listener(data, options));
        }
    }

    // Remove a specific listener for an event
    off(event: string, listener: Function) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(l => l !== listener);
        }
    }
}

export default EventSystem;