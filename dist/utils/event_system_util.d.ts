declare class EventSystem {
    private events;
    constructor();
    on(event: string, listener: Function): void;
    emit(event: string, data?: any, options?: object): void;
    off(event: string, listener: Function): void;
}
export default EventSystem;
