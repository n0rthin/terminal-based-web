import vm from "node:vm";

export function executeJSOnTarget(target, jsString, extraContext = {}) {
    const context = getJSContext();
    context.this = target;
    Object.assign(context, extraContext);

    const script = new vm.Script(jsString);
    script.runInContext(context);
}

function getJSContext() {
    return {}
}
