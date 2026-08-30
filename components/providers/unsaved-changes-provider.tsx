"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Alert,
  Button,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { useAppSession } from "@/features/session/hooks/use-app-session";

type NavigationAction = () => void | Promise<void>;
type DiscardAction = () => void;

type DirtySource = {
  discard?: DiscardAction;
};

type PendingNavigation = {
  discardActions: DiscardAction[];
  run: NavigationAction;
};

type UnsavedChangesContextValue = {
  clearDrafts: () => void;
  clearSource: (source: symbol) => void;
  deleteDraft: (key: string) => void;
  getDraft: <Draft>(key: string) => Draft | undefined;
  hasUnsavedChanges: boolean;
  requestNavigation: (action: NavigationAction) => Promise<boolean>;
  setDraft: <Draft>(key: string, draft: Draft) => void;
  setSourceDirty: (
    source: symbol,
    dirty: boolean,
    discard?: DiscardAction,
  ) => void;
};

const UnsavedChangesContext =
  createContext<UnsavedChangesContextValue | null>(null);

/**
 * Owns the confirmation UI for in-app navigation and the native document-leave
 * warning. Forms register themselves with `useUnsavedChanges`.
 */
export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const { loading: sessionLoading, session } = useAppSession();
  const sourcesRef = useRef(new Map<symbol, DirtySource>());
  const draftsRef = useRef(new Map<string, unknown>());
  const sessionScopeRef = useRef<string | null>(null);
  const pendingRef = useRef<PendingNavigation | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pending, setPending] = useState<PendingNavigation | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const clearDrafts = useCallback(() => {
    draftsRef.current.clear();
  }, []);

  const getDraft = useCallback(
    <Draft,>(key: string) => draftsRef.current.get(key) as Draft | undefined,
    [],
  );

  const setDraft = useCallback(<Draft,>(key: string, draft: Draft) => {
    draftsRef.current.set(key, draft);
  }, []);

  const deleteDraft = useCallback((key: string) => {
    draftsRef.current.delete(key);
  }, []);

  const setSourceDirty = useCallback((
    source: symbol,
    dirty: boolean,
    discard?: DiscardAction,
  ) => {
    const sources = sourcesRef.current;
    const existing = sources.get(source);

    if (dirty) {
      if (existing?.discard === discard) return;
      sources.set(source, { discard });
    } else {
      if (!existing) return;
      sources.delete(source);
    }
    setHasUnsavedChanges(sources.size > 0);
  }, []);

  const clearSource = useCallback(
    (source: symbol) => setSourceDirty(source, false),
    [setSourceDirty],
  );

  const requestNavigation = useCallback(
    async (action: NavigationAction) => {
      if (sourcesRef.current.size === 0) {
        await action();
        return true;
      }

      if (pendingRef.current) return false;

      setActionError(null);
      const nextPending = {
        discardActions: Array.from(sourcesRef.current.values()).flatMap(
          (source) => source.discard ? [source.discard] : [],
        ),
        run: action,
      };
      pendingRef.current = nextPending;
      setPending(nextPending);
      return false;
    },
    [],
  );

  const keepEditing = useCallback(() => {
    if (continuing) return;
    setActionError(null);
    pendingRef.current = null;
    setPending(null);
  }, [continuing]);

  const discardAndContinue = useCallback(async () => {
    if (!pending || continuing) return;
    setContinuing(true);
    setActionError(null);
    try {
      await pending.run();
      pending.discardActions.forEach((discard) => {
        try {
          discard();
        } catch {
          // Draft cleanup must never turn a completed navigation into an error.
        }
      });
      pendingRef.current = null;
      setPending(null);
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : t(
              "We could not complete that navigation.",
              "Hatukuweza kukamilisha uhamisho huo.",
            ),
      );
    } finally {
      setContinuing(false);
    }
  }, [continuing, pending, t]);

  useEffect(() => {
    if (sessionLoading) return;
    const nextScope = [
      session?.user?.id ?? "anonymous",
      session?.activePropertyId ?? "no-property",
      session?.activeRole ?? "no-role",
    ].join(":");
    const previousScope = sessionScopeRef.current;
    sessionScopeRef.current = nextScope;
    if (previousScope === null || previousScope === nextScope) return;

    draftsRef.current.clear();
  }, [session?.activePropertyId, session?.activeRole, session?.user?.id, sessionLoading]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedChanges]);

  const value = useMemo<UnsavedChangesContextValue>(
    () => ({
      clearDrafts,
      clearSource,
      deleteDraft,
      getDraft,
      hasUnsavedChanges,
      requestNavigation,
      setDraft,
      setSourceDirty,
    }),
    [
      clearDrafts,
      clearSource,
      deleteDraft,
      getDraft,
      hasUnsavedChanges,
      requestNavigation,
      setDraft,
      setSourceDirty,
    ],
  );

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      <ResponsiveModal
        maxWidth="xs"
        onClose={continuing ? undefined : keepEditing}
        open={Boolean(pending)}
      >
        <DialogTitle>
          {t("Leave without saving?", "Ondoka bila kuhifadhi?")}
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            {t(
              "You have unsaved changes. If you leave now, those changes will be discarded.",
              "Una mabadiliko ambayo hayajahifadhiwa. Ukiondoka sasa, mabadiliko hayo yataondolewa.",
            )}
          </Typography>
          {actionError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {actionError}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button disabled={continuing} onClick={keepEditing}>
            {t("Keep editing", "Endelea kuhariri")}
          </Button>
          <Button
            color="error"
            disabled={continuing}
            onClick={() => void discardAndContinue()}
            startIcon={
              continuing ? <CircularProgress color="inherit" size={16} /> : undefined
            }
            variant="contained"
          >
            {continuing
              ? t("Leaving…", "Inaondoka…")
              : t("Discard and leave", "Ondoa na uondoke")}
          </Button>
        </DialogActions>
      </ResponsiveModal>
    </UnsavedChangesContext.Provider>
  );
}

export function useDirtyNavigation() {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error(
      "useDirtyNavigation must be used inside UnsavedChangesProvider.",
    );
  }
  return {
    clearDrafts: context.clearDrafts,
    hasUnsavedChanges: context.hasUnsavedChanges,
    requestNavigation: context.requestNavigation,
  };
}

/** Registers one form and returns a synchronous escape hatch for a saved form. */
export function useUnsavedChanges(dirty: boolean, onDiscard?: DiscardAction) {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error(
      "useUnsavedChanges must be used inside UnsavedChangesProvider.",
    );
  }

  const sourceRef = useRef(Symbol("unsaved-form"));
  const { clearSource, setSourceDirty } = context;

  useEffect(() => {
    const source = sourceRef.current;
    setSourceDirty(source, dirty, onDiscard);
    return () => clearSource(source);
  }, [clearSource, dirty, onDiscard, setSourceDirty]);

  return useCallback(
    () => clearSource(sourceRef.current),
    [clearSource],
  );
}

/**
 * Keeps sensitive form recovery data in memory only. It survives App Router
 * Back/Forward transitions, but never enters storage, URLs, history state or
 * analytics payloads.
 */
export function useEphemeralDraft<Draft>(key: string) {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error(
      "useEphemeralDraft must be used inside UnsavedChangesProvider.",
    );
  }
  const { deleteDraft, getDraft, setDraft } = context;

  return useMemo(
    () => ({
      clear: () => deleteDraft(key),
      read: () => getDraft<Draft>(key),
      write: (draft: Draft) => setDraft(key, draft),
    }),
    [deleteDraft, getDraft, key, setDraft],
  );
}
