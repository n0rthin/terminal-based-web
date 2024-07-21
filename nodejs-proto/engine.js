import fs from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";
import { createDOM, stringifyDOM } from "./dom.js";
import { createPainter } from "./paint.js";
import { createPipeline } from "./pipeline.js";
import { ANSIES, initInput } from "./input.js";

async function main() {
    const WIDTH = 30;
    const HEIGHT = 30;
    const { input } = initInput();
    const painter = createPainter(WIDTH, HEIGHT);
    const pipeline = createPipeline(painter);
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
    //console.log(JSON.stringify(docObj, null, 2));
    const { dom, css } = createDOM(docObj, input, pipeline);
    //console.log("DOM:\n", stringifyDOM(dom));
    pipeline.setDOM(dom, css);
    pipeline.on("paint", canvas => {
        process.stdout.write(ANSIES.MoveCursortToTopLeftCorner);
        process.stdout.write(ANSIES.ClearScreen);
        process.stdout.write("\n" + canvas);
    });
    pipeline.schedule();
}

main();
