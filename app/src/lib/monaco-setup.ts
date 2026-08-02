/**
 * Use the bundled copy of Monaco instead of the CDN.
 *
 * By default @monaco-editor/react fetches the editor from jsDelivr at runtime,
 * the first time you open a file. That makes an editor whose whole point is
 * local, offline file editing silently depend on the network: with no
 * connection the tab just sits on "Loading..." forever, and every cold open
 * pays a round-trip.
 *
 * `monaco-editor` is already a dependency, so we point the loader at it and
 * let Vite bundle it. Bigger build, no network at runtime.
 */
import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

// Monaco asks for a worker per language service; without this it falls back to
// running them on the main thread and logs a warning on every file open.
self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    switch (label) {
      case 'json':
        return new jsonWorker();
      case 'css':
      case 'scss':
      case 'less':
        return new cssWorker();
      case 'html':
      case 'handlebars':
      case 'razor':
        return new htmlWorker();
      case 'typescript':
      case 'javascript':
        return new tsWorker();
      default:
        return new editorWorker();
    }
  },
};

loader.config({ monaco });
