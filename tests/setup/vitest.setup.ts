import "@testing-library/jest-dom/vitest";

Object.defineProperties(Element.prototype, {
  hasPointerCapture: {
    configurable: true,
    value: () => false,
  },
  releasePointerCapture: {
    configurable: true,
    value: () => {},
  },
  setPointerCapture: {
    configurable: true,
    value: () => {},
  },
});

Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
  configurable: true,
  value: () => {},
});
