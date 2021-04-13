import { TinyEmitter as Emitter } from 'tiny-emitter';
import { I18NStrings, EmojiButtonOptions, EmojiRecord } from './types';
export declare class EmojiArea {
    private events;
    private i18n;
    private options;
    private emojiCategories;
    private headerOffsets;
    private currentCategory;
    private headers;
    private categoryButtons;
    private emojisPerRow;
    private categories;
    private focusedIndex;
    container: HTMLElement;
    emojis: HTMLElement;
    constructor(events: Emitter, i18n: I18NStrings, options: EmojiButtonOptions, emojiCategories: {
        [key: string]: EmojiRecord[];
    });
    updateRecents(): void;
    render(): HTMLElement;
    reset(): void;
    private get currentCategoryEl();
    private get focusedEmoji();
    private get currentEmojiCount();
    private getEmojiCount;
    private handleKeyDown;
    private setFocusedEmoji;
    private addCategory;
    selectCategory: (category: string, focus?: boolean) => void;
    highlightCategory: () => void;
}
