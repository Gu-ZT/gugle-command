export interface CommandSource {
  success: (msg: string) => void;
  fail: (msg: string) => void;
  getName: () => string;
  hasPermission: (permission: string) => boolean;
}

/**
 * Arguments类提供了几个静态函数，用于安全地将字符串转换为布尔值、数字和字符串
 * 每个函数都会对输入进行验证，如果输入不符合期望格式，则会抛出错误
 */
export class Arguments {
  /**
   * 将字符串转换为布尔值如果字符串为'true'（大小写严格），则返回true；
   * 如果字符串为'false'（大小写严格），则返回false；否则抛出错误
   *
   * @param arg {string} 要转换为布尔值的字符串
   * @returns {boolean} 返回转换后的布尔值
   * @throws {Error} 如果字符串不能转换为布尔值，则抛出错误
   */
  public static readonly BOOLEAN = function (arg: string): boolean {
    if (arg === 'true') return true;
    if (arg === 'false') return false;
    throw new Error(`Invalid boolean ${arg}`);
  };

  /**
   * 将字符串转换为数字如果转换失败或者结果是NaN，则抛出错误
   *
   * @param arg {string} 要转换为数字的字符串
   * @returns {number} 返回转换后的数字
   * @throws {Error} 如果字符串不能转换为有效的数字，则抛出错误
   */
  public static readonly NUMBER = function (arg: string): number {
    const num = Number(arg);
    if (isNaN(num)) throw new Error(`Invalid number ${arg}`);
    return num;
  };

  /**
   * 将字符串原样返回此函数用作身份验证，确保传入的值确实是字符串
   *
   * @param arg {string} 要验证的字符串
   * @returns {string} 返回原样的字符串
   */
  public static readonly STRING = function (arg: string): string {
    return arg;
  };
}

/**
 * 命令树节点类
 */
export class CommandNode {
  // 子节点数组，用于存储后续的命令节点
  public readonly children: CommandNode[] = [];
  // 命令执行函数，用于在命令被触发时执行相应的操作
  public exec: ((source: CommandSource, ...args: any) => void) | undefined = undefined;
  public permission: string | undefined = undefined;

  // 构造函数，初始化命令节点
  public constructor() {}

  /**
   * 设置并返回当前命令节点的权限需求
   *
   * 此方法用于指定当前命令节点所需的特定权限只有具备该权限的用户才能成功执行此命令节点
   * 它通过参数接收一个字符串类型的权限标识符，并将其赋值给当前命令节点的permission属性随后，
   * 其他方法可以检查这个permission属性来判断用户是否有权执行这个命令节点通过返回当前命令节点实例，
   * 这个方法支持链式调用，允许在一行代码中连续设置多个属性或方法
   *
   * @param permission - 要设置的权限标识符，用于限制谁能执行这个命令节点
   * @returns 返回当前命令节点实例，以支持链式调用
   */
  public require(permission: string): CommandNode {
    this.permission = permission;
    return this;
  }

  /**
   * 向当前命令节点添加一个后续节点，并返回当前节点
   * 此方法用于构建命令树，通过链式调用为命令添加子节点
   *
   * @param node 要添加的命令节点
   * @returns {CommandNode} 返回添加的命令节点
   */
  public then(node: CommandNode): CommandNode {
    // 将新的命令节点添加到子节点数组中
    this.children.push(node);
    // 对子节点进行排序，以确保字面量节点在前，参数节点在后
    this.children.sort((a, b) => {
      // 如果a是字面量节点而b是参数节点，则a排在b前面
      if (a instanceof LiteralCommandNode && b instanceof ArgumentCommandNode) return -1;
      // 如果a是参数节点而b是字面量节点，则b排在a前面
      else if (a instanceof ArgumentCommandNode && b instanceof LiteralCommandNode) return 1;
      // 如果两者类型相同，则保持原状，不交换位置
      else return 0;
    });
    // 返回当前实例，以支持链式调用
    return this;
  }

  /**
   * 设置命令节点的执行函数，并返回当前命令节点
   *
   * @param exec 执行函数，当命令被触发时会调用此函数
   * @returns {CommandNode} 返回当前的命令节点，以便进行链式调用
   */
  public execute(exec: (source: CommandSource, ...args: any) => void): CommandNode {
    // 存储传入的执行函数，以便在命令触发时使用
    this.exec = exec;
    // 返回当前命令节点，支持链式调用
    return this;
  }

  /**
   * 解析命令节点
   *
   * 该方法用于解析给定的命令节点数组，根据当前命令节点的配置和子节点来执行相应的操作
   * 它支持执行命令或者根据提供的参数更新命令状态
   *
   * @param nodes 命令节点数组，表示待解析的命令
   * @param source 命令源对象，用于获取执行命令所需的权限和名称
   * @param args 可选参数数组，用于传递给命令执行函数
   * @returns {boolean} 返回布尔值，表示命令是否成功解析和执行
   *
   * @throws 当命令格式无效时抛出错误
   */
  public parse(nodes: string[], source: CommandSource, ...args: any): boolean {
    if (this.permission && !source.hasPermission(this.permission)) {
      source.fail('Permission denied');
      return false;
    }
    // 检查命令节点数组是否为空
    if (nodes.length === 0) {
      // 如果存在执行函数，则调用它，并返回成功标志
      if (this.exec) {
        this.exec(source, ...args);
        return true;
      } else {
        // 如果命令为空或无效，则抛出错误
        source.fail('Invalid command');
        return false;
      }
    }
    // 从命令节点数组中移除最后一个节点，用于进一步解析
    const nodeStr: string | undefined = nodes.pop();
    // 如果移除节点操作导致节点字符串变为undefined，则命令无效，抛出错误
    if (nodeStr === undefined) {
      source.fail('Invalid command');
      return false;
    } else if (this.children.length === 0) {
      // 如果当前节点没有子节点，则命令无效，抛出错误
      source.fail('Invalid command');
      return false;
    } else {
      // 遍历所有子节点，尝试匹配并解析当前节点
      for (let child of this.children) {
        // 如果子节点是字面量命令节点且与当前节点字符串匹配，则递归解析剩余节点
        if (child instanceof LiteralCommandNode && child.toString() === nodeStr) {
          return child.parse(nodes, source, ...args);
        }
        // 如果子节点是参数命令节点，则解码节点字符串并添加到参数列表中，然后递归解析剩余节点
        if (child instanceof ArgumentCommandNode) {
          try {
            args.push(child.decode(nodeStr));
            return child.parse(nodes, source, ...args);
          } catch (e: any) {
            // 如果解码过程中发生错误，则直接抛出
            source.fail(e.message);
            return false;
          }
        }
      }
    }
    // 如果没有匹配的子节点，则解析失败，返回false
    return false;
  }

  /**
   * 判断当前命令节点是否为字面量节点
   *
   * 此方法通过检查当前实例是否为LiteralCommandNode的实例来实现这一点
   * 它用于在命令解析和处理过程中确定节点的类型
   *
   * @returns {boolean} 如果当前节点是字面量节点，则返回true；否则返回false
   */
  public isLiteral(): boolean {
    return this instanceof LiteralCommandNode;
  }
}

/**
 * 表示一个命令节点类，专门处理命令行中的字面量部分
 * 继承自CommandNode，添加了对命令的字面量部分进行识别和处理的能力
 * @extends CommandNode
 */
class LiteralCommandNode extends CommandNode {
  private readonly name: string;

  /**
   * 构造一个新的LiteralCommandNode实例
   *
   * @param {string} name - 字面量命令的名称这是实例的主要标识符
   */
  public constructor(name: string) {
    super();
    this.name = name;
  }

  /**
   * 将当前实例转换为字符串表示
   * 此方法主要用于获取实例的名称属性作为字符串表示，可以在需要转换为字符串的上下文中使用
   *
   * @returns {string} 返回实例的名称属性
   */
  public toString(): string {
    return this.name;
  }
}

/**
 * `ArgumentCommandNode` 类用于处理命令行参数中的特定类型参数。
 * 它继承自 `CommandNode` 类，提供对命令参数的解析和表示功能。
 *
 * @typeparam T 参数解析后的类型。
 * @extends CommandNode
 */
class ArgumentCommandNode<T> extends CommandNode {
  // 参数名称，用于标识该命令参数。
  private readonly name: string;
  // 装饰器函数，用于将字符串参数转换为泛型类型 T。
  private readonly decorator: (value: string) => T;

  /**
   * 构造函数，初始化 `ArgumentCommandNode` 实例。
   *
   * @param name 参数名称，用于在命令行中标识该参数。
   * @param decorator 装饰器函数，用于将字符串值转换为指定的类型 T。
   */
  public constructor(name: string, decorator: (value: string) => T) {
    super();
    this.name = name;
    this.decorator = decorator;
  }

  /**
   * 解析命令行参数字符串，将其转换为类型 T 的值。
   *
   * @param arg 命令行参数字符串。
   * @returns 返回转换后的类型 T 的值。
   */
  public decode(arg: string): T {
    return this.decorator(arg);
  }

  /**
   * 返回该命令参数的字符串表示形式。
   *
   * @returns 返回参数的字符串表示，格式为 `<参数名>`。
   */
  public toString(): string {
    return `<${this.name}>`;
  }
}

/**
 * CommandManager 类用于管理和执行命令
 * 它通过命令节点树的结构来解析和执行特定的命令
 */
export class CommandManager {
  // 命令的前缀字符
  public readonly prefix: string;
  // 根命令节点的集合，使用 Map 来存储多个根节点
  public readonly roots: Map<string, CommandNode> = new Map<string, CommandNode>();

  /**
   * 构造函数初始化 CommandManager 实例
   * @param prefix 命令的前缀字符，默认为 '/'
   */
  public constructor(prefix: string = '/') {
    this.prefix = prefix;
  }

  /**
   * 注册命令节点到指定的命名空间
   * 如果命名空间不存在，则创建一个新的命令节点
   * @param namespace 命令的命名空间，默认为 'gugle-command'
   * @param node 要注册的命令节点
   */
  public register(namespace: string = 'gugle-command', node: CommandNode): void {
    if (!this.roots.has(namespace)) this.roots.set(namespace, new CommandNode());
    this.roots.get(namespace)!.then(node);
  }

  /**
   * 移除指定命名空间的命令节点
   * @param namespace 要移除的命令节点的命名空间
   */
  public remove(namespace: string) {
    this.roots.delete(namespace);
  }

  /**
   * 创建一个字面量命令节点
   * @param name 字面量命令节点的名称
   * @returns 返回创建的字面量命令节点
   */
  public static literal(name: string): LiteralCommandNode {
    return new LiteralCommandNode(name);
  }

  /**
   * 创建一个参数命令节点
   * @param name 参数命令节点的名称
   * @param decorator 参数解析的装饰器函数，用于将字符串参数转换为特定类型
   * @returns 返回创建的参数命令节点
   */
  public static argument<T>(name: string, decorator: (value: string) => T): ArgumentCommandNode<T> {
    return new ArgumentCommandNode(name, decorator);
  }

  /**
   * 执行给定的命令字符串
   * 命令字符串必须以指定的前缀开始，否则抛出错误
   * @param source 命令执行源，用于获取命令执行所需的信息
   * @param commands 要执行的命令字符串
   */
  public execute(source: CommandSource, commands: string): void {
    if (!commands.startsWith(this.prefix)) {
      source.fail('Invalid command');
      return;
    }
    commands = commands.substring(this.prefix.length);
    const nodes = commands.split(' ');
    for (let key of this.roots.keys()) {
      const root = this.roots.get(key);
      if (root!.parse(nodes.reverse(), source)) return;
    }
    source.fail('Invalid command');
  }
}
