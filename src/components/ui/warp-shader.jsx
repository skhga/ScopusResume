import { Warp } from "@paper-design/shaders-react";

export default function WarpShaderHero({ children }) {
  return (
    <div className="relative overflow-hidden">
      {/* Shader background */}
      <div className="absolute inset-0">
        <Warp
          style={{ height: "100%", width: "100%" }}
          proportion={0.45}
          softness={1}
          distortion={0.25}
          swirl={0.8}
          swirlIterations={10}
          shape="checks"
          shapeScale={0.1}
          scale={1}
          rotation={0}
          speed={0.6}
          colors={[
            "hsl(175, 77%, 18%)",
            "hsl(175, 77%, 55%)",
            "hsl(349, 100%, 68%)",
            "hsl(175, 60%, 82%)",
          ]}
        />
      </div>

      {/* Content slot */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
