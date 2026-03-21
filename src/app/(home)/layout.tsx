import { Navbar } from "@/client/modules/home/components/navbar";

interface Props {
  children: React.ReactNode;
};

const Layout = ({ children }: Props) => {
  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0A] text-white">
      <Navbar />
      <div className="flex-1 flex pt-[72px] justify-center">
        {/* Main Content Area */}
        <main className="w-full max-w-7xl flex flex-col p-6 overflow-x-hidden min-h-[calc(100vh-72px)] relative">
          <div className="absolute inset-0 z-0 h-full w-full bg-[#0A0A0A] dark:bg-[radial-gradient(#111111_1px,transparent_1px)] bg-[radial-gradient(#111111_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="relative z-10 w-full h-full flex flex-col items-center">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
