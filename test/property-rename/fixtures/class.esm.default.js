class a{constructor(){this.a=this._a="1";this._b=this._b.bind(this)}_b(){console.log("bound bar")}executor(){console.log(this._a,this.a)}}export var Foo=a
