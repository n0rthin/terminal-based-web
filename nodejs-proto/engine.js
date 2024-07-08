import fs from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";
import { createDOM, stringifyDOM } from "./dom.js";
import { createCSSOM } from "./cssom.js";
import { createRenderTree } from "./render_tree.js";
import { createLayout } from "./layout.js";
import { paintDOM } from "./paint.js";

async function main() {
    //process.stdout.write('\x1b[?1049h'); // use alternate buffer
    console.time("Time");
    const WIDTH = 30;
    const HEIGHT = 30;
    const file = process.argv[2];
    const docString = await fs.readFile(file);
    const parser = new XMLParser({
        ignoreAttributes: false,
        //alwaysCreateTextNode: false,
        ignoreDeclaration: true,
        attributeNamePrefix: "",
        allowBooleanAttributes: true,
        preserveOrder: true
    });
    const docObj = parser.parse(docString);
    console.log(JSON.stringify(docObj, null, 2));
    const { dom, css } = createDOM(docObj);
    console.log("DOM:\n", stringifyDOM(dom));
    createCSSOM(dom, css.join("\n"));
    console.log("CSSOM:\n", stringifyDOM(dom));
    createRenderTree(dom);
    console.log("Render tree:\n", stringifyDOM(dom, true));
    createLayout(dom, WIDTH, HEIGHT);
    console.log("Layout:\n", stringifyDOM(dom, true));

    const page = paintDOM(dom, WIDTH, HEIGHT);
    console.log("Page:");
    console.log(page);
    console.timeEnd("Time");
    //process.stdin.setRawMode(true);
    //process.stdout.write('\x1b[?1049l'); // return back to main buffer
}

main();



