import { Stack, Typography, type SxProps, type Theme } from "@mui/material";

import { BrandSymbol } from "@/components/shared/brand-symbol";

type BrandLockupProps = {
  color?: string;
  priority?: boolean;
  symbolSize?: number;
  textSize?: string | { xs: string; sm?: string; md?: string };
  sx?: SxProps<Theme>;
};

export function BrandLockup({
  color,
  priority = false,
  symbolSize = 32,
  textSize = "1rem",
  sx,
}: BrandLockupProps) {
  return (
    <Stack
      aria-label="Loji Business"
      component="span"
      direction="row"
      spacing={1}
      sx={{
        alignItems: "center",
        display: "inline-flex",
        minWidth: 0,
        ...sx,
      }}
    >
      <BrandSymbol priority={priority} size={symbolSize} />
      <Typography
        component="span"
        noWrap
        sx={{
          color: color ?? "text.primary",
          fontSize: textSize,
          fontWeight: 700,
          letterSpacing: "-.025em",
          lineHeight: 1,
          transform: "translateY(-.5px)",
        }}
      >
        Loji Business
      </Typography>
    </Stack>
  );
}
