import { useEffect, useState, useCallback, useRef } from "react";
import { useWebSocket } from "../services/websocket/useWebSocket";
import { MessageType } from "../services/websocket/WebSocketService";
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
  const { subscribe, unsubscribe, onMessage, offMessage, isConnected } =
    useWebSocket();
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeSession, setActiveSession] = useState<TerminalSession | null>(
    null
  );
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const terminalsRef = useRef<Map<string, Terminal>>(new Map());
  const fitAddonsRef = useRef<Map<string, FitAddon>>(new Map());
  const currentLineRef = useRef<Map<string, string>>(new Map());

  const createTerminalSession = useCallback(
    async (rows: number = 24, cols: number = 80) => {
      if (!isConnected) {
        setError("WebSocket not connected");
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
            rows,
            cols,
          },
          timestamp: new Date().toISOString(),
        };

        const { webSocketService } = await import(
          "../services/websocket/WebSocketService"
        );
        webSocketService.send(createMessage);

        return true;
      } catch (err) {
        setError(`Failed to create terminal: ${err}`);
        return null;
      } finally {
        setIsCreatingSession(false);
      }
    },
    [isConnected, projectId]
  );

  const closeTerminalSession = useCallback(
    async (sessionId: string) => {
      const closeMessage = {
        type: MessageType.TERMINAL_CLOSE,
        channel: "system",
        data: { session_id: sessionId },
        timestamp: new Date().toISOString(),
      };

      const { webSocketService } = await import(
        "../services/websocket/WebSocketService"
      );
      webSocketService.send(closeMessage);

      const terminal = terminalsRef.current.get(sessionId);
      if (terminal) {
        terminal.dispose();
        terminalsRef.current.delete(sessionId);
        fitAddonsRef.current.delete(sessionId);
        currentLineRef.current.delete(sessionId);
      }

      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
      if (activeSession?.session_id === sessionId) {
        setActiveSession(null);
      }
    },
    [activeSession]
  );

  const sendTerminalInput = useCallback(
    async (sessionId: string, input: string) => {
      const inputMessage = {
        type: MessageType.TERMINAL_INPUT,
        channel: "system",
        data: {
          session_id: sessionId,
          input,
        },
        timestamp: new Date().toISOString(),
      };

      const { webSocketService } = await import(
        "../services/websocket/WebSocketService"
      );
      webSocketService.send(inputMessage);
    },
    []
  );

  const resizeTerminal = useCallback(
    async (sessionId: string, rows: number, cols: number) => {
      const resizeMessage = {
        type: MessageType.TERMINAL_RESIZE,
        channel: "system",
        data: {
          session_id: sessionId,
          rows,
          cols,
        },
        timestamp: new Date().toISOString(),
      };

      const { webSocketService } = await import(
        "../services/websocket/WebSocketService"
      );
      webSocketService.send(resizeMessage);
    },
    []
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
        rows: 24,
        cols: 80,
        cursorBlink: true,
        cursorStyle: "block",
        convertEol: true,
        scrollback: 1000,
        fastScrollModifier: "alt",
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.loadAddon(new WebLinksAddon());

      terminal.open(container);
      fitAddon.fit();

      terminal.onData((data) => {
        let currentLine = currentLineRef.current.get(sessionId) || "";

        if (data === "\r") {
          terminal.write("\r\n");
          currentLineRef.current.set(sessionId, "");
        } else if (data === "\u007f" || data === "\b") {
          if (currentLine.length > 0) {
            terminal.write("\b \b");
            currentLine = currentLine.slice(0, -1);
            currentLineRef.current.set(sessionId, currentLine);
          }
        } else if (data >= " " || data === "\t") {
          terminal.write(data);
          currentLine += data;
          currentLineRef.current.set(sessionId, currentLine);
        }

        sendTerminalInput(sessionId, data);
      });

      terminal.onResize(({ rows, cols }) => {
        resizeTerminal(sessionId, rows, cols);
      });

      terminalsRef.current.set(sessionId, terminal);
      fitAddonsRef.current.set(sessionId, fitAddon);

      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
      });
      resizeObserver.observe(container);

      return terminal;
    },
    [sendTerminalInput, resizeTerminal]
  );

  const fitTerminal = useCallback((sessionId: string) => {
    const fitAddon = fitAddonsRef.current.get(sessionId);
    if (fitAddon) {
      fitAddon.fit();
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

      if (terminal && output) {
        terminal.write(output);
      }
    };

    const handleTerminalList = (message: any) => {
      const { sessions: sessionList } = message.data;
      setSessions(sessionList);

      sessionList.forEach((session: TerminalSession) => {
        const channel = `project:${projectId}:terminal:${session.session_id}`;
        subscribe(channel);
      });
    };

    onMessage(MessageType.TERMINAL_STATUS, handleTerminalStatus);
    onMessage(MessageType.TERMINAL_OUTPUT, handleTerminalOutput);
    onMessage(MessageType.TERMINAL_LIST, handleTerminalList);

    const listMessage = {
      type: MessageType.TERMINAL_LIST,
      channel: "system",
      data: {},
      timestamp: new Date().toISOString(),
    };

    import("../services/websocket/WebSocketService").then(
      ({ webSocketService }) => {
        webSocketService.send(listMessage);
      }
    );

    if (autoCreate && sessions.length === 0) {
      createTerminalSession();
    }

    return () => {
      offMessage(MessageType.TERMINAL_STATUS, handleTerminalStatus);
      offMessage(MessageType.TERMINAL_OUTPUT, handleTerminalOutput);
      offMessage(MessageType.TERMINAL_LIST, handleTerminalList);

      sessions.forEach((session) => {
        const channel = `project:${projectId}:terminal:${session.session_id}`;
        unsubscribe(channel);
      });
    };
  }, [
    isConnected,
    projectId,
    autoCreate,
    sessions.length,
    activeSession,
    subscribe,
    unsubscribe,
    onMessage,
    offMessage,
    createTerminalSession,
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
