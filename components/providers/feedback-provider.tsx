"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import { Alert, Snackbar } from "@mui/material";

type Feedback = {
  message: string;
  severity: "success" | "error";
};

type FeedbackContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const success = useCallback((message: string) => {
    setFeedback({ message, severity: "success" });
  }, []);

  const error = useCallback((message: string) => {
    setFeedback({ message, severity: "error" });
  }, []);

  const value = useMemo(() => ({ success, error }), [error, success]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={4500}
        anchorOrigin={{ horizontal: "center", vertical: "bottom" }}
        onClose={() => setFeedback(null)}
        sx={{
          bottom: { xs: 86, lg: 24 },
          maxWidth: { xs: "calc(100vw - 24px)", sm: 560 },
          width: { xs: "calc(100vw - 24px)", sm: "auto" },
        }}
      >
        <Alert
          icon={
            feedback?.severity === "success" ? (
              <CheckCircleRoundedIcon />
            ) : (
              <ErrorRoundedIcon />
            )
          }
          severity={feedback?.severity ?? "success"}
          variant="filled"
          onClose={() => setFeedback(null)}
          sx={{
            alignItems: "center",
            boxShadow: "0 14px 40px rgba(17, 24, 39, .22)",
            fontWeight: 700,
            maxWidth: 520,
            minWidth: { sm: 360 },
            width: { xs: "100%", sm: "auto" },
          }}
        >
          {feedback?.message}
        </Alert>
      </Snackbar>
    </FeedbackContext.Provider>
  );
}

export function useAppFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error("useAppFeedback must be used inside FeedbackProvider.");
  }
  return context;
}
