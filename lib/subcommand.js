var sys = require('sys');
var lib = require('../fuckparse'); // this makes me so nervous for some reason

var SubcommandMeta = {
  nameRe : /^[-_a-z0-9]+$/i
};
exports.SubcommandMeta = SubcommandMeta; // if u want it

var SubcommandInstanceMethods = {
  _canSubcommand : true,
  desc : lib.commonDesc,
  intern : function()          { return this._intern; },
  syntaxName : function()   { return this._intern; },
  syntaxString : function() { return this._intern; },
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
    if (f) f(subc); // i don't yet know under what circumstances we wouldn't..
    if (!this._subcommands) this._initSubcommands();
    if (this._subcommandsHash[subc.intern()]) {
      throw new lib.SyntaxSyntaxError('can\'t redefine "'+subc.intern()+'"');
    }
    var useIdx = this._subcommands.length;
    this._subcommandsHash[subc.intern()] = useIdx;
    this._subcommands[useIdx] = subc;
    return subc;
  },
  _initSubcommands : function() {
    // do this check once
    if (this.positionalParameters().length > 0) {
      throw new lib.SyntaxSyntaxError("commands that take arguments should "+
        "not also take subcommands!");
    }
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
  run : function(argv) {
    if (!this._subcommands) return this.parse(argv);
    var req = this.parse(argv);
    if (!req) return req; // errors!
    var subName = req.values.subcommand;
    var subObj = this._fuzzyMatch(subName);
    if (!subObj) return false;
    this.c.err.puts("ok running this: "+subName);
    return null;
  },
  _fuzzyMatch : function(subName) {
    var re = new RegExp('^'+exports.regexpEscape(subName));
    var matches = [];
    for (i = 0; i < this._subcommands.length; i++) {
      if (re.test(this._subcommands[i].syntaxName())) {
        matches.push(this._subcommands[i]);
      }
    }
    switch (matches.length) {
      case 1  : return matches[0];
      case 0  : return this.handleSubcommandNotFound(subName);
      default : return this.handleAmbiguousSubcommand(subName, matches);
    }
  },
  handleSubcommandNotFound : function(subName) {
    return this._error('Unrecognized command "' + subName +'".  '+
      'Available subcommands: '+lib.oxfordComma(this._subcommandParam.subs,
        ' or ', function(x){ return '"'+x.syntaxName()+'"';})+'.');
  },
  handleAmbiguousSubcommand : function(subName, matches) {
    return this._error('Ambiguous subcommand "'+subName+'".  '+
      'Did you mean ' + lib.oxfordComma(matches, ' or ', function(c) {
        return '"'+c.syntaxName()+'"';})+'?');
  }
};

exports.escapeRegexp = new RegExp("[.*+?|()\\[\\]{}\\\\]", "g"); // .*+?|()[]{}\

exports.regexpEscape = function(str) {
  return str.replace(exports.regexpEscape, "\\$&");
};

var SubcommandParam = function(subs) {
  this.subs = subs;
};
exports.SubcommandParam = SubcommandParam;
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
  desc : function () { return []; }
};

exports.SubcommandInstanceMethods = SubcommandInstanceMethods; // if u want it

// @todo not sure of the "right" way to do this
if (! lib.Command.prototype._canSubcommand) {
  var p = lib.Command.prototype;

  // @todo better way!? how the hell is inheiritance supposed to work here?
  p._commandArgumentsHelp = p._argumentsHelp;

  for (var i in SubcommandInstanceMethods)
    p[i] = SubcommandInstanceMethods[i];
}
