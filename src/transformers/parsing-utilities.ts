/**
 * Copyright 2018 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Literal, SimpleLiteral, ImportDeclaration } from 'estree';
import { PluginContext } from 'rollup';

export function literalName(context: PluginContext, literal: Literal): string {
  // Literal can either be a SimpleLiteral, or RegExpLiteral
  if ('regex' in literal) {
    // This is a RegExpLiteral
    context.warn(
      'Rollup Plugin Closure Compiler found a Regex Literal Named Import. `import foo from "*/.hbs"`',
    );
    return '';
  }

  const literalValue = (literal as SimpleLiteral).value;
  return typeof literalValue === 'string' ? literalValue : '';
}

export function importLocalNames(
  context: PluginContext,
  declaration: ImportDeclaration,
): Array<string> {
  const returnableSpecifiers: Array<string> = [];

  if (declaration.specifiers) {
    declaration.specifiers.forEach(specifier => {
      switch (specifier.type) {
        case 'ImportSpecifier':
        case 'ImportNamespaceSpecifier':
        case 'ImportDefaultSpecifier':
          returnableSpecifiers.push(specifier.local.name);
          break;
        default:
          break;
      }
    });
  }

  return returnableSpecifiers;
}
