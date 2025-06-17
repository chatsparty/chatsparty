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
    <div className="p-10 text-center bg-white h-full flex flex-col justify-center">
      <h1 className="text-2xl font-semibold text-gray-700 mb-4">Agent Management</h1>
      <p className="text-gray-600 mb-8">
        Create and manage AI agents with custom personalities and prompts.
      </p>

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-5">Quick Start Templates</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 max-w-2xl mx-auto">
          {presetAgents.map((preset, index) => (
            <div
              key={index}
              onClick={() => onSelectPreset(preset)}
              className="p-5 bg-gray-50 rounded-md border border-gray-200 cursor-pointer transition-all duration-200 text-left hover:bg-blue-50 hover:border-blue-200"
            >
              <h3 className="text-sm font-semibold mb-3 text-gray-700">{preset.name}</h3>
              <p className="text-sm text-gray-600 leading-relaxed overflow-hidden line-clamp-3">
                {preset.characteristics}
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-gray-500 text-sm">
        Click on a template to use it as a starting point, or create a custom agent from scratch.
      </p>
    </div>
  );
};

export default PresetTemplates;