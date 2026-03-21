import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { PLANS } from "@/shared/constants";

export async function GET() {
    try {
        const { userId } = await auth();
        const user = await currentUser();

        if (!userId || !user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (user.publicMetadata?.role !== "admin") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Initialize clerk client
        const client = await clerkClient();

        // Fetch metrics concurrently
        const [
            totalUsersResponse,
            freeUsers,
            standardUsers,
            premiumUsers,
            revenueResult,
            creditsResult,
            recentPayments,
            recentSignupsResponse
        ] = await Promise.all([
            client.users.getCount(),
            prisma.userSubscription.count({ where: { plan: PLANS.FREE } }),
            prisma.userSubscription.count({ where: { plan: PLANS.STANDARD } }),
            prisma.userSubscription.count({ where: { plan: PLANS.PREMIUM } }),
            prisma.paymentRecord.aggregate({
                _sum: { amount: true },
                where: { status: "success" }
            }),
            prisma.usage.aggregate({
                _sum: { points: true }
            }),
            prisma.paymentRecord.findMany({
                where: { status: "success" },
                orderBy: { createdAt: "desc" },
                take: 10
            }),
            client.users.getUserList({
                limit: 10,
                orderBy: "-created_at"
            })
        ]);

        const totalUsers = totalUsersResponse;
        const totalRevenue = (revenueResult._sum.amount || 0) / 100; // Assuming cents
        const totalCreditsUsed = creditsResult._sum.points || 0;

        // Process recent signups to match frontend expectations
        const recentSignups = recentSignupsResponse.data.map((u) => ({
            id: u.id,
            email: u.emailAddresses[0]?.emailAddress || "N/A",
            createdAt: u.createdAt,
            firstName: u.firstName || "",
            lastName: u.lastName || ""
        }));

        // For payments we might not have emails in DB directly, but we can return what we have
        // If needed we could map userIds to emails, but for raw speed we return the records
        // Alternatively, we get unique userIds from payments and map emails. Let's do a quick mapping.

        // mapping user IDs from recent payments to emails
        const uniqueUserIdsInPayments = [...new Set(recentPayments.map(p => p.userId))];
        const usersInPaymentsResponse = await client.users.getUserList({
            userId: uniqueUserIdsInPayments,
            limit: 10
        });
        const emailMap = new Map();
        for (const u of usersInPaymentsResponse.data) {
            emailMap.set(u.id, u.emailAddresses[0]?.emailAddress || "N/A");
        }

        const mappedRecentPayments = recentPayments.map(p => ({
            ...p,
            email: emailMap.get(p.userId) || p.userId
        }));

        return NextResponse.json({
            totalUsers,
            freeUsers,
            standardUsers,
            premiumUsers,
            totalRevenue,
            totalCreditsUsed,
            recentPayments: mappedRecentPayments,
            recentSignups
        });

    } catch {
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
