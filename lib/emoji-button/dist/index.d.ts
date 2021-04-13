import '../css/emoji-button.css';
import { EmojiButtonOptions, EmojiTheme } from './types';
export declare class EmojiButton {
    private pickerVisible;
    private hideInProgress;
    private events;
    private publicEvents;
    private options;
    private i18n;
    private pickerEl;
    private pickerContent;
    private wrapper;
    private focusTrap;
    private emojiArea;
    private search;
    private overlay?;
    private popper;
    private observer;
    private theme;
    private emojiCategories;
    constructor(options?: EmojiButtonOptions);
    /**
     * Adds an event listener to the picker.
     *
     * @param event The name of the event to listen for
     * @param callback The function to call when the event is fired
     */
    on(event: string, callback: (arg?: any) => void): void;
    /**
     * Removes an event listener from the picker.
     *
     * @param event The name of the event
     * @param callback The callback to remove
     */
    off(event: string, callback: (arg?: any) => void): void;
    /**
     * Sets any CSS variable values that need to be set.
     */
    private setStyleProperties;
    /**
     * Shows the search results in the main emoji area.
     *
     * @param searchResults The element containing the search results.
     */
    private showSearchResults;
    /**
     * Hides the search results and resets the picker.
     */
    private hideSearchResults;
    /**
     * Emits a selected emoji event.
     * @param param0 The selected emoji and show variants flag
     */
    private emitEmoji;
    /**
     * Emits a native emoji record.
     * @param emoji The selected emoji
     */
    private emitNativeEmoji;
    /**
     * Emits a custom emoji record.
     * @param emoji The selected emoji
     */
    private emitCustomEmoji;
    /**
     * Emits a Twemoji emoji record.
     * @param emoji The selected emoji
     */
    private emitTwemoji;
    /**
     * Builds the search UI.
     */
    private buildSearch;
    /**
     * Builds the emoji preview area.
     */
    private buildPreview;
    /**
     * Initializes any plugins that were specified.
     */
    private initPlugins;
    /**
     * Initializes the emoji picker's focus trap.
     */
    private initFocusTrap;
    /**
     * Builds the emoji picker.
     */
    private buildPicker;
    /**
     * Shows the variant popup for an emoji.
     *
     * @param emoji The emoji whose variants are to be shown.
     */
    private showVariantPopup;
    /**
     * Initializes the IntersectionObserver for lazy loading emoji images
     * as they are scrolled into view.
     */
    private observeForLazyLoad;
    /**
     * IntersectionObserver callback that triggers lazy loading of emojis
     * that need it.
     *
     * @param entries The entries observed by the IntersectionObserver.
     */
    private handleIntersectionChange;
    /**
     * Determines whether or not an emoji should be lazily loaded.
     *
     * @param element The element containing the emoji.
     * @return true if the emoji should be lazily loaded, false if not.
     */
    private shouldLazyLoad;
    /**
     * Handles a click on the document, so that the picker is hidden
     * if the mouse is clicked outside of it.
     *
     * @param event The MouseEvent that was dispatched.
     */
    private onDocumentClick;
    /**
     * Destroys the picker. Once this is called, the picker can no longer
     * be shown.
     */
    destroyPicker(): void;
    /**
     * Hides, but does not destroy, the picker.
     */
    hidePicker(): void;
    /**
     * Shows the picker.
     *
     * @param referenceEl The element to position relative to if relative positioning is used.
     */
    showPicker(referenceEl: HTMLElement): void;
    /**
     * Determines which display and position are used for the picker, based on
     * the viewport size and specified options.
     *
     * @param referenceEl The element to position relative to if relative positioning is used.
     */
    determineDisplay(referenceEl: HTMLElement): void;
    /**
     * Sets the initial focus to the appropriate element, depending on the specified
     * options.
     */
    setInitialFocus(): void;
    /**
     * Adds the event listeners that will close the picker without selecting an emoji.
     */
    private addEventListeners;
    /**
     * Sets relative positioning with Popper.js.
     *
     * @param referenceEl The element to position relative to.
     */
    private setRelativePosition;
    /**
     * Sets fixed positioning.
     */
    private setFixedPosition;
    /**
     * Shows the picker in a mobile view.
     */
    private showMobileView;
    /**
     * Toggles the picker's visibility.
     *
     * @param referenceEl The element to position relative to if relative positioning is used.
     */
    togglePicker(referenceEl: HTMLElement): void;
    /**
     * Determines whether or not the picker is currently visible.
     * @return true if the picker is visible, false if not.
     */
    isPickerVisible(): boolean;
    /**
     * Handles a keydown event on the document.
     * @param event The keyboard event that was dispatched.
     */
    private onDocumentKeydown;
    /**
     * Sets the theme to use for the picker.
     */
    setTheme(theme: EmojiTheme): void;
}
