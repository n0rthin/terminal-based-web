import css from "css";

export function createCSSOM(root, css) {
    applyCSS(root, css);
    applyInlineCSS(root);
}

function applyCSS(root, css) {
    // TODO: parse and apply css to the DOM
}

function applyInlineCSS(node) {
    if (!node.dirty) return;

    if (node.attributes.style) {
        const inlineComputedStyleMap = parseInlineCSS(node.attributes.style);
        node.computedStyleMap.set(inlineComputedStyleMap);
    }

    node.children.forEach(applyInlineCSS);
}

function parseInlineCSS(cssString) {
    const obj = css.parse(`el { ${cssString} }`);
    const declarations = obj.stylesheet.rules[0].declarations;

    return Object.fromEntries(declarations.map(dec => ([cebabToCamelCase(dec.property), dec.value])));
}

function cebabToCamelCase(str) {
    return str
        .split("-")
        .map((part, index) =>
            index > 0 ? part[0].toUpperCase() + part.slice(1) : part
        ).join("");
}

export class ComputedStyleMap {
    constructor(defaultValues = {}) {
        this.alignItems = "";
        this.backgroundColor = "";
        this.borderTop = "";
        this.borderRight = "";
        this.borderBottom = "";
        this.borderLeft = "";
        this.borderWidth = "";
        this.color = "";
        this.display = "";
        this.flexDirection = "";

        Object.assign(this, defaultValues);
    }

    set(values) {
        Object.assign(this, values);
    }
}
