export function createRenderTree(node) {
    if (!node.dirty) return node;
    node.ignoreRender = shouldNotBeRendered(node);
    node.children.forEach(createRenderTree);
    return node;
}

function shouldNotBeRendered(node) {
    return node.computedStyleMap.display === "none";
}
