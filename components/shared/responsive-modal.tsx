"use client";

import type { ReactNode } from "react";
import {
  Box,
  Dialog,
  Drawer,
  useMediaQuery,
  useTheme,
  type DialogProps,
} from "@mui/material";

type ResponsiveModalProps = {
  children: ReactNode;
  open: boolean;
  onClose?: () => void;
  maxWidth?: DialogProps["maxWidth"];
};

/** Bottom sheet on phones and a conventional dialog on larger screens. */
export function ResponsiveModal({
  children,
  open,
  onClose,
  maxWidth = "sm",
}: ResponsiveModalProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  if (!isMobile) {
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth={maxWidth}>
        {children}
      </Dialog>
    );
  }

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      slotProps={{
        paper: {
          sx: {
            borderRadius: "16px 16px 0 0",
            maxHeight: "min(88dvh, 760px)",
            overflow: "hidden",
          },
        },
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          bgcolor: "divider",
          borderRadius: 99,
          height: 4,
          mx: "auto",
          mt: 1.25,
          width: 38,
        }}
      />
      <Box
        sx={{
          overflowY: "auto",
          pb: "max(8px, env(safe-area-inset-bottom))",
          "& .MuiDialogTitle-root": { px: 2.5, pt: 2, pb: 1 },
          "& .MuiDialogContent-root": { px: 2.5 },
          "& .MuiDialogActions-root": {
            px: 2.5,
            pb: 2,
            pt: 1.5,
          },
        }}
      >
        {children}
      </Box>
    </Drawer>
  );
}
