"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  DialogContent,
  DialogTitle,
  Divider,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { createClient } from "@/lib/supabase/client";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { getWorkspaceCapabilities } from "@/features/session/permissions";
import { getProperty } from "@/features/more/services/more-service";
import type { Json } from "@/types/database.types";

type PropertyRow = Awaited<ReturnType<typeof getProperty>>;

function stringList(value: Json | undefined) {
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

function textValue(value: Json | undefined | null) {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function propertyType(property: NonNullable<PropertyRow>) {
  return textValue(property.property_type) || textValue(property.type) || "Property";
}

export function PropertyDetails() {
  const router = useRouter();
  const { session } = useAppSession();
  const supabase = useMemo(() => createClient(), []);
  const [property, setProperty] = useState<PropertyRow>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const capabilities = getWorkspaceCapabilities(session?.activeRole);
  const propertyId = session?.activePropertyId;

  useEffect(() => {
    let live = true;
    const timer = window.setTimeout(() => {
      if (!propertyId) {
        setProperty(null);
        setError("No active property was found.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      getProperty(supabase, propertyId)
        .then((value) => {
          if (live) setProperty(value);
        })
        .catch((cause) => {
          if (live) {
            setError(
              cause instanceof Error ? cause.message : "Unable to load property.",
            );
          }
        })
        .finally(() => {
          if (live) setLoading(false);
        });
    }, 0);

    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [propertyId, reloadKey, supabase]);

  if (loading) return <PropertySkeleton />;
  if (error || !property) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 6, sm: 10 } }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={() => setReloadKey((current) => current + 1)} startIcon={<RefreshRoundedIcon />}>
              Retry
            </Button>
          }
        >
          {error ?? "Property not found."}
        </Alert>
      </Container>
    );
  }

  const images = stringList(property.images);
  const amenities = stringList(property.amenities);
  const name = textValue(property.name) || "Property";
  const type = propertyType(property);
  const address = textValue(property.formatted_address) || textValue(property.address);
  const phone = textValue(property.phone);
  const email = textValue(property.email);
  const description = textValue(property.description);

  return (
    <Box component="section" sx={{ py: { xs: 2, sm: 3, lg: 4 } }}>
      <Container maxWidth="xl">
        <Stack spacing={{ xs: 2.25, sm: 3 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ alignItems: { sm: "flex-start" }, justifyContent: "space-between" }}
          >
            <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
              <Button
                aria-label="Go back"
                color="inherit"
                onClick={() => router.back()}
                size="small"
                startIcon={<ArrowBackRoundedIcon />}
                sx={{ display: { xs: "none", sm: "inline-flex" }, mt: 0.25 }}
              >
                Back
              </Button>
              <Box>
                <Typography color="text.secondary" variant="overline">
                  Workspace profile
                </Typography>
                <Typography component="h1" variant="h3" sx={{ mt: 0.1 }}>
                  Property profile
                </Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                  The public-facing details and operational identity for this property.
                </Typography>
              </Box>
            </Stack>
            {capabilities.canManageProperty ? (
              <Button
                onClick={() => setEditOpen(true)}
                startIcon={<EditRoundedIcon />}
                variant="contained"
                sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}
              >
                Edit property
              </Button>
            ) : null}
          </Stack>

          <Box
            sx={{
              bgcolor: "#173A30",
              border: 1,
              borderColor: "rgba(14,73,53,.32)",
              borderRadius: 1.5,
              color: "#F8FAFC",
              minHeight: { xs: 244, sm: 270 },
              overflow: "hidden",
              position: "relative",
            }}
          >
            {images[0] ? (
              <Box
                alt={name}
                component="img"
                src={images[0]}
                sx={{
                  height: "100%",
                  inset: 0,
                  objectFit: "cover",
                  opacity: 0.44,
                  position: "absolute",
                  width: "100%",
                }}
              />
            ) : null}
            <Box
              aria-hidden="true"
              sx={{
                background:
                  "linear-gradient(90deg, rgba(10,41,31,.96) 0%, rgba(12,57,42,.84) 53%, rgba(12,57,42,.28) 100%)",
                inset: 0,
                position: "absolute",
              }}
            />
            <Stack
              spacing={1.25}
              sx={{ alignItems: "flex-start", justifyContent: "flex-end", minHeight: { xs: 244, sm: 270 }, p: { xs: 2.25, sm: 3, md: 3.5 }, position: "relative" }}
            >
              <Chip
                icon={<ApartmentRoundedIcon />}
                label={type}
                size="small"
                sx={{
                  bgcolor: "rgba(255,255,255,.14)",
                  color: "#F8FAFC",
                  fontWeight: 700,
                  "& .MuiChip-icon": { color: "inherit" },
                  textTransform: "capitalize",
                }}
              />
              <Typography component="h2" variant="h2" sx={{ color: "inherit", maxWidth: 760 }}>
                {name}
              </Typography>
              {address ? (
                <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", color: "rgba(248,250,252,.78)" }}>
                  <PlaceRoundedIcon fontSize="small" />
                  <Typography variant="body2">{address}</Typography>
                </Stack>
              ) : (
                <Typography sx={{ color: "rgba(248,250,252,.68)" }} variant="body2">
                  Location details have not been added yet.
                </Typography>
              )}
            </Stack>
          </Box>

          <Box
            sx={{
              display: "grid",
              gap: { xs: 2.25, lg: 3 },
              gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1.14fr) minmax(320px, .86fr)" },
            }}
          >
            <Stack spacing={2.25}>
              <SectionPanel
                title="About this property"
                description="The introduction guests and staff use to understand the property."
                icon={<InfoOutlinedIcon fontSize="small" />}
              >
                <Typography
                  color={description ? "text.primary" : "text.secondary"}
                  sx={{ lineHeight: 1.75, p: { xs: 2, sm: 2.5 }, pt: { xs: 0.5, sm: 0.75 } }}
                  variant="body2"
                >
                  {description || "No property description has been added yet."}
                </Typography>
              </SectionPanel>

              <SectionPanel
                title="Amenities"
                description="Facilities currently listed for this property."
                icon={<LocalOfferRoundedIcon fontSize="small" />}
              >
                <Box sx={{ p: { xs: 2, sm: 2.5 }, pt: { xs: 0.75, sm: 1 } }}>
                  {amenities.length ? (
                    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75 }}>
                      {amenities.map((amenity) => (
                        <Chip key={amenity} label={amenity} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  ) : (
                    <Typography color="text.secondary" variant="body2">
                      No amenities have been listed yet.
                    </Typography>
                  )}
                </Box>
              </SectionPanel>

              {images.length ? (
                <SectionPanel
                  title="Property gallery"
                  description={`${images.length} ${images.length === 1 ? "image" : "images"} in the current gallery.`}
                  icon={<ImageRoundedIcon fontSize="small" />}
                >
                  <Gallery images={images} name={name} />
                </SectionPanel>
              ) : null}
            </Stack>

            <Stack spacing={2.25}>
              <SectionPanel
                title="Contact details"
                description="How guests and staff can reach this property."
                icon={<PhoneRoundedIcon fontSize="small" />}
              >
                <Box>
                  <InfoLine icon={<PhoneRoundedIcon />} label="Phone" value={phone} />
                  <Divider />
                  <InfoLine icon={<EmailRoundedIcon />} label="Email" value={email} />
                  <Divider />
                  <InfoLine icon={<PlaceRoundedIcon />} label="Address" value={address} />
                </Box>
              </SectionPanel>

              <Box
                sx={{
                  bgcolor: "background.paper",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  p: { xs: 2, sm: 2.5 },
                }}
              >
                <Stack spacing={1.25}>
                  <Box
                    sx={{
                      alignItems: "center",
                      bgcolor: "rgba(23,107,77,.1)",
                      borderRadius: 1,
                      color: "primary.main",
                      display: "grid",
                      height: 36,
                      placeItems: "center",
                      width: 36,
                    }}
                  >
                    <ApartmentRoundedIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Workspace identity
                    </Typography>
                    <Typography color="text.secondary" variant="body2" sx={{ mt: 0.35 }}>
                      Keep this profile current so your team works from the same information.
                    </Typography>
                  </Box>
                  {capabilities.canManageProperty ? (
                    <Button onClick={() => setEditOpen(true)} startIcon={<EditRoundedIcon />} variant="outlined">
                      Review property settings
                    </Button>
                  ) : null}
                </Stack>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </Container>

      <ResponsiveModal open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm">
        <DialogTitle>Property settings</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
            Choose the property information you would like to review.
          </Typography>
          <Stack divider={<Divider flexItem />}>
            {[
              "Basic information",
              "Contact information",
              "Amenities",
              "Photos",
              "Check-in & check-out",
              "Policies",
            ].map((item) => (
              <Button
                key={item}
                fullWidth
                onClick={() => setEditOpen(false)}
                sx={{ justifyContent: "flex-start", minHeight: 52, px: 0.5 }}
              >
                {item}
              </Button>
            ))}
          </Stack>
        </DialogContent>
      </ResponsiveModal>
    </Box>
  );
}

function SectionPanel({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start", p: { xs: 2, sm: 2.5 }, pb: { xs: 1.25, sm: 1.5 } }}>
        <Box
          sx={{
            alignItems: "center",
            bgcolor: "rgba(23,107,77,.1)",
            borderRadius: 1,
            color: "primary.main",
            display: "grid",
            flex: "0 0 auto",
            height: 34,
            placeItems: "center",
            width: 34,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mt: 0.25 }}>
            {description}
          </Typography>
        </Box>
      </Stack>
      {children}
    </Box>
  );
}

function InfoLine({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Stack
      direction="row"
      spacing={1.25}
      sx={{ alignItems: "center", minHeight: 66, px: { xs: 2, sm: 2.5 }, py: 1.25 }}
    >
      <Box sx={{ color: "primary.main", display: "grid", placeItems: "center" }}>{icon}</Box>
      <Typography color="text.secondary" variant="body2" sx={{ flex: "0 0 72px" }}>
        {label}
      </Typography>
      <Typography align="right" variant="body2" sx={{ flex: 1, fontWeight: 600, overflowWrap: "anywhere" }}>
        {value || "Not provided"}
      </Typography>
    </Stack>
  );
}

function Gallery({ images, name }: { images: string[]; name: string }) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 0.75,
        gridAutoRows: { xs: 108, sm: 138 },
        gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))" },
        p: { xs: 2, sm: 2.5 },
        pt: { xs: 0.75, sm: 1 },
      }}
    >
      {images.map((image, index) => (
        <Box
          key={image}
          sx={{
            borderRadius: 0.75,
            gridColumn: index === 0 && images.length > 1 ? { xs: "span 2", sm: "span 2" } : undefined,
            gridRow: index === 0 && images.length > 2 ? { sm: "span 2" } : undefined,
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <Box
            alt={`${name} ${index + 1}`}
            component="img"
            loading="lazy"
            src={image}
            sx={{ height: "100%", objectFit: "cover", transition: "transform 180ms ease", width: "100%", "&:hover": { transform: "scale(1.025)" } }}
          />
        </Box>
      ))}
    </Box>
  );
}

function PropertySkeleton() {
  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, lg: 4 } }}>
      <Stack spacing={3}>
        <Box><Skeleton width={124} /><Skeleton height={38} width="26%" /><Skeleton width="44%" /></Box>
        <Skeleton height={270} variant="rectangular" sx={{ borderRadius: 1.5 }} />
        <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", lg: "1.14fr .86fr" } }}>
          {[0, 1, 2, 3].map((item) => (
            <Box key={item} sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2.5 }}>
              <Skeleton width="38%" /><Skeleton width="65%" />
              <Stack spacing={1} sx={{ mt: 2 }}><Skeleton height={28} /><Skeleton height={28} /><Skeleton height={28} /></Stack>
            </Box>
          ))}
        </Box>
      </Stack>
    </Container>
  );
}
