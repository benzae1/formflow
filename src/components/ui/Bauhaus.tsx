type PrimitiveShape = "circle" | "square" | "triangle";

export function PrimitiveMark({
  shape,
  color,
  size = 28,
}: {
  shape: PrimitiveShape;
  color: string;
  size?: number;
}) {
  if (shape === "circle") {
    return (
      <span
        className="bf-primitive"
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          borderRadius: "999px",
          background: color,
          display: "inline-block",
        }}
      />
    );
  }

  if (shape === "square") {
    return (
      <span
        className="bf-primitive"
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          background: color,
          display: "inline-block",
        }}
      />
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="bf-primitive"
      width={size}
      height={size}
      viewBox="0 0 40 40"
    >
      <polygon points="20,2 38,36 2,36" fill={color} />
    </svg>
  );
}
