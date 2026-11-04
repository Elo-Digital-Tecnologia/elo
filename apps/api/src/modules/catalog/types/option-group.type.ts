export interface OptionChoice {
    label: string;
    priceCents: number;
}
/** Options set up by the restaurant: sizes, extras, etc. */
export interface OptionGroup {
    name: string;
    required: boolean;
    multiple: boolean;
    choices: OptionChoice[];
}
