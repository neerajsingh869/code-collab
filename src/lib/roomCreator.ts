const key = (roomId: string) => `codecollab_created_${roomId}`;

// Exactly one tab seeds the starter snippet: the one that created the room.
// sessionStorage rather than the URL, so a shared link never carries the mark
// and a second person opening an empty room can't insert a second copy.
export const markCreatedHere = (roomId: string) => {
  try {
    sessionStorage.setItem(key(roomId), "1");
  } catch {
    // private browsing or a blocked storage partition — the room just starts empty
  }
};

export const wasCreatedHere = (roomId: string) => {
  try {
    return sessionStorage.getItem(key(roomId)) === "1";
  } catch {
    return false;
  }
};
