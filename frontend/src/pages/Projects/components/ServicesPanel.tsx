import { Play, RefreshCw, Square } from "lucide-react";
import React from "react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import type { ProjectVMService } from "../../../types/project";

interface ServicesPanelProps {
  vmServices: ProjectVMService[];
  onRefreshServices: () => void;
  onStopService: (serviceId: string) => void;
}

export const ServicesPanel: React.FC<ServicesPanelProps> = ({
  vmServices,
  onRefreshServices,
  onStopService,
}) => {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Play className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Services</h2>
        </div>
        <Button onClick={onRefreshServices} variant="ghost" size="sm">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {vmServices.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No services running
          </p>
        ) : (
          vmServices.map((service) => (
            <Card key={service.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">
                      {service.service_name}
                    </span>
                    <Badge
                      variant={
                        service.status === "running" ? "default" : "secondary"
                      }
                    >
                      {service.status}
                    </Badge>
                  </div>
                  {service.service_url && (
                    <a
                      href={service.service_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline truncate block"
                    >
                      {service.service_url}
                    </a>
                  )}
                </div>
                <Button
                  onClick={() => onStopService(service.id)}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 ml-2"
                >
                  <Square className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};