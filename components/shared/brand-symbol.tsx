import { Box, type SxProps, type Theme } from "@mui/material";

type BrandSymbolProps = {
  priority?: boolean;
  size?: number;
  sx?: SxProps<Theme>;
};

export function BrandSymbol({
  priority: _priority = false,
  size = 36,
  sx,
}: BrandSymbolProps) {
  return (
    <Box
      aria-label="Loji Business"
      component="span"
      data-priority={_priority ? "true" : undefined}
      sx={{
        display: "inline-flex",
        flexShrink: 0,
        height: size,
        lineHeight: 0,
        width: size,
        ...sx,
      }}
    >
      <Box
        aria-hidden
        component="svg"
        viewBox="0 0 64 64"
        sx={{ color: "primary.main", height: "100%", width: "100%" }}
      >
        <path
          clipRule="evenodd"
          fill="currentColor"
          fillRule="evenodd"
          d="M13 51V15.8c0-1.5.8-2.9 2.1-3.6L29.8 4a4.5 4.5 0 0 1 4.4 0l14.7 8.2c1.3.7 2.1 2.1 2.1 3.6V51h-8V20.5L32 14.4l-11 6.1V43h14v8H13Zm19-28 11 6.1V43L32 39.5V23Z"
        />
      </Box>
    </Box>
  );
}
