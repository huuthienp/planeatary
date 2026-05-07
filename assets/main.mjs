import { createApp } from 'vue';
import { insertStyleLink } from 'vuethienp';
import { insertStyleBlock } from 'vuethienp';
import INDEX_UI from './index-ui.mjs';

const { url } = import.meta;

const ELEMENTS = Object.assign(
  Object.create(null),
  INDEX_UI,
);
Object.freeze(ELEMENTS);

const names = [
  'hero',
  'wave1',
  'steps',
  'wave2',
  'do-you-know',
  'wave3',
  'reflect',
  'divider',
]; // prettier-ignore

const app = createApp({
  mounted() {
    //
  },
  setup() {
    //
  },
  template: names.map(n_ => `<${n_}></${n_}>`).join(''),
});

for (const name of names) {
  const templateFetch = await fetch(new URL(`${name}.html`, url));
  const fallbackElement = ELEMENTS[name];

  if (!templateFetch.ok) {
    if (fallbackElement) {
      console.log(`OK '${name}' is defined`);
    } else {
      console.warn(`SKIPPED '${name}' is ${templateFetch.status} and undefined`);
      continue;
    }
  }

  app.component(name, {
    mounted() {
      /** INSERT STYLE
       * {name}.html found -> insert link to {name}.css
       * else -> {name} defined -> insert attached style as block
       */

      if (!templateFetch.ok) {
        fallbackElement?.style && insertStyleBlock(fallbackElement.style.trim());
        return;
      }

      const cssUrl = new URL(`${name}.css`, url);
      fetch(cssUrl) // cache to be used by link below
        .then(res => res.ok && insertStyleLink(cssUrl))
        .catch(err => console.warn(err));
    },
    props: [],
    setup() {},
    template: (templateFetch.ok ? await templateFetch.text() : fallbackElement.template).trim(),
  });
}

app.mount('main');
