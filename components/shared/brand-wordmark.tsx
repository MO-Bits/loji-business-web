import Image from "next/image";
import { Box, type SxProps, type Theme } from "@mui/material";

type BrandWordmarkProps = {
  priority?: boolean;
  sx?: SxProps<Theme>;
};

export function BrandWordmark({ priority = false, sx }: BrandWordmarkProps) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        lineHeight: 0,
        maxWidth: "100%",
        ...sx,
      }}
    >
      <Image
        alt="Loji Business"
        src="/loji-business-wordmark.png"
        width={1468}
        height={361}
        priority={priority}
        unoptimized
        sizes="(max-width: 600px) 220px, 360px"
        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
      />
    </Box>
  );
}
