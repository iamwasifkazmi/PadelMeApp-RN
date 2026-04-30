import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "./api";

let socket: Socket | null = null;
let connectedEmail = "";

function socketBaseUrl() {
  return API_BASE_URL.replace(/\/api\/?$/, "");
}

export function getSocket(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  if (socket && connectedEmail === normalizedEmail) return socket;

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(socketBaseUrl(), {
    transports: ["websocket", "polling"],
    autoConnect: true,
    auth: { email: normalizedEmail },
  });
  connectedEmail = normalizedEmail;
  return socket;
}

export function closeSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
  connectedEmail = "";
}
