import type { FlowResponseData } from '../core/interfaces';

export class FlowResponse {
    /**
     * Returns a response to move to the next screen.
     * @param screen The ID of the next screen to display.
     * @param data Optional data to pass to the next screen.
     */
    static next(screen: string, data: Record<string, unknown> = {}): FlowResponseData {
        return {
            screen,
            data
        };
    }

    /**
     * Returns a response to complete the flow.
     * @param data Optional final data.
     */
    static success(data: Record<string, unknown> = {}): FlowResponseData {
        return {
            screen: 'SUCCESS',
            data
        };
    }

    /**
     * Returns an error response (if supported by the flow logic, usually just a terminal screen).
     * @param message Error message to display (if you have an error screen).
     */
    static error(message: string): FlowResponseData {
        return {
            screen: 'ERROR', // Assumes an 'ERROR' screen exists in the flow
            data: {
                error_message: message
            }
        };
    }
}
