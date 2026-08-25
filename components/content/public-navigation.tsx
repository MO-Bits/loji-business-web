"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import {
  Box, Button, Divider, Drawer, IconButton, Link, List, ListItemButton,
  ListItemText, Menu, MenuItem, Select, Stack, Typography,
} from "@mui/material";
import { useState } from "react";

import { useLanguage } from "@/components/providers/language-provider";
import { BrandLockup } from "@/components/shared/brand-lockup";
import { ThemeModeSelect } from "@/components/shared/theme-mode-select";

const publicPaths = [
  "/login", "/learn-more", "/features", "/solutions", "/how-it-works", "/faq",
  "/help", "/security", "/updates", "/contact", "/terms", "/privacy",
] as const;

export function PublicNavigation() {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resourcesAnchor, setResourcesAnchor] = useState<null | HTMLElement>(null);

  const isPublicPage = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (!isPublicPage) return null;

  const mainItems = [
    { href: "/learn-more", label: t("About", "Kuhusu") },
    { href: "/features", label: t("Features", "Vipengele") },
    { href: "/solutions", label: t("Solutions", "Suluhisho") },
    { href: "/how-it-works", label: t("How it works", "Jinsi inavyofanya kazi") },
  ];
  const resourceItems = [
    { href: "/help", label: t("Help Centre", "Kituo cha Msaada") },
    { href: "/faq", label: t("FAQs", "Maswali") },
    { href: "/security", label: t("Security & Data", "Usalama na Taarifa") },
    { href: "/updates", label: t("What’s New", "Maboresho Mapya") },
    { href: "/contact", label: t("Contact & Support", "Mawasiliano na Msaada") },
  ];
  const resourcesActive = resourceItems.some((item) => pathname === item.href);
  const mobileItems = [...mainItems, ...resourceItems, { href: "/login", label: t("Login", "Ingia") }];

  return <>
    <Box component="header" sx={{ alignItems:"center", bgcolor:"background.paper", borderBottom:1, borderColor:"divider", display:"flex", height:64, left:0, px:{xs:2.25,sm:3.5}, position:"fixed", right:0, top:0, width:"100%", zIndex:(theme)=>theme.zIndex.appBar }}>
      <Link aria-label={t("Loji Business home","Nyumbani Loji Business")} component={NextLink} href="/login" sx={{display:"inline-flex",flexShrink:0}} underline="none"><BrandLockup priority symbolSize={30} textSize={{xs:".96rem",sm:"1rem"}} /></Link>

      <Stack component="nav" direction="row" spacing={0.1} sx={{alignItems:"center",display:{xs:"none",md:"flex"},ml:"auto"}}>
        {mainItems.map((item)=>{const active=pathname===item.href;return <Button key={item.href} component={NextLink} href={item.href} color="inherit" aria-current={active?"page":undefined} sx={{color:active?"text.primary":"text.secondary",fontSize:".8rem",fontWeight:active?700:500,minHeight:38,px:1.15}}>{item.label}</Button>})}
        <Button color="inherit" endIcon={<KeyboardArrowDownRoundedIcon />} onClick={(e)=>setResourcesAnchor(e.currentTarget)} sx={{color:resourcesActive?"text.primary":"text.secondary",fontSize:".8rem",fontWeight:resourcesActive?700:500,minHeight:38,px:1.15}}>{t("Resources","Rasilimali")}</Button>
        <Button component={NextLink} href="/login" variant={pathname==="/login"?"contained":"outlined"} sx={{ml:1,minHeight:36,px:1.7,fontSize:".8rem"}}>{t("Login","Ingia")}</Button>
      </Stack>

      <Stack direction="row" spacing={0.65} sx={{alignItems:"center",display:{xs:"none",md:"flex"},ml:1.5}}><ThemeModeSelect compact/><TranslateRoundedIcon aria-hidden sx={{color:"text.secondary",fontSize:17}}/><Select value={language} onChange={(e)=>setLanguage(e.target.value as "en"|"sw")} size="small" inputProps={{"aria-label":t("Language","Lugha")}} sx={{bgcolor:"background.paper",borderRadius:1,fontSize:".75rem",fontWeight:700,minWidth:64,"& .MuiSelect-select":{py:.7}}}><MenuItem value="en">EN</MenuItem><MenuItem value="sw">SW</MenuItem></Select></Stack>

      <IconButton aria-label={t("Open navigation","Fungua menyu")} onClick={()=>setMobileOpen(true)} sx={{display:{md:"none"},ml:"auto"}}><MenuRoundedIcon/></IconButton>
    </Box>
    <Box aria-hidden sx={{height:64}} />

    <Menu anchorEl={resourcesAnchor} open={Boolean(resourcesAnchor)} onClose={()=>setResourcesAnchor(null)} slotProps={{paper:{sx:{mt:1,minWidth:230,border:"1px solid",borderColor:"divider",boxShadow:"0 16px 45px rgba(15,23,42,.12)"}}}}>{resourceItems.map((item)=><MenuItem key={item.href} component={NextLink} href={item.href} selected={pathname===item.href} onClick={()=>setResourcesAnchor(null)} sx={{fontSize:".86rem",minHeight:44}}>{item.label}</MenuItem>)}</Menu>

    <Drawer anchor="right" onClose={()=>setMobileOpen(false)} open={mobileOpen} slotProps={{paper:{sx:{p:2,width:"min(88vw,340px)"}}}}>
      <BrandLockup priority symbolSize={30} textSize="1rem"/><Divider sx={{my:2}}/>
      <Typography color="text.secondary" sx={{fontSize:".68rem",fontWeight:800,letterSpacing:".08em",mb:1}}>{t("EXPLORE","CHUNGUZA")}</Typography>
      <List component="nav" disablePadding>{mobileItems.map((item)=>{const active=pathname===item.href;return <ListItemButton key={item.href} component={NextLink} href={item.href} selected={active} onClick={()=>setMobileOpen(false)} sx={{mb:.35,minHeight:44,borderRadius:1}}><ListItemText primary={item.label} slotProps={{primary:{fontSize:".9rem",fontWeight:active?700:500}}}/></ListItemButton>})}</List>
      <Divider sx={{my:2}}/><Typography color="text.secondary" sx={{fontSize:".68rem",fontWeight:800,letterSpacing:".08em",mb:1.25}}>{t("PREFERENCES","MAPENDELEO")}</Typography>
      <Stack spacing={1.25}><ThemeModeSelect/><Select fullWidth value={language} onChange={(e)=>setLanguage(e.target.value as "en"|"sw")} size="small" inputProps={{"aria-label":t("Language","Lugha")}}><MenuItem value="en">English</MenuItem><MenuItem value="sw">Kiswahili</MenuItem></Select></Stack>
      <Divider sx={{my:2}}/><Stack direction="row" spacing={2}><Typography component={NextLink} href="/terms" color="text.secondary" sx={{fontSize:".75rem",textDecoration:"none"}}>{t("Terms","Masharti")}</Typography><Typography component={NextLink} href="/privacy" color="text.secondary" sx={{fontSize:".75rem",textDecoration:"none"}}>{t("Privacy","Faragha")}</Typography></Stack>
    </Drawer>
  </>;
}
