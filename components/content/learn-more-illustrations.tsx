import { Box, type SxProps, type Theme } from "@mui/material";

type IllustrationProps = { sx?: SxProps<Theme> };
const frame = { display: "block", height: "auto", maxWidth: "100%", width: "100%" };

export function HospitalityHeroIllustration({ sx }: IllustrationProps) {
  return (
    <Box aria-hidden component="svg" viewBox="0 0 640 470" sx={{ ...frame, ...sx }}>
      <rect width="640" height="470" rx="28" fill="#EEF6FF" />
      <circle cx="548" cy="78" r="42" fill="#DCEEFF" />
      <path d="M65 382h510" stroke="#BCD8F5" strokeWidth="8" strokeLinecap="round" />
      <path d="M125 175 292 74l169 101v207H125V175Z" fill="#fff" stroke="#1E88E5" strokeWidth="8" strokeLinejoin="round" />
      <path d="M103 178 292 62l191 116" fill="none" stroke="#163B65" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="166" y="201" width="72" height="58" rx="8" fill="#CFE7FF" />
      <rect x="346" y="201" width="72" height="58" rx="8" fill="#CFE7FF" />
      <rect x="166" y="283" width="72" height="58" rx="8" fill="#CFE7FF" />
      <path d="M263 382V225c0-16 13-29 29-29s29 13 29 29v157" fill="#1E88E5" />
      <circle cx="292" cy="275" r="7" fill="#fff" />
      <rect x="407" y="102" width="176" height="112" rx="14" fill="#fff" stroke="#B8D2ED" strokeWidth="3" />
      <rect x="429" y="124" width="76" height="9" rx="4.5" fill="#163B65" />
      <rect x="429" y="145" width="122" height="7" rx="3.5" fill="#C4D4E5" />
      <path d="M429 188v-22m30 22v-35m30 35v-17m30 17v-46m30 46v-29" stroke="#1E88E5" strokeWidth="11" strokeLinecap="round" />
      <circle cx="104" cy="336" r="27" fill="#F4B184" />
      <path d="M69 382c3-34 17-51 35-51s32 17 35 51" fill="#163B65" />
      <circle cx="500" cy="344" r="27" fill="#8D5B42" />
      <path d="M464 382c4-33 18-50 36-50s32 17 36 50" fill="#28A779" />
      <circle cx="548" cy="78" r="17" fill="#FFBE55" />
    </Box>
  );
}

export function ConnectedTeamIllustration({ sx }: IllustrationProps) {
  return (
    <Box aria-hidden component="svg" viewBox="0 0 560 430" sx={{ ...frame, ...sx }}>
      <rect width="560" height="430" rx="28" fill="#F4F8FC" />
      <path d="M280 128V85M211 176l-70-50m208 50 70-50M210 259l-70 46m210-46 70 46" stroke="#9FC8F1" strokeWidth="7" strokeLinecap="round" />
      <rect x="190" y="128" width="180" height="148" rx="18" fill="#fff" stroke="#1E88E5" strokeWidth="6" />
      <rect x="216" y="153" width="82" height="10" rx="5" fill="#163B65" />
      <rect x="216" y="177" width="128" height="8" rx="4" fill="#C5D7E8" />
      <rect x="216" y="205" width="38" height="43" rx="7" fill="#CFE7FF" />
      <rect x="261" y="190" width="38" height="58" rx="7" fill="#80C2FF" />
      <rect x="306" y="169" width="38" height="79" rx="7" fill="#1E88E5" />
      <g><circle cx="280" cy="58" r="27" fill="#F4B184" /><path d="M240 112c4-38 19-57 40-57s36 19 40 57" fill="#163B65" /></g>
      <g><circle cx="105" cy="99" r="27" fill="#8D5B42" /><path d="M66 153c4-38 18-57 39-57s36 19 40 57" fill="#1E88E5" /></g>
      <g><circle cx="455" cy="99" r="27" fill="#D28B62" /><path d="M416 153c4-38 18-57 39-57s36 19 40 57" fill="#163B65" /></g>
      <g><circle cx="105" cy="329" r="27" fill="#B96F45" /><path d="M66 383c4-38 18-57 39-57s36 19 40 57" fill="#1E88E5" /></g>
      <g><circle cx="455" cy="329" r="27" fill="#F4B184" /><path d="M416 383c4-38 18-57 39-57s36 19 40 57" fill="#163B65" /></g>
      <circle cx="280" cy="202" r="12" fill="#28A779" />
      <path d="m274 202 5 5 9-11" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </Box>
  );
}

export function CloudOperationsIllustration({ sx }: IllustrationProps) {
  return (
    <Box aria-hidden component="svg" viewBox="0 0 560 390" sx={{ ...frame, ...sx }}>
      <rect width="560" height="390" rx="28" fill="#EAF4FF" />
      <path d="M187 132c7-41 41-71 83-71 34 0 64 20 77 50 7-3 15-5 24-5 35 0 63 28 63 63s-28 63-63 63H184c-34 0-62-27-62-61 0-30 22-56 51-61 3 7 8 15 14 22Z" fill="#fff" stroke="#1E88E5" strokeWidth="7" strokeLinejoin="round" />
      <path d="m247 164 29 28 51-59" fill="none" stroke="#28A779" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="75" y="242" width="144" height="92" rx="14" fill="#fff" stroke="#B8D2ED" strokeWidth="4" />
      <rect x="96" y="264" width="70" height="8" rx="4" fill="#163B65" />
      <rect x="96" y="285" width="101" height="7" rx="3.5" fill="#C4D4E5" />
      <circle cx="187" cy="316" r="8" fill="#28A779" />
      <rect x="342" y="238" width="104" height="137" rx="17" fill="#163B65" />
      <rect x="352" y="251" width="84" height="103" rx="10" fill="#fff" />
      <rect x="367" y="269" width="54" height="8" rx="4" fill="#1E88E5" />
      <rect x="367" y="290" width="40" height="7" rx="3.5" fill="#C4D4E5" />
      <rect x="367" y="312" width="54" height="24" rx="7" fill="#DDF0FF" />
      <circle cx="394" cy="364" r="5" fill="#fff" />
      <path d="M219 287h123M394 232v-19" stroke="#78B8F3" strokeWidth="6" strokeLinecap="round" strokeDasharray="8 12" />
      <circle cx="81" cy="80" r="18" fill="#FFBE55" />
      <circle cx="478" cy="94" r="13" fill="#28A779" />
    </Box>
  );
}
