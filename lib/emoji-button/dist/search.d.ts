import { TinyEmitter as Emitter } from 'tiny-emitter';
import { I18NStrings, EmojiButtonOptions, EmojiRecord } from './types';
export declare class Search {
    private events;
    private i18n;
    private options;
    private emojiData;
    private emojisPerRow;
    private focusedEmojiIndex;
    private searchContainer;
    private searchField;
    private searchIcon;
    private resultsContainer;
    constructor(events: Emitter, i18n: I18NStrings, options: EmojiButtonOptions, emojiData: EmojiRecord[], categories: number[]);
    render(): HTMLElement;
    clear(): void;
    focus(): void;
    onClearSearch(event: Event): void;
    setFocusedEmoji(index: number): void;
    handleResultsKeydown(event: KeyboardEvent): void;
    onKeyDown(event: KeyboardEvent): void;
    onKeyUp(event: KeyboardEvent): void;
}
