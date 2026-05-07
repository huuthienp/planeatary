const UI = Object.create(null);
export default UI;

const createFrozenPureObjectFrom = object =>
  Object.freeze(Object.assign(Object.create(null), object));

UI.divider = createFrozenPureObjectFrom({
  style: /* css */ `
.b-example-divider {
  width: 100%;
  height: 3rem;
  background-color: rgba(0, 0, 0, 0.1);
  border: solid rgba(0, 0, 0, 0.15);
  border-width: 1px 0;
  box-shadow:
    inset 0 0.5rem 1.5rem rgba(0, 0, 0, 0.1),
    inset 0 0.125rem 0.5rem rgba(0, 0, 0, 0.15);
}`,
  template: /* html */ `
<div class="b-example-divider"></div>`,
});

UI.wave1 = createFrozenPureObjectFrom({
  template: /* html */ `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" class="first-wave" style="margin-top: -1px; position: relative">
  <path fill="#00af8c" fill-opacity="1" d="M0,160L24,138.7C48,117,96,75,144,74.7C192,75,240,117,288,112C336,107,384,53,432,37.3C480,21,528,43,576,80C624,117,672,171,720,165.3C768,160,816,96,864,74.7C912,53,960,75,1008,117.3C1056,160,1104,224,1152,245.3C1200,267,1248,245,1296,240C1344,235,1392,245,1416,250.7L1440,256L1440,0L1416,0C1392,0,1344,0,1296,0C1248,0,1200,0,1152,0C1104,0,1056,0,1008,0C960,0,912,0,864,0C816,0,768,0,720,0C672,0,624,0,576,0C528,0,480,0,432,0C384,0,336,0,288,0C240,0,192,0,144,0C96,0,48,0,24,0L0,0Z"></path>
</svg>`,
});

UI.wave2 = createFrozenPureObjectFrom({
  template: /* html */ `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" style="margin-bottom: -1px">
    <path fill="#00abc9" fill-opacity="1" d="M0,32L40,69.3C80,107,160,181,240,213.3C320,245,400,235,480,234.7C560,235,640,245,720,224C800,203,880,149,960,133.3C1040,117,1120,139,1200,160C1280,181,1360,203,1400,213.3L1440,224L1440,320L1400,320C1360,320,1280,320,1200,320C1120,320,1040,320,960,320C880,320,800,320,720,320C640,320,560,320,480,320C400,320,320,320,240,320C160,320,80,320,40,320L0,320Z"></path>
</svg>`,
});

UI.wave3 = createFrozenPureObjectFrom({
  template: /* html */ `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" style="margin-top: -1px">
    <path fill="#7cd7e7" fill-opacity="1" d="M0,64L48,58.7C96,53,192,43,288,37.3C384,32,480,32,576,48C672,64,768,96,864,138.7C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
</svg>`,
});

Object.freeze(UI);
