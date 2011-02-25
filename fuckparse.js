var sys = require('sys'),
    log = sys.puts;

var Command = function() { };
Command.prototype = {
  commandInit : function() {
    this.params = {};
    this.shorts = {};
    this.longs = {};
  },
  on : function() {
    log("ignoring thing for now");
    //param = Parameter.build(arguments);
    //this.params.push(param);
  }
};
var Fuckparse = function(arr) {
  this.commandInit();
  this.fuckparseInit.apply(this, arr);
};
Fuckparse.prototype = {
  fuckparseInit : function(b) {
    if (b) b.apply(this, [this]);
  }
};
Fuckparse.prototype.__proto__ = Command.prototype;

// export
this.build = function() { return new Fuckparse(arguments); };
