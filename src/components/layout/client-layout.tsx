import Header from "@/components/Header";
import AccessibleDrawer from "../AccessibleDrawer";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-dvh flex flex-col">
      <Header />
      <AccessibleDrawer />
      {children}
    </div>
  );
}
