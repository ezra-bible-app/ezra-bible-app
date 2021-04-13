import { TinyEmitter as Emitter } from 'tiny-emitter';
import { EmojiRecord, EmojiButtonOptions } from './types';
export declare class EmojiPreview {
    private events;
    private options;
    private emoji;
    private name;
    constructor(events: Emitter, options: EmojiButtonOptions);
    render(): HTMLElement;
    showPreview(emoji: EmojiRecord): void;
    hidePreview(): void;
}
