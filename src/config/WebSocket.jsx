import { Stomp } from "@stomp/stompjs";
import { useEffect, useState } from "react";
import SockJS from "sockjs-client";

export const WebSocket = () => {
  const [location, setLocation] = useState([]);
  const [stompClient, setStompClient] = useState(null);

  useEffect(() => {
    const socket = new SockJS("http://localhost:9001/ws");
    const client = Stomp.over(socket);

    client.connect({}, () => {
      setStompClient(client);
      client.subscribe("/topic/shipping", () => {
        const receivedMessage = JSON.parse(location.body);
        setLocation((prevMessages) => [...prevMessages, receivedMessage]);
      });
    });
    setStompClient(client);

    return () => {
      client.disconnect();
    };
  }, []);
};
