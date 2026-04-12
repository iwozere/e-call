export interface RoomCodeBoxProps {
  roomCode: string;
}

export function RoomCodeBox({ roomCode }: RoomCodeBoxProps) {
  return (
    <div className="invite-panel__code-wrap">
      <p className="invite-panel__sublabel">Room code</p>
      <p className="invite-panel__code" tabIndex={0}>
        {roomCode}
      </p>
    </div>
  );
}
