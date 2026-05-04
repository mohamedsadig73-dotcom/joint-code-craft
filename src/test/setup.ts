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

// Stub ResizeObserver for Radix UI
class ResizeObserverStub {
  observe() {} unobserve() {} disconnect() {}
}
(global as any).ResizeObserver = ResizeObserverStub;

// Stub scrollIntoView for Radix Select
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = () => {};
  // @ts-expect-error - jsdom stub for Radix
  Element.prototype.hasPointerCapture = () => false;
  // @ts-expect-error
  Element.prototype.releasePointerCapture = () => {};
}
