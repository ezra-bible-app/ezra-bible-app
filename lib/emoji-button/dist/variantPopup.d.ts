import { TinyEmitter as Emitter } from 'tiny-emitter';
import { EmojiRecord, EmojiButtonOptions } from './types';
export declare class VariantPopup {
    private events;
    private emoji;
    private options;
    private popup;
    private focusedEmojiIndex;
    constructor(events: Emitter, emoji: EmojiRecord, options: EmojiButtonOptions);
    getEmoji(index: number): Element;
    setFocusedEmoji(newIndex: number): void;
    render(): HTMLElement;
}
