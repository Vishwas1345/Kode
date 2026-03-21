import Link from "next/link";
import { TerminalIcon } from "lucide-react";

export const Logo = () => {
    return (
        <Link href="/" className="flex items-center gap-x-2 hover:opacity-80 transition">
            <div className="bg-[#00FF88]/20 p-1.5 rounded-lg border border-[#00FF88]/30">
                <TerminalIcon className="w-5 h-5 text-[#00FF88]" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-xl tracking-tight text-[#F4F4F5]">Kode</span>
        </Link>
    );
};
