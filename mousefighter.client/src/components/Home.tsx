import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { getSession, setSession } from "../utils/Store";
import ConnectionState from "../enum/ConnectionState";

export default function Home() {
  const [Player2, setPlayer2] = useState(false);

  const [ConnectionSignalR, setConnectionSignalR] =
    useState<signalR.HubConnection>();
  const [ConnectionStatus, setConnectionStatus] = useState<ConnectionState>(
    ConnectionState.WAITING_CONNECTION
  );
  const [ErrorMessage, setErrorMessage] = useState("");

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
      ConnectionSignalR.on("RoomCreated", (roomId: string) => {
        setSession(roomId);
        setConnectionStatus(ConnectionState.WAITING_PLAYER);
      });
      ConnectionSignalR.on("PlayerJoined", () => {
        console.log("ça marche enfin ptn");

        setConnectionStatus(ConnectionState.PLAYER_FOUND);
      });

      ConnectionSignalR.start().then(() => {
        if (Player2) {
          const url = getSession();
          ConnectionSignalR.invoke("JoinRoom", url);
        } else {
          ConnectionSignalR.invoke("CreateRoom");
        }
        ConnectionSignalR.on("Error", (error: string) => {
          setConnectionStatus(ConnectionState.ERROR);
          setErrorMessage(error);
        });
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
        return "Connection en cours";
      case ConnectionState.PLAYER_FOUND:
        return "Joueur trouvé";
      case ConnectionState.ERROR:
        return ErrorMessage;
    }
  };

  return (
    <div className="h-screen flex flex-col gap-5 items-center justify-center">
      <div className="absolute top-0 left-0 p-4 opacity-50">
        {Player2 ? "Joueur 2" : "Joueur 1"}
      </div>
      {waitingMessage()}
      <button
        onClick={() => {
          const id = getSession();
          const url = `${window.location.href}join?roomId=${id}`;
          navigator.clipboard.writeText(url);
        }}
        className="border rounded-2xl p-2 cursor-pointer"
      >
        Copier le lien
      </button>
    </div>
  );
}
