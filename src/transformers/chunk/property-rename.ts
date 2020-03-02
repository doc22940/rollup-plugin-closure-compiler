/**
 * Copyright 2020 The AMP HTML Authors. All Rights Reserved.
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

import { ChunkTransform } from '../../transform';
import { TransformInterface, Range } from '../../types';
import MagicString from 'magic-string';
import {
  parse,
  isIdentifier,
  isObjectExpression,
  isVariableDeclarator,
  isImportDeclaration,
  isExportAllDeclaration,
  isExportDefaultDeclaration,
  isExportNamedDeclaration,
  isExportSpecifier,
} from '../../acorn';
import { asyncWalk as walk } from 'estree-walker';
import { BaseNode } from 'estree';
import { Position } from 'acorn';

/*
  "minify": {
    "mangle": {
      "properties": {
        "regex": "^_",
        "reserved": [
          "__webpack_public_path__"
        ],
      }
    },
  }
  "props": {
    "props": {
      "$_somePrivateProperty": "__p",
      "$_backingInstance": "__b"
    }
  }
*/

const A_CHAR_CODE = 'A'.charCodeAt(0);
const Z_CHAR_CODE = 'Z'.charCodeAt(0);
const a_CHAR_CODE = 'a'.charCodeAt(0);
const z_CHAR_CODE = 'z'.charCodeAt(0);
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (i: number, count: number) => count + from);
const VALID_RANGE = [...range(a_CHAR_CODE, z_CHAR_CODE), ...range(A_CHAR_CODE, Z_CHAR_CODE)];

/**
 * Accept and use the "mangle" configuration supplied by Microbundle or other tools
 * @see https://github.com/developit/microbundle/wiki/mangle.json
 */
export default class RequestedPropertyRename extends ChunkTransform implements TransformInterface {
  public name = 'RequestedPropertyRenameTransform';
  private stored: number = 0;

  /**
   * Find the next shortname to rename a value to.
   */
  private nextRenameValue = (): string => {
    let { currentCharPositions } = this.memory.rename;
    if (this.stored === 0) {
      return String.fromCharCode(VALID_RANGE[0]);
    }

    let iterator = 0;
    let iterated = false;
    do {
      if (currentCharPositions[iterator] < VALID_RANGE.length) {
        currentCharPositions[iterator]++;
        iterated = true;
        break;
      }
      iterator++;
    } while (iterator <= currentCharPositions.length);
    if (!iterated) {
      this.memory.rename.currentCharPositions = [...currentCharPositions.map(position => 0), 0];
    }

    return String.fromCharCode(...currentCharPositions.map(position => VALID_RANGE[position]));
  };

  /**
   * Store unavailable names before creating rename values to prevent naming collisions.
   * @param name
   */
  private storeUnavailable = (node: BaseNode): void => {
    const { candidates, unavailable } = this.memory.rename;
    if (isIdentifier(node) && !candidates.has(node.name)) {
      unavailable.add(node.name);
    }
  };

  /**
   * Store a name for renaming.
   * @param name
   */
  private store = (node: BaseNode): void => {
    const { candidates, mapping } = this.memory.rename;
    if (isIdentifier(node) && candidates.has(node.name) && !mapping.has(node.name)) {
      mapping.set(node.name, `_${this.nextRenameValue()}`);
      this.stored++;
    }
  };

  /**
   * For identifiers stored in our mapping memory for renaming, rename to the valid name.
   * @param node
   * @param source
   */
  private maybeOverwrite = (node: BaseNode, source: MagicString): void => {
    const { mapping } = this.memory.rename;

    if (isIdentifier(node) && mapping.has(node.name)) {
      const [keyStart, keyEnd] = node.range as Range;
      source.overwrite(keyStart, keyEnd, mapping.get(node.name) as string);
    }
  };

  /**
   * @param source source to parse, and modify
   * @return modified input source with computed literal keys
   */
  public async post(fileName: string, source: MagicString): Promise<MagicString> {
    if (!this.memory.rename.enabled) {
      return source;
    }

    const program = await parse(fileName, source.toString());
    const { store, storeUnavailable } = this;

    await walk(program, {
      enter: async function(node) {
        if (isIdentifier(node)) {
          storeUnavailable(node);
        }
        if (
          isImportDeclaration(node) ||
          isExportAllDeclaration(node) ||
          isExportDefaultDeclaration(node) ||
          isExportNamedDeclaration(node) ||
          isExportSpecifier(node)
        ) {
          this.skip();
        } else if (isVariableDeclarator(node) && isObjectExpression(node.init as BaseNode)) {
          await walk(node.init as BaseNode, {
            enter: async function(node) {
              store(node);
            },
          });
          this.skip();
        } else {
          store(node);
        }
      },
    });

    if (this.stored > 0) {
      const { maybeOverwrite } = this;
      await walk(program, {
        enter: async function(node) {
          if (
            isImportDeclaration(node) ||
            isExportAllDeclaration(node) ||
            isExportDefaultDeclaration(node) ||
            isExportNamedDeclaration(node) ||
            isExportSpecifier(node)
          ) {
            this.skip();
          } else if (isVariableDeclarator(node) && isObjectExpression(node.init as BaseNode)) {
            await walk(node.init as BaseNode, {
              enter: async function(node) {
                maybeOverwrite(node, source);
              },
            });
            this.skip();
          } else {
            maybeOverwrite(node, source);
          }
        },
      });
    }

    return source;
  }
}
