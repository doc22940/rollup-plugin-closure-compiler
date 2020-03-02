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

import { SourceTransform } from '../../transform';
import { TransformInterface, ManglePropertiesConfiguration, PluginOptions, MangleProperties } from '../../types';
import MagicString from 'magic-string';
import { asyncWalk as walk } from 'estree-walker';
import { isIdentifier, parse } from '../../acorn';
import { promises as fsPromises } from 'fs';
import { resolve } from 'path';

function validateConfiguration(configuration: ManglePropertiesConfiguration | null): MangleProperties {
  const regex = configuration?.minify?.mangle?.properties?.regex;
  const props = configuration?.props?.props;

  if (regex) {
    return {
      mangle: {
        regex: new RegExp(regex),
        reserved: configuration?.minify?.mangle?.properties?.reserved || [],
      },
      props: props || {},
    };
  }

  return {
    mangle: null,
    props: props || {},
  };
}

async function loadConfiguration(options: PluginOptions): Promise<ManglePropertiesConfiguration | null> {
  if (!options.property_rename || options.property_rename === true) {
    return null;
  }

  const { property_rename: filePath } = options;
  const fileContents = await fsPromises.readFile(resolve(filePath), 'utf-8');

  try {
    return JSON.parse(fileContents) as ManglePropertiesConfiguration;
  } catch {
    return null;
  }
}

/**
 * Closure Compiler will not compile code that is prefixed with a hashbang (common to rollup output for CLIs).
 *
 * This transform will remove the hashbang (if present) and ask Ebbinghaus to remember if for after compilation.
 */
export default class PropertyRenameTransform extends SourceTransform implements TransformInterface {
  public name = 'PropertyRenameTransform';

  public transform = async (id: string, source: MagicString): Promise<MagicString> => {
    const configuration = await loadConfiguration(this.pluginOptions);
    if (configuration === null) {
      return source;
    }

    const renaming = validateConfiguration(configuration);
    if (renaming.mangle !== null && renaming.mangle.regex) {
      const { regex } = renaming.mangle;
      const { memory } = this;
      const program = await parse(id, source.toString());
      let foundCandidate: boolean = false;

      await walk(program, {
        enter: async function(node) {
          if (isIdentifier(node) && regex.test(node.name)) {
            memory.rename.candidates.add(node.name);
            foundCandidate = true;
          }
        },
      });

      if (foundCandidate) {
        memory.rename.enabled = true;
      }
    }

    return source;
  };
}
