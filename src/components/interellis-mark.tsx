import Image from "next/image";
import type { ComponentProps } from "react";

type InterellisMarkProps = Omit<ComponentProps<typeof Image>, "alt" | "height" | "src" | "width">;

export function InterellisMark({ className = "", ...props }: InterellisMarkProps) {
  return (
    <Image
      {...props}
      alt=""
      aria-hidden={props["aria-hidden"] ?? true}
      className={`select-none object-contain ${className}`}
      draggable={false}
      height={512}
      sizes="40px"
      src="/aptelys-mark.png"
      width={512}
    />
  );
}
