interface SessionCardProps {
  subjectName: string;
  subjectColor: string;
  teacherName: string;
  roomName: string | null;
  startTime: string;
  endTime: string;
  status: string;
}

export function SessionCard({
  subjectName,
  subjectColor,
  teacherName,
  roomName,
  startTime,
  endTime,
  status,
}: SessionCardProps) {
  const isCancelled = status === 'cancelled';

  return (
    <div
      className={`rounded-md border p-2 text-xs leading-tight ${isCancelled ? 'opacity-50 line-through' : ''}`}
      style={{ borderLeftColor: subjectColor, borderLeftWidth: 3, backgroundColor: `${subjectColor}10` }}
    >
      <div className="font-semibold truncate" style={{ color: subjectColor }}>
        {subjectName}
      </div>
      <div className="text-muted-foreground truncate">{teacherName}</div>
      {roomName && <div className="text-muted-foreground truncate">{roomName}</div>}
      <div className="text-muted-foreground">
        {startTime} - {endTime}
      </div>
    </div>
  );
}
