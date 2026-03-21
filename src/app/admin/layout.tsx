import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await currentUser();

    if (!user || user.publicMetadata?.role !== "admin") {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-[#c9ff00] selection:text-black">
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
                {children}
            </div>
        </div>
    );
}
