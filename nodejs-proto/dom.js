import { EventEmitter } from "node:events";
import { executeJSOnTarget } from "./javascript.js";
import { ComputedStyleMap } from "./cssom.js";
import { Edge } from "yoga-layout";
/**
 * Build a linked list of focusable elements that can be navigated with Tab
 * when user presses Tab:
 * 1. Emit keypressed event
 * 2. Blur currently focused element (if any)
 * 3. Go to the next focusable element and focus it
 * 
 *
 * Initiate painter - module responsible for painting DOM
 * Each time painter paints it should emit "paint" event
 * Event must include painted text as well as row and column where it should be placed
 * Painter must support partial rendering:
 * When something is changed in DOM, affected elements must be scheduled for painting
 *
 */
let pipeline;
export function createDOM(children, input, _pipeline) {
    pipeline = _pipeline;
    const { dom, css, firstFocusable } = createNode(children);

    // handle focus
    let activeElement = null;
    input.on("keypress", (_, key) => {
        if (key.name !== "tab") return;

        if (activeElement) activeElement.blur();

        if (!activeElement) activeElement = firstFocusable;
        else if (activeElement.nextFocusable) activeElement = activeElement.nextFocusable;
        else activeElement = firstFocusable;

        if (!activeElement) return;
        activeElement.focus();
    });

    return { dom, css };
}

function createNode(children, parent, prevFocusable = null, css = []) {
    if (!parent) {
        parent = new DOMRootNode();
    }

    let firstFocusable = prevFocusable;
    for (const child of children) {
        const type = Object.keys(child)[0];
        const attrs = child[":@"] || {};
        let node;
        switch (type) {
            case "box":
                node = new DOMBoxNode(parent, attrs);
                break;
            case "text":
                node = new DOMTextElement(parent, attrs);
                break;
            case "#text":
                node = new DOMTextNode(parent, String(child[type]));
                if (parent.type === "style") {
                    css.push(node.text);
                }
                break;
            case "input":
                node = new DOMInputNode(parent, attrs);
                break;
            case "button":
                node = new DOMButtonNode(parent, attrs);
                break;
            case "style":
                node = new DOMStyleNode(parent, attrs);
                break;
            default:
                throw new Error(`Unknown ITML element: ${type}. Parent: ${parent.type}`);
        }
        parent.appendChild(node);

        if (node.tabIndex === 0) {
            node.tabIndex = prevFocusable ? prevFocusable.tabIndex + 1 : 0;
            node.prevFocusable = prevFocusable;
            if (prevFocusable) prevFocusable.nextFocusable = node;
            prevFocusable = node;

            if (!firstFocusable) {
                firstFocusable = node;
            }
        }

        if (Array.isArray(child[type]) && child[type].length > 0) {
            const result = createNode(child[type], node, node.tabIndex > -1 ? node : prevFocusable, css);
            if (result.firstFocusable && !firstFocusable) {
                firstFocusable = result.firstFocusable;
            }
        }
    }

    return { dom: parent, css, firstFocusable };
}

export function stringifyDOM(node, renderTree = false, depth = 0) {
    const offset = new Array(4 * depth).fill(" ").join("");
    let stringifiedDOM = `${offset}${node.type} ${node.dirty ? "dirty" : ""}\n`;

    const styles = Object
        .entries(node.computedStyleMap)
        .filter(([_, value]) => !!value);
    if (styles.length > 0) {
        stringifiedDOM += `${offset}  #style:\n`;
        stringifiedDOM += styles.map(([key, value]) => `${offset}    ${key}: ${value}`)
            .join("\n") + "\n";
    }

    if (node.yogaNode) {
        stringifiedDOM += `${offset}  #layout:\n`;
        stringifiedDOM += `${offset}    width: ${node.yogaNode.getComputedWidth()}\n`;
        stringifiedDOM += `${offset}    height: ${node.yogaNode.getComputedHeight()}\n`;
        stringifiedDOM += `${offset}    top: ${node.yogaNode.getComputedTop()}\n`;
        stringifiedDOM += `${offset}    left: ${node.yogaNode.getComputedLeft()}\n`;
    }

    if (node.children.length > 0) {
        stringifiedDOM += `${offset}  #children:\n`;
        node.children.forEach(child => {
            if (renderTree && child.ignoreRender === true) return;
            stringifiedDOM += stringifyDOM(child, renderTree, depth + 1);
        });
    }
    return stringifiedDOM;
}

class DOMNode extends EventEmitter {
    #type;

    constructor(type, parent = null, attributes = {}, children = []) {
        super();

        this.#type = type;
        this.ignoreRender = null;
        this.dirty = true;
        this.parent = parent;
        this.children = children;
        this.attributes = attributes;
        this.styles = {
            default: {},
            active: {}
        };
        this.computedStyleMap = new ComputedStyleMap();
        this.yogaNode = null;
        this.tabIndex = -1;
        this.prevFocusable = null;
        this.nextFocusable = null;

        this.#prepareEventHandling();
    }

    get type() {
        return this.#type;
    }

    get innerText() {
        return this.children
            .filter(child => child.type === "#text")
            .map(child => child.text)
            .join("");
    }

    appendChild(child) {
        this.children.push(child);
    }

    prepareLayout() { }

    getComputedLayout() {
        return this.yogaNode.getComputedLayout();
    }

    focus() {
        this.computedStyleMap.set({ ...this.styles.default, ...this.styles.active });
        this.markAsDirty();
    }

    blur() {
        this.computedStyleMap.set(this.styles.default);
        this.markAsDirty();
    }

    markAsDirty(dirtifySubtree = true) {
        this.dirty = true;
        pipeline.schedule();

        if (!dirtifySubtree) return;
        for (const child of this.children) {
            if (child.dirty) continue;
            child.markAsDirty();
        }

        let parent = this.parent;
        while (parent) {
            if (parent.dirty) break;

            parent.markAsDirty(false);
            parent = parent.parent;
        }
    }

    #prepareEventHandling() {
        const events = ["click"];
        for (const event of events) {
            this.on(event, (e) => {
                const jsHandler = Object.keys(this.attributes).find(key => key === `on${event}`);
                if (!jsHandler) return;
                executeJSOnTarget(this, this.attributes[jsHandler], { e });
            });
        }
    }
}



class DOMRootNode extends DOMNode {
    constructor(children = []) {
        super("root", null, {}, children);

        this.styles.default.display = "flex";
        this.styles.default.flexDirection = "column";
        this.styles.default.alignItems = "flex-start";
        this.computedStyleMap.set(this.styles.default);
    }
}

class DOMBoxNode extends DOMNode {
    constructor(parent, attrs) {
        super("box", parent, attrs);

        this.styles.default.display = "flex";
        this.styles.default.flexDirection = "column";
        this.styles.default.alignItems = "flex-start";
        this.computedStyleMap.set(this.styles.default);
    }

}

class DOMTextElement extends DOMNode {
    constructor(parent, attributes = {}) {
        super("text", parent, attributes);

        this.styles.default.display = "flex";
        this.styles.default.flexDirection = "row";
        this.styles.default.alignItems = "flex-start";
        this.computedStyleMap.set(this.styles.default);
    }

    prepareLayout() {
        this.yogaNode.setHeight(1);
    }
}

class DOMTextNode extends DOMNode {
    constructor(parent, text = "") {
        super("#text", parent);
        this.text = text;
    }

    prepareLayout() {
        this.yogaNode.setWidth(this.text.length);
        this.yogaNode.setHeight(1);
    }
}

class DOMButtonNode extends DOMNode {
    constructor(parent, attributes = {}) {
        super("button", parent, attributes);

        this.tabIndex = 0;

        this.styles.default = {
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            borderTop: "yes",
            borderRight: "yes",
            borderBottom: "yes",
            borderLeft: "yes",
            borderWidth: "normal"
        };
        this.styles.active = {
            borderWidth: "thick",
        };
        this.computedStyleMap.set(this.styles.default);
    }

    prepareLayout() {
        if (this.computedStyleMap.borderTop === "yes") this.yogaNode.setBorder(Edge.Top, 1);
        if (this.computedStyleMap.borderBottom === "yes") this.yogaNode.setBorder(Edge.Bottom, 1);
        if (this.computedStyleMap.borderLeft === "yes") this.yogaNode.setBorder(Edge.Left, 1);
        if (this.computedStyleMap.borderRight === "yes") this.yogaNode.setBorder(Edge.Right, 1);
    }
}

class DOMInputNode extends DOMNode {
    constructor(parent, attributes = {}) {
        super("input", parent, attributes);
        this.value = "";
        this.tabIndex = 0;

        this.styles.default = {
            backgroundColor: "green",
            borderTop: "yes",
            borderRight: "yes",
            borderBottom: "yes",
            borderLeft: "yes",
            borderWidth: "normal"
        };
        this.styles.active = {
            borderWidth: "thick",
        };
        this.computedStyleMap.set(this.styles.default);

        this.placeholderStyleMap = new ComputedStyleMap({
            color: "gray",
        });
    }

    prepareLayout() {
        this.yogaNode.setWidth(20); // default input width
        this.yogaNode.setHeight(3); // default input width
    }
}

class DOMStyleNode extends DOMNode {
    constructor(parent, attributes = {}) {
        super("style", parent, attributes);
    }
}



