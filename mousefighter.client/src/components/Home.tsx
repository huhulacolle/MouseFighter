import { useEffect, useRef, useState, MouseEvent } from "react";
import * as signalR from "@microsoft/signalr";
import { getSession, setSession } from "../utils/Store";
import ConnectionState from "../enum/ConnectionState";
import Segment from "../interfaces/Segment";
import Position from "../interfaces/Position";

export default function Home() {
  const MIN_SEGMENT_LENGTH = 6;

  const [Player2, setPlayer2] = useState(false);

  const [ConnectionSignalR, setConnectionSignalR] =
    useState<signalR.HubConnection>();

  const [ConnectionStatus, setConnectionStatus] = useState<ConnectionState>(
    ConnectionState.WAITING_CONNECTION
  );
  const [ErrorMessage, setErrorMessage] = useState("");
  const [Message, setMessage] = useState("");

  const [Play, setPlay] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const segmentsRed = useRef<Segment[]>([]);
  const segmentsBlue = useRef<Segment[]>([]);

  const [lastPos, setLastPos] = useState<Position | null>(null);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl("/hub/mousefighter")
      .withAutomaticReconnect()
      .build();

    setConnectionSignalR(connection);

    const url = getSession();

    if (url) {
      setPlayer2(true);
    }
  }, []);

  useEffect(() => {
    if (ConnectionSignalR) {
      ConnectionSignalR.start().then(async () => {
        if (Player2) {
          const url = getSession();
          await ConnectionSignalR.invoke("JoinRoom", url);
        } else {
          await ConnectionSignalR.invoke("CreateRoom");
        }
        ConnectionSignalR.on("Error", (error: string) => {
          setConnectionStatus(ConnectionState.ERROR);
          setErrorMessage(error);
        });
      });

      ConnectionSignalR.on("RoomCreated", (roomId: string) => {
        setSession(roomId);
        setConnectionStatus(ConnectionState.WAITING_PLAYER);
      });
      ConnectionSignalR.on("PlayerJoined", () => {
        setConnectionStatus(ConnectionState.PLAYER_FOUND);
      });

      ConnectionSignalR.on("StartGame", () => {
        setPlay(true);
      });

      ConnectionSignalR.on(
        "ReceivePosition",
        (prevPos: Position, currentPos: Position) => {
          drawSegment(prevPos, currentPos, "blue");
          segmentsBlue.current.push({
            x1: prevPos.x,
            y1: prevPos.y,
            x2: currentPos.x,
            y2: currentPos.y,
          });
        }
      );

      ConnectionSignalR.on("ReceiveReset", clearCanvas);

      ConnectionSignalR.on("ReceiveLost", () => {
        setMessage("Tu a gagnés gg !!!");
        clearCanvas();
      });

      return () => {
        ConnectionSignalR.stop();
      };
    }
  }, [ConnectionSignalR, Player2]);

  const waitingMessage = () => {
    switch (ConnectionStatus) {
      case ConnectionState.WAITING_PLAYER:
        return "Attente de joueur";
      case ConnectionState.WAITING_CONNECTION:
        return "Connexion en cours";
      case ConnectionState.PLAYER_FOUND:
        return "Joueur trouvé";
      case ConnectionState.ERROR:
        return ErrorMessage;
    }
  };

  const drawSegment = (start: Position, end: Position, color: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.stroke();
  };

  const intersectSegments = (
    A: Position,
    B: Position,
    C: Position,
    D: Position
  ): boolean => {
    const det = (B.x - A.x) * (D.y - C.y) - (B.y - A.y) * (D.x - C.x);
    if (det === 0) return false;

    const lambda =
      ((D.y - C.y) * (D.x - A.x) + (C.x - D.x) * (D.y - A.y)) / det;
    const gamma = ((A.y - B.y) * (D.x - A.x) + (B.x - A.x) * (D.y - A.y)) / det;

    return 0 < lambda && lambda < 1 && 0 < gamma && gamma < 1;
  };

  const checkCollision = (
    newSegment: Segment,
    segmentsOpponent: Segment[]
  ): boolean => {
    return segmentsOpponent.some((segment) =>
      intersectSegments(
        { x: newSegment.x1, y: newSegment.y1 },
        { x: newSegment.x2, y: newSegment.y2 },
        { x: segment.x1, y: segment.y1 },
        { x: segment.x2, y: segment.y2 }
      )
    );
  };

  const handleMouseLeave = () => setLastPos(null);

  const distance = (p1: Position, p2: Position) => {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
  };

  const handleMouseMove = async (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const currentPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (
      lastPos &&
      ConnectionSignalR &&
      distance(lastPos, currentPos) > MIN_SEGMENT_LENGTH
    ) {
      const newSegment: Segment = {
        x1: lastPos.x,
        y1: lastPos.y,
        x2: currentPos.x,
        y2: currentPos.y,
      };

      if (checkCollision(newSegment, segmentsBlue.current)) {
        await ConnectionSignalR.invoke("SendLost");
        setMessage("tu as perdu !");
        clearCanvas();
        await ConnectionSignalR.invoke("SendReset");
        return;
      }

      drawSegment(lastPos, currentPos, "red");
      segmentsRed.current.push(newSegment);

      const url = getSession();

      ConnectionSignalR.invoke("SendPosition", lastPos, currentPos, url).catch(
        console.error
      );

      setLastPos(currentPos);
    } else if (!lastPos) {
      setLastPos(currentPos);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    segmentsRed.current = [];
    segmentsBlue.current = [];
  };

  if (!Play) {
    return (
      <div className="h-screen flex flex-col gap-5 items-center justify-center">
        <div className="absolute top-0 left-0 p-4">
          {Player2 ? "Joueur 2" : "Joueur 1"}
        </div>
        {waitingMessage()}
        {ConnectionStatus == ConnectionState.WAITING_PLAYER ? (
          <button
            onClick={() => {
              const id = getSession();
              const url = `${window.location.href}join?roomId=${id}`;
              navigator.clipboard.writeText(url);
            }}
            className="border rounded-2xl p-2 cursor-pointer hover:bg-slate-200 active:bg-slate-400"
          >
            Copier le lien
          </button>
        ) : null}
        {!Player2 && ConnectionStatus == ConnectionState.PLAYER_FOUND ? (
          <button
            onClick={async () => {
              if (ConnectionSignalR) {
                const roomId = getSession();
                await ConnectionSignalR.invoke("LaunchGame", roomId);
              }
            }}
            className="border rounded-2xl p-2 cursor-pointer"
          >
            Lancer la parti
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="h-screen flex gap-5 flex-col items-center justify-center">
      <div>{Message}</div>
      <canvas
        ref={canvasRef}
        width={1080}
        height={720}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="border cursor-none"
      />
    </div>
  );
}
