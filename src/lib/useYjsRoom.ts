import { useRoom } from "@liveblocks/react";
import { getYjsProviderForRoom } from "@liveblocks/yjs";

// The provider is memoised per room inside @liveblocks/yjs and torn down with
// the room, so every component can just ask for it rather than threading one
// instance through context.
export const useYjsProvider = () => getYjsProviderForRoom(useRoom());

export const useYText = () => useYjsProvider().getYDoc().getText("code");
