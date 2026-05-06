import { createApp } from 'vue';
import { insertStyleLink } from 'vuethienp';

const { url } = import.meta;
const names = [
  'hero',
  'steps',
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
  app.component(name, {
    mounted() {
      const cssUrl = new URL(`${name}.css`, url);
      fetch(cssUrl) // cache to be used by link below
        .then(res => res.ok && insertStyleLink(cssUrl))
        .catch(err => console.warn(err));
    },
    props: [],
    setup() {},
    template: await (await fetch(new URL(`${name}.html`, url))).text(),
  });
}

app.mount('main');
