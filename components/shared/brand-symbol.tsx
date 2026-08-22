import Image from "next/image";
import { Box, type SxProps, type Theme } from "@mui/material";

type BrandSymbolProps = {
  priority?: boolean;
  size?: number;
  sx?: SxProps<Theme>;
};

export function BrandSymbol({
  priority = false,
  size = 36,
  sx,
}: BrandSymbolProps) {
  return (
    <Box
      aria-label="Loji Business"
      component="span"
      sx={{
        display: "inline-flex",
        flexShrink: 0,
        height: size,
        lineHeight: 0,
        width: size,
        ...sx,
      }}
    >
      <Image
        alt=""
        aria-hidden
        height={64}
        priority={priority}
        src="/loji-symbol.svg"
        width={64}
        style={{ height: "100%", width: "100%" }}
      />
    </Box>
  );
}
