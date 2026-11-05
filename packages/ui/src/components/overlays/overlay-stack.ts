const stack: string[] = [];

/** Open overlays in the order they opened, so keys like Esc reach only the one on top. */
export function pushOverlay(id: string) {
    stack.push(id);
}

export function popOverlay(id: string) {
    const index = stack.lastIndexOf(id);
    if (index >= 0) stack.splice(index, 1);
}

export function isTopOverlay(id: string) {
    return stack.at(-1) === id;
}
