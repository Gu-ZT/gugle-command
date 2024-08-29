"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandManager = exports.Arguments = void 0;
var Arguments = /** @class */ (function () {
    function Arguments() {
    }
    Arguments.BOOLEAN = function (arg) {
        if (arg === 'true')
            return true;
        if (arg === 'false')
            return false;
        throw new Error("Invalid boolean ".concat(arg));
    };
    Arguments.NUMBER = function (arg) {
        var num = Number(arg);
        if (isNaN(num))
            throw new Error("Invalid number ".concat(arg));
        return num;
    };
    Arguments.STRING = function (arg) {
        return arg;
    };
    return Arguments;
}());
exports.Arguments = Arguments;
var CommandNode = /** @class */ (function () {
    function CommandNode() {
        this.children = [];
        this.exec = undefined;
    }
    CommandNode.prototype.then = function (node) {
        this.children.push(node);
        this.children.sort(function (a, b) {
            if (a instanceof LiteralCommandNode && b instanceof ArgumentCommandNode)
                return -1;
            else if (a instanceof ArgumentCommandNode && b instanceof LiteralCommandNode)
                return 1;
            else
                return 0;
        });
        return this;
    };
    CommandNode.prototype.execute = function (exec) {
        this.exec = exec;
        return this;
    };
    CommandNode.prototype.parse = function (nodes) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (nodes.length === 0) {
            if (this.exec) {
                this.exec.apply(this, args);
                return;
            }
            else {
                throw new Error('Invalid command');
            }
        }
        var nodeStr = nodes.pop();
        if (nodeStr === undefined) {
            throw new Error('Invalid command');
        }
        else if (this.children.length === 0) {
            throw new Error('Invalid command');
        }
        else {
            for (var _a = 0, _b = this.children; _a < _b.length; _a++) {
                var child = _b[_a];
                if (child instanceof LiteralCommandNode && child.toString() === nodeStr) {
                    child.parse.apply(child, __spreadArray([nodes], args, false));
                    return;
                }
                if (child instanceof ArgumentCommandNode) {
                    try {
                        args.push(child.decode(nodeStr));
                        child.parse(nodes, args);
                    }
                    catch (e) {
                        throw e;
                    }
                    return;
                }
            }
        }
    };
    return CommandNode;
}());
var LiteralCommandNode = /** @class */ (function (_super) {
    __extends(LiteralCommandNode, _super);
    function LiteralCommandNode(name) {
        var _this = _super.call(this) || this;
        _this.name = name;
        return _this;
    }
    LiteralCommandNode.prototype.toString = function () {
        return this.name;
    };
    return LiteralCommandNode;
}(CommandNode));
var ArgumentCommandNode = /** @class */ (function (_super) {
    __extends(ArgumentCommandNode, _super);
    function ArgumentCommandNode(name, decorator) {
        var _this = _super.call(this) || this;
        _this.name = name;
        _this.decorator = decorator;
        return _this;
    }
    ArgumentCommandNode.prototype.decode = function (arg) {
        return this.decorator(arg);
    };
    ArgumentCommandNode.prototype.toString = function () {
        return "<".concat(this.name, ">");
    };
    return ArgumentCommandNode;
}(CommandNode));
var CommandManager = /** @class */ (function () {
    function CommandManager(prefix) {
        if (prefix === void 0) { prefix = '/'; }
        this.root = new CommandNode();
        this.prefix = prefix;
    }
    CommandManager.prototype.register = function (node) {
        this.root.then(node);
    };
    CommandManager.prototype.literal = function (name) {
        return new LiteralCommandNode(name);
    };
    CommandManager.prototype.argument = function (name, decorator) {
        return new ArgumentCommandNode(name, decorator);
    };
    CommandManager.prototype.execute = function (commands) {
        if (!commands.startsWith(this.prefix)) {
            throw new Error('Invalid command');
        }
        commands = commands.substring(this.prefix.length);
        var nodes = commands.split(' ');
        console.log(nodes);
        this.root.parse(nodes.reverse());
    };
    return CommandManager;
}());
exports.CommandManager = CommandManager;
