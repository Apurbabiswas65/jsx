
// src/app/dashboard/agent/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgentDashboard() {
  // TODO: Add authentication check here to ensure only agents can access

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-secondary-foreground">Agent Dashboard</h1>

       <Card>
        <CardHeader>
            <CardTitle>Agent Tools</CardTitle>
        </CardHeader>
         <CardContent>
            <p className="text-muted-foreground">Access agent-specific tools and information.</p>
            {/* Placeholder for agent functionalities */}
            {/* E.g., Assigned properties, client communication tools, commission tracking */}
         </CardContent>
      </Card>
    </div>
  );
}
