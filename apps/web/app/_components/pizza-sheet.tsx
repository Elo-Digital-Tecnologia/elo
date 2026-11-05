'use client';

import type {
    CategoryView,
    PizzaSetup,
    ProductView
} from '@elo/core/api/views/catalog.view';
import type { ChosenOption } from '@elo/core/catalog/product-pricing';
import type { SheetProps } from './product-sheet';
import { FlavorPricing } from '@elo/core/catalog/option-kinds';
import { flavorPriceAt, pricePizza } from '@elo/core/catalog/pizza-pricing';
import { isRequired } from '@elo/core/catalog/product-pricing';
import { formatBRL } from '@elo/core/money/cents';
import { useState } from 'react';
import { PIZZA_TEXTS } from '../_lib/messages/catalog';
import { ChoiceGroup } from './choice-group';
import { ItemSheet } from './item-sheet';
import { ProductPrice } from './menu-list';

/**
 * Pizza builder, opened from one flavor of a pizza category: the size, then up to the
 * size's number of flavors (the tapped one comes in first), then the shared add-ons.
 */
export function PizzaSheet({
    product,
    category,
    ...rest
}: SheetProps & { product: ProductView | null; category: CategoryView | null }) {
    if (!product || !category?.pizza) return null;
    return (
        <Body
            key={product.id}
            product={product}
            setup={category.pizza}
            flavors={category.products.filter((p) => p.available)}
            {...rest}
        />
    );
}

function Body({
    product,
    setup,
    flavors,
    onAdd,
    onClose,
    blocked
}: SheetProps & { product: ProductView; setup: PizzaSetup; flavors: ProductView[] }) {
    const [sizeId, setSizeId] = useState<string | null>(null);
    const [flavorIds, setFlavorIds] = useState<string[]>([product.id]);
    const [addons, setAddons] = useState<ChosenOption[]>([]);
    const size = setup.sizes.find((s) => s.id === sizeId) ?? null;
    const limit = size?.maxFlavors ?? 1;

    const madeIn = (flavor: ProductView, id: string) =>
        flavorPriceAt(flavor, id) !== null;

    const pickSize = (id: string) => {
        const next = setup.sizes.find((s) => s.id === id);
        if (!next) return;
        setSizeId(id);
        // Keeps the flavors made in the new size, as many as it takes.
        setFlavorIds((cur) =>
            cur
                .filter((f) => {
                    const flavor = flavors.find((x) => x.id === f);
                    return flavor && madeIn(flavor, id);
                })
                .slice(0, next.maxFlavors)
        );
    };

    const pickFlavor = (id: string) =>
        setFlavorIds((cur) => {
            if (limit === 1) return [id];
            if (cur.includes(id)) return cur.filter((f) => f !== id);
            return cur.length < limit ? [...cur, id] : cur;
        });

    const pickAddon = (group: string, multiple: boolean, label: string) =>
        setAddons((cur) => {
            const on = cur.some((o) => o.group === group && o.label === label);
            if (on)
                return multiple
                    ? cur.filter((o) => !(o.group === group && o.label === label))
                    : cur;
            return [
                ...(multiple ? cur : cur.filter((o) => o.group !== group)),
                { group, label }
            ];
        });

    // The tapped flavor leads the list; the others follow in menu order.
    const ordered = [product, ...flavors.filter((f) => f.id !== product.id)];
    const missingAddon = setup.addons.find(
        (g) => isRequired(g) && !addons.some((o) => o.group === g.name)
    );
    const missing = !size
        ? setup.sizesName
        : !flavorIds.length
          ? setup.flavorsName
          : (missingAddon?.name ?? null);
    const priced = size
        ? pricePizza(setup, flavors, { sizeId: size.id, flavorIds, addons })
        : null;
    const rule =
        setup.flavorPricing === FlavorPricing.AVERAGE
            ? PIZZA_TEXTS.chargesAverage
            : PIZZA_TEXTS.chargesHighest;

    return (
        <ItemSheet
            product={product}
            price={<ProductPrice product={product} pizza={setup} />}
            missing={missing}
            unitCents={priced?.ok ? priced.unitCents : null}
            blocked={blocked}
            onClose={onClose}
            onAdd={({ quantity, notes }) =>
                size &&
                priced?.ok &&
                onAdd({
                    product,
                    quantity,
                    notes,
                    options: priced.options,
                    pizza: { sizeId: size.id, flavorIds }
                })
            }
        >
            <ChoiceGroup
                name={setup.sizesName}
                required
                many={false}
                rows={setup.sizes.map((s) => {
                    const price = flavorPriceAt(product, s.id);
                    return {
                        label: s.label,
                        price: price === null ? PIZZA_TEXTS.notInSize : formatBRL(price),
                        disabled: price === null
                    };
                })}
                isOn={(label) => size?.label === label}
                onPick={(label) => {
                    const s = setup.sizes.find((x) => x.label === label);
                    if (s) pickSize(s.id);
                }}
            />
            <ChoiceGroup
                name={setup.flavorsName}
                required
                many={limit > 1}
                note={
                    size
                        ? `${PIZZA_TEXTS.flavorsUpTo(limit)}${limit > 1 ? ` · ${rule}` : ''}`
                        : PIZZA_TEXTS.chooseSize
                }
                rows={ordered.map((f) => {
                    const price = size ? flavorPriceAt(f, size.id) : null;
                    return {
                        label: f.name,
                        price: price === null ? null : formatBRL(price),
                        disabled:
                            !size ||
                            price === null ||
                            (limit > 1 && flavorIds.length >= limit)
                    };
                })}
                isOn={(name) =>
                    flavorIds.some(
                        (id) => ordered.find((f) => f.id === id)?.name === name
                    )
                }
                onPick={(name) => {
                    const f = ordered.find((x) => x.name === name);
                    if (f) pickFlavor(f.id);
                }}
            />
            {setup.addons.map((g) => (
                <ChoiceGroup
                    key={g.name}
                    name={g.name}
                    required={isRequired(g)}
                    many={g.multiple}
                    rows={g.choices.map((c) => {
                        const price = size ? (c.sizePrices[size.id] ?? 0) : 0;
                        return {
                            label: c.label,
                            price: price > 0 ? `+ ${formatBRL(price)}` : null,
                            disabled: !size
                        };
                    })}
                    isOn={(label) =>
                        addons.some((o) => o.group === g.name && o.label === label)
                    }
                    onPick={(label) => pickAddon(g.name, g.multiple, label)}
                />
            ))}
        </ItemSheet>
    );
}
