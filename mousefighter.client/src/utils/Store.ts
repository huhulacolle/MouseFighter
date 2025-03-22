export function resetSession(): void {
  sessionStorage.clear();
}

export function getSession(): string {
  const roomId = sessionStorage.getItem("roomId");
  if (!roomId) {
    return "" 
  }
  return roomId;
}

export function setSession(roomId: string): void {
  sessionStorage.setItem("roomId", roomId);
}