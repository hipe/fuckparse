var sys  = require('sys'),
    util = require('util'),
    log = sys.puts;

var fuckparse = exports;

fuckparse.build = function() { return new Fuckparse(arguments); };

var SyntaxSyntaxError = function(msg) {
  this.name = 'SyntaxSyntaxError';
  this.message = msg;
  Error.captureStackTrace && Error.captureStackTrace(this, SyntaxSyntaxError);
};
util.inherits(SyntaxSyntaxError, Error);

var Parameter = function() {
  this.parameterInit();
};
Parameter.build = function(args){
  var p = new this();
  r = p.applyDefinition(args); // throws syntax error
  return r;
};
Parameter.prototype = {
  parameterInit : function() {
    this.shorts = [];
    this.longs = [];
    this._takesArgument = undefined;
    this._argumentIsRequired = undefined;
    this._argumentLabel = undefined;
    this._defaultIsDefined = undefined;
    this._isNoable = undefined;
    this._default = undefined;
  },
  applyDefinition : function(args) {
    for(var i=0; i < args.length; i++) {
      var arg = args[i], t = typeof(arg);
      if ('string' == t) {
        if (arg.substr(0,1) == '-') {
          this._parseSwitch(arg);
        } else {
          this.desc(arg);
        }
      } else if ('function' == t) {
        this._takeFunction(arg);
      } else if ('object' == t) {
        this._processOpts(arg);
      } else {
        throw new Error("wtf: "+arg);
      }
    }
    this._validate();
    return this; // could be factory later
  },
  desc : function() {
    if (!this._desc) this._desc = [];
    if (arguments.length == 0) return this._desc;
    if (arguments.length == 1) {
      if ('string' == typeof(arguments[0])) {
        this._desc.push(arguments[0]);
      } else {
        for (var i = 0; i < arguments[0].length; i ++)
          this._desc.push(arguments[0][i]);
      }
    } else {
      for (i = 0; i < arguments.length; i++)
        this._desc.push(arguments[i]);
    }
    return null;
  },
  toString : function() {
    return this.getSyntaxTokenLong();
  },
  getSyntaxTokenLong : function() {
    if (this.longs.length) {
      var n = this._isNoable ? '[no-]' : '';
      return '--'+n+ this.longs[this.longs.length-1] + this._longSyntaxTail;
    }
    return getSyntaxTokenShort();
  },
  getSyntaxTokenShort : function() {
    return '-' + this.shorts[this.shorts.length-1] + this._shortSyntaxTail;
  },
  intern : function() {
    return this.longs.length ? this.longs[0] : this.shorts[0];
  },
  _parseSwitch : function(sw) {
    var md;
    if ('--' == sw.substr(0,2)) {
      (md = FuckMeLonger.exec(sw)) && this._processLong(md);
    } else {
      (md = FuckMeShorter.exec(sw)) && this._processShort(md);
    }
    if (!md) throw new SyntaxSyntaxError(
      'doesn\'t look like long or short option: "'+sw+'"'
    );
  },
  _takeFunction : function(f) {
    if (this._f) throw new Error("multiple functions passed in definition.");
    this._f = f;
  },
  _processOpts : function(o) {
    if (o['default']) {
      this._defaultIsDefined = true;
      this._default = o['default'];
    }
  },
  _processLong : function(md) {
    if (md[1]) this._isNoable = true;
         if (md[3]) this._setLong(md[2], true, true, md[3], '=' + md[3]);
    else if (md[4]) this._setLong(md[2], true, true, md[4], ' ' + md[4]);
    else if (md[5]) this._setLong(md[2], true, false, md[5],'[='+ md[5]+']');
    else            this._setLong(md[2], false, false, null, "");
  },
  _setLong : function(stem, takesArg, argRequired, argLabel, syntaxTail){
    var x;
    if (-1 != this.longs.indexOf(stem))
      throw new SyntaxSyntaxError('cannot redefine "--'+stem);

    if (undefined != (x = this._takesArgument) && x != takesArg )
      throw new SyntaxSyntaxError('shape of "--'+stem+'" does not match'+
        ' that of "--'+this.intern()+'" (takes arg/not takes arg).');

    if (undefined != (x = this._argumentIsRequired) && x != argRequired)
      throw new SyntaxSyntaxError('shape of "--'+stem+'" does not match'+
        ' that of "--'+this.intern()+'" (arg required/not required).');

    if (undefined != (x = this._longArgLabel) && x != argLabel)
      throw new SyntaxSyntaxError('shape of "--'+stem+'" does not match'+
        ' that of "--'+this.intern()+'" ('+argLabel+')');

    if (undefined != (x = this._longSyntaxTail) && x != syntaxTail )
      throw new SyntaxSyntaxError('shape of "--'+stem+'" does not match'+
        ' that of "--'+this.intern()+'" ("'+syntaxTail+'")');

    this.longs.push(stem);
    this._takesArgument = takesArg;
    this._argumentIsRequired = argRequired;
    this._longArgLabel = argLabel;
    this._longSyntaxTail = syntaxTail;
  },
  _processShort : function(md) {
    var stem = md[1], argLabel = md[2], x;
    if (-1 != this.shorts.indexOf(stem)) {
      throw new SyntaxSyntaxError('cannot reopen definition of "-'+stem+'"');
    }
    if (argLabel) {
      if (undefined != (x = this._shortArgLabel) && x != argLabel) {
        throw new SyntaxSyntaxError('shape of "-'+stem+'" changed: '+
          'cannot redefine argument label from "'+x+'" to "'+argLabel+'"');
      }
    }
    this.shorts.push(stem);
    if (argLabel) {
      this._shortArgLabel = argLabel;
      this._shortSyntaxTail = ' ' + argLabel;
      this._takesArgument = true;
      this._argumentIsRequired = true;
    } else {
      this._takesArgument = false;
      this._argumentIsRequired = false;
      this._shortSyntaxTail = '';
    }
  },
  _validate : function() {
    if (this.shorts.length == 0 && this.longs.length == 0) {
      throw new SyntaxSyntaxError("a parameter definition must have at least"+
      " one short or long switch");
    }
  }
};
var FuckMeLonger = new RegExp(
  '^--(\\[no-\\])?([^=[\\] ]{2,})'+
  '(?:=(<?[^[ >\\]]+>?)|'+         // --foo=<bar>
  ' (<?[^[ >\\]]+>?)|'+            // --foo <bar>
  '\\[=(<?[^ >]+>?)\\])?$'         // --foo[=<bar>]
);
var FuckMeShorter = new RegExp(
  '^-([a-zA-Z0-9])(?: (<?[^\\[\\] >]+>?))?$'
);
var Command = function() { };
Command.prototype = {
  commandInit : function() {
    this.parameters = {};
    this.shorts = {};
    this.longs = {};
  },
  on : function() {
    param = Parameter.build(arguments);
    if (this.parameters[param.intern()]) {
      throw new Error("no redefining: "+param.intern());
    }
    this.parameters[param.intern()] = param;
  }
};
var Fuckparse = function(args) {
  this.commandInit();
  this.fuckparseInit.apply(this, args);
};
Fuckparse.prototype = {
  fuckparseInit : function(b) {
    if (b) b.apply(this, [this]);
  }
};
Fuckparse.prototype.__proto__ = Command.prototype;
