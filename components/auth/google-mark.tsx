import { Box } from "@mui/material";

export function GoogleMark() {
  return (
    <Box
      component="span"
      aria-hidden="true"
      sx={{
        background:
          "conic-gradient(from -45deg, #4285F4 0 25%, #34A853 0 50%, #FBBC05 0 75%, #EA4335 0)",
        backgroundClip: "text",
        color: "transparent",
        fontSize: 22,
        fontWeight: 900,
        lineHeight: 1,
      }}
    >
      G
    </Box>
  );
}
