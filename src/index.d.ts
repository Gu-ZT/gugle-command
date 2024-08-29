export declare class Arguments {
    static readonly BOOLEAN: (arg: string) => boolean;
    static readonly NUMBER: (arg: string) => number;
    static readonly STRING: (arg: string) => string;
}
declare class CommandNode {
    readonly children: CommandNode[];
    exec: ((...args: any) => void) | undefined;
    constructor();
    then(node: CommandNode): CommandNode;
    execute(exec: (...args: any) => void): CommandNode;
    parse(nodes: string[], ...args: any): void;
}
declare class LiteralCommandNode extends CommandNode {
    private readonly name;
    constructor(name: string);
    toString(): string;
}
declare class ArgumentCommandNode<T> extends CommandNode {
    private readonly name;
    private readonly decorator;
    constructor(name: string, decorator: (value: string) => T);
    decode(arg: string): T;
    toString(): string;
}
export declare class CommandManager {
    readonly prefix: string;
    readonly root: CommandNode;
    constructor(prefix?: string);
    register(node: CommandNode): void;
    literal(name: string): LiteralCommandNode;
    argument<T>(name: string, decorator: (value: string) => T): ArgumentCommandNode<T>;
    execute(commands: string): void;
}
export {};
