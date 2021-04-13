import { TinyEmitter as Emitter } from 'tiny-emitter';
import { EmojiButtonOptions, EmojiRecord, RecentEmoji } from './types';
export declare class EmojiContainer {
    private showVariants;
    private events;
    private options;
    private lazy;
    private emojis;
    constructor(emojis: Array<EmojiRecord | RecentEmoji>, showVariants: boolean, events: Emitter, options: EmojiButtonOptions, lazy?: boolean);
    render(): HTMLElement;
}
