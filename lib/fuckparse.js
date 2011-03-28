/**
* Features: colors, help screen formatting, defaults, (ruby) OptionParser like
* api.
*
*/

var util = require('util'),
    path = require('path');

var fuckparse = exports;

fuckparse.build = function() { return new Fuckparse(arguments); };

// (ary [, lastSep [, sep]] [func])
fuckparse.oxfordComma = function() {
  var args = []; // es muss sein
  for (var i = arguments.length ; i--; ) { args[i] = arguments[i]; }
  var each = ('function' == typeof(args[args.length-1])) ? args.pop() : null;
  var arr = args[0].slice(0); // we pop it below, don't change orig!!
  var sep = args[2] || ', ', lastSep = args[1] || ' and ';
  if (each) { for(i = arr.length; i--;) arr[i] = each(arr[i]); }
  if (arr.length <= 1) return arr[0]; // truly undefined, for now
  var parts = [[arr.pop(), arr.pop()].reverse().join(lastSep)];
  if (arr.length) parts.unshift(arr.join(sep) + sep);
  return parts.join('');
};

fuckparse.oxfordComma.quote = function(s) { return '"' + s + '"'; };

var _e = String.fromCharCode(0x1B);
var color = {
  codes : {'bold':1,'blink':5,'dark_red':31,'green':32,'yellow':33,
    'blue':34,'purple':35,'cyan':36,'white':37,'red':38
  },
  re  : new RegExp(''+_e+'\\[(\\d+(?:,\\d+)*)m', 'g'),
  methods : {
    uncolorize : function(str) {
      return str.replace(color.re, function(){return '';});
    },
    color : function(str) {
      var these = [], c;
      for (var i = 1; i < arguments.length; i++) {
        (c = color.codes[arguments[i]]) && these.push(c.toString());
      }
      return ''+_e+'[' + these.join(';') + 'm' + str + _e + '[0m';
    }
  }
};

fuckparse.color = color;

var table = exports.table = { methods : {} };
table.table = function(rows, m) {
  this.colOpts = m || [];
  this.rows = rows;
  this.defaultSeparator = '';
  this.defaultFillChar = ' ';
};
table.table.prototype = {
  renderTo : function(cout) {
    this.cout = cout;
    this._render();
  },
  toString : function() { return 'table:'+this.rows.length+' rows'; },
  _render : function() {
    if (!this.widths) { this._calculateWidths(); }
    for (var i = 0, j = this.rows.length; i < j; i++) {
      var row = this.rows[i];
      if (row[0] == 'header') {
        this.cout.puts(row[1]);
        continue;
      }
      var rowRender = [];
      for (var k = 1; k < row.length; k++ ) {
        var colOpt = this.colOpts[k-1];
        var align = (colOpt && colOpt.align) || 'right';
        var str = row[k].toString();
        var width = this.widths[k] || 0;
        var add = width - str.length;
        var pad = add ? Array(add+1).join(this.defaultFillChar) : '';
        var useStr = align == 'left' ? (str + pad) : (pad + str);
        if (colOpt && colOpt.padLeft) useStr = colOpt.padLeft + useStr;
        if (colOpt && colOpt.padRight) useStr += colOpt.padRight;
        rowRender[k] = useStr;
      }
      this.cout.puts(rowRender.join(this.defaultSeparator));
    }
  },
  _calculateWidths : function() {
    this.widths = [];
    for (var i = this.rows.length; --i; ) {
      var row = this.rows[i];
      if ('header'==row[0]) continue;
      if (this.widths.length < row.length) {
        for (var k=this.widths.length; k<row.length; k++)
          this.widths[k] = 0;
      }
      for (var j=1; j < row.length; j++) {
        if (row[j] && row[j].toString().length > this.widths[j]) {
          this.widths[j] = row[j].toString().length;
        }
      }
    }
  }
};
table.methods.render = function(rows, colsOpts, cout) {
  var tt = new table.table(rows, colsOpts);
  tt.renderTo(cout);
};

// see implementation file.  this whole thing gets memoized.
var Templite = exports.Templite = {
  buildIfLooksLikeTemplate : function() {
    return this._lazyLoad('buildIfLooksLikeTemplate', arguments);
  },
  _lazyLoad : function(fname, args) {
    Templite = exports.Templite = require('./fuckparse/templite').Templite;
    return Templite[fname].apply(Templite, args);
  }
};

var SyntaxSyntaxError = function(msg) {
  this.name = 'SyntaxSyntaxError';
  this.message = msg;
  Error.captureStackTrace && Error.captureStackTrace(this, SyntaxSyntaxError);
};
exports.SyntaxSyntaxError = SyntaxSyntaxError; // for lib/
util.inherits(SyntaxSyntaxError, Error); // @todo what does this do exactly

/**
 * setter/getter for description strings for things.
 *
 * Inspired by ruby OptionParser, description strings are allowed to be
 * specified as arrays of strings so the author can have control
 * over how the description string is broken up across lines.
 * In practice this is more optimal than dynamic truncation and
 * "ellipsification" of strings
 *
 *   as getter:
 * When used as a getter, always returns an array.
 * This array should not be modified!  Whether or not it is a reference
 * to the original is undefined.
 *
 *   as setter:
 * If setter is passed one element,
 * it should be an array of strings or a string.  If passed more than
 * one argument it is assumed to be a list of strings.
 * These strings are appended to any existing description array.
 *
 * Experimentally the strings can contain {variables} that will expand
 * to the value of methods or properties of the Command object.
 *
 */
var commonDesc = exports.commonDesc = function() {
  var i, t;
  if (!this._desc) this._desc = []; // makes life easier :(
  if (arguments.length == 0) {
    if (!this._desc._checkedForTemplates) {
      for (i = this._desc.length; i--; ) {
        if ((t = Templite.buildIfLooksLikeTemplate(this._desc[i]))) {
          this._desc[i] = t;
          this._desc._hasTemplates = true;
        }
      }
      this._desc._checkedForTemplates = true;
    }
    if (this._desc._hasTemplates) {
      var map = new Array(this._desc.length);
      for (i = this._desc.length; i--; ) {
        map[i] = this._desc[i]._isTemplite ?
          this._desc[i].run(this) : this._desc[i];
      }
      return map;
    }
    return this._desc;
  }
  if (arguments.length == 1) {
    if ('string' == typeof(arguments[0])) {
      this._desc.push(arguments[0]);
    } else {
      for (i = 0; i < arguments[0].length; i ++)
        this._desc.push(arguments[0][i]);
    }
  } else {
    for (i = 0; i < arguments.length; i++)
      this._desc.push(arguments[i]);
  }
  return null;
};

var OptionalParameter = function() {
  this.optionalParameterInit();
};
OptionalParameter.build = function(args){
  var p = new this();
  r = p.applyDefinition(args); // throws syntax error
  return r;
};
OptionalParameter.prototype = {
  _isOptionalParameter : true,
  optionalParameterInit : function() {
    this.shorts = [];
    this.longs = [];
    this._takesArgument = undefined;
    this._isRepeatable = undefined;
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
    this._validateDefinition();
    return this; // could be factory later
  },
  isRepeatable : function() { return this._isRepeatable; },
  takesArgument : function() { return this._takesArgument; },
  argumentIsRequired : function() { return this._argumentIsRequired; },
  isNoable : function() { return this._isNoable; },
  hasFunction : function(){ return !! this._f; },
  getFunction : function(){ return this._f; },
  desc : commonDesc,
  'default' : function() { return this._default; },
  toString : function() {
    return this.getLongestSyntax();
  },
  getLongSyntaxAt : function(i) {
    var len = this.longs.length;
    if (0==len) return undefined;
    if (undefined == i || -1 == i || i >= len) i = len-1;
    else if (i < 0) i = 0;
    var n = this._isNoable ? '[no-]' : '';
    return '--'+n+ this.longs[i] + this._longSyntaxTail;
  },
  getShortSyntaxAt : function(i) {
    var len = this.shorts.length;
    if (0==len) return undefined;
    if (undefined == i || -1 == i || i >= len) i = len-1;
    else if (i < 0) i = 0;
    return '-' + this.shorts[i] + this._shortSyntaxTail;
  },
  getLongestSyntax : function() {
    if (this.longs.length) return this.getLongSyntaxAt();
    return this.getShortSyntaxAt();
  },
  getShortestSyntax : function() {
    if (this.shorts.length) return this.getShortSyntaxAt();
    return this.getLongSyntaxAt();
  },
  getShortSyntaxDesc : function() {
    return this._getSyntaxDesc('shorts');
  },
  getLongSyntaxDesc : function() {
    return this._getSyntaxDesc('longs');
  },
  _getSyntaxDesc : function(which) {
    var them = this[which], a = [], dash = (('shorts'==which) ? '-' : '--');
    if (0==them.length) return '';
    for (var i = 0, last = them.length - 2; i <= last; i++) {
      a.push(dash + them[i]);
    }
    a.push(this['shorts'==which ? 'getShortSyntaxAt' : 'getLongSyntaxAt']());
    return a.join(',');
  },
  intern : function() {
    return this.longs.length ? this.longs[0] : this.shorts[0];
  },
  casual : function() {
    return this.longs.length ? ('--'+this.longs[0]) : ('-'+this.shorts[0]);
  },
  label : function() {
    var str = this.intern().replace(/[_-]/g, ' ');
    return str.length > 1 ? str : null;
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
    if (this._f) throw new SyntaxSyntaxError(
      "Cannot pass more than one function in definition.");
    this._f = f;
  },
  _processOpts : function(o) {
    if (o['list']) {
      if (o['default']) throw new SyntaxSyntaxError("for now, list-type ",
      "parameters cannot have default arguments.");
      this._isRepeatable = true;
    }
    if (o['default']) {
      if (!this.takesArgument()) throw new SyntaxSyntaxError("cannot define"+
      " defaults unless the parameter takes an argument.");
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
        ' that of "'+this.casual()+'" (takes arg/not takes arg).');

    if (undefined != (x = this._argumentIsRequired) && x != argRequired)
      throw new SyntaxSyntaxError('shape of "--'+stem+'" does not match'+
        ' that of "'+this.casual()+'" (arg required/not required).');

    if (undefined != (x = this._longArgLabel) && x != argLabel)
      throw new SyntaxSyntaxError('shape of "--'+stem+'" does not match'+
        ' that of "'+this.casual()+'" ('+argLabel+'/'+this._longArgLabel+')');

    if (undefined != (x = this._longSyntaxTail) && x != syntaxTail )
      throw new SyntaxSyntaxError('shape of "--'+stem+'" does not match'+
        ' that of "'+this.casual()+'" ("'+syntaxTail+'")');

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
    if (undefined != (x = this._shortArgLabel) && x != argLabel) {
      throw new SyntaxSyntaxError('shape of "-'+stem+'" changed: '+
        'cannot redefine argument label from "'+x+'" to "'+argLabel+'"');
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
  _validateDefinition : function() {
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

var PositionalParameter = function() { };

var _name = '<([_a-zA-Z0-9][-_a-zA-Z0-9]*)>|([_a-zA-Z0-9][-_a-zA-Z0-9]*)';

PositionalParameter.nameRegex = new RegExp(
  "^\\[("+_name+")(\\s*\\[\\s*\\1\\s*\\[\\.\\.\\.?\\]\\])?\\]$|" +
  "^("+_name+")(\\s*\\[\\s*\\5\\s*\\[\\.\\.\\.?\\]\\])?$");

PositionalParameter.build = function(argumentz) {
  var p = new PositionalParameter();
  var argsArr = new Array(argumentz.length); // we need arguments as an Array
  for (var i = argumentz.length; i--; ) { argsArr[i] = argumentz[i]; }
  r = p._applyDefinition(argsArr); // throws syntax error
  return r;
};

PositionalParameter.prototype = {
  _isPositionalParameter : true,
  toString : function() {
    return this._intern + '{' + this._min + (this._isGlob ? ',' : '') + '}';
  },
  intern : function() { return this._intern; },
  isRequired : function() { return (this._min > 0); },
  syntaxString : function() { return this._syntaxString; },
  syntaxName   : function() { return this._syntaxName; },
  desc : commonDesc,
  label : function() { // ick for now same as ..
    var str = this.intern().replace(/[_-]/g, ' ');
    return str.length > 1 ? str : null;
  },
  _applyDefinition : function(args) {
    var s, opts;
    this._parseName(args.shift());
    this._desc = [];
    while ((m = args.shift())) {
      switch (typeof(m)) {
        case 'string' : this._desc.push(m); break;
        case 'object' :
          if (opts) throw new SyntaxSyntaxError("can't specify more than one" +
          ' options object for "'+this._intern+'"!');
          opts = m;
          break;
        default :
          throw new SyntaxSyntaxError('don\'t know what to do with "'+m+'"'+
            ' for '+this._intern);
      }
    }
    if (opts) this._processOpts(opts);
    return this; // allow factory method
  },
  _parseName : function(mixed) {
    if ('string' != typeof(mixed)) {
      throw new SyntaxSyntaxError(
        "needed string for first argument, had: "+mixed);
    }
    var md = PositionalParameter.nameRegex.exec(mixed);
    if (!md) throw new SyntaxSyntaxError(
      'invalid argument definition string: "'+mixed+'" -- expecting '+
      '"<foo>", "[<foo>]", "<foo>[<foo>[..]]" or "[<foo>[<foo>[..]]]"'
    );
    this._syntaxString = md[0];
    if (md[1]) {
      this._min = 0;
      this._syntaxName = md[1];
      this._intern = md[3] || md[2];
      if (md[4]) {
        this._isGlob = true;
      }
    } else {
      this._min = 1;
      this._syntaxName = md[5];
      this._intern = md[7] || md[6];
      if (md[8]) {
        this._isGlob = true;
      }
    }
  },
  _processOpts : function(opts) {
    var i;
    for (i in opts) {
      switch (i) {
        case 'default' : this._setDefault(opts[i]); break;
        default : throw new SyntaxSyntaxError(
          'invalid option for a positional parameter (' +
          this._syntaxName +'): "'+i+'"');
      }
    }
  },
  _setDefault : function(value) {
    if (0 != this._min) throw new SyntaxSyntaxError('it doesn\'t make sense '+
      'to define a default value for required parameter "'+
        this.syntaxString()+'"');
    this._defaultIsDefined = true;
    this._default = value;
  },
  'default' : function() { return this._default; } // for templates
};


/**
 * The Execution context is alive through the lifecycle of the request,
 * as it changes hands through the entrypoint command and any
 * sub-commands.  It has a handle to the stderr and any stdout stream,
 * and a Request object, which holds the result values of the parsed
 * arguments as they get processed progressively.
 */
var ExecutionContext = (exports.ExecutionContext = function(){});
ExecutionContext.prototype = {
  toString : function() {
    return  'ExecutionContext:{parse:' + this.parse.toString() +
              ',request:' + this.request.toString()+'}';
  },
  out     : require('util'), // haha w/e
  err     : require('util'), // w/e w/e
  request : null, // set this at the earliest processing of the actual args
  parse   : null, // experimental

  programName : function() {
    if (!this.parse) return null;
    return this.parse.programName();
  }
};


/**
 * The state of a Command object should not change during the execution of
 * a request.  Any data required for the parsing and dispatching of a command
 * is held here and disposed of *before* the or the request is returned and/or
 * request is executed (parse() vs. run()).
 *
 * Experimentally this may hold configurable settings that alters the way
 * argv is parsed, e.g. ignore unrecognized flags, stop on unrecognized flags,
 * whether or not to alter the original passed argv array.  Not yet implemented.
 */
var Parse = (exports.Parse = function(cmd, executionContext) {
  this.ec = executionContext;
  this.cmd = cmd;
});

Parse.prototype = {
  i        : 0,     // the current offset into argv that you're about to parse
  _consume : true,  // remove elements as you process them from argv @todo
  //_stopOnDashDash : true, // @todo implement
  _skipOverUnparsableOptions : false, // @todo setters.  This setting
    // has no meaning if the command interface defines any arguments.

  toString : function() {
    return 'Parse:{i:'+this.i+',cmd:'+this.cmd.toString()+'}';
  },
  // this is the entrypoint parse
  parse : function(argv) {
    this.argv = this._consume ? argv : argv.slice(0);
    this._interpreterName = this.argv.shift();
    this._programName = this.argv.shift();
    return this.parseCommand();
  },
  parseCommand : function() {
    if (! this._parseOpts() || ! this._parseArgs()) return false;
    this._applyDefaults();
    return this.ec.request;
  },
  programName : function() {
    return path.basename(this._programName);
  },
  _parseOpts : function() {
    while (this.i < this.argv.length) {
      var curTok = this.argv[this.i];
      if ('-' == curTok.substr(0,1)) {
        if (!this._parseOpt(curTok)) return false;
      } else if (this.cmd.hasPositionalParameters()) {
        return true;
      } else if (this._skipOverUnparsableOptions) {
        this.i++;
        continue;
      } else {
        return this.cmd.handleUnexpectedArgument(curTok, this.ec);
      }
    }
    return true;
  },
  _parseOpt : function(tok) {
    var md = (/^(-(?:-([^=]+)|([^=]*)))(?:=(.+)|(.*))$/).exec(tok); //ballsy
    var asUsed = md[1], longStem = md[2], shortStem = md[3], eqArg = md[4],
      xtra = (md[5] || ''), eachStem, eachAsUsed, i, last;
    var useLong = undefined == longStem ? null : (longStem + xtra);
    var useShort = undefined == shortStem ? null : (shortStem + xtra);
    var which = null == useShort ? 'longs' : 'shorts';
    if ('longs' == which) {
      eachStem = [useLong]; eachAsUsed = [asUsed];
    } else {
      md = (/^([^0-9]*)(.*)$/).exec(useShort);
      if (md[1].length > 0 && md[2].length > 0) {
          // haha -xkcd20=xd6 fml
        if (eqArg) return this.cmd.handleAmbiguousDelim(md[2], eqArg, this.ec);
        useShort = md[1]; eqArg = md[2];
      }
      eachStem = useShort == '' ? [''] : useShort.split('');
      eachAsUsed = Array(eachStem.length);
      for (i=eachStem.length; i--;) eachAsUsed[i] = '-'+eachStem[i];
    }
    var hashLookup = this.cmd[which+'Hash'], r;
    for (i = 0, last = eachStem.length-1; i <= last; i++) {
      var stem = eachStem[i], paramIdx = hashLookup[stem], p;
      asUsed = eachAsUsed[i];
      if (undefined == paramIdx){
        if (!(p = this.cmd._getOfficious(useShort || useLong, which))) {
          return this.cmd.handleUnrecognizedOption(asUsed, this.ec);
        }
      } else {
        p = this.cmd.parameters[paramIdx];
      }
      r = this._parseArgvWithOptParam(p, asUsed, i == last ? eqArg : undefined);
      if (!r) return r;
    }
    return r; // should not be semantic only bool true here
  },
  _parseArgvWithOptParam : function(p, asUsed, eqArg) {
    var useValue = undefined, consumeAmt = 1;
    if (undefined == eqArg) {
      if (p.takesArgument()) {
        if (this.i < (this.argv.length - 1) &&
          '-' != this.argv[this.i + 1].substr(0,1)) {
            consumeAmt += 1;
            useValue = this.argv[this.i +1];
        } else if (p.argumentIsRequired()) {
          return this.cmd.handleMissingRequiredOptionArgument(asUsed, this.ec);
        }
      }
    } else {
      if (!p.takesArgument())
        return this.cmd.handleUnexpectedOptionArgument(eqArg, asUsed, this.ec);
      useValue = eqArg;
    }
    if (!this._acceptOptionalParamValue(p, useValue, asUsed)) return false;
    while (consumeAmt--) this.argv.shift();
    return true;
  },
  _acceptOptionalParamValue : function(p, useValue, asUsed) {
    var req = this.ec.request;
    if (-1 == req.keys.indexOf(p.intern())) {
      req.keys.push(p.intern());
      if (p.isRepeatable()) {
        if (p.takesArgument()) {
          req.values[p.intern()] = [];
        } else {
          req.values[p.intern()] = 0;
        }
      }
    }
    if (p.isRepeatable()) {
      if (p.takesArgument()) {
        req.values[p.intern()].push(useValue || true);
      } else {
        req.values[p.intern()] += 1;
      }
    } else {
      req.values[p.intern()] = useValue || true;
    }
    if (p.hasFunction() && false ==
      p.getFunction().call(this.ec, useValue || true, p, asUsed)) return false;
    return true;
  },
  _parseArgs : function() {
    var p;
    this.ii = 0; // the index into the parameters queue
    var parameters = this.cmd.buildPositionalParametersQueue();
    while (this.i < this.argv.length && this.ii < parameters.length) {
      p = parameters[this.ii];
      this._acceptPositionalParamValue(p); // always ok, advances counters
    }
    for ( ; this.ii < parameters.length; this.ii ++) {
      p = parameters[this.ii];
      if (p._min > 0) {
        if (-1 != this.ec.request.keys.indexOf(p.intern())) continue;
          // above is for globs. they don't advance ii.
        return this.cmd.handleMissingRequiredPositional(p, this.ec);
      }
    }
    if (this.i < this.argv.length && ! this.cmd._unparsableOk) {
      return this.cmd.handleUnexpectedArgument(this.argv[this.i], this.ec);
    }
    return true;
  },
  _acceptPositionalParamValue : function(p) {
    var value = this.argv[this.i]; // should always exist
    var req = this.ec.request;
    if (-1 == req.keys.indexOf(p.intern())) {
      req.keys.push(p.intern());
      if (p._isGlob) {
        req.values[p.intern()] = [value];
      } else {
        req.values[p.intern()] = value;
        this.ii ++;
      }
    } else if (p._isGlob) {
      req.values[p.intern()].push(value);
    } else {
      throw new RuntimeError("unexpected clobber, value already exists for "+
        '"' + this.intern() + '"');
    }
    this.i ++;
  },
  _applyDefaults : function() {
    var parameters = this.cmd.parameters, req = this.ec.request, p;
    for (var i = parameters.length; i--; ) {
      if (!parameters[i]._defaultIsDefined) continue;
      p = parameters[i];
      if (-1 != req.keys.indexOf(p.intern())) continue;
      req.values[p.intern()] = p._default;
      req.keys.push(p.intern());
    }
  }
};

/**
 * a Command is a syntactic and declarative structure that represents
 * the shape of the command in terms of its options and arguments.  It should
 * not change state throughout the processing of a request.
 *
 * It has handler methods for all the UI-level error messages that the
 * library can emit.  These are high up in the API here so the client can more
 * easily override them.
 */
var Command = exports.Command = function(){ };

Command.prototype = {
  toString : function() {
    s = 'Command';
    if (this._intern) s += '{intern:'+(this._intern)+'}';
    else s += ':[root]';
    return s;
  },
  desc : commonDesc,
  _unparsableOk : false, // can get set to true by extensions
  commandInit : function() {
    this.parameters = [];
    this.paramsHash = {};
    this.shortsHash = {};
    this.longsHash = {};
    this.officious = { // set officious.enabled.help = false
      enabled : { help : true }, list   : ['help'],
      longs   : { help : 0    }, shorts : { h : 0 }
    };
  },
  on : function() {
    if (arguments[0] && arguments[0].substr && '-' != arguments[0].substr(0,1)){
      require('./fuckparse/subcommand'); // @lazy-load
      return this._processSubcommandDefinition(arguments);
    }
    var param = OptionalParameter.build(arguments);
    var paramIdx = this._addParam(param);
    var which = ['shorts', 'longs'], w;
    for (w = which.length; w--;) { // @todo refactor after unit tests
      for (var i = param[which[w]].length; i--;) {
        if (this[which[w]+'Hash'][param[which[w]][i]])
          throw new SyntaxSyntaxError("cannot redefine -"+
            ('longs'==which[w]?'-':'')+param[which[w]][i]);
        this[which[w]+'Hash'][param[which[w]][i]] = paramIdx;
      }
    }
    return param;
  },
  arg : function() {
    if (this._beforeArgHooks && ! this._beforeArgHooks(arguments)) return false;
    var param = PositionalParameter.build(arguments), errmsg;
    if (this._lastArg) {
      if (this._lastArg._isGlob)
        errmsg = 'a glob argument can only exist as the last argument';
      else if (0 == this._lastArg._min && 0 != param._min)
        errmsg = 'a required parameter cannot follow an optional parameter';
      if (errmsg) throw new SyntaxSyntaxError('Invalid syntax sequence: '+
        '"' + this._lastArg.syntaxString() + ' ' + param.syntaxString() + '": '+
        errmsg);
    }
    this._lastArg = param;
    this._addParam(param);
    return param;
  },
  parse : function(argv) {
    return this.buildExecutionContext().parse.parse(argv);
  },
  buildExecutionContext : function() {
    var ec = new ExecutionContext();
    ec.request = new Request();
    ec.parse = new Parse(this, ec);
    return ec;
  },
  buildPositionalParametersQueue : function() {
    var arr = [];
    for (var i = 0; i < this.parameters.length; i++) {
      if (this.parameters[i]._isPositionalParameter)
        arr.push(this.parameters[i]);
    }
    return arr;
  },
  hasPositionalParameters : function() {
    for (var i = 0; i < this.parameters.length &&
      ! this.parameters[i]._isPositionalParameter; i++);
    return i < this.parameters.length;
  },
  // output formatting & display
  handleUnrecognizedOption : function(asUsed, ec) {
    return this._error('Unrecognized option '+asUsed, ec);
  },
  handleUnexpectedOptionArgument : function(eqArg, asUsed, ec) {
    return this._error(
      'Unexpected argument "'+eqArg+'" '+'for '+asUsed, ec);
  },
  handleMissingRequiredOptionArgument : function(asUsed, ec) {
    return this._error('Missing required argument for "'+
      asUsed+'"', ec);
  },
  handleAmbiguousDelim : function(a, b, ec) {
     return this._error("Ambiguous parameter/argument "+
     'delimiter: "'+a+'", "'+b+'"', ec);
  },
  handleUnexpectedArgument : function(curTok, ec) {
    return this._error('Unexpected argument: "'+curTok+'"', ec);
  },
  // client can override this and call the other for ad-hoc logic
  handleMissingRequiredPositional : function(p, ec) {
    return this._handleMissingRequiredPositional(p, ec);
  },
  _handleMissingRequiredPositional : function(p, ec) {
    return this._error("expecting "+p.syntaxName(), ec);
  },
  _error : function(msg, ctx) {
    msg && ctx.err.puts(msg);
    ctx.err.puts(this.strong('usage: ') + this.usage(ctx));
    var str;
    (str = this.invite(ctx)) && ctx.err.puts(str);
    return false; // important
  },
  _addParam : function (param) {
    if (undefined != this.paramsHash[param.intern()]) {
      throw new SyntaxSyntaxError("no redefining: "+param.intern());
    }
    var paramIdx = this.parameters.length;
    this.parameters[paramIdx] = param;
    this.paramsHash[param.intern()] = paramIdx;
    return paramIdx;
  },
  color : color.methods.color,
  tableize : table.methods.render,
  strong : function(s) { return this.color(s, 'bold', 'green'); },
  printHelp : function(ctx) {
    ctx.err.puts(this.strong('usage: ') + this.usage(ctx));
    if (this._desc && this._desc.length) this._printDesc(ctx);
    var rows = [];
    var o, a, i, j, p;
    for (i=0; i<this.parameters.length; i++) {
      p = this.parameters[i];
      if (! p._isOptionalParameter) continue;
      if (!o) (o = 1) && rows.push(['header', this.strong('options:')]);
      var descLines = p.desc();
      if (descLines.length == 0) descLines = [p.label() || ''];
      rows.push(['row', (p.getShortSyntaxDesc() || ''),
        (p.getLongSyntaxDesc() || ''), descLines[0]]);
      for (j = 1; j < descLines.length; j++) {
        rows.push(['row', '', '', descLines[j]]);
      }
    }
    this._argumentsHelp(rows);
    this.renderHelpTable(rows, ctx);
  },
  _printDesc : function(ctx) {
    var lines = this.desc();
    switch (lines.length) {
      case 0 : break;
      case 1 : ctx.err.puts(this.strong('description: ') + lines[0]); break;
      default :
        ctx.err.puts(this.strong('description:'));
        for (var i = 0; i < lines.length; i++)
          ctx.err.puts(lines[i]);
        break;
    }
  },
  renderHelpTable : function(rows, ctx) {
    this.tableize(rows,
      [{align:'right', padRight:'   ', padLeft:' '},
       {align:'left',  padRight:'      '},
       {align:'left'}
      ], ctx.err);
  },
  _argumentsHelp : function(rows) {
    var a = false;
    for (var i=0 ; i < this.parameters.length; i++) {
      var p = this.parameters[i];
      if (! p._isPositionalParameter) continue;
      if (!a) (a = 1) && rows.push(['header', this.strong('arguments:')]);
      descLines = p.desc();
      if (descLines.length == 0) descLines = [p.label() || ''];
      rows.push(['row','',p.syntaxName(), descLines[0]]);
      for (var j = 1; j < descLines.length; j++) {
        rows.push(['row', '', '', descLines[j]]);
      }
    }
  },
  getInterpreterName : function() {
    return this._interpreterName;
  },
  usage : function(ctx) {
    var parts = [], opts = [], args = [], p, i;
    for (i = 0; i < this.parameters.length; i++) {
      p = this.parameters[i];
      if (! p._isOptionalParameter) continue;
      opts.push('['+p.getShortestSyntax()+']');
    }
    for (i = 0; i < this.parameters.length; i++) {
      p = this.parameters[i];
      if (! p._isPositionalParameter) continue;
      args.push(p.syntaxString());
    }
    parts.push(this._invocationString(ctx));
    if (opts.length) parts.push(opts.join(' '));
    if (args.length) parts.push(args.join(' '));
    return parts.join(' ');
  },
  _invocationString : function(ctx) {
    return ctx.programName();
  },
  invite : function(ctx) {
    if (this.officious.enabled.help)
      return this.strong(this._invocationString(ctx)+' -h')+' for help.';
  },
  _getOfficious : function(stem, shortsOrLongs) {
    var idx = this.officious[shortsOrLongs][stem];
    if (undefined == idx) return null;
    var name = this.officious.list[idx];
    if (! this.officious.enabled[name]) return null;
    return this[name+'OfficiousCommand'](); // e.g. helpOfficiousCommand()
  },
  helpOfficiousCommand : function() {
    if (!this._helpOfficiousCommand) {
      var cmd = this;
      this._helpOfficiousCommand = this.on('-h', '--help', 'this screen',
        function(){ return cmd.onHelp(this); });
    }
    return this._helpOfficiousCommand;
  },
  onHelp : function(ctx) {
    this.printHelp(ctx);
    return false; // don't do any further processing, we are done.
  }
};

var Request = function() {
  this.keys = [];
  this.values = {};
};
Request.prototype = {
  toString : function() {
    var a = [];
    for (var i=0; i < this.keys.length; i++)
      a.push(this.keys[i]+':'+this.values[this.keys[i]]); // not json
    return 'Request:{'+a.join(',')+'}';
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
