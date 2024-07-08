const BoxDrawing = {
    Horizontal: "\u2500",
    Vertical: "\u2502",
    TopLeftCorner: "\u250C",
    TopRightCorner: "\u2510",
    BottomLeftCorner: "\u2514",
    BottomRightCorner: "\u2518",
}

export function paintDOM(dom, width, height) {
    // use 1d array to improve performance
    const canvas = new Array(height)
        .fill(null)
        .map(() => new Array(width).fill(" "));

    paintNode(canvas, dom, 0, 0);

    return canvas.map(row => row.join("")).join("\n");
}

function paintNode(canvas, node, offsetTop, offsetLeft) {
    const layout = node.getComputedLayout();
    const top = layout.top + offsetTop;
    const left = layout.left + offsetLeft;

    const border = {
        top: node.computedStyleMap.borderTop === "yes",
        right: node.computedStyleMap.borderRight === "yes",
        bottom: node.computedStyleMap.borderBottom === "yes",
        left: node.computedStyleMap.borderLeft === "yes",
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
    const paddingWidth = layout.width - border.left - border.right;
    const paddingHeight = layout.height - border.top - border.bottom;

    if (border.top) {
        canvas[top].splice(left + border.left, paddingWidth, ...new Array(paddingWidth).fill(BoxDrawing.Horizontal));
    }

    if (border.bottom) {
        canvas[top + layout.height - 1]
            .splice(left + border.left, paddingWidth, ...new Array(paddingWidth).fill(BoxDrawing.Horizontal));
    }

    if (border.left) {
        for (let row = 0; row < paddingHeight; row++) {
            canvas[top + border.top + row][left] = BoxDrawing.Vertical;
        }
    }

    if (border.right) {
        for (let row = 0; row < paddingHeight; row++) {
            canvas[top + border.top + row][left + layout.width - 1] = BoxDrawing.Vertical;
        }
    }

    if (border.top && border.left) {
        canvas[top][left] = BoxDrawing.TopLeftCorner;
    }

    if (border.top && border.right) {
        canvas[top][left + layout.width - 1] = BoxDrawing.TopRightCorner;
    }

    if (border.right && border.bottom) {
        canvas[top + layout.height - 1][left + layout.width - 1] = BoxDrawing.BottomRightCorner;
    }

    if (border.left && border.bottom) {
        canvas[top + layout.height - 1][left] = BoxDrawing.BottomLeftCorner;
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
