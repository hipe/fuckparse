// bootstrapped test stuff !
var Microtest = exports.Microtest = function(name) {
  this.name = name;
  this.out = require('util');
  this.numOk = this.numFailed = 0;
};
Microtest.prototype = {
  start : function() {
    this.out.puts('Loaded suite '+this.name);
    return this;
  },
  ok : function(b, msg) {
    if (b) { this.numOk += 1; this.out.print('.'); }
    else { this.numFailed += 1; this.out.puts("\nfailed "+msg); }
  },
  equal : function(a, b, msg) {
    if (a==b) { this.numOk +=1; this.out.print('.'); }
    else {
      this.numFailed += 1;
      this.out.puts("\nfailed: " + msg + ' "' + a + '" "' + b + '"');
    }
  },
  summary : function() {
    this.out.puts("\n" + (this.numOk + this.numFailed) + ' assertions, ' +
      this.numFailed + ' failures');
  }
};

exports.escapeRegexp = new RegExp("[.*+?|()\\[\\]{}\\\\]", "g");
  // .*+?|()[]{}\

exports.regexpEscape = function(str) {
  return str.replace(exports.regexpEscape, "\\$&");
};

// @return a subset of the strings in `of` that start with `str`
exports.fuzzyMatch = function(str, of) {
  var matcher = new RegExp('^'+exports.regexpEscape(str));
  var founds = [];
  for (var i = 0; i < of.length; i ++) {
    if (matcher.test(of[i])) {
      if (str == of[i]) {
        founds = [of[i]];
        break;
      } else {
        founds.push(of[i]);
      }
    }
  }
  return founds;
};

/**
 * ruby has abbrev() which is "Given a set of strings, calculate the set of
 * unambiguous abbreviations for those strings [..]".
 * In this version, return only the shortest string that can uniquely
 * identify each string, (or the whole string if etc.)
 * Returns an array of triplets, [[uniq, tail], [uniq, tail] [..]]
 * So for ['foobie', 'fooboo', 'derp'] returns:
 *   [['foobi', 'e'], ['foobo','o'], ['d', 'erp']]
 * and for ['foo', 'foobie'] returns [['foo',null], ['foobi','e']]
 */
exports.abbrevesque = function(enumz) {
  var out = new Array(enumz.length);
  for (var i = 0; i < enumz.length; i++) {
    var size = enumz.length;
    var len = 1;
    var strlen = enumz[i].length;
    var str = enumz[i].substr(0, len);
    var space = {};
    for (var j = 0; j < enumz.length; j++) space[j] = j;
    while (true) {
      for (j in space) {
        if (enumz[j].substr(0, len) != str) {
          delete space[j];
          size --;
        }
      }
      if (size <= 1) break;
      if (len == strlen) break;
      ++ len;
      str = enumz[i].substr(0, len);
    }
    out[i] = [str, enumz[i].substr(str.length)];
  }
  return out;
};

exports.abbrevesqueRender = function(abbrev) {
  return abbrev.map(function(a){
    return a[1] ? (a[0] + '[' + a[1] + ']') : a[0];
  }).join(', ');
};


if (process.argv && process.argv[1] == __filename) (function(){
  var mt = (new Microtest('abbrevesque')).start();
  var t = function(str, arr) {
    var have = exports.abbrevesqueRender(exports.abbrevesque(arr));
    mt.equal(str, have, 'should equal');
  };
  t('', []);
  t('a[bc]', ['abc']);
  t('a[bc], d[ef]', ['abc', 'def']);
  t('abc, abcd', ['abc', 'abcd']);
  mt.summary();
})();


exports.normalizeEnum = function(val, enumVals, opts, errFunc) {
  if (undefined == errFunc && 'function' == typeof(opts)) {
    errFunc = opts;
    opts = null;
  }
  if (!errFunc) errFunc = function(e) {
    process.stderr.write(e.toString() + '\n');
  };
  var buildError = function(tmplStr) {
    var op = require('./../fuckparse');
    var data = { given : ('"' + val + '"') }, datas = [], e = new Error();
    e.toString = function() { return this.message; };
    e.givenValue = val;
    e['enum'] = enumVals;
    if (founds.length > 1) {
      e.similar = founds;
      e.errorType = 'ambiguous';
      data.similar = op.oxfordComma(founds, ' or ', op.oxfordComma.quote);
    } else {
      e.errorType = 'invalid';
      data.all = op.oxfordComma(enumVals, ' or ', op.oxfordComma.quote);
    }
    if (opts && opts.templateVars) datas.push(opts.templateVars);
    datas.push(data);
    var t = new (require('./templite').Templite)(tmplStr);
    e.message = t.run.apply(t, datas);
    return e;
  };
  var founds = exports.fuzzyMatch(val, enumVals), str;
  switch (founds.length) {
    case 0 :
      str = (opts && opts.invalid);
      str || (str = (opts && opts.templateVars && opts.templateVars.param) ?
        'Expecting {all} not {given} for {param}.' :
        'Expecting {all} not {given}.');
      errFunc(buildError(str));
      return false;
    case 1 :
      return founds[0];
    default :
      str = (opts && opts.abiguous);
      str || (str = (opts && opts.templateVars && opts.templateVars.param) ?
        'Ambiguous value {given} for {param}. Did you mean {similar}?' :
        'Ambiguous value {given}. Did you mean {similar}?');
      errFunc(buildError(str));
      return false;
  }
};
// run this file to run these tests
if (process.argv && process.argv[1] == __filename) (function(){
  var t = (new Microtest('normalizeEnum')).start();

  var enumz = ['sql', 'sqlite', 'mysql'], ne = exports.normalizeEnum;

  t.equal(ne('my', enumz), 'mysql');
  t.equal(ne('mysql', enumz), 'mysql');
  var str;
  var v = ne('blah',enumz, function(e){ str = ''+e.message; });
  t.equal(v, false, "returns false on failure.");
  t.equal(str, 'Expecting "sql", "sqlite" or "mysql" not "blah".', 'work');
  v = ne('sq', enumz, function(e){ str = ''+e.message; });
  t.equal(v, false, 'false on ambiguous');
  t.equal(str, 'Ambiguous value "sq". Did you mean "sql" or "sqlite"?', 'ambi');

  t.summary();
})();
