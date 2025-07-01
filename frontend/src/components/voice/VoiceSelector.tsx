import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { VoiceOption } from '@/types/voice';

interface VoiceSelectorProps {
  voices: VoiceOption[];
  selectedVoiceId: string | undefined;
  onVoiceSelect: (voiceId: string) => void;
  loading?: boolean;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  voices,
  selectedVoiceId,
  onVoiceSelect,
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccent, setSelectedAccent] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');

  const accents = useMemo(() => {
    const accentSet = new Set<string>();
    voices.forEach(voice => {
      if (voice.accent) {
        accentSet.add(voice.accent);
      }
    });
    return Array.from(accentSet).sort();
  }, [voices]);

  const genders = useMemo(() => {
    const genderSet = new Set<string>();
    voices.forEach(voice => {
      if (voice.gender) {
        genderSet.add(voice.gender);
      }
    });
    return Array.from(genderSet).sort();
  }, [voices]);

  const filteredVoices = useMemo(() => {
    return voices.filter(voice => {
      const matchesSearch = searchTerm === '' || 
        voice.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voice.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAccent = selectedAccent === 'all' || 
        voice.accent === selectedAccent;
      
      const matchesGender = selectedGender === 'all' || 
        voice.gender === selectedGender;
      
      return matchesSearch && matchesAccent && matchesGender;
    });
  }, [voices, searchTerm, selectedAccent, selectedGender]);

  if (loading) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Loading voices...
      </div>
    );
  }

  if (voices.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No voices available
      </div>
    );
  }

  const selectedVoice = voices.find(v => v.id === selectedVoiceId);

  return (
    <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
      <div className="space-y-2">
        <Input
          id="voice-search"
          type="text"
          placeholder="Search voices..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="h-8 text-sm"
        />
        
        <div className="flex gap-2">
          <select
            id="accent-filter"
            value={selectedAccent}
            onChange={(e) => setSelectedAccent(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 h-8 rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            <option value="all">All accents</option>
            {accents.map(accent => (
              <option key={accent} value={accent}>
                {accent}
              </option>
            ))}
          </select>
          
          <select
            id="gender-filter"
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 h-8 rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            <option value="all">All genders</option>
            {genders.map(gender => (
              <option key={gender} value={gender}>
                {gender.charAt(0) + gender.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedVoice && (
        <div className="rounded-md border border-primary bg-primary/5 p-2">
          <p className="text-xs font-medium">Selected: {selectedVoice.name}</p>
        </div>
      )}

      <div>
        <Label className="text-sm mb-2 block">
          Available voices ({filteredVoices.length})
        </Label>
        <ScrollArea className="h-[150px] rounded-md border">
          <div className="p-2 space-y-1">
            {filteredVoices.map((voice) => (
              <button
                key={voice.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onVoiceSelect(voice.id);
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors flex items-start gap-2 ${
                  selectedVoiceId === voice.id 
                    ? 'bg-primary/10 border border-primary' 
                    : 'hover:bg-accent'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                    selectedVoiceId === voice.id 
                      ? 'border-primary bg-primary' 
                      : 'border-gray-300'
                  }`}>
                    {selectedVoiceId === voice.id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-medium">{voice.name}</div>
                  {voice.description && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {voice.description}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default VoiceSelector;