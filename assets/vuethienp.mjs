import { createApp } from 'vue';

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
