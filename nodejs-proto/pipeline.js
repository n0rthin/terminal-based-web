import assert from "node:assert";
import { createCSSOM } from "./cssom.js";
import { createRenderTree } from "./render_tree.js";
import { createLayout } from "./layout.js";
import { stringifyDOM } from "./dom.js";
import EventEmitter from "node:events";

export function createPipeline(painter) {
    let dom, css, scheduled;
    const emitter = new EventEmitter();

    function pipeline() {
        createCSSOM(dom, css);
        //console.log("CSSOM:\n", stringifyDOM(dom));
        createRenderTree(dom);
        //console.log("Render tree:\n", stringifyDOM(dom, true));
        //createLayout(dom, painter.width, painter.height);
        createLayout(dom, painter.width, painter.height);
        //console.log("DOM", stringifyDOM(dom, true));
        emitter.emit("paint", painter.paint(dom));
    }

    return {
        setDOM(DOM, CSS) {
            dom = DOM;
            css = CSS.join("\n");
        },
        schedule() {
            if (scheduled) return;
            assert(!!dom, "DOM is not provided, can't schedule pipeline");

            setImmediate(() => {
                scheduled = false;
                pipeline(dom, painter);
            });
            scheduled = true;
        },
        on(event, cb) {
            emitter.on(event, cb);
        }
    }
}
