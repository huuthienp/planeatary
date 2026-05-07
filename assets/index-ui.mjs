const UI = Object.create(null);
export default UI;

const createFrozenPureObjectFrom = object =>
  Object.freeze(Object.assign(Object.create(null), object));

Object.freeze(UI);
