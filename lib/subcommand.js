var sys = require('sys');
var lib = require('../fuckparse'); // this makes me so nervous for some reason

exports.escapeRegexp = new RegExp("[.*+?|()\\[\\]{}\\\\]", "g"); // .*+?|()[]{}\

exports.regexpEscape = function(str) {
  return str.replace(exports.regexpEscape, "\\$&");
};

lib.ExecutionContext.prototype.pushCommandToStack = function(cmd) {
  if (!this._commandStack) this._commandStack = [];
  this._commandStack.push(cmd);
};
lib.ExecutionContext.prototype.commandStack = function() {
  return this._commandStack;
};

lib.Parse.prototype.addCommand = function(cmd) {
  this.ec.pushCommandToStack(this.cmd);
  this.cmd = cmd;
  return this;
};

var SubcommandMeta = exports.SubcommandMeta =  {
  nameRe : /^[-_a-z0-9]+$/i
};

var Subcommand = exports.Subcommand = {
  _canSubcommand : true,
  desc : lib.commonDesc,
  intern : function()       { return this._intern; },
  syntaxName : function()   { return this._intern; },
  syntaxString : function() { return this._intern; },
  execute : function(f) {
    if (this._function) throw new lib.SyntaxSyntaxError('multiple '+
    'definitions for execute()');
    if (this._subcommands) throw new lib.SyntaxSyntaxError('Commands cannot '+
      'define an execute() function and have subcommands ("'+this._intern+'")');
    this._function = f;
  },
  hasFunction : function() { return this._function; },
  'function'  : function() { return this._function; },
  _processSubcommandDefinition : function(argumentz) {
    if (!SubcommandMeta.nameRe.test(argumentz[0])) {
      throw new lib.SyntaxSyntaxError(
        'bad name for subcommand: "'+argumentz[0]+'"');
    }
    var subc = new lib.Command();
    subc.commandInit();
    subc._intern = argumentz[0];

    // we decide here that the only thing these can have for now
    // is desc strings and even that is experimental
    var i, f;
    for (i=1; i < argumentz.length; i++) {
      switch (typeof(argumentz[i])) {
        case 'function' :
          if (f) throw new lib.SyntaxSyntaxError("must not use more than "+
          "one function in subcommand definition!");
          f = argumentz[i];
          break;
        case 'string' :
          subc.desc(argumentz[i]);
          break;
        default :
          throw new lib.SyntaxSyntaxError('bad type for subcommmand '+
          'definition: "'+argumentz[i]+'"');
      }
    }
    if (f) f(subc); // if just for parsing, maybe no def block
    if (!this._subcommands) this._initCommandWithSubcommands();
    if (this._subcommandsHash[subc.intern()]) {
      throw new lib.SyntaxSyntaxError('can\'t redefine "'+subc.intern()+'"');
    }
    var useIdx = this._subcommands.length;
    this._subcommandsHash[subc.intern()] = useIdx;
    this._subcommands[useIdx] = subc;
    return subc;
  },
  _initCommandWithSubcommands : function() {
    // do this check once
    if (this.hasPositionalParameters()) throw new lib.SyntaxSyntaxError(
      'Commands that take (positional) arguments cannot also take subcommands.'
    );
    if (this._function) throw new lib.SyntaxSyntaxError(
      'Commands that have execute() functions cannot also specify subcommands.'
    );
    this._unparsableOk = true; // stop on unparsables
    // for now we just write this straight. one day maybe we need to chain it
    this._beforeArgHooks = function(_) {
      throw new SyntaxSyntaxError('A Command with'+
      ' subcommands cannot take arguments ("'+(this._intern||'root command')+
      '" with: "'+arguments[0]+'",..)');
    };
    this._subcommands = [];
    this._subcommandsHash = {};
    this._subcommandParam = new SubcommandParam(this._subcommands);
    this._addParam(this._subcommandParam);
  },
  _argumentsHelp : function(rows) {
    if (!this._subcommands) return this._commandArgumentsHelp(rows);
    rows.push(['header', this.strong('subcommands:')]);
    for (var i=0 ; i < this._subcommands.length; i++) {
      var sub = this._subcommands[i];
      descLines = sub.desc();
      if (descLines.length == 0) descLines = [sub.label() || ''];
      rows.push(['row', '', sub.syntaxName(), descLines[0]]);
      for (var j = 1; j < descLines.length; j++) {
        rows.push(['row', '', '', descLines[j]]);
      }
    }
    return null;
  },
  // entrypoint run
  run : function(argv) {
    // no matter what we want to parse it
    var ec = this.buildExecutionContext(argv);
    var request = ec.parse.parse(argv);
    if (!request) return request; // error handlers were called. done.
    if (this._function) return this._function.call(ec);
    if (this._subcommands) {
      var cmd = this._determineTerminalCommand(request, ec);
      if (!cmd) return cmd; // not found, error handlers called
      if (cmd._function)
        return cmd._function.apply(ec, cmd._buildFunctionParameters(ec));
    }
    // no subcommands and no function. wat do? we could throw error but meh
    return request;
  },
  _buildFunctionParameters : function(ctx) {
    var argsFormal = this.buildPositionalParametersQueue();
    var argsActual = [], i = argsFormal.length - 1;
    while (0 <= i && 0 == argsFormal[i]._min &&
      -1 == ctx.request.keys.indexOf(argsFormal[i].intern())) { i--; }
    for ( ; 0 <= i; i-- )
      argsActual.unshift(ctx.request.values[argsFormal[i].intern()]);
    argsActual.unshift(ctx.request.values); // always 'opts' should be first
    return argsActual;
  },
  _determineTerminalCommand : function(request, ctx) {
    var subName = request.values.subcommand, cmd;
    if (!(cmd = this._fuzzyMatch(subName, ctx))) return false; //error handlers
    var childRequest = ctx.parse.addCommand(cmd).parseCommand();
    if (!childRequest) return childRequest; // error handlers called
    return cmd._subcommands ?
      cmd._determineTerminalCommand(childRequest, ctx) : cmd;
  },
  _fuzzyMatch : function(subName, ctx) {
    var re = new RegExp('^'+exports.regexpEscape(subName));
    var matches = [];
    for (i = 0; i < this._subcommands.length; i++) {
      if (re.test(this._subcommands[i].syntaxName())) {
        matches.push(this._subcommands[i]);
      }
    }
    switch (matches.length) {
      case 1  : return matches[0];
      case 0  : return this.handleSubcommandNotFound(subName, ctx);
      default : return this.handleAmbiguousSubcommand(subName, matches, ctx);
    }
  },
  handleSubcommandNotFound : function(subName, ctx) {
    return this._error('Unrecognized command "' + subName +'".  '+
      'Available subcommands: '+lib.oxfordComma(this._subcommandParam.subs,
        ' or ', function(x){ return '"'+x.syntaxName()+'"';})+'.', ctx);
  },
  handleAmbiguousSubcommand : function(subName, matches, ctx) {
    return this._error('Ambiguous subcommand "'+subName+'".  '+
      'Did you mean ' + lib.oxfordComma(matches, ' or ', function(c) {
        return '"'+c.syntaxName()+'"';})+'?', ctx);
  }
};

var SubcommandParam = exports.SubcommandParam = function(subs) {
  this.subs = subs;
};

SubcommandParam.prototype = {
  toString : function() { return 'SubcommandParam'; },
  _isPositionalParameter : true,
  _min : 1,
  _isGlob : false,
  intern : function() { return 'subcommand'; },
  syntaxString : function() {
    return '{ ' + this._names().join(' | ') + ' } [opts] [args]';
    // if str.length > 80 str = "<subcommand>"
  },
  syntaxName : function() {
    return lib.oxfordComma(this._names(),' or ', lib.oxfordComma.quote);
  },
  _names : function() {
    var map = [];
    for (var i=0; i<this.subs.length; i++) {
      map.push(this.subs[i].syntaxString());
    }
    return map;
  },
  desc : function () { return []; } // @todo test and explain
};

// @todo not sure of the "right" way to do this
if (! lib.Command.prototype._canSubcommand) {
  var p = lib.Command.prototype;

  // @todo better way!? how the hell is inheiritance supposed to work here?
  p._commandArgumentsHelp = p._argumentsHelp;
  for (var i in Subcommand) p[i] = Subcommand[i];
}
