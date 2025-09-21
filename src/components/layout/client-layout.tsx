import Header from "@/components/Header";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-dvh flex flex-col">
      <Header />

      {children}
    </div>
  );
}
