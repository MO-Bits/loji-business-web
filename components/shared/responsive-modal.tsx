"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactNode,
} from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  Drawer,
  useMediaQuery,
  useTheme,
  type DialogProps,
} from "@mui/material";
import { useLanguage } from "@/components/providers/language-provider";

type ResponsiveModalProps = {
  ariaLabel?: string;
  children: ReactNode;
  open: boolean;
  onClose?: () => void;
  maxWidth?: DialogProps["maxWidth"];
};

/** Bottom sheet on phones and a conventional dialog on larger screens. */
export function ResponsiveModal({
  ariaLabel,
  children,
  open,
  onClose,
  maxWidth = "sm",
}: ResponsiveModalProps) {
  const { t } = useLanguage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const generatedTitleId = useId();
  const directTitle = Children.toArray(children).find(
    (child) => isValidElement(child) && child.type === DialogTitle,
  );
  const drawerTitleId = isValidElement<{ id?: string }>(directTitle)
    ? (directTitle.props.id ?? generatedTitleId)
    : undefined;

  const drawerChildren = Children.map(children, (child) => {
    if (!isValidElement<{ id?: string }>(child) || child.type !== DialogTitle) {
      return child;
    }

    return child.props.id ? child : cloneElement(child, { id: drawerTitleId });
  });

  if (!isMobile) {
    return (
      <Dialog
        aria-label={ariaLabel}
        fullWidth
        maxWidth={maxWidth}
        onClose={onClose}
        open={open}
        scroll="paper"
        slotProps={{
          paper: {
            sx: {
              backgroundImage: "none",
              border: 1,
              borderColor: "divider",
              borderRadius: 3,
              boxShadow: 12,
              m: 2,
              maxHeight: "min(90dvh, 860px)",
              width: "calc(100% - 32px)",
            },
          },
        }}
        sx={{
          "& .MuiDialogTitle-root": {
            fontSize: "1.125rem",
            fontWeight: 700,
            lineHeight: 1.35,
            px: 3,
            pb: 1.25,
            pt: 2.75,
          },
          "& .MuiDialogContent-root": { px: 3, py: 2 },
          "& .MuiDialogActions-root": { gap: 1, px: 3, pb: 2.5, pt: 1.5 },
          "& .MuiDialogActions-root .MuiButton-root": { minHeight: 40 },
        }}
      >
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
          "aria-label": drawerTitleId ? undefined : (ariaLabel ?? t("Dialog", "Kidirisha")),
          "aria-labelledby": drawerTitleId,
          "aria-modal": true,
          role: "dialog",
          sx: {
            backgroundImage: "none",
            borderRadius: "24px 24px 0 0",
            borderTop: "1px solid",
            borderColor: "divider",
            boxShadow: 16,
            display: "flex",
            flexDirection: "column",
            maxHeight: "min(92dvh, 840px)",
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
          my: 1.25,
          width: 40,
          flexShrink: 0,
        }}
      />
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overscrollBehavior: "contain",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          "& .MuiDialogTitle-root": {
            fontSize: "1.125rem",
            fontWeight: 700,
            lineHeight: 1.35,
            px: 2,
            pb: 1,
            pt: 1.25,
          },
          "& .MuiDialogContent-root": { px: 2, py: 1.5 },
          "& .MuiDialogActions-root": {
            bgcolor: "background.paper",
            borderColor: "divider",
            borderTop: 1,
            bottom: 0,
            gap: 1,
            px: 2,
            pb: "max(16px, calc(8px + env(safe-area-inset-bottom)))",
            position: "sticky",
            pt: 1.5,
            zIndex: 1,
          },
          "& .MuiDialogActions-root .MuiButton-root": { minHeight: 44 },
        }}
      >
        {drawerChildren}
      </Box>
    </Drawer>
  );
}
