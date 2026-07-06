import '@testing-library/jest-dom';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(global as Record<string, unknown>).ResizeObserver = ResizeObserverStub;

if (typeof Element !== 'undefined') {
  (Element.prototype as Record<string, unknown>).scrollIntoView = () => {};
  (Element.prototype as Record<string, unknown>).hasPointerCapture = () => false;
  (Element.prototype as Record<string, unknown>).releasePointerCapture = () => {};
}
