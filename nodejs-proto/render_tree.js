export function createRenderTree(node) {
    node.ignoreRender = shouldNotBeRendered(node);
    node.children.forEach(createRenderTree);
    return node;
}

function shouldNotBeRendered(node) {
    return node.computedStyleMap.display === "none";
}
