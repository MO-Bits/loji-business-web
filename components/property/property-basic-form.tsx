"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import AddPhotoAlternateRoundedIcon from "@mui/icons-material/AddPhotoAlternateRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import { Alert, Box, Button, Chip, Container, FormControl, IconButton, InputLabel, MenuItem, Paper, Select, Snackbar, Stack, TextField, Typography } from "@mui/material";
import { usePropertyController } from "@/features/property/hooks/use-property-controller";
import type { PropertyType } from "@/features/property/models/property";
import { MAX_PROPERTY_IMAGE_BYTES, MAX_PROPERTY_IMAGES } from "@/features/property/services/property-service";

const amenities = ["WiFi", "Parking", "Swimming Pool", "Restaurant", "Bar", "Air Conditioning", "Breakfast", "24/7 Reception", "Laundry", "Security", "Gym", "Conference Room"];
const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: "hotel", label: "Hotel" }, { value: "lodge", label: "Lodge" },
  { value: "apartment", label: "Apartment" }, { value: "guesthouse", label: "Guesthouse" },
];

export function PropertyBasicForm() {
  const router = useRouter();
  const controller = usePropertyController();
  const [type, setType] = useState<PropertyType>("hotel");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  const pickFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length + picked.length > MAX_PROPERTY_IMAGES) return setLocalError("You can upload up to 3 photos.");
    const tooLarge = picked.find((file) => file.size > MAX_PROPERTY_IMAGE_BYTES);
    if (tooLarge) return setLocalError(`${tooLarge.name} is larger than 5 MB.`);
    setFiles((current) => [...current, ...picked]);
  };

  const submit = async () => {
    if (!name.trim() || !phone.trim()) return setLocalError("Property name and phone are required.");
    if (!selectedAmenities.length) return setLocalError("Select at least one facility.");
    if (!files.length) return setLocalError("Add at least one property photo.");
    try {
      await controller.createProperty({ name, type, phone, email, amenities: selectedAmenities }, files);
      router.replace("/");
    } catch { /* controller exposes the message */ }
  };

  return (
    <Box component="main" sx={{ minHeight: "100dvh", pb: 14, pt: { xs: 2, md: 5 } }}>
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Button startIcon={<ArrowBackRoundedIcon />} color="inherit" onClick={() => router.back()} sx={{ alignSelf: "flex-start" }}>Back</Button>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Box sx={{ bgcolor: "primary.main", borderRadius: 3, color: "primary.contrastText", display: "grid", height: 56, placeItems: "center", width: 56 }}><HotelRoundedIcon /></Box>
            <Box><Typography variant="h4">Create your property profile</Typography><Typography color="text.secondary">Property details · Step 2 of 3</Typography></Box>
          </Stack>

          <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}>
            <Stack spacing={2.5}>
              <Typography variant="h6">Property details</Typography>
              <FormControl fullWidth><InputLabel>Property type</InputLabel><Select value={type} label="Property type" onChange={(e) => setType(e.target.value as PropertyType)}>{propertyTypes.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}</Select></FormControl>
              <TextField label="Property name" required value={name} onChange={(e) => setName(e.target.value)} />
              <TextField label="Phone" required value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^+\d]/g, ""))} inputMode="tel" />
              <TextField label="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}>
            <Stack spacing={2}><Box><Typography variant="h6">Amenities</Typography><Typography color="text.secondary">Select everything available at your property.</Typography></Box>
              <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>{amenities.map((item) => { const selected = selectedAmenities.includes(item); return <Chip key={item} label={item} clickable color={selected ? "primary" : "default"} variant={selected ? "filled" : "outlined"} onClick={() => setSelectedAmenities((current) => selected ? current.filter((value) => value !== item) : [...current, item])} />; })}</Stack>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}>
            <Stack spacing={2}><Box><Typography variant="h6">Property photos</Typography><Typography color="text.secondary">Add 1–3 photos. The first photo is your cover.</Typography></Box>
              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" } }}>
                {previews.map((url, index) => <Box key={url} sx={{ aspectRatio: "4 / 3", borderRadius: 2, overflow: "hidden", position: "relative" }}><Box component="img" alt={`Property photo ${index + 1}`} src={url} sx={{ height: "100%", objectFit: "cover", width: "100%" }} />{index === 0 && <Chip label="Cover" color="primary" size="small" sx={{ left: 8, position: "absolute", top: 8 }} />}<IconButton aria-label="Remove photo" onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} sx={{ bgcolor: "rgba(0,0,0,.65)", color: "white", position: "absolute", right: 8, top: 8, "&:hover": { bgcolor: "rgba(0,0,0,.8)" } }}><CloseRoundedIcon /></IconButton></Box>)}
                {files.length < 3 && <Button component="label" variant="outlined" startIcon={<AddPhotoAlternateRoundedIcon />} sx={{ aspectRatio: "4 / 3", borderStyle: "dashed" }}>Add photos<input hidden multiple accept="image/*" type="file" onChange={pickFiles} /></Button>}
              </Box>
            </Stack>
          </Paper>
        </Stack>
      </Container>

      <Paper elevation={8} square sx={{ bottom: 0, left: 0, p: 2, position: "fixed", right: 0, zIndex: 10 }}><Container maxWidth="md"><Button fullWidth size="large" variant="contained" disabled={controller.loading} onClick={submit}>{controller.loading ? "Creating your property…" : "Create property"}</Button></Container></Paper>
      <Snackbar open={Boolean(localError || controller.error)} autoHideDuration={5000} onClose={() => { setLocalError(null); controller.clearError(); }}><Alert severity="error" variant="filled">{localError || controller.error}</Alert></Snackbar>
    </Box>
  );
}
