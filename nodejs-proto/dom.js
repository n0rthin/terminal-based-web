import { EventEmitter } from "node:events";
import { executeJSOnTarget } from "./javascript.js";
import { ComputedStyleMap } from "./cssom.js";
import { Edge } from "yoga-layout";

export function createDOM(children, parent, css = []) {
    if (!parent) {
        parent = new DOMRootNode();
    }

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
        if (node) parent.appendChild(node);
        if (Array.isArray(child[type]) && child[type].length > 0) {
            createDOM(child[type], node, css);
        }
    }

    return { dom: parent, css };
}

export function stringifyDOM(node, renderTree = false, depth = 0) {
    const offset = new Array(4 * depth).fill(" ").join("");
    let stringifiedDOM = `${offset}${node.type}\n`;

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
        this.parent = parent;
        this.children = children;
        this.attributes = attributes;
        this.computedStyleMap = new ComputedStyleMap();
        this.yogaNode = null;

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

        this.computedStyleMap.display = "flex";
        this.computedStyleMap.flexDirection = "column";
        this.computedStyleMap.alignItems = "flex-start";
    }
}

class DOMBoxNode extends DOMNode {
    constructor(parent, attrs) {
        super("box", parent, attrs);

        this.computedStyleMap.display = "flex";
        this.computedStyleMap.flexDirection = "column";
        this.computedStyleMap.alignItems = "flex-start";
    }

}

class DOMTextElement extends DOMNode {
    constructor(parent, attributes = {}) {
        super("text", parent, attributes);

        this.computedStyleMap.display = "flex";
        this.computedStyleMap.flexDirection = "row";
        this.computedStyleMap.alignItems = "flex-start";
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

        this.computedStyleMap.set({
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            borderTop: "yes",
            borderRight: "yes",
            borderBottom: "yes",
            borderLeft: "yes",
        });
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

        this.computedStyleMap.set({
            backgroundColor: "green",
            borderTop: "yes",
            borderRight: "yes",
            borderBottom: "yes",
            borderLeft: "yes",
        });

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



