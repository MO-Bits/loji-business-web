import { Typography, type SxProps, type Theme } from "@mui/material";

type BrandLockupProps = {
  color?: string;
  priority?: boolean;
  symbolSize?: number;
  textSize?: string | { xs: string; sm?: string; md?: string };
  sx?: SxProps<Theme>;
};

export function BrandLockup({
  color,
  priority: _priority = false,
  symbolSize: _symbolSize = 32,
  textSize = "1rem",
  sx,
}: BrandLockupProps) {
  return (
    <Typography
      aria-label="Loji Business"
      component="span"
      data-priority={_priority ? "true" : undefined}
      data-symbol-size={_symbolSize}
      noWrap
      sx={{
        color: color ?? "text.primary",
        display: "inline-flex",
        fontSize: textSize,
        fontWeight: 700,
        letterSpacing: "-.025em",
        lineHeight: 1,
        minWidth: 0,
        ...sx,
      }}
    >
      Loji Business
    </Typography>
  );
}
