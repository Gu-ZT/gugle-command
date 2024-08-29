export class Arguments {
  public static readonly BOOLEAN = function (arg: string): boolean {
    if (arg === 'true') return true;
    if (arg === 'false') return false;
    throw new Error(`Invalid boolean ${arg}`);
  };

  public static readonly NUMBER = function (arg: string): number {
    const num = Number(arg);
    if (isNaN(num)) throw new Error(`Invalid number ${arg}`);
    return num;
  };

  public static readonly STRING = function (arg: string): string {
    return arg;
  };
}

class CommandNode {
  public readonly children: CommandNode[] = [];
  public exec: ((...args: any) => void) | undefined = undefined;

  public constructor() {}

  public then(node: CommandNode): CommandNode {
    this.children.push(node);
    this.children.sort((a, b) => {
      if (a instanceof LiteralCommandNode && b instanceof ArgumentCommandNode) return -1;
      else if (a instanceof ArgumentCommandNode && b instanceof LiteralCommandNode) return 1;
      else return 0;
    });
    return this;
  }

  public execute(exec: (...args: any) => void): CommandNode {
    this.exec = exec;
    return this;
  }

  public parse(nodes: string[], ...args: any): void {
    if (nodes.length === 0) {
      if (this.exec) {
        this.exec(...args);
        return;
      } else {
        throw new Error('Invalid command');
      }
    }
    const nodeStr: string | undefined = nodes.pop();
    if (nodeStr === undefined) {
      throw new Error('Invalid command');
    } else if (this.children.length === 0) {
      throw new Error('Invalid command');
    } else {
      for (let child of this.children) {
        if (child instanceof LiteralCommandNode && child.toString() === nodeStr) {
          child.parse(nodes, ...args);
          return;
        }
        if (child instanceof ArgumentCommandNode) {
          try {
            args.push(child.decode(nodeStr));
            child.parse(nodes, args);
          } catch (e) {
            throw e;
          }
          return;
        }
      }
    }
  }
}

class LiteralCommandNode extends CommandNode {
  private readonly name: string;

  public constructor(name: string) {
    super();
    this.name = name;
  }

  public toString(): string {
    return this.name;
  }
}

class ArgumentCommandNode<T> extends CommandNode {
  private readonly name: string;
  private readonly decorator: (value: string) => T;

  public constructor(name: string, decorator: (value: string) => T) {
    super();
    this.name = name;
    this.decorator = decorator;
  }

  public decode(arg: string): T {
    return this.decorator(arg);
  }

  public toString(): string {
    return `<${this.name}>`;
  }
}

export class CommandManager {
  public readonly prefix: string;
  public readonly root: CommandNode = new CommandNode();

  public constructor(prefix: string = '/') {
    this.prefix = prefix;
  }

  public register(node: CommandNode): void {
    this.root.then(node);
  }

  public literal(name: string): LiteralCommandNode {
    return new LiteralCommandNode(name);
  }

  public argument<T>(name: string, decorator: (value: string) => T): ArgumentCommandNode<T> {
    return new ArgumentCommandNode(name, decorator);
  }

  public execute(commands: string): void {
    if (!commands.startsWith(this.prefix)) {
      throw new Error('Invalid command');
    }
    commands = commands.substring(this.prefix.length);
    const nodes = commands.split(' ');
    console.log(nodes);
    this.root.parse(nodes.reverse());
  }
}