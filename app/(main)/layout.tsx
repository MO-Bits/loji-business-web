import { MainShell } from "@/components/main-shell/main-shell";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <MainShell>{children}</MainShell>;
}
