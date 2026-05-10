import INDEX_UI from './index-ui.mjs';
import { createAppFromElements } from 'vuethienp';

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
  'development',
]; // prettier-ignore

( await createAppFromElements(
  {
    elements: ELEMENTS,
    names,
    url,
  } /* better-diff */,
  {},
) ).mount('main');
