/**
 * Represents the properties for a custom event.
 */
export interface EventProperties {
    article_id?: number;
    establishment_account_id?: number;
    name?: string;
    user_type?: string;
    [key: string]: any;
}

/**
 * Yawl Analytics interface.
 */
export interface Yawl {
    /**
     * Configures the Yawl analytics library with your API key.
     * This function must be called before tracking any events.
     *
     * @param apiKey - Your API key for tracking events.
     */
    configure(apiKey: string): void;

    /**
     * Tracks a custom event.
     *
     * Example:
     * ```js
     * yawl.track("click", {
     *   article_id: 69,
     *   establishment_account_id: 109,
     *   name: 'test',
     *   user_type: 'client'
     * });
     * ```
     *
     * @param name - The name of the event.
     * @param properties - Additional properties to associate with the event.
     * @returns True if the event was successfully queued for tracking.
     */
    track(name: string, properties?: EventProperties): boolean;

    /**
     * Tracks a page view event.
     * Automatically collects information like URL, title, and page path.
     *
     * @param additionalProperties - Optional additional properties for the page view.
     */
    trackView(additionalProperties?: { [key: string]: any }): void;
}

declare const yawl: Yawl;
export default yawl;