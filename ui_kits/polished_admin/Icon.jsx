// Icon — a React wrapper around Lucide that keeps the SVG DOM out of
// React's reconciliation tree. React owns a stable <span>; we mutate
// innerHTML inside it manually so Lucide's DOM mutation can't trip
// React's diff when state changes.

function Icon({ name, size = 18, color = 'currentColor', style = {} }) {
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!ref.current || !window.lucide) return;
    // Place an <i data-lucide> inside the span and let Lucide replace it.
    ref.current.innerHTML = `<i data-lucide="${name}"></i>`;
    window.lucide.createIcons({
      elements: [ref.current],
      attrs: { width: size, height: size, stroke: color, 'stroke-width': 2 }
    });
  }, [name, size, color]);

  return (
    <span ref={ref} style={{
      display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center',
      width: size, height: size,
      color, flexShrink: 0,
      ...style,
    }}></span>
  );
}

window.Icon = Icon;
