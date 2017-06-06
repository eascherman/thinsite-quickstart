
export function Bundle(args) {
    this.args = args;
    var strings = args[0];
    if (!(strings instanceof Array))
        throw Error('Invalid bundle call');
    this.strings = strings;
}

export default function bundle() {
    return new Bundle(arguments);
}