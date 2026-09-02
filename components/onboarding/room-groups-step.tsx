"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import {
  configuredRoomCount,
  createRoomGroup,
  setupRoomTypes,
  type RoomGroupDraft,
  type SetupRoomType,
} from "@/features/onboarding/models/business-setup";

export function RoomGroupsStep({
  groups,
  roomCount,
  onChange,
}: {
  groups: RoomGroupDraft[];
  roomCount: number;
  onChange: (groups: RoomGroupDraft[]) => void;
}) {
  const { t } = useLanguage();
  const assigned = configuredRoomCount(groups);
  const remaining = roomCount - assigned;

  const update = (id: string, patch: Partial<RoomGroupDraft>) => {
    onChange(groups.map((group) => (group.id === id ? { ...group, ...patch } : group)));
  };

  const changeType = (group: RoomGroupDraft, value: SetupRoomType) => {
    const definition = setupRoomTypes.find((option) => option.value === value);
    update(group.id, {
      roomType: value,
      capacity: definition?.capacity ?? group.capacity,
      bedCount: definition?.beds ?? group.bedCount,
    });
  };

  const addGroup = () => {
    if (remaining > 0) {
      onChange([...groups, createRoomGroup(remaining)]);
      return;
    }
    const donorIndex = groups.findIndex((group) => group.count > 1);
    if (donorIndex < 0) return;
    const next = groups.map((group, index) =>
      index === donorIndex ? { ...group, count: group.count - 1 } : group,
    );
    onChange([...next, createRoomGroup(1)]);
  };

  const removeGroup = (id: string) => {
    const removed = groups.find((group) => group.id === id);
    const next = groups.filter((group) => group.id !== id);
    if (!removed || !next.length) return;
    next[0] = { ...next[0], count: next[0].count + removed.count };
    onChange(next);
  };

  return (
    <Stack spacing={2}>
      <Alert
        icon={<HotelRoundedIcon />}
        severity={remaining === 0 ? "success" : "info"}
        variant="outlined"
      >
        {remaining === 0
          ? t(
              `All ${roomCount} rooms are configured. Loji will name them automatically; you can rename them later.`,
              `Vyumba vyote ${roomCount} vimepangwa. Loji itavipa majina moja kwa moja; unaweza kuyabadilisha baadaye.`,
            )
          : t(
              `${assigned} of ${roomCount} rooms configured. Add ${remaining} more.`,
              `Vyumba ${assigned} kati ya ${roomCount} vimepangwa. Ongeza ${remaining} zaidi.`,
            )}
      </Alert>

      {groups.map((group, index) => (
        <Box
          key={group.id}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2.5,
            p: { xs: 2, sm: 2.5 },
          }}
        >
          <Stack
            direction="row"
            sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}
          >
            <Box>
              <Typography sx={{ fontWeight: 700 }}>
                {t(`Room group ${index + 1}`, `Kundi la vyumba ${index + 1}`)}
              </Typography>
              <Typography color="text.secondary" variant="caption">
                {t("Rooms with the same type and price", "Vyumba vyenye aina na bei inayofanana")}
              </Typography>
            </Box>
            {groups.length > 1 ? (
              <IconButton
                aria-label={t("Remove room group", "Ondoa kundi la vyumba")}
                onClick={() => removeGroup(group.id)}
                size="small"
              >
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            ) : null}
          </Stack>

          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" },
            }}
          >
            <TextField
              fullWidth
              label={t("Room type", "Aina ya chumba")}
              onChange={(event) => changeType(group, event.target.value as SetupRoomType)}
              select
              value={group.roomType}
            >
              {setupRoomTypes.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {t(option.label[0], option.label[1])}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              label={t("How many rooms?", "Vyumba vingapi?")}
              onChange={(event) =>
                update(group.id, {
                  count: Math.max(1, Math.min(roomCount, Number(event.target.value) || 1)),
                })
              }
              slotProps={{ htmlInput: { inputMode: "numeric", min: 1, max: roomCount } }}
              type="number"
              value={group.count}
            />
            <TextField
              fullWidth
              label={t("Price per night", "Bei kwa usiku")}
              onChange={(event) =>
                update(group.id, {
                  pricePerNight: event.target.value.replace(/[^0-9]/g, "").slice(0, 9),
                })
              }
              slotProps={{
                input: { startAdornment: <InputAdornment position="start">TZS</InputAdornment> },
                htmlInput: { inputMode: "numeric" },
              }}
              value={group.pricePerNight}
            />
            <TextField
              fullWidth
              label={t("Maximum guests", "Idadi ya juu ya wageni")}
              onChange={(event) => {
                const capacity = Math.max(1, Math.min(20, Number(event.target.value) || 1));
                update(group.id, {
                  capacity,
                  bedCount: Math.min(group.bedCount, capacity),
                });
              }}
              slotProps={{ htmlInput: { inputMode: "numeric", min: 1, max: 20 } }}
              type="number"
              value={group.capacity}
            />
            <TextField
              fullWidth
              label={t("Number of beds", "Idadi ya vitanda")}
              onChange={(event) =>
                update(group.id, {
                  bedCount: Math.max(
                    1,
                    Math.min(group.capacity, Number(event.target.value) || 1),
                  ),
                })
              }
              slotProps={{
                htmlInput: { inputMode: "numeric", min: 1, max: group.capacity },
              }}
              type="number"
              value={group.bedCount}
            />
          </Box>
        </Box>
      ))}

      <Button
        disabled={roomCount <= groups.length}
        onClick={addGroup}
        startIcon={<AddRoundedIcon />}
        sx={{ alignSelf: "flex-start" }}
        variant="outlined"
      >
        {t("Add another room type", "Ongeza aina nyingine ya chumba")}
      </Button>
    </Stack>
  );
}
