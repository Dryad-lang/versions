"use strict";

var interpreter = (function () {
    var _scopeStack = [];
    var _this;
    var _super;
    var _funcs = {LX_PLUS: function(c) { return (interpretExpr(c[0]) + interpretExpr(c[1])); },
		  LX_MINUS: function(c) { return (interpretExpr(c[0]) - interpretExpr(c[1])); },
		  LX_POW: function(c) { return (Math.pow(interpretExpr(c[0]), interpretExpr(c[1]))); },
		  LX_MULT: function(c) { return (interpretExpr(c[0]) * interpretExpr(c[1])); },
		  LX_DIV: function(c) { return (interpretExpr(c[0]) / interpretExpr(c[1])); },
		  LX_MODULO: function(c) { return (interpretExpr(c[0]) % interpretExpr(c[1])); },
		  LX_INC: function(c) { return (setValue(c[0].val, getValue(c[0].val) + 1)); },
		  LX_DEC: function(c) { return (setValue(c[0].val, getValue(c[0].val) - 1)); },

		  LX_OR: function(c) { return (interpretExpr(c[0]) | interpretExpr(c[1])); },
		  LX_XOR: function(c) { return (interpretExpr(c[0]) ^ interpretExpr(c[1])); },
		  LX_AND: function(c) { return (interpretExpr(c[0]) & interpretExpr(c[1])); },
		  LX_NOT: function(c) { return (~interpretExpr(c[0])); },
		  LX_LSHIFT: function(c) { return (interpretExpr(c[0]) << interpretExpr(c[1])); },
		  LX_RSHIFT: function(c) { return (interpretExpr(c[0]) >> interpretExpr(c[1])); },

		  LX_EQ: function(c) { return (interpretExpr(c[0]) == interpretExpr(c[1])); },
		  LX_NEQ: function(c) { return (interpretExpr(c[0]) != interpretExpr(c[1])); },
		  LX_LT: function(c) { return (interpretExpr(c[0]) < interpretExpr(c[1])); },
		  LX_LE: function(c) { return (interpretExpr(c[0]) <= interpretExpr(c[1])); },
		  LX_GT: function(c) { return (interpretExpr(c[0]) > interpretExpr(c[1])); },
		  LX_GE: function(c) { return (interpretExpr(c[0]) >= interpretExpr(c[1])); },

		  LX_ASSIGN: function(c) { return (setValue(c[0].val, interpretExpr(c[1]))); },
		  LX_PLUSSET: function(c) { return (setValue(c[0].val, getValue(c[0].val) + interpretExpr(c[1]))); },
		  LX_MINUSSET: function(c) { return (setValue(c[0].val, getValue(c[0].val) - interpretExpr(c[1]))); },
		  LX_MULTSET: function(c) { return (setValue(c[0].val, getValue(c[0].val) * interpretExpr(c[1]))); },
		  LX_DIVSET: function(c) { return (setValue(c[0].val, getValue(c[0].val) / interpretExpr(c[1]))); },
		  LX_MODULOSET: function(c) { return (setValue(c[0].val, getValue(c[0].val) % interpretExpr(c[1]))); },
		  LX_ANDSET: function(c) { return (setValue(c[0].val, getValue(c[0].val) & interpretExpr(c[1]))); },
		  LX_ORSET: function(c) { return (setValue(c[0].val, getValue(c[0].val) | interpretExpr(c[1]))); },
		  LX_XORSET: function(c) { return (setValue(c[0].val, getValue(c[0].val) ^ interpretExpr(c[1]))); },
		  LX_LSHIFTSET: function(c) { return (setValue(c[0].val, getValue(c[0].val) << interpretExpr(c[1]))); },
		  LX_RSHIFTSET: function(c) { return (setValue(c[0].val, getValue(c[0].val) >> interpretExpr(c[1]))); },

		  LX_LNOT: function(c) { return (0 + !interpretExpr(c[0])); },
		  LX_LOR: function(c) {
		      var val = interpretExpr(c[0]);
		      return (val ? val : interpretExpr(c[1]));
		  },
		  LX_LAND: function(c) {
		      var val = interpretExpr(c[0]);
		      return (!val ? val : interpretExpr(c[1]));
		  },

		  LX_BLOCK: function(c) {
		      var val;
		      pushScope();
		      for (var i in c)
			  val = interpretExpr(c[i]);
		      popScope();
		      return (val);
		  },
		  LX_FUNCALL: function(c) {
		      var f = getValue(c[0].val);
		      var val;

		      if (!f || typeof f != "function" && (typeof f != "object" || !f.name || f.name != "LX_FUNC")) {
			  console.error("Runtime warning: " + c[0].val + " is not a function");
			  return (null);
		      }

		      if (typeof f == "object") {
			  var args = f.children[0].children;
			  if (c.length - 1 < args.length)
			      console.warn("Runtime warning: too few arguments provided to function " + c[0].val);
			  else if (c.length - 1 > args.length)
			      console.warn("Runtime warning: too many arguments provided to function " + c[0].val);
			  pushScope();
			  for (var i = 0; i < args.length; i++)
			      _this[args[i].val] = i + 1 < c.length ? interpretExpr(c[i + 1]) : null;
			  val = interpretExpr(f.children[1]);
			  popScope();
		      } else {
			  var args = [];
			  if (c.length - 1 < f.length)
			      console.warn("Runtime warning: too few arguments provided to function " + c[0].val);
			  else if (c.length - 1 > f.length)
			      console.warn("Runtime warning: too many arguments provided to function " + c[0].val);
			  for (var i = 0; i < f.length; i++)
			      args.push(i + 1 < c.length ? interpretExpr(c[i + 1]) : null);
			  val = f.apply(null, args);
		      }
		      return (val);
		  },

		  LX_IF: function(c) {
		      if (interpretExpr(c[0]))
			  return (interpretExpr(c[1]));
		      return (c.length == 2 ? null : interpretExpr(c[2]));
		  },
		  LX_WHILE: function(c) {
		      var val = null;
		      pushScope();
		      while (interpretExpr(c[0]))
			  val = interpretExpr(c[1]);
		      popScope();
		      return (val);
		  },
		  LX_DO: function(c) {
		      var val = null;
		      pushScope();
		      do
			  val = interpretExpr(c[0]);
		      while (interpretExpr(c[1]));
		      popScope();
		      return (val);
		  },
		  LX_FOR: function(c) {
		      var val = null;
		      pushScope();
		      for (interpretExpr(c[0]); interpretExpr(c[1]); interpretExpr(c[2]))
			  val = interpretExpr(c[3]);
		      popScope();
		      return (val);
		  }
		 }

    function interpreter(ast, externals) {
		if (!ast)
			return (null);
		pushScope();
		defineBuiltins(externals);
		return (interpretExpr(ast));
    }

    function defineBuiltins(externals) {
	_this.cos = Math.cos;
	_this.acos = Math.acos;
	_this.sin = Math.sin;
	_this.asin = Math.asin;
	_this.tan = Math.tan;
	_this.atan = Math.atan;
	_this.atan2 = Math.atan2;
	_this.sqrt = Math.sqrt;
	_this.cbrt = Math.cbrt;
	_this.exp = Math.exp;
	_this.log = Math.log;
	_this.log10 = Math.log10;
	_this.log2 = Math.log2;
	_this.random = Math.random;
	_this.PI = Math.PI;
	_this.E = Math.E;
	
	// Console functions
	_this.ConsoleWrite = function(x) {process.stdout.write(x);};
	_this.ConsoleWriteLine = function(x) {process.stdout.write(x + "\n");};
	_this.ConsoleRead = function() {return (process.stdin.read());};
	_this.ConsoleReadLine = function() {return (process.stdin.read().split("\n")[0]);};
	_this.ConsoleReadKey = function() {return (process.stdin.read(1));};
	_this.ConsoleError = function(x) {process.stderr.write(x);};

		/*
		External functions must be defined as follows:
		"funcName": function(x) { ... }

		{
			"funcName": function(x) { ... },
			...
		}
		*/ 

		// External functions
		if (externals) {
			for (var i in externals) {
				_this[i] = externals[i];
			}
		}
    }

    function interpretExpr(ast) {
	if (["LX_NUMBER", "LX_STRING"].indexOf(ast.name) != -1)
	    return (ast.val);
	if (ast.name == "LX_ID")
	    return (getValue(ast.val));
	if (ast.name == "LX_FUNC")
	    return (ast);
	if (_funcs[ast.name])
	    return (_funcs[ast.name](ast.children));
	return (null);
    }

    function setValue(name, val) {
	for (var i = _scopeStack.length - 1; i >= 0; i--) {
	    if (_scopeStack[i][name] != undefined) {
		_scopeStack[i][name] = val;
		return (val);
	    }
	}
	_this[name] = val;
	return (val);
    }

    function getValue(name) {
	for (var i = _scopeStack.length - 1; i >= 0; i--) {
	    if (_scopeStack[i][name] != undefined)
		return (_scopeStack[i][name]);
	}
	return (undefined);
    }

    function pushScope() {
	_scopeStack.push({});
	_this = _scopeStack[_scopeStack.length - 1];
	_super = _scopeStack[_scopeStack.length - 2];
    }

    function popScope() {
	_scopeStack.pop();
	_this = _super;
	_super = _scopeStack[_scopeStack.length - 2];
    }

    return (interpreter);
} ());

module.exports = interpreter;
