/**
* Features: colors, help screen formatting, defaults, (ruby) OptionParser like
* api.
*
*/

var sys  = require('sys'),
    util = require('util'),
    path = require('path'),
    Puts = sys.puts;

var fuckparse = exports;

fuckparse.build = function() { return new Fuckparse(arguments); };

// (ary [, lastSep [, sep]] [func])
fuckparse.oxfordComma = function() {
  var args = []; // es muss sein
  for (var i = arguments.length ; i--; ) { args[i] = arguments[i]; }
  var each = ('function' == typeof(args[args.length-1])) ? args.pop() : null;
  var sep = args[2] || ', ', lastSep = args[1] || ' and ', arr = args[0];
  if (each) { for(i = arr.length; i--;) arr[i] = each(arr[i]); }
  if (arr.length <= 1) return arr[0]; // truly undefined, for now
  var parts = [[arr.pop(), arr.pop()].reverse().join(lastSep)];
  if (arr.length) parts.push(arr.join(sep));
  return parts.join(' ');
};

fuckparse.oxfordComma.quote = function(s) { return '"' + s + '"'; };

var Color = {
  codes : {'bold':1,'blink':5,'dark_red':31,'green':32,'yellow':33,
    'blue':34,'purple':35,'cyan':36,'white':37,'red':38
  },
  esc : String.fromCharCode(0x1B), // in ruby/php we could do "\e"
  methods : {
    color : function(str) {
      var these = [], c;
      for (var i = 1; i < arguments.length; i++) {
        (c = Color.codes[arguments[i]]) && these.push(c.toString());
      }
      return Color.esc +'[' + these.join(';') + 'm' + str + Color.esc + '[0m';
    }
  }
};

var Table = { methods : {} };
Table.table = function(rows, m) {
  this.colOpts = m || [];
  this.rows = rows;
  this.defaultSeparator = '';
  this.defaultFillChar = ' ';
};
Table.table.prototype = {
  renderTo : function(cout) {
    this.cout = cout;
    this._render();
  },
  toString : function() { return 'Table:'+this.rows.length+' rows'; },
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
Table.methods.render = function(rows, colsOpts, cout) {
  var tt = new Table.table(rows, colsOpts);
  tt.renderTo(cout);
};

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
  desc : function() {
    if (arguments.length == 0) return (this._desc || []);
    if (!this._desc) this._desc = [];
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
  getLabel : function() {
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
    if (this._f) throw new Error("multiple functions passed in definition.");
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
var Command = function() { };
Command.prototype = {
  commandInit : function() {
    this.parameters = [];
    this.paramsHash = {};
    this.shortsHash = {};
    this.longsHash = {};
    this.c = { err : sys }; // execution context, (cout, cerr, request)
    this._consume = true; // alters the argv passed to parse(), @todo setters
    this._skipOverUnparsableArguments = false; // @todo setters
    this.officious = { // set officious.enabled.help = false
      enabled : { help : true }, list   : ['help'],
      longs   : { help : 0    }, shorts : { h : 0 }
    };
    this._stopOnDashDash = true; // @todo implement
    this.request = null; // not set unless anything is parsed or set
      // via defaults
  },
  on : function() {
    param = Parameter.build(arguments);
    if (undefined != this.paramsHash[param.intern()]) {
      throw new SyntaxSyntaxError("no redefining: "+param.intern());
    }
    var paramIdx = this.parameters.length;
    this.parameters[paramIdx] = param;
    this.paramsHash[param.intern()] = paramIdx;
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
  parse : function(args) {
    this.argv = this._consume ? args : args.slice(0);
    this._interpreterName = this.argv.shift();
    this._programName = this.argv.shift();
    if (!this._parseOpts()) return false;
    this._applyDefaults();
    return this.c.request;
  },
  _parseOpts : function() {
    this.i = 0;
    while (this.i < this.argv.length) {
      var curTok = this.argv[this.i];
      var chr = curTok.substr(0,1);
      if ('-' == chr) {
        if (!this._parseOpt(curTok)) return false;
      } else {
        if (this._skipOverUnparsableArguments) {
          this.i++;
          continue;
        } else {
          return this._parseOptError('Unexpected argument: "'+curTok+'"');
        }
      }
    }
    return true;
  },
  _applyDefaults : function() {
    var p, r;
    for (var i = this.parameters.length; i--; ) {
      if (!this.parameters[i]._defaultIsDefined) continue;
      p = this.parameters[i];
      r = this.c.request || (this.c.request = new Request());
      if (-1 != r.keys.indexOf(p.intern())) continue;
      r.values[p.intern()] = p._default;
      r.keys.push(p.intern());
    }
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
        if (eqArg) return this._parseOptError("Ambiguous parameter/argument "+
          'delimiter: "'+md[2]+'", "'+eqArg+'"'); // haha -xkcd20=xd6 fml
        useShort = md[1]; eqArg = md[2];
      }
      eachStem = useShort == '' ? [''] : useShort.split('');
      eachAsUsed = Array(eachStem.length);
      for (i=eachStem.length; i--;) eachAsUsed[i] = '-'+eachStem[i];
    }
    var hashLookup = this[which+'Hash'], r;
    for (i = 0, last = eachStem.length-1; i <= last; i++) {
      var stem = eachStem[i], paramIdx = hashLookup[stem], p;
      asUsed = eachAsUsed[i];
      if (undefined == paramIdx){
        if (!(p = this._getOfficious(useShort || useLong, which))) {
          return this._parseOptError('Unrecognized option '+asUsed);
        }
      } else {
        p = this.parameters[paramIdx];
      }
      r = this._parseArgvWithParam(p, asUsed, i == last ? eqArg : undefined);
      if (!r) return r;
    }
    return r; // should not be semantic only bool true here
  },
  _parseArgvWithParam : function(p, asUsed, eqArg) {
    var useValue = undefined, consumeAmt = 1;
    if (undefined == eqArg) {
      if (p.takesArgument()) {
        if (this.i < (this.argv.length - 1) &&
          '-' != this.argv[this.i + 1].substr(0,1)) {
            consumeAmt += 1;
            useValue = this.argv[this.i +1];
        } else if (p.argumentIsRequired()) {
          return this._parseOptError('missing required argument for "'+
            asUsed+'"');
        }
      }
    } else {
      if (!p.takesArgument()) return this._parseOptError(
        'Unexpected argument "'+eqArg+'" '+'for '+asUsed);
      useValue = eqArg;
    }
    if (!this._acceptParamValue(p, useValue, asUsed)) return false;
    while (consumeAmt--) this.argv.shift();
    return true;
  },
  _acceptParamValue : function(p, useValue, asUsed) {
    var req = this.c.request || ( this.c.request = new Request() );
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
      p.getFunction().call(this, useValue || true, p, asUsed)) return false;
    return true;
  },
  _parseOptError : function(msg) {
    var i;
    msg && this.c.err.puts(msg);
    this.c.err.puts(this.strong('usage: ')+this.usage());
    (i = this.invite()) && this.c.err.puts(i);
    return false; // important
  },
  // output formatting & display
  color : Color.methods.color,
  tableize : Table.methods.render,
  strong : function(s) { return this.color(s, 'bold', 'green'); },
  printHelp : function() {
    this.c.err.puts(this.strong('usage: ')+this.usage());
    var rows = [];
    if (this.parameters.length) {
      rows.push(['header', this.strong('options:')]);
      for (var i=0; i<this.parameters.length; i++) {
        var p = this.parameters[i];
        var descLines = p.desc();
        if (descLines.length == 0) descLines = [p.getLabel() || ''];
        rows.push(['row', (p.getShortSyntaxDesc() || ''),
          (p.getLongSyntaxDesc() || ''), descLines[0]]);
        for (var j = 1; j < descLines.length; j++) {
          rows.push(['row', '', '', descLines[j]]);
        }
      }
    }
    this.tableize(rows,
      [{align:'right', padRight:'    '},
       {align:'left',  padRight:'      '},
       {align:'left'}
      ],this.c.err);
  },
  getProgramName : function() {
    return path.basename(this._programName);
  },
  getInterpreterName : function() {
    return this._interpreterName;
  },
  usage : function() {
    var parts = [];
    var opts = [];
    for (var i = 0; i < this.parameters.length; i++) {
      opts.push('['+this.parameters[i].getShortestSyntax()+']');
    }
    parts.push(this.getProgramName());
    if (opts.length) parts.push(opts.join(' '));
    if ('meh') parts.push('[args]');
    return parts.join(' ');
  },
  invite : function() {
    if (this.officious.enabled.help)
      return this.strong(this.getProgramName()+' -h')+' for help.';
  },
  _getOfficious : function(stem, shortsOrLongs) {
    var idx = this.officious[shortsOrLongs][stem];
    if (undefined == idx) return null;
    var name = this.officious.list[idx];
    if (! this.officious.enabled[name]) return null;
    return this[name+'OfficiousCommand'](); // e.g. helpOfficiousCommand()
  },
  helpOfficiousCommand : function() {
    if (this._helpOfficiousCommand) return this._helpOfficiousCommand;
    this._helpOfficiousCommand = this.on('-h', '--help', 'this screen',
      this.onHelp );
    return this._helpOfficiousCommand;
  },
  onHelp : function() {
    this.printHelp();
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
    return 'request:{'+a.join(',')+'}';
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
