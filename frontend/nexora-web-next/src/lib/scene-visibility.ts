// A mounted canvas owns its observer and visibility listener. Rendering stays with R3F.
export function observeSceneVisibility(host: HTMLElement, onChange: (visible: boolean) => void): () => void {
  let active = true;
  let intersecting = typeof IntersectionObserver === "undefined";
  let previous: boolean | undefined;
  const update = () => {
    const visible = intersecting && document.visibilityState === "visible";
    if (!active || visible === previous) return;
    previous = visible;
    onChange(visible);
  };
  const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === host) intersecting = entry.isIntersecting && entry.intersectionRatio > 0;
    }
    update();
  });

  document.addEventListener("visibilitychange", update);
  observer?.observe(host);
  update();
  return () => {
    active = false;
    observer?.disconnect();
    document.removeEventListener("visibilitychange", update);
  };
}
