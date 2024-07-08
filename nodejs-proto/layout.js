import Yoga, { Align, Direction, Display, FlexDirection } from "yoga-layout";

export function createLayout(dom, width, height) {
    prepareYoga(dom);
    dom.yogaNode.calculateLayout(width, height, Direction.LTR);
}

function prepareYoga(node) {
    node.yogaNode = Yoga.Node.create();

    if (node.parent) {
        node.parent.yogaNode.insertChild(
            node.yogaNode,
            node.parent.children.indexOf(node)
        );
    }

    node.yogaNode.setDisplay(CSS_to_Yoga_display[node.computedStyleMap.display]);
    node.yogaNode.setFlexDirection(CSS_to_Yoga_flexDirection[node.computedStyleMap.flexDirection]);
    node.yogaNode.setAlignItems(CSS_to_Yoga_align[node.computedStyleMap.alignItems]);
    node.prepareLayout();
    node.children.forEach(createLayout);
}

const CSS_to_Yoga_align = {
    "flex-start": Align.FlexStart,
    "flex-end": Align.FlexEnd,
    "center": Align.Center,
};

const CSS_to_Yoga_display = {
    "flex": Display.Flex,
    "none": Display.None,
};

const CSS_to_Yoga_flexDirection = {
    "row": FlexDirection.Row,
    "column": FlexDirection.Column,
    "row-revers": FlexDirection.RowReverse,
    "column-reverse": FlexDirection.ColumnReverse
}

