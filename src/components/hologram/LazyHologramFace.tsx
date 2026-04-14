import { lazy, Suspense, memo } from "react";
import type { HologramFaceProps } from "./HologramFace";

const HologramFaceLazy = lazy(() =>
  import("./HologramFace").then((m) => ({ default: m.HologramFace }))
);

/**
 * Lightweight shell that lazy-loads the heavy HologramFace (three.js / R3F).
 * Renders a soft pulsing placeholder while the chunk downloads.
 */
function LazyHologramFace(props: HologramFaceProps) {
  return (
    <Suspense fallback={<HologramPlaceholder />}>
      <HologramFaceLazy {...props} />
    </Suspense>
  );
}

/** ~0 KB placeholder shown during chunk download */
function HologramPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        className="rounded-full animate-pulse"
        style={{
          width: "40%",
          paddingBottom: "40%",
          background:
            "radial-gradient(circle, hsla(215,80%,75%,0.25) 0%, hsla(270,45%,75%,0.1) 50%, transparent 80%)",
        }}
      />
    </div>
  );
}

export default memo(LazyHologramFace);
export { LazyHologramFace };
