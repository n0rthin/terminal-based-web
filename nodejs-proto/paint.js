const BoxDrawing = {
    Horizontal: "\u2500",
    Vertical: "\u2502",
    TopLeftCorner: "\u250C",
    TopRightCorner: "\u2510",
    BottomLeftCorner: "\u2514",
    BottomRightCorner: "\u2518",
}

const BoxDrawingThick = {
    Horizontal: "\u2501",
    Vertical: "\u2503",
    TopLeftCorner: "\u250F",
    TopRightCorner: "\u2513",
    BottomLeftCorner: "\u2517",
    BottomRightCorner: "\u251B",
}

function initCanvas(width, height) {
    return new Array(height)
        .fill(null)
        .map(() => new Array(width).fill(" "));

}

export function createPainter(width, height) {
    // use 1d array to improve performance
    const canvas = initCanvas(width, height);

    function paint(dom) {
        paintNode(canvas, dom, 0, 0);
        return canvas.map(row => row.join("")).join("\n");
    }

    return {
        paint,
        width,
        height
    }
}

function paintNode(canvas, node, offsetTop, offsetLeft) {
    //if (!node.dirty) return;
    node.dirty = false;
    node.yogaNode.markLayoutSeen();

    const layout = node.getComputedLayout();
    const top = layout.top + offsetTop;
    const left = layout.left + offsetLeft;

    const border = {
        top: node.computedStyleMap.borderTop === "yes",
        right: node.computedStyleMap.borderRight === "yes",
        bottom: node.computedStyleMap.borderBottom === "yes",
        left: node.computedStyleMap.borderLeft === "yes",
        thick: node.computedStyleMap.borderWidth === "thick",
    };
    const contentTop = top + border.top; // + padding;
    const contentLeft = left + border.left; // + padding;

    paintBorder(border, canvas, layout, top, left);

    switch (node.type) {
        case "#text":
            // TODO: trim or wrap text if it's out-of-boundary
            canvas[top].splice(left, node.text.length, ...node.text.split(""));
            break
        case "input":
            if (node.attributes.placeholder) {
                canvas[contentTop].splice(contentLeft, node.attributes.placeholder.length, ...node.attributes.placeholder.split(""));
            }
            // NOTE: color map?
            break;
    }

    node.children.forEach(child => paintNode(canvas, child, top, left));

    return canvas;
}

function paintBorder(border, canvas, layout, top, left) {
    const boxDrawing = border.thick ? BoxDrawingThick : BoxDrawing;
    const paddingWidth = layout.width - border.left - border.right;
    const paddingHeight = layout.height - border.top - border.bottom;

    if (border.top) {
        canvas[top].splice(left + border.left, paddingWidth, ...new Array(paddingWidth).fill(boxDrawing.Horizontal));
    }

    if (border.bottom) {
        canvas[top + layout.height - 1]
            .splice(left + border.left, paddingWidth, ...new Array(paddingWidth).fill(boxDrawing.Horizontal));
    }

    if (border.left) {
        for (let row = 0; row < paddingHeight; row++) {
            canvas[top + border.top + row][left] = boxDrawing.Vertical;
        }
    }

    if (border.right) {
        for (let row = 0; row < paddingHeight; row++) {
            canvas[top + border.top + row][left + layout.width - 1] = boxDrawing.Vertical;
        }
    }

    if (border.top && border.left) {
        canvas[top][left] = boxDrawing.TopLeftCorner;
    }

    if (border.top && border.right) {
        canvas[top][left + layout.width - 1] = boxDrawing.TopRightCorner;
    }

    if (border.right && border.bottom) {
        canvas[top + layout.height - 1][left + layout.width - 1] = boxDrawing.BottomRightCorner;
    }

    if (border.left && border.bottom) {
        canvas[top + layout.height - 1][left] = boxDrawing.BottomLeftCorner;
    }
}


function ansiColor(str, color, bg) {
    let code = "\u001b[" + ANSIColor[color];
    if (bg) code += ";" + bgANSIColor[bg];
    code += "m";
    return code + str;
}

const ANSIColor = {
    white: 37
};

const bgANSIColor = {
    green: 42
};
