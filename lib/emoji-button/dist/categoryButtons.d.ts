import { TinyEmitter as Emitter } from 'tiny-emitter';
import { EmojiButtonOptions, I18NStrings } from './types';
export declare class CategoryButtons {
    private options;
    private events;
    private i18n;
    constructor(options: EmojiButtonOptions, events: Emitter, i18n: I18NStrings);
    activeButton: number;
    buttons: HTMLElement[];
    render(): HTMLElement;
    setActiveButton(activeButton: number, focus?: boolean): void;
}
