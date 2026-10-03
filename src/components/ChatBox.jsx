import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

function ChatBox({ room, player }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (!room?.id) return;

    let active = true;

    async function loadMessages() {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id,player_id,player_name,player_avatar,message,created_at")
        .eq("room_id", room.id)
        .order("created_at", { ascending: true })
        .limit(100);

      if (!error && active) setMessages(data || []);
      if (error) console.error("Could not load chat:", error);
    }

    loadMessages();

    const channel = supabase
      .channel(`room-chat-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          setMessages((current) =>
            current.some((item) => item.id === payload.new.id)
              ? current
              : [...current, payload.new].slice(-100)
          );
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [room?.id]);

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function sendMessage(event) {
    event.preventDefault();

    const message = text.trim();
    if (!message || !room?.id || !player?.id || sending) return;

    setSending(true);
    setText("");

    const { error } = await supabase.from("chat_messages").insert({
      room_id: room.id,
      player_id: player.id,
      player_name: player.name,
      player_avatar: player.avatar || null,
      message,
    });

    if (error) {
      console.error("Could not send chat message:", error);
      setText(message);
    }

    setSending(false);
  }

  if (!room?.id || !player?.id) return null;

  return (
    <>
      <button
        type="button"
        className={`global-chat-button ${open ? "active" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close chat" : "Open chat"}
        title={open ? "Close chat" : "Open chat"}
      >
        {open ? "×" : "💬"}
      </button>

      {open && (
        <section className="global-chat-panel" aria-label="Room chat">
          <div className="global-chat-header">
            <div>
              <span>ROOM CHAT</span>
              <strong>Talk to everyone</strong>
            </div>
            <button
              type="button"
              className="global-chat-close"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              ×
            </button>
          </div>

          <div className="global-chat-messages">
            {messages.length === 0 ? (
              <div className="global-chat-empty">
                No messages yet. Start the conversation.
              </div>
            ) : (
              messages.map((item) => (
                <div
                  className={`global-chat-message ${item.player_id === player.id ? "own" : ""}`}
                  key={item.id}
                >
                  <div className="global-chat-avatar">
                    {item.player_avatar ? (
                      <img
                        src={`${import.meta.env.BASE_URL}assets/avatars/${item.player_avatar}`}
                        alt=""
                        draggable="false"
                      />
                    ) : (
                      <span>{item.player_name?.charAt(0)?.toUpperCase() || "?"}</span>
                    )}
                  </div>
                  <div className="global-chat-bubble">
                    <strong>{item.player_name}</strong>
                    <p>{item.message}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          <form className="global-chat-form" onSubmit={sendMessage}>
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={300}
              placeholder="Write a message..."
              autoComplete="off"
              aria-label="Chat message"
            />
            <button type="submit" disabled={!text.trim() || sending}>
              {sending ? "..." : "Send"}
            </button>
          </form>
        </section>
      )}
    </>
  );
}

export default ChatBox;
