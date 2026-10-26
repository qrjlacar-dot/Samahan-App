module.exports = function hookHarness() {
  let active;
  const same = (a, b) =>
    a && b && a.length === b.length && a.every((item, index) => Object.is(item, b[index]));
  const react = {
    useState(initial) {
      const h = active,
        i = h.index++;
      if (!(i in h.slots)) h.slots[i] = typeof initial === "function" ? initial() : initial;
      return [
        h.slots[i],
        (value) => {
          const next = typeof value === "function" ? value(h.slots[i]) : value;
          if (!Object.is(next, h.slots[i])) {
            h.slots[i] = next;
            h.dirty = true;
          }
        },
      ];
    },
    useRef(initial) {
      const h = active,
        i = h.index++;
      return (h.slots[i] ??= { current: initial });
    },
    useCallback(fn, deps) {
      const h = active,
        i = h.index++;
      if (!same(h.slots[i]?.deps, deps)) h.slots[i] = { fn, deps };
      return h.slots[i].fn;
    },
    useMemo(fn, deps) {
      const h = active,
        i = h.index++;
      if (!same(h.slots[i]?.deps, deps)) h.slots[i] = { value: fn(), deps };
      return h.slots[i].value;
    },
    useEffect(fn, deps) {
      const h = active,
        i = h.index++;
      if (!same(h.slots[i]?.deps, deps)) {
        const previous = h.slots[i];
        h.slots[i] = { deps };
        h.effects.push(() => {
          previous?.cleanup?.();
          h.slots[i].cleanup = fn();
        });
      }
    },
  };
  const runtime = {
    jsx: (type, props, key) => ({ type, props, key: key ?? null }),
    jsxs: (type, props, key) => ({ type, props, key: key ?? null }),
    Fragment: "Fragment",
  };
  function render(component, props = {}) {
    const h = { props, slots: [], index: 0, effects: [], dirty: true };
    h.flush = () => {
      let count = 0;
      do {
        if (++count > 60) throw new Error("Unexpected render loop");
        h.index = 0;
        h.effects = [];
        h.dirty = false;
        active = h;
        h.result = component(h.props);
        for (const effect of h.effects) effect();
      } while (h.dirty);
    };
    h.dispose = () => {
      for (const item of h.slots) item?.cleanup?.();
    };
    h.flush();
    return h;
  }
  return { react, runtime, render };
};
