"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
    Users,
    CreditCard,
    Zap,
    Activity,
    DollarSign,
    Crown,
    Loader2
} from "lucide-react";

interface Stats {
    totalUsers: number;
    freeUsers: number;
    standardUsers: number;
    premiumUsers: number;
    totalRevenue: number;
    totalCreditsUsed: number;
    recentPayments: Array<{
        id: string;
        email: string;
        plan: string;
        amount: number;
        createdAt: string | number | Date;
    }>;
    recentSignups: Array<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        createdAt: string | number | Date;
    }>;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchStats() {
            try {
                const response = await fetch("/api/admin/stats");
                if (!response.ok) {
                    throw new Error("Failed to fetch admin stats. Ensure you are an admin.");
                }
                const data = await response.json();
                setStats(data);
            } catch (err: unknown) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError(String(err));
                }
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#c9ff00]" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-[60vh] items-center justify-center text-red-500">
                <p>{error}</p>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="space-y-8">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <MetricCard
                    title="Total Users"
                    value={stats.totalUsers}
                    icon={<Users className="w-5 h-5 text-zinc-400" />}
                />
                <MetricCard
                    title="Free Users"
                    value={stats.freeUsers}
                    icon={<Activity className="w-5 h-5 text-blue-400" />}
                />
                <MetricCard
                    title="Standard Users"
                    value={stats.standardUsers}
                    icon={<Zap className="w-5 h-5 text-yellow-400" />}
                />
                <MetricCard
                    title="Premium Users"
                    value={stats.premiumUsers}
                    icon={<Crown className="w-5 h-5 text-[#c9ff00]" />}
                />
                <MetricCard
                    title="Total Revenue"
                    value={`$${stats.totalRevenue.toFixed(2)}`}
                    icon={<DollarSign className="w-5 h-5 text-green-400" />}
                />
                <MetricCard
                    title="Credits Used"
                    value={stats.totalCreditsUsed}
                    icon={<CreditCard className="w-5 h-5 text-purple-400" />}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Payments Table */}
                <div className="bg-[#111111] border border-zinc-800 rounded-xl p-6">
                    <h2 className="text-xl font-semibold mb-4 text-zinc-100">Recent Payments</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-zinc-400 border-b border-zinc-800">
                                <tr>
                                    <th className="pb-3 font-medium">Email</th>
                                    <th className="pb-3 font-medium">Plan</th>
                                    <th className="pb-3 font-medium">Amount</th>
                                    <th className="pb-3 font-medium text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {stats.recentPayments.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-4 text-center text-zinc-500">
                                            No recent payments
                                        </td>
                                    </tr>
                                ) : (
                                    stats.recentPayments.map((payment) => (
                                        <tr key={payment.id}>
                                            <td className="py-4 truncate max-w-[150px]" title={payment.email}>
                                                {payment.email}
                                            </td>
                                            <td className="py-4 capitalize text-zinc-300">{payment.plan}</td>
                                            <td className="py-4 text-[#c9ff00] font-medium">
                                                ${(payment.amount / 100).toFixed(2)}
                                            </td>
                                            <td className="py-4 text-right text-zinc-400">
                                                {format(new Date(payment.createdAt), "MMM d, yyyy")}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Signups Table */}
                <div className="bg-[#111111] border border-zinc-800 rounded-xl p-6">
                    <h2 className="text-xl font-semibold mb-4 text-zinc-100">Recent Signups</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-zinc-400 border-b border-zinc-800">
                                <tr>
                                    <th className="pb-3 font-medium">Name</th>
                                    <th className="pb-3 font-medium">Email</th>
                                    <th className="pb-3 font-medium text-right">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {stats.recentSignups.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="py-4 text-center text-zinc-500">
                                            No recent signups
                                        </td>
                                    </tr>
                                ) : (
                                    stats.recentSignups.map((user) => (
                                        <tr key={user.id}>
                                            <td className="py-4 truncate max-w-[120px] text-zinc-300">
                                                {user.firstName} {user.lastName}
                                            </td>
                                            <td className="py-4 truncate max-w-[150px]" title={user.email}>
                                                {user.email}
                                            </td>
                                            <td className="py-4 text-right text-zinc-400">
                                                {format(new Date(user.createdAt), "MMM d, yyyy")}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({
    title,
    value,
    icon,
}: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
}) {
    return (
        <div className="bg-[#111111] border border-zinc-800 rounded-xl p-6 flex flex-col justify-between items-start hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-3 mb-4 w-full">
                <div className="p-2 bg-zinc-900/50 rounded-lg">{icon}</div>
                <h3 className="text-zinc-400 font-medium text-sm">{title}</h3>
            </div>
            <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
        </div>
    );
}
