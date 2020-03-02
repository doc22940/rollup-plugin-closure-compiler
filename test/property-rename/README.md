These tests are designed to ensure the property renamer and mangler do not produce broken output.

Babel has some tests in this category (thanks @jridgewell):
- https://github.com/babel/babel/blob/d13fd7c7bdb51995e8c9171b7047fc93402f8c3a/packages/babel-traverse/src/scope/lib/renamer.js
- https://github.com/babel/babel/tree/d13fd7c7bdb51995e8c9171b7047fc93402f8c3a/packages/babel-traverse/test/fixtures/rename

Dependent on:
- https://github.com/babel/babel/blob/eac4c5bc17133c2857f2c94c1a6a8643e3b547a7/packages/babel-types/src/retrievers/getBindingIdentifiers.js