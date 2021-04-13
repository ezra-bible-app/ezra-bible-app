import { TinyEmitter as Emitter } from 'tiny-emitter';
import { EmojiButtonOptions, EmojiRecord } from './types';
export declare class Emoji {
    private emoji;
    private showVariants;
    private showPreview;
    private events;
    private options;
    private lazy;
    private emojiButton;
    constructor(emoji: EmojiRecord, showVariants: boolean, showPreview: boolean, events: Emitter, options: EmojiButtonOptions, lazy?: boolean);
    render(): HTMLElement;
    onEmojiClick(): void;
    onEmojiHover(): void;
    onEmojiLeave(): void;
}
