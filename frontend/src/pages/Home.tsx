import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom } from '../lib/api';
import { useRoomStore } from '../store/roomStore';
import { DisplayNameModal } from '../components/DisplayNameModal';

export function Home() {
  const navigate = useNavigate();
  const { displayName, setDisplayName } = useRoomStore();
  const [roomIdInput, setRoomIdInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nameOpen, setNameOpen] = useState(!displayName.trim());

  const goRoom = (id: string) => {
    navigate(`/room/${encodeURIComponent(id)}`);
  };

  const onCreate = async () => {
    if (!displayName.trim()) {
      setNameOpen(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const mode =
        import.meta.env.VITE_DEFAULT_ROOM_MODE === 'sfu' ? 'sfu' : 'p2p';
      const r = await createRoom(mode);
      goRoom(r.roomId);
    } catch {
      setError('Could not create a room. Is the server running?');
    } finally {
      setBusy(false);
    }
  };

  const onJoin = () => {
    if (!displayName.trim()) {
      setNameOpen(true);
      return;
    }
    const id = roomIdInput.trim();
    if (!id) {
      setError('Enter a room ID or open an invite link.');
      return;
    }
    goRoom(id);
  };

  return (
    <div className="page home">
      <header className="page__header">
        <h1>E-Call</h1>
        <p className="page__lead">Video calls by link — no account required.</p>
      </header>

      <section className="home__card">
        <label className="field">
          <span className="field__label">Display name</span>
          <div className="field__row">
            <input
              className="field__input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How should others see you?"
              maxLength={64}
            />
            <button type="button" className="btn btn--ghost" onClick={() => setNameOpen(true)}>
              Edit
            </button>
          </div>
        </label>

        <div className="home__actions">
          <button type="button" className="btn btn--primary" onClick={onCreate} disabled={busy}>
            Create room
          </button>
        </div>

        <hr className="home__hr" />

        <label className="field">
          <span className="field__label">Join with room ID</span>
          <input
            className="field__input"
            value={roomIdInput}
            onChange={(e) => setRoomIdInput(e.target.value)}
            placeholder="Paste or type room ID"
            autoComplete="off"
          />
        </label>
        <button type="button" className="btn btn--secondary" onClick={onJoin}>
          Join room
        </button>

        {error && <p className="form-error">{error}</p>}
      </section>

      <DisplayNameModal
        open={nameOpen}
        initialValue={displayName}
        onSave={(n) => {
          setDisplayName(n);
          setNameOpen(false);
        }}
      />
    </div>
  );
}
