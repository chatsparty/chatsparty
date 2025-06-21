import React from "react";
import Modal from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { VoiceConnectionTestResult } from "@/types/voice";

interface VoiceConnectionTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  testResult: VoiceConnectionTestResult | null;
  isLoading: boolean;
}

export const VoiceConnectionTestModal: React.FC<
  VoiceConnectionTestModalProps
> = ({ isOpen, onClose, testResult, isLoading }) => {
  if (isLoading) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Testing Connection"
        actions={null}
      >
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
          <p className="text-muted-foreground">
            Please wait while we test your voice connection...
          </p>
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-muted h-12 w-12"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  if (!testResult) return null;

  const isSuccess = testResult.success;
  const CheckIcon = () => (
    <svg
      className="h-5 w-5 text-green-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );

  const XIcon = () => (
    <svg
      className="h-5 w-5 text-red-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );

  const Icon = isSuccess ? CheckIcon : XIcon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isSuccess ? "Connection Successful!" : "Connection Failed"}
      actions={
        <Button onClick={onClose} variant="outline">
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        <div
          className={`p-4 rounded-lg border ${
            isSuccess
              ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200"
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <Icon />
            <p className="font-medium">{testResult.message}</p>
          </div>
        </div>

        {testResult.latency_ms && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Response time: {testResult.latency_ms}ms</span>
          </div>
        )}

        {testResult.provider_info && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-foreground">
              Provider Details
            </h4>

            {testResult.provider_info.supported_features && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Supported Features:
                </p>
                <div className="flex gap-2">
                  {testResult.provider_info.supported_features.tts && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      Text-to-Speech
                    </Badge>
                  )}
                  {testResult.provider_info.supported_features.stt && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                      </svg>
                      Speech-to-Text
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {testResult.provider_info.subscription_tier && (
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subscription:</span>
                  <Badge variant="outline">
                    {testResult.provider_info.subscription_tier}
                  </Badge>
                </div>
              </div>
            )}

            {testResult.provider_info.character_limit &&
              testResult.provider_info.character_count !== undefined && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Character Usage:
                    </span>
                    <span>
                      {testResult.provider_info.character_count.toLocaleString()}{" "}
                      /{" "}
                      {testResult.provider_info.character_limit.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (testResult.provider_info.character_count /
                            testResult.provider_info.character_limit) *
                            100
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(
                      testResult.provider_info.character_limit -
                      testResult.provider_info.character_count
                    ).toLocaleString()}{" "}
                    characters remaining
                  </p>
                </div>
              )}

            {testResult.provider_info.available_voices && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Available Voices:</span>
                <Badge variant="outline" className="flex items-center gap-1">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  {testResult.provider_info.available_voices}
                </Badge>
              </div>
            )}

            {testResult.provider_info.base_url && (
              <div className="text-xs text-muted-foreground">
                <span>Endpoint: </span>
                <code className="bg-muted px-1 py-0.5 rounded">
                  {testResult.provider_info.base_url}
                </code>
              </div>
            )}
          </div>
        )}

        {testResult.details?.test_audio_size_bytes && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Test audio generated:</span>{" "}
              {Math.round(testResult.details.test_audio_size_bytes / 1024)} KB
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};
