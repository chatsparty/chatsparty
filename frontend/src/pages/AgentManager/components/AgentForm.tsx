import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface ChatStyle {
  friendliness: 'friendly' | 'neutral' | 'formal';
  response_length: 'short' | 'medium' | 'long';
  personality: 'enthusiastic' | 'balanced' | 'reserved';
  humor: 'none' | 'light' | 'witty';
  expertise_level: 'beginner' | 'intermediate' | 'expert';
}

interface Agent {
  agent_id: string;
  name: string;
  prompt: string;
  characteristics: string;
  chat_style?: ChatStyle;
}

interface FormData {
  agent_id: string;
  name: string;
  prompt: string;
  characteristics: string;
  model_name: string;
  chat_style: ChatStyle;
}

interface AgentFormProps {
  formData: FormData;
  editingAgent: Agent | null;
  isLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const AgentForm: React.FC<AgentFormProps> = ({
  formData,
  editingAgent,
  isLoading,
  onInputChange,
  onSubmit,
  onCancel
}) => {
  const handleSelectChange = (field: string, value: string) => {
    const event = {
      target: { name: field, value }
    } as React.ChangeEvent<HTMLSelectElement>;
    onInputChange(event);
  };

  return (
    <div className="p-5 h-full overflow-y-auto bg-card">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-semibold text-card-foreground">
          {editingAgent ? 'Edit Agent' : 'Create New Agent'}
        </h2>
        <Button
          onClick={onCancel}
          variant="outline"
          size="sm"
        >
          Cancel
        </Button>
      </div>

      <form onSubmit={onSubmit}>
        <div className="space-y-5">
          <div>
            <label className="block mb-2 font-medium text-card-foreground">
              Agent ID *
            </label>
            <Input
              name="agent_id"
              value={formData.agent_id}
              onChange={onInputChange}
              placeholder="e.g., business-analyst"
              disabled={editingAgent !== null}
              className={editingAgent ? "bg-muted" : ""}
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              Unique identifier for the agent (cannot be changed after creation)
            </p>
          </div>

          <div>
            <label className="block mb-2 font-medium text-card-foreground">
              Agent Name *
            </label>
            <Input
              name="name"
              value={formData.name}
              onChange={onInputChange}
              placeholder="e.g., Business Analyst"
              required
            />
          </div>

          <div>
            <label className="block mb-2 font-medium text-card-foreground">
              Characteristics *
            </label>
            <Textarea
              name="characteristics"
              value={formData.characteristics}
              onChange={onInputChange}
              rows={3}
              placeholder="Describe the agent's personality, expertise, and behavioral traits..."
              className="resize-y"
              required
            />
          </div>

          <div>
            <label className="block mb-2 font-medium text-card-foreground">
              System Prompt *
            </label>
            <Textarea
              name="prompt"
              value={formData.prompt}
              onChange={onInputChange}
              rows={6}
              placeholder="Detailed instructions for how the agent should behave and respond..."
              className="resize-y"
              required
            />
          </div>

          <div>
            <label className="block mb-2 font-medium text-card-foreground">
              Model Name (Optional)
            </label>
            <Input
              name="model_name"
              value={formData.model_name}
              onChange={onInputChange}
              placeholder="Leave empty to use default model"
            />
          </div>

          <Separator />

          <div>
            <h3 className="mb-4 font-bold text-card-foreground text-lg">
              Chat Style Settings
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 font-medium text-card-foreground">
                  Friendliness
                </label>
                <Select
                  value={formData.chat_style.friendliness}
                  onValueChange={(value) => handleSelectChange('chat_style.friendliness', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block mb-2 font-medium text-card-foreground">
                  Response Length
                </label>
                <Select
                  value={formData.chat_style.response_length}
                  onValueChange={(value) => handleSelectChange('chat_style.response_length', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short & Concise</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="long">Detailed & Long</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block mb-2 font-medium text-card-foreground">
                  Personality
                </label>
                <Select
                  value={formData.chat_style.personality}
                  onValueChange={(value) => handleSelectChange('chat_style.personality', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block mb-2 font-medium text-card-foreground">
                  Humor Level
                </label>
                <Select
                  value={formData.chat_style.humor}
                  onValueChange={(value) => handleSelectChange('chat_style.humor', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Humor</SelectItem>
                    <SelectItem value="light">Light Humor</SelectItem>
                    <SelectItem value="witty">Witty</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <label className="block mb-2 font-medium text-card-foreground">
                  Expertise Level
                </label>
                <Select
                  value={formData.chat_style.expertise_level}
                  onValueChange={(value) => handleSelectChange('chat_style.expertise_level', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner-friendly</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="expert">Expert Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Creating...' : editingAgent ? 'Update Agent' : 'Create Agent'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AgentForm;