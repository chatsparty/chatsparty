import { useEffect, useState, useCallback, useRef } from "react";
import { useSocketIO } from "../services/socketio/useSocketIO";
import { MessageType } from "../services/socketio/SocketIOService";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";

interface TerminalSession {
  session_id: string;
  project_id: string;
  status: string;
  created_at: string;
  rows: number;
  cols: number;
}

interface UseTerminalOptions {
  projectId: string;
  autoCreate?: boolean;
}

export const useTerminal = ({
  projectId,
  autoCreate = false,
}: UseTerminalOptions) => {
  const { subscribe, unsubscribe, onMessage, offMessage, isConnected, send } =
    useSocketIO();
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeSession, setActiveSession] = useState<TerminalSession | null>(
    null
  );
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAutoCreated = useRef(false);
  const recentlyClosedSessions = useRef<Set<string>>(new Set());

  const terminalsRef = useRef<Map<string, Terminal>>(new Map());
  const fitAddonsRef = useRef<Map<string, FitAddon>>(new Map());

  const createTerminalSession = useCallback(async () => {
    if (!isConnected) {
      setError("Socket.IO not connected");
      return null;
    }

    setIsCreatingSession(true);
    setError(null);

    try {
      const createMessage = {
        type: MessageType.TERMINAL_CREATE,
        channel: "system",
        data: {
          project_id: projectId,
        },
        timestamp: new Date().toISOString(),
      };

      send(createMessage);

      return true;
    } catch (err) {
      setError(`Failed to create terminal: ${err}`);
      return null;
    } finally {
      setIsCreatingSession(false);
    }
  }, [isConnected, projectId, send]);

  const closeTerminalSession = useCallback(
    async (sessionId: string) => {
      console.log(`[TERMINAL] Closing session: ${sessionId}`);

      recentlyClosedSessions.current.add(sessionId);

      setTimeout(() => {
        recentlyClosedSessions.current.delete(sessionId);
      }, 5000);

      const closeMessage = {
        type: MessageType.TERMINAL_CLOSE,
        channel: "system",
        data: { terminal_id: sessionId },
        timestamp: new Date().toISOString(),
      };

      send(closeMessage);

      const channel = `project:${projectId}:terminal:${sessionId}`;
      console.log(`[TERMINAL] Unsubscribing from channel: ${channel}`);
      unsubscribe(channel);

      const terminal = terminalsRef.current.get(sessionId);
      if (terminal) {
        console.log(`[TERMINAL] Disposing terminal instance: ${sessionId}`);
        terminal.dispose();
        terminalsRef.current.delete(sessionId);
        fitAddonsRef.current.delete(sessionId);
      }

      setSessions((prev) => {
        const remaining = prev.filter((s) => s.session_id !== sessionId);
        console.log(
          `[TERMINAL] Sessions remaining after close: ${remaining.length}`
        );
        console.log(
          `[TERMINAL] Remaining session IDs: ${remaining
            .map((s) => s.session_id)
            .join(", ")}`
        );

        if (activeSession?.session_id === sessionId && remaining.length > 0) {
          const nextSession = remaining[0];
          console.log(
            `[TERMINAL] Switching active session to: ${nextSession.session_id}`
          );
          setActiveSession(nextSession);
        } else if (remaining.length === 0) {
          console.log(
            `[TERMINAL] No sessions remaining, setting active to null`
          );
          setActiveSession(null);
        }

        return remaining;
      });
    },
    [activeSession, send, projectId, unsubscribe]
  );

  const sendTerminalInput = useCallback(
    async (sessionId: string, input: string) => {
      const inputMessage = {
        type: MessageType.TERMINAL_INPUT,
        channel: "system",
        data: {
          terminal_id: sessionId,
          input,
        },
        timestamp: new Date().toISOString(),
      };

      send(inputMessage);
    },
    [send]
  );

  const createTerminalInstance = useCallback(
    (sessionId: string, container: HTMLElement) => {
      const terminal = new Terminal({
        theme: {
          background: "#0f172a",
          foreground: "#e2e8f0",
          cursor: "#10b981",
          selectionBackground: "#1e293b",
          brightBlack: "#475569",
          brightRed: "#ef4444",
          brightGreen: "#10b981",
          brightYellow: "#f59e0b",
          brightBlue: "#3b82f6",
          brightMagenta: "#a855f7",
          brightCyan: "#06b6d4",
          brightWhite: "#f8fafc",
        },
        fontFamily:
          '"JetBrains Mono", "Fira Code", "Source Code Pro", monospace',
        fontSize: 14,
        cursorBlink: true,
        cursorStyle: "block",
        convertEol: true,
        scrollback: 1000,
        fastScrollModifier: "alt",
        disableStdin: false,
        allowTransparency: false,
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.loadAddon(new WebLinksAddon());

      terminal.open(container);
      fitAddon.fit();

      terminal.onData((data) => {
        sendTerminalInput(sessionId, data);
      });

      terminalsRef.current.set(sessionId, terminal);
      fitAddonsRef.current.set(sessionId, fitAddon);

      return terminal;
    },
    [sendTerminalInput]
  );

  const fitTerminal = useCallback((sessionId: string) => {
    const fitAddon = fitAddonsRef.current.get(sessionId);
    if (fitAddon) {
      try {
        fitAddon.fit();
      } catch (error) {
        console.warn(`[TERMINAL] Error fitting terminal ${sessionId}:`, error);
      }
    }
  }, []);

  useEffect(() => {
    if (!isConnected) return;

    const handleTerminalStatus = (message: any) => {
      const { session, error } = message.data;

      if (error) {
        setError(error);
        return;
      }

      if (session) {
        console.log(
          `[TERMINAL] Status update for ${session.session_id}: ${session.status}`
        );

        if (session.status === "closed") {
          console.log(
            `[TERMINAL] Removing closed session: ${session.session_id}`
          );

          setSessions((prev) => {
            const remaining = prev.filter(
              (s) => s.session_id !== session.session_id
            );

            if (activeSession?.session_id === session.session_id) {
              if (remaining.length > 0) {
                const nextSession = remaining[0];
                console.log(
                  `[TERMINAL] Switching active session to: ${nextSession.session_id}`
                );
                setActiveSession(nextSession);
              } else {
                console.log(
                  `[TERMINAL] No sessions remaining, setting active to null`
                );
                setActiveSession(null);
              }
            }

            return remaining;
          });
          return;
        }

        setSessions((prev) => {
          const existing = prev.find(
            (s) => s.session_id === session.session_id
          );
          if (existing) {
            return prev.map((s) =>
              s.session_id === session.session_id ? session : s
            );
          } else {
            return [...prev, session];
          }
        });

        const channel = `project:${projectId}:terminal:${session.session_id}`;
        subscribe(channel);

        if (!activeSession && session.status === "active") {
          setActiveSession(session);
        }
      }
    };

    const handleTerminalOutput = (message: any) => {
      const { session_id, output } = message.data;
      const terminal = terminalsRef.current.get(session_id);

      console.log(
        `[TERMINAL] Output received for session ${session_id}:`,
        output?.substring(0, 50) + (output?.length > 50 ? "..." : "")
      );

      if (terminal && output) {
        terminal.write(output);
      } else if (!terminal) {
        console.warn(
          `[TERMINAL] No terminal instance found for session: ${session_id}`
        );
      }
    };

    const handleTerminalList = (message: any) => {
      const { terminals: sessionList } = message.data;
      if (sessionList) {
        console.log(`[TERMINAL] Raw session list from server:`, sessionList);

        const normalizedSessions = sessionList.map((session: any) => ({
          session_id: session.terminal_id || session.session_id,
          project_id: session.project_id,
          status: session.status,
          created_at: session.created_at,
          rows: 24,
          cols: 80,
        }));

        const filteredSessions = normalizedSessions.filter((session: any) => {
          const sessionId = session.session_id;
          const isRecentlyClosed =
            recentlyClosedSessions.current.has(sessionId);
          if (isRecentlyClosed) {
            console.log(
              `[TERMINAL] Filtering out recently closed session: ${sessionId}`
            );
          }
          return !isRecentlyClosed;
        });

        console.log(
          `[TERMINAL] Received ${sessionList.length} sessions, normalized and filtered to ${filteredSessions.length}`
        );
        console.log(
          `[TERMINAL] Setting sessions to:`,
          filteredSessions
            .map((s: TerminalSession) => `${s.session_id}(${s.status})`)
            .join(", ")
        );
        setSessions(filteredSessions);

        filteredSessions.forEach((session: TerminalSession) => {
          const channel = `project:${projectId}:terminal:${session.session_id}`;
          subscribe(channel);
        });
      }
    };

    const handleSuccess = (message: any) => {
      const { terminal_id, project_id } = message.data;

      if (
        terminal_id &&
        project_id &&
        message.data.message === "Terminal created"
      ) {
        console.log(`[TERMINAL] Terminal created successfully: ${terminal_id}`);

        const newSession: TerminalSession = {
          session_id: terminal_id,
          project_id: project_id,
          status: "active",
          created_at: new Date().toISOString(),
          rows: 24,
          cols: 80,
        };

        setSessions((prev) => {
          const existing = prev.find((s) => s.session_id === terminal_id);
          if (!existing) {
            console.log(`[TERMINAL] Adding new session: ${terminal_id}`);
            return [...prev, newSession];
          }
          console.log(`[TERMINAL] Session already exists: ${terminal_id}`);
          return prev;
        });

        const channel = `project:${projectId}:terminal:${terminal_id}`;
        subscribe(channel);

        if (!activeSession) {
          setActiveSession(newSession);
        }

        setIsCreatingSession(false);
      }

      if (message.data.message) {
        console.log(`[TERMINAL] Success: ${message.data.message}`);
      }
    };

    const handleError = (message: any) => {
      console.error(`[TERMINAL] Error: ${message.data.message}`);
      setError(message.data.message);
      setIsCreatingSession(false);
    };

    onMessage(MessageType.TERMINAL_STATUS, handleTerminalStatus);
    onMessage(MessageType.TERMINAL_OUTPUT, handleTerminalOutput);
    onMessage(MessageType.TERMINAL_LIST, handleTerminalList);
    onMessage(MessageType.SUCCESS, handleSuccess);
    onMessage(MessageType.ERROR, handleError);

    const listMessage = {
      type: MessageType.TERMINAL_LIST,
      channel: "system",
      data: { project_id: projectId },
      timestamp: new Date().toISOString(),
    };

    send(listMessage);

    if (autoCreate && sessions.length === 0 && !hasAutoCreated.current) {
      hasAutoCreated.current = true;
      createTerminalSession();
    }

    return () => {
      offMessage(MessageType.TERMINAL_STATUS, handleTerminalStatus);
      offMessage(MessageType.TERMINAL_OUTPUT, handleTerminalOutput);
      offMessage(MessageType.TERMINAL_LIST, handleTerminalList);
      offMessage(MessageType.SUCCESS, handleSuccess);
      offMessage(MessageType.ERROR, handleError);

      sessions.forEach((session) => {
        const channel = `project:${projectId}:terminal:${session.session_id}`;
        unsubscribe(channel);
      });
    };
  }, [
    isConnected,
    projectId,
    autoCreate,
    subscribe,
    unsubscribe,
    onMessage,
    offMessage,
    send,
  ]);

  return {
    sessions,
    activeSession,
    setActiveSession,
    isCreatingSession,
    error,
    createTerminalSession,
    closeTerminalSession,
    createTerminalInstance,
    fitTerminal,
    isConnected,
  };
};
