import { EmojiData, EmojiRecord } from './types';
export declare function createElement(tagName: string, className?: string): HTMLElement;
export declare function empty(element: HTMLElement): void;
export declare function formatEmojiName(name: string): string;
export declare function buildEmojiCategoryData(emojiData: EmojiData): {
    [key: string]: EmojiRecord[];
};
