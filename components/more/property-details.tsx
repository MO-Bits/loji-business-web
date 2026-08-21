"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  ImageList,
  ImageListItem,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { createClient } from "@/lib/supabase/client";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { getProperty } from "@/features/more/services/more-service";
import type { Json } from "@/types/database.types";

type PropertyRow = Awaited<ReturnType<typeof getProperty>>;
function strings(value: Json | undefined) {
  return Array.isArray(value)
    ? value
        .map((item) =>
          typeof item === "string"
            ? item
            : item &&
                typeof item === "object" &&
                !Array.isArray(item) &&
                typeof item.url === "string"
              ? item.url
              : "",
        )
        .filter(Boolean)
    : [];
}

export function PropertyDetails() {
  const router = useRouter();
  const { session } = useAppSession();
  const supabase = useMemo(() => createClient(), []);
  const [property, setProperty] = useState<PropertyRow>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  useEffect(() => {
    if (!session?.activePropertyId) return;
    let live = true;
    getProperty(supabase, session.activePropertyId)
      .then((value) => {
        if (live) setProperty(value);
      })
      .catch((cause) => {
        if (live)
          setError(
            cause instanceof Error ? cause.message : "Unable to load property.",
          );
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [session?.activePropertyId, supabase]);
  if (loading)
    return (
      <Box sx={{ display: "grid", minHeight: "70dvh", placeItems: "center" }}>
        <CircularProgress size={28} />
      </Box>
    );
  if (error || !property)
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error">{error ?? "Property not found"}</Alert>
      </Container>
    );
  const images = strings(property.images);
  const amenities = strings(property.amenities);
  const name = String(property.name ?? "Property");
  return (
    <Box sx={{ pb: 6 }}>
      <Box
        sx={{
          bgcolor: "#14345B",
          color: "white",
          minHeight: 230,
          position: "relative",
        }}
      >
        {images[0] && (
          <Box
            component="img"
            src={images[0]}
            alt={name}
            sx={{
              height: "100%",
              inset: 0,
              objectFit: "cover",
              opacity: 0.55,
              position: "absolute",
              width: "100%",
            }}
          />
        )}
        <Container maxWidth="md" sx={{ pb: 4, pt: 2, position: "relative" }}>
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <IconButton
              aria-label="Back"
              onClick={() => router.back()}
              sx={{ bgcolor: "rgba(0,0,0,.28)", color: "white" }}
            >
              <ArrowBackRoundedIcon />
            </IconButton>
            <IconButton
              aria-label="Edit property"
              onClick={() => setEditOpen(true)}
              sx={{ bgcolor: "rgba(0,0,0,.28)", color: "white" }}
            >
              <EditRoundedIcon />
            </IconButton>
          </Stack>
          <Typography variant="h3" sx={{ fontWeight: 700, mt: 8 }}>
            {name}
          </Typography>
          <Typography sx={{ opacity: 0.82, textTransform: "capitalize" }}>
            {String(property.property_type ?? property.type ?? "")}
          </Typography>
        </Container>
      </Box>
      <Container maxWidth="md" sx={{ pt: 3 }}>
        <Stack spacing={3}>
          <Section title="Contact">
            <Info icon={<PhoneRoundedIcon />} value={property.phone} />
            <Info icon={<EmailRoundedIcon />} value={property.email} />
            <Info
              icon={<PlaceRoundedIcon />}
              value={property.formatted_address ?? property.address}
            />
          </Section>
          <Section title="About">
            <Typography
              color={property.description ? "text.primary" : "text.secondary"}
              sx={{ lineHeight: 1.7 }}
            >
              {String(property.description ?? "No description added yet.")}
            </Typography>
          </Section>
          <Section title="Amenities">
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
              {amenities.length ? (
                amenities.map((item) => (
                  <Chip
                    key={item}
                    label={item}
                    color="primary"
                    variant="outlined"
                  />
                ))
              ) : (
                <Typography color="text.secondary">
                  No amenities added yet.
                </Typography>
              )}
            </Stack>
          </Section>
          {images.length > 0 && (
            <Section title="Gallery">
              <ImageList cols={Math.min(images.length, 3)} gap={8}>
                {images.map((image) => (
                  <ImageListItem key={image}>
                    <Box
                      component="img"
                      src={image}
                      alt={name}
                      loading="lazy"
                      sx={{
                        aspectRatio: "4/3",
                        borderRadius: 1,
                        objectFit: "cover",
                      }}
                    />
                  </ImageListItem>
                ))}
              </ImageList>
            </Section>
          )}
        </Stack>
      </Container>
      <ResponsiveModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="sm"
      >
        <DialogTitle>Edit Property</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Choose what you would like to update.
          </Typography>
          {[
            "Basic Information",
            "Contact Information",
            "Amenities",
            "Photos",
            "Check-in & Check-out",
            "Policies",
          ].map((item) => (
            <Box key={item}>
              <Button
                fullWidth
                onClick={() => setEditOpen(false)}
                sx={{ justifyContent: "flex-start", py: 1.5 }}
              >
                {item}
              </Button>
              <Divider />
            </Box>
          ))}
        </DialogContent>
      </ResponsiveModal>
    </Box>
  );
}
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1.2 }}>
        {title}
      </Typography>
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        {children}
      </Paper>
    </Box>
  );
}
function Info({
  icon,
  value,
}: {
  icon: React.ReactNode;
  value: Json | undefined;
}) {
  return value ? (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", py: 0.8 }}>
      {icon}
      <Typography>{String(value)}</Typography>
    </Stack>
  ) : null;
}
