'use client';

import type { CategoryView, ProductView } from '@elo/core/api/views/catalog.view';
import type { ChosenOption, PricedOption } from '@elo/core/catalog/product-pricing';
import { OptionGroupKind } from '@elo/core/catalog/option-kinds';
import { pricePizza } from '@elo/core/catalog/pizza-pricing';
import {
    groupsInFillOrder,
    isRequired,
    kindOf,
    priceSelection
} from '@elo/core/catalog/product-pricing';
import { formatBRL } from '@elo/core/money/cents';
import { useState } from 'react';
import { ChoiceGroup } from './choice-group';
import { ItemSheet } from './item-sheet';
import { ProductPrice } from './menu-list';

export interface CartLine {
    product: ProductView;
    quantity: number;
    notes: string;
    /** Priced lines: choices, or for a pizza its size, flavors and add-ons. */
    options: PricedOption[];
    /** Pizza: the size and flavors, from the product's pizza category. */
    pizza?: { sizeId: string; flavorIds: string[] };
}

/** Add-ons of a pizza line, as the API takes them next to `pizza`. */
export const pizzaAddons = (l: CartLine): ChosenOption[] =>
    l.options
        .filter((o) => o.kind === OptionGroupKind.EXTRA)
        .map((o) => ({ group: o.group, label: o.label }));

/** Unit price of a bag line, from the menu as it is now. */
export function lineUnit(l: CartLine, menu: CategoryView[]): number {
    if (l.pizza) {
        const category = menu.find((c) => c.id === l.product.categoryId);
        if (!category?.pizza) return 0;
        const r = pricePizza(category.pizza, category.products, {
            ...l.pizza,
            addons: pizzaAddons(l)
        });
        return r.ok ? r.unitCents : 0;
    }
    const r = priceSelection(l.product, l.options);
    return r.ok ? r.unitCents : 0;
}

export interface SheetProps {
    onAdd: (line: CartLine) => void;
    onClose: () => void;
    /** Why nothing more can be added right now (a full bag), shown in place of the add button. */
    blocked?: string | null;
}

/** Product detail: photo, sizes and extras, note and quantity. */
export function ProductSheet({
    product,
    ...rest
}: SheetProps & { product: ProductView | null }) {
    // The body remounts per product to reset quantity and choices.
    return product ? <Body key={product.id} product={product} {...rest} /> : null;
}

function Body({
    product,
    onAdd,
    onClose,
    blocked
}: SheetProps & { product: ProductView }) {
    const [chosen, setChosen] = useState<ChosenOption[]>([]);
    const isOn = (group: string, label: string) =>
        chosen.some((o) => o.group === group && o.label === label);

    const pick = (group: string, single: boolean, label: string) =>
        setChosen((cur) => {
            if (isOn(group, label))
                return single
                    ? cur
                    : cur.filter((o) => !(o.group === group && o.label === label));
            const base = single ? cur.filter((o) => o.group !== group) : cur;
            return [...base, { group, label }];
        });

    const missing = product.options.find(
        (g) =>
            isRequired({ ...g, kind: kindOf(g) }) &&
            !chosen.some((o) => o.group === g.name)
    );
    const priced = priceSelection(product, chosen);

    return (
        <ItemSheet
            product={product}
            price={<ProductPrice product={product} />}
            missing={missing?.name ?? null}
            unitCents={priced.ok ? priced.unitCents : null}
            blocked={blocked}
            onClose={onClose}
            onAdd={({ quantity, notes }) =>
                priced.ok && onAdd({ product, quantity, notes, options: priced.options })
            }
        >
            {groupsInFillOrder(product.options).map((g) => {
                const size = kindOf(g) === OptionGroupKind.SIZE;
                const single = size || !g.multiple;
                return (
                    <ChoiceGroup
                        key={g.name}
                        name={g.name}
                        required={isRequired({ ...g, kind: kindOf(g) })}
                        many={!single}
                        rows={g.choices.map((c) => ({
                            label: c.label,
                            price: size
                                ? formatBRL(c.priceCents)
                                : c.priceCents > 0
                                  ? `+ ${formatBRL(c.priceCents)}`
                                  : null
                        }))}
                        isOn={(label) => isOn(g.name, label)}
                        onPick={(label) => pick(g.name, single, label)}
                    />
                );
            })}
        </ItemSheet>
    );
}
