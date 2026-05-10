import { createApp } from 'vue';

export async function createAppFromElements(
  /* prettier-ignore */ {
    elements=Object.create(null),
    names=['names-is-empty'],
    url,
  },
  /* prettier-ignore */ {
    mounted = function(){},
    setup = function(){},
  } = {},
) {
  const app = createApp({
    mounted,
    setup,
    template: names.map(n_ => `<${n_}></${n_}>`).join(''),
  });

  for (const name of names) {
    const templateFetch = await fetch(new URL(`${name}.html`, url));
    const fallbackElement = elements[name];

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

  return app;
} /* function createAppFromElements */

export function insertStyleBlock(textContent) {
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent }));
} /* function insertStyleBlock */

export function insertStyleLink(href) {
  const link = document.createElement('link');
  Object.entries({
    rel: 'stylesheet',
    href,
  }).forEach(attr => {
    const [ak, av] = attr;
    link.setAttribute(ak, av);
  });
  document.head.appendChild(link);
} /* function insertStyleLink */

export async function mountAppByUrl(url) {
  const name = new URL(url).pathname.split('/').at(-1).split('.').at(0);

  createApp({
    components: {
      v: {
        template: await (await fetch(new URL(`${name}.html`, url))).text(),
      },
    },
    template: '<v></v>',
    mounted() {
      insertStyleLink(new URL(`${name}.css`, url));
    },
  }).mount('#' + name);
}
