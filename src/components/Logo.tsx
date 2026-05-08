import logo from "@/assets/logo.png";

export function Logo({ size = 140 }: { size?: number }) {
  return (
    <img
      src={logo}
      alt="PunctuOwlity logo"
      width={size}
      height={size}
      className="mx-auto"
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
