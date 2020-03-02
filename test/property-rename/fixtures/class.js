export class Foo {
  constructor() {
    this._foo = '1';
    this.a = this._foo;
    this._bar = this._bar.bind(this);
  }

  _bar() {
    console.log('bound bar');
  }

  executor() {
    console.log(this._foo, this.a);
  }
}