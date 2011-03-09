/**
 * ultra-lightweight atomically minimal templating.
 *
 * usage:
 *   var Templite = require('./lib/templite');
 *   var dataSource = { age : function() { return 11; }};
 *   var template = Templite.build("i am {age} years old.");
 *   sys.puts(template.run(dataSource));
 *       // outputs: "i am 11 years old."
 *
 *   sys.puts(Template.build('{a}{b}{c}').run({a:'A', c:'C'});
 *       // outputs "AC"
 *
 */
exports = function(str) { this.source = str; };

exports.buildIfLooksLikeTemplate = function(str) {
  return (/\{[_a-zA-Z][-_a-zA-Z0-9]*\}/).test(str) ? new this(str) : null;
};
exports.build = function(str) {
  return new this(str);
};
exports.prototype = {
  _compiled : false,
  run : function(dataSource) {
    if (!this._sexp) this._compile();
    var parts = new Array(this._sexp.length);
    for (var i = 0; i < this._sexp.length; i ++) {
      if ('string' == this._sexp[i][0]) {
        parts[i] = this._sexp[i][1];
      } else {
        if ('function' == typeof(dataSource[this._sexp[i][1]])) {
          parts[i] = dataSource[this._sexp[i][1]]();
        } else {
          parts[i] = dataSource[this._sexp[i][1]];
        }
      }
    }
    return parts.join('');
  },
  // we tried using lastIndex, got wonky results
  _compile : function() {
    var done = false, md, i = 0;
    this._sexp = [];
    while (!done) {
      if ((md = (/^[^{]*/).exec(this.source.substr(i)))) {
        if (md[0].length) {
          i += md[0].length;
          this._sexp.push(['string', md[0]]);
        }
        if ((md = (/^\{([_a-z0-9][-a-z0-9]*)\}/i).exec(this.source.substr(i)))){
          i += md[0].length;
          this._sexp.push(['variable', md[1]]);
        } else {
          if ((md = (/^\{[^{]*/).exec(this.source.substr(i)))) {
            i += md[0].length;
            this._sexp.push(['string', md[0]]);
          }
        }
        if (i >= this.source.length) {
          done = true; // ballsland
        }
      } else {
        done = true; // safety, should never occur w/ strings
      }
    }
  }
};

// inline tests -- to run them, run this file
if (process.argv && process.argv[1] == __filename) {

  // world's smallest test lib
  var sys = require('sys');
  var numOk = 0; numFailed = 0;
  var ok = function(b, msg) {
    if (b) { numOk += 1; sys.print('.'); }
    else { numFailed += 1; sys.puts("\nfailed "+msg); }
  };
  var equal = function(a, b, msg) {
    if (a==b) { numOk +=1; sys.print('.'); }
    else { numFailed +=1; sys.puts("\nfailed: "+msg+' "'+a+'" "'+b+'"'); }
  };

  // tests
  sys.puts('Loaded suite '+require('path').basename(__filename));
  var Templite = exports, t, s;
  t = Templite.buildIfLooksLikeTemplate('');
  ok(!t, "empty string must not build template");

  t = Templite.buildIfLooksLikeTemplate('abc');
  ok(!t, "non empty non template string must not build template");

  t = Templite.buildIfLooksLikeTemplate('abc{one');
  ok(!t, "non empty non template string that has '{' must not build template");

  t = Templite.buildIfLooksLikeTemplate('abc{def}ghi');
  ok(t, "SVS template gets built");

  t._compile();
  equal(3, t._sexp.length, "should have 3 elements");
  equal('string',   t._sexp[0][0], '00');
  equal('abc',      t._sexp[0][1], '01');
  equal('variable', t._sexp[1][0], '10');
  equal('def',      t._sexp[1][1], '11');
  equal('string',   t._sexp[2][0], '20');
  equal('ghi',      t._sexp[2][1], '21');

  var datasource = { def : function(){ return 'DEF'; }, xyz : 'XYZ' };

  t = function(out, tmpl) {
    var s = Templite.build(tmpl).run(datasource);
    equal(out, s, '"'+tmpl+'" should output "'+out+'" had:');
  };
  t('abc',        'abc');
  t('{def',       '{def');
  t('def}',       'def}');
  t('DEF',        '{def}');
  t('{DEF}',      '{{def}}');
  t('abcDEF',     'abc{def}');
  t('DEFabc',     '{def}abc');
  t('abcDEFghi',  'abc{def}ghi');
  t('aDEFbDEF',   'a{def}b{def}');
  t('abcDEFXYZend', 'abc{def}{xyz}{hij}end');

  sys.puts("\n"+(numOk+numFailed)+' assertions, '+numFailed+' failures');
}
