import React from 'react';

interface PresetAgent {
  name: string;
  prompt: string;
  characteristics: string;
}

interface PresetTemplatesProps {
  presetAgents: PresetAgent[];
  onSelectPreset: (preset: PresetAgent) => void;
}

const PresetTemplates: React.FC<PresetTemplatesProps> = ({ 
  presetAgents, 
  onSelectPreset 
}) => {
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-y-auto p-10">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold text-foreground mb-4">Agent Management</h1>
          <p className="text-muted-foreground mb-8">
            Create and manage AI agents with custom personalities and prompts.
          </p>

          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-5">Quick Start Templates</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 max-w-2xl mx-auto">
              {presetAgents.map((preset, index) => (
                <div
                  key={index}
                  onClick={() => onSelectPreset(preset)}
                  className="p-5 bg-card rounded-md border border-border cursor-pointer transition-all duration-200 text-left hover:bg-accent hover:border-accent-foreground/20"
                >
                  <h3 className="text-sm font-semibold mb-3 text-card-foreground">{preset.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed overflow-hidden line-clamp-3">
                    {preset.characteristics}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-muted-foreground text-sm">
            Click on a template to use it as a starting point, or create a custom agent from scratch.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PresetTemplates;