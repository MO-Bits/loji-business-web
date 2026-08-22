import { Box, type SxProps, type Theme } from "@mui/material";

type IllustrationProps = { sx?: SxProps<Theme> };
const frame = { display: "block", height: "auto", maxWidth: "100%", width: "100%" };
const css = (name: string) => `var(--loji-illustration-${name})`;

const illustrationSx: SxProps<Theme> = {
  "--loji-illustration-bg": "#EEF6FF",
  "--loji-illustration-bg-soft": "#F4F8FC",
  "--loji-illustration-surface": "#FFFFFF",
  "--loji-illustration-primary": "#1E88E5",
  "--loji-illustration-ink": "#163B65",
  "--loji-illustration-muted": "#C4D4E5",
  "--loji-illustration-line": "#B8D2ED",
  "--loji-illustration-accent-soft": "#CFE7FF",
  "--loji-illustration-link": "#9FC8F1",
  "--loji-illustration-success": "#28A779",
  "--loji-illustration-warning": "#FFBE55",
  "--loji-illustration-skin": "#F4B184",
  "--loji-illustration-skin-dark": "#8D5B42",
  "--loji-illustration-skin-mid": "#D28B62",
  "--loji-illustration-skin-deep": "#B96F45",
  "--loji-illustration-blue-mid": "#80C2FF",
  "--loji-illustration-blue-line": "#78B8F3",
  "--loji-illustration-blue-pale": "#DDF0FF",
  "--loji-illustration-sun-bg": "#DCEEFF",
  ["[data-mui-color-scheme='dark'] &" as string]: {
    "--loji-illustration-bg": "#101A25",
    "--loji-illustration-bg-soft": "#111820",
    "--loji-illustration-surface": "#18232F",
    "--loji-illustration-primary": "#64B5F6",
    "--loji-illustration-ink": "#D8E7F5",
    "--loji-illustration-muted": "#73879A",
    "--loji-illustration-line": "#40566B",
    "--loji-illustration-accent-soft": "#203A50",
    "--loji-illustration-link": "#456E91",
    "--loji-illustration-blue-mid": "#3E8CCB",
    "--loji-illustration-blue-line": "#4F86B5",
    "--loji-illustration-blue-pale": "#20384B",
    "--loji-illustration-sun-bg": "#24384A",
  },
  "@media (prefers-color-scheme: dark)": {
    "[data-mui-color-scheme='system'] &": {
      "--loji-illustration-bg": "#101A25",
      "--loji-illustration-bg-soft": "#111820",
      "--loji-illustration-surface": "#18232F",
      "--loji-illustration-primary": "#64B5F6",
      "--loji-illustration-ink": "#D8E7F5",
      "--loji-illustration-muted": "#73879A",
      "--loji-illustration-line": "#40566B",
      "--loji-illustration-accent-soft": "#203A50",
      "--loji-illustration-link": "#456E91",
      "--loji-illustration-blue-mid": "#3E8CCB",
      "--loji-illustration-blue-line": "#4F86B5",
      "--loji-illustration-blue-pale": "#20384B",
      "--loji-illustration-sun-bg": "#24384A",
    },
  },
};

export function HospitalityHeroIllustration({ sx }: IllustrationProps) {
  return (
    <Box aria-hidden component="svg" viewBox="0 0 640 470" sx={[frame, illustrationSx, ...(Array.isArray(sx) ? sx : [sx])]}>
      <rect width="640" height="470" rx="28" fill={css("bg")} />
      <circle cx="548" cy="78" r="42" fill={css("sun-bg")} />
      <path d="M65 382h510" stroke={css("line")} strokeWidth="8" strokeLinecap="round" />
      <path d="M125 175 292 74l169 101v207H125V175Z" fill={css("surface")} stroke={css("primary")} strokeWidth="8" strokeLinejoin="round" />
      <path d="M103 178 292 62l191 116" fill="none" stroke={css("ink")} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="166" y="201" width="72" height="58" rx="8" fill={css("accent-soft")} />
      <rect x="346" y="201" width="72" height="58" rx="8" fill={css("accent-soft")} />
      <rect x="166" y="283" width="72" height="58" rx="8" fill={css("accent-soft")} />
      <path d="M263 382V225c0-16 13-29 29-29s29 13 29 29v157" fill={css("primary")} />
      <circle cx="292" cy="275" r="7" fill={css("surface")} />
      <rect x="407" y="102" width="176" height="112" rx="14" fill={css("surface")} stroke={css("line")} strokeWidth="3" />
      <rect x="429" y="124" width="76" height="9" rx="4.5" fill={css("ink")} />
      <rect x="429" y="145" width="122" height="7" rx="3.5" fill={css("muted")} />
      <path d="M429 188v-22m30 22v-35m30 35v-17m30 17v-46m30 46v-29" stroke={css("primary")} strokeWidth="11" strokeLinecap="round" />
      <circle cx="104" cy="336" r="27" fill={css("skin")} />
      <path d="M69 382c3-34 17-51 35-51s32 17 35 51" fill={css("ink")} />
      <circle cx="500" cy="344" r="27" fill={css("skin-dark")} />
      <path d="M464 382c4-33 18-50 36-50s32 17 36 50" fill={css("success")} />
      <circle cx="548" cy="78" r="17" fill={css("warning")} />
    </Box>
  );
}

export function ConnectedTeamIllustration({ sx }: IllustrationProps) {
  return (
    <Box aria-hidden component="svg" viewBox="0 0 560 430" sx={[frame, illustrationSx, ...(Array.isArray(sx) ? sx : [sx])]}>
      <rect width="560" height="430" rx="28" fill={css("bg-soft")} />
      <path d="M280 128V85M211 176l-70-50m208 50 70-50M210 259l-70 46m210-46 70 46" stroke={css("link")} strokeWidth="7" strokeLinecap="round" />
      <rect x="190" y="128" width="180" height="148" rx="18" fill={css("surface")} stroke={css("primary")} strokeWidth="6" />
      <rect x="216" y="153" width="82" height="10" rx="5" fill={css("ink")} />
      <rect x="216" y="177" width="128" height="8" rx="4" fill={css("muted")} />
      <rect x="216" y="205" width="38" height="43" rx="7" fill={css("accent-soft")} />
      <rect x="261" y="190" width="38" height="58" rx="7" fill={css("blue-mid")} />
      <rect x="306" y="169" width="38" height="79" rx="7" fill={css("primary")} />
      <g><circle cx="280" cy="58" r="27" fill={css("skin")} /><path d="M240 112c4-38 19-57 40-57s36 19 40 57" fill={css("ink")} /></g>
      <g><circle cx="105" cy="99" r="27" fill={css("skin-dark")} /><path d="M66 153c4-38 18-57 39-57s36 19 40 57" fill={css("primary")} /></g>
      <g><circle cx="455" cy="99" r="27" fill={css("skin-mid")} /><path d="M416 153c4-38 18-57 39-57s36 19 40 57" fill={css("ink")} /></g>
      <g><circle cx="105" cy="329" r="27" fill={css("skin-deep")} /><path d="M66 383c4-38 18-57 39-57s36 19 40 57" fill={css("primary")} /></g>
      <g><circle cx="455" cy="329" r="27" fill={css("skin")} /><path d="M416 383c4-38 18-57 39-57s36 19 40 57" fill={css("ink")} /></g>
      <circle cx="280" cy="202" r="12" fill={css("success")} />
      <path d="m274 202 5 5 9-11" fill="none" stroke={css("surface")} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </Box>
  );
}

export function CloudOperationsIllustration({ sx }: IllustrationProps) {
  return (
    <Box aria-hidden component="svg" viewBox="0 0 560 390" sx={[frame, illustrationSx, ...(Array.isArray(sx) ? sx : [sx])]}>
      <rect width="560" height="390" rx="28" fill={css("bg")} />
      <path d="M187 132c7-41 41-71 83-71 34 0 64 20 77 50 7-3 15-5 24-5 35 0 63 28 63 63s-28 63-63 63H184c-34 0-62-27-62-61 0-30 22-56 51-61 3 7 8 15 14 22Z" fill={css("surface")} stroke={css("primary")} strokeWidth="7" strokeLinejoin="round" />
      <path d="m247 164 29 28 51-59" fill="none" stroke={css("success")} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="75" y="242" width="144" height="92" rx="14" fill={css("surface")} stroke={css("line")} strokeWidth="4" />
      <rect x="96" y="264" width="70" height="8" rx="4" fill={css("ink")} />
      <rect x="96" y="285" width="101" height="7" rx="3.5" fill={css("muted")} />
      <circle cx="187" cy="316" r="8" fill={css("success")} />
      <rect x="342" y="238" width="104" height="137" rx="17" fill={css("ink")} />
      <rect x="352" y="251" width="84" height="103" rx="10" fill={css("surface")} />
      <rect x="367" y="269" width="54" height="8" rx="4" fill={css("primary")} />
      <rect x="367" y="290" width="40" height="7" rx="3.5" fill={css("muted")} />
      <rect x="367" y="312" width="54" height="24" rx="7" fill={css("blue-pale")} />
      <circle cx="394" cy="364" r="5" fill={css("surface")} />
      <path d="M219 287h123M394 232v-19" stroke={css("blue-line")} strokeWidth="6" strokeLinecap="round" strokeDasharray="8 12" />
      <circle cx="81" cy="80" r="18" fill={css("warning")} />
      <circle cx="478" cy="94" r="13" fill={css("success")} />
    </Box>
  );
}
