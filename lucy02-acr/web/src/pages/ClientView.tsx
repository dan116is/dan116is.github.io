import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, type Tenant } from "../lib/api";
import AgentsTab from "../components/agents/AgentsTab";
import WorkflowsTab from "../components/workflows/WorkflowsTab";
import AlertsTab from "../components/alerts/AlertsTab";
import CostsTab from "../components/costs/CostsTab";
import ActivityFeed from "../components/ActivityFeed";

const TABS = ["Agents", "Workflows", "Alerts", "Costs", "Activity"] as const;
type Tab = (typeof TABS)[number];

export default function ClientView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Agents");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    api.tenants.list().then((tenants) => {
      const found = tenants.find((t) => t.slug === slug);
      if (!found) {
        navigate("/");
        return;
      }
      setTenant(found);
      setLoading(false);
    });
  }, [slug, navigate]);

  if (loading || !tenant) {
    return (
      <div className="min-h-screen bg-[#08080F] flex items-center justify-center">
        <div className="text-gray-500 font-mono">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080F] text-white">
      {/* Client header */}
      <header className="border-b border-white/[0.06] px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="text-gray-600 hover:text-gray-400 font-mono text-sm transition-colors"
            >
              ← All Clients
            </button>
            <span className="text-gray-700">|</span>
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: tenant.brand_color }}
              />
              <span className="font-mono font-semibold">{tenant.name}</span>
              {tenant.industry && (
                <span className="text-xs text-gray-500 font-mono bg-white/[0.04] px-2 py-0.5 rounded">
                  {tenant.industry}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-sm font-mono rounded-md transition-colors ${
                activeTab === tab
                  ? "text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
              style={activeTab === tab ? { backgroundColor: tenant.brand_color + "22", color: tenant.brand_color } : {}}
            >
              {tab}
            </button>
          ))}
        </nav>
      </header>

      <main className="px-8 py-6">
        {activeTab === "Agents" && <AgentsTab tenantId={tenant.id} />}
        {activeTab === "Workflows" && <WorkflowsTab tenantId={tenant.id} />}
        {activeTab === "Alerts" && <AlertsTab tenantId={tenant.id} />}
        {activeTab === "Costs" && <CostsTab tenantId={tenant.id} />}
        {activeTab === "Activity" && <ActivityFeed tenantId={tenant.id} />}
      </main>
    </div>
  );
}
